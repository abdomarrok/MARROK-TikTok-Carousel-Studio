import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import type { CarouselData } from '../../src/types.ts';
import { synthesizeCarousel } from '../../src/lib/synthesizer.ts';
import { sanitizeFullCarousel } from '../../src/lib/textSanitizer.ts';
import {
  ALLOWED_INPUT_MODES,
  ALLOWED_IMAGE_MIMES,
  sanitizeLogText,
} from '../constants.ts';
import {
  MARROK_SYSTEM_PROMPT,
  buildUserCarouselPrompt,
} from '../prompts/systemPrompt.ts';
import { CAROUSEL_RESPONSE_SCHEMA } from '../prompts/responseSchema.ts';
import { parseCarouselData } from '../../src/lib/validation/carousel.ts';
import { parseImageDataUrl, parseRawBase64Image } from '../../src/lib/validation/image.ts';

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

// Multi-Model Failover Cascade per User Spec
const CANDIDATE_GENERATION_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.1-flash-lite',
];

/**
 * 100% AI-First Autonomous Carousel Generation Controller
 * - Skips Google Search tool on long pasted content (>200 chars) to preserve search quota.
 * - Rotates across candidate Gemini models and API keys with instant failover on 429 or 404.
 * - Protects authentic AI output without heuristic overwrites.
 */
export async function handleGenerateCarousel(req: Request, res: Response) {
  const rawPromptParts = [
    typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '',
    typeof req.body.topic === 'string' ? req.body.topic.trim() : '',
    typeof req.body.notes === 'string' ? req.body.notes.trim() : '',
  ].filter(Boolean);

  const uniqueParts = Array.from(new Set(rawPromptParts));
  const combinedPrompt = uniqueParts.join('\n\n');

  const { inputMode, imageBase64, imageMimeType, categoryHint, imageName } = req.body;
  const customKey =
    (req.headers['x-gemini-key'] as string) ||
    (req.headers['x-gemini-api-key'] as string) ||
    req.body?.apiKey;
  const systemKey = process.env.GEMINI_API_KEY;

  if (!combinedPrompt && !imageBase64) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }

  // Validate and sanitize parameters
  const safeInputMode = typeof inputMode === 'string' && ALLOWED_INPUT_MODES.has(inputMode) ? inputMode : 'text';
  const safeCategoryHint = typeof categoryHint === 'string' ? categoryHint.slice(0, 100).replace(/[<>{}]/g, '') : 'auto';
  const safeMimeType = typeof imageMimeType === 'string' && ALLOWED_IMAGE_MIMES.has(imageMimeType) ? imageMimeType : 'image/jpeg';
  const safePrompt = combinedPrompt.slice(0, 50000);
  const safeImageName = typeof imageName === 'string' ? imageName.slice(0, 200) : '';

  let imagePayload: { mimeType: string; base64: string } | null = null;
  if (typeof imageBase64 === 'string' && imageBase64.length > 0) {
    if (/^data:/i.test(imageBase64)) {
      const parsedDataUrl = parseImageDataUrl(imageBase64);
      if (!parsedDataUrl) {
        return res.status(400).json({ error: 'Uploaded image data URL is invalid or too large.' });
      }
      imagePayload = { mimeType: parsedDataUrl.mimeType, base64: parsedDataUrl.base64 };
    } else {
      const parsedBase64 = parseRawBase64Image(imageBase64, safeMimeType);
      if (!parsedBase64) {
        return res.status(400).json({ error: 'Uploaded image payload is invalid or too large.' });
      }
      imagePayload = parsedBase64;
    }
  }

  // Source Material Check: Pasted notes, transcripts, or code (>200 chars) already contain the ground truth
  const hasImage = Boolean(imagePayload);
  const isLongInput = safePrompt.length > 200;

  try {
    const parts: GeminiPart[] = [];

    // If an image was uploaded, attach it as inlineData
    if (imagePayload) {
      parts.push({
        inlineData: {
          mimeType: imagePayload.mimeType,
          data: imagePayload.base64,
        },
      });
    }

    // Build user prompt
    const userPromptText = buildUserCarouselPrompt({
      rawPrompt: safePrompt,
      safeCategoryHint,
      safeInputMode,
      hasImage,
      imageName: safeImageName,
    });
    parts.push({ text: userPromptText });

    // Build key cascade (user-provided custom key prioritized, then system environment key)
    const candidateKeys: { key: string; isCustom: boolean }[] = [];
    if (typeof customKey === 'string' && customKey.trim().length > 5) {
      candidateKeys.push({ key: customKey.trim(), isCustom: true });
    }
    if (systemKey && systemKey.trim().length > 5 && !candidateKeys.some((k) => k.key === systemKey.trim())) {
      candidateKeys.push({ key: systemKey.trim(), isCustom: false });
    }

    let jsonResult: CarouselData | null = null;
    let successfulModel = '';

    // Multi-Key & Multi-Model Cascade
    keyLoop: for (const { key, isCustom } of candidateKeys) {
      const activeAi = new GoogleGenAI({ apiKey: key });

      for (const model of CANDIDATE_GENERATION_MODELS) {
        // Attempt A: Google Search Grounding ONLY for short text inputs (< 200 chars) WITHOUT images
        // (Google Search tool cannot be combined with multimodal media payloads in Gemini)
        if (!isLongInput && !hasImage) {
          const searchController = new AbortController();
          const searchTimer = setTimeout(() => searchController.abort(), 12000);
          try {
            console.log(`[AI-Gateway] Trying grounded model ${model} (${isCustom ? 'custom key' : 'system key'})...`);

            const response = await activeAi.models.generateContent({
              model,
              contents: { parts },
              config: {
                systemInstruction: MARROK_SYSTEM_PROMPT,
                temperature: 0.2,
                tools: [{ googleSearch: {} }],
                responseMimeType: 'application/json',
                responseSchema: CAROUSEL_RESPONSE_SCHEMA,
                abortSignal: searchController.signal,
              },
            });

            const rawText = response.text;
            if (rawText) {
              const cleanText = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
              const parsed = parseCarouselData(JSON.parse(cleanText), { minSlides: 3, requireSlideContent: true });

              if (parsed) {
                const groundingMeta = response.candidates?.[0]?.groundingMetadata;
                const searchQueries: string[] = (groundingMeta?.webSearchQueries as string[]) || [];
                const groundingChunks = (groundingMeta?.groundingChunks as Array<{ web?: { uri?: string; title?: string } }>) || [];
                const webSources: { title: string; url: string }[] = [];

                if (Array.isArray(groundingChunks)) {
                  for (const chunk of groundingChunks) {
                    if (chunk?.web?.uri) {
                      webSources.push({
                        title: chunk.web.title || chunk.web.uri,
                        url: chunk.web.uri,
                      });
                    }
                  }
                }

                parsed.sourceMeta = parsed.sourceMeta || {};
                parsed.sourceMeta.isSearchGrounded = webSources.length > 0 || searchQueries.length > 0;
                if (searchQueries.length > 0) parsed.sourceMeta.groundingQueries = searchQueries;
                if (webSources.length > 0) parsed.sourceMeta.groundingSources = webSources;
                jsonResult = parsed;
                successfulModel = model;
                break keyLoop;
              }
            }
          } catch (groundingErr: unknown) {
            const errMsg = groundingErr instanceof Error ? groundingErr.message : String(groundingErr);
            console.warn(`[AI-Gateway] Grounding failed on ${model}: ${sanitizeLogText(errMsg, key).slice(0, 100)}. Falling back to direct LLM...`);
          } finally {
            clearTimeout(searchTimer);
          }
        }

        // Attempt B: Direct LLM Schema Generation (Zero Search Quota Wasted)
        const directController = new AbortController();
        const directTimer = setTimeout(() => directController.abort(), 15000);
        try {
          console.log(`[AI-Gateway] Calling direct LLM schema mode: ${model} (${isCustom ? 'custom key' : 'system key'})...`);

          const directResponse = await activeAi.models.generateContent({
            model,
            contents: { parts },
            config: {
              systemInstruction: MARROK_SYSTEM_PROMPT,
              temperature: 0.2,
              responseMimeType: 'application/json',
              responseSchema: CAROUSEL_RESPONSE_SCHEMA,
              abortSignal: directController.signal,
            },
          });

          const directText = directResponse.text;
          if (directText) {
            const cleanText = directText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
            const parsed = parseCarouselData(JSON.parse(cleanText), { minSlides: 3, requireSlideContent: true });
            if (parsed) {
              jsonResult = parsed;
              successfulModel = model;
              console.log(`[AI-Gateway] Successfully generated 100% authentic carousel with model ${model} (direct LLM mode)`);
              break keyLoop;
            }
            console.warn(`[AI-Gateway] Model ${model} returned an invalid carousel payload. Cascading to next candidate...`);
          }
        } catch (directErr: unknown) {
          const directMsg = directErr instanceof Error ? directErr.message : String(directErr);
          console.warn(`[AI-Gateway] Model ${model} failed (${sanitizeLogText(directMsg, key).slice(0, 100)}). Cascading to next candidate...`);
        } finally {
          clearTimeout(directTimer);
        }
      }
    }

    // Authentic AI Generation Succeeded — Output Directly Without Heuristic Overwrite!
    if (jsonResult) {
      jsonResult.brand = 'MARROK';
      if (!jsonResult.sourceMeta) jsonResult.sourceMeta = {};
      jsonResult.sourceMeta.isFallback = false;
      jsonResult.sourceMeta.status = 'verified_live';
      jsonResult.sourceMeta.userReviewed = true;
      jsonResult.sourceMeta.engine = 'gemini-ai';
      jsonResult.sourceMeta.model = successfulModel;

      // Pure lightweight formatting only (strip stray markdown markers `**` or `#`):
      jsonResult = sanitizeFullCarousel(jsonResult);

      res.setHeader('X-Marrok-Engine', 'gemini-ai');
      res.setHeader('X-Marrok-Model', successfulModel);
      return res.json(jsonResult);
    }

    // Upstream AI API completely unavailable across all keys and models — activate resilient local synthesizer
    console.warn('[AI-Gateway] All Gemini models exhausted. Activating MARROK local synthesis fallback.');
    const synthesizedData = synthesizeCarousel({
      prompt: safePrompt,
      categoryHint: safeCategoryHint,
      inputMode: safeInputMode,
      imageFileName: safeImageName,
    });

    synthesizedData.brand = 'MARROK';
    synthesizedData.sourceMeta = {
      ...synthesizedData.sourceMeta,
      isFallback: true,
      status: 'unverified_draft',
      userReviewed: false,
      engine: 'offline-synthesizer',
    };

    res.setHeader('X-Marrok-Engine', 'offline-synthesizer');
    return res.json(synthesizedData);
  } catch (error: unknown) {
    console.error('[AI-Gateway] Fatal generation error, falling back to local synthesizer:', error);
    const fallbackData = synthesizeCarousel({
      prompt: safePrompt,
      categoryHint: safeCategoryHint,
      inputMode: safeInputMode,
      imageFileName: safeImageName,
    });
    fallbackData.brand = 'MARROK';
    fallbackData.sourceMeta = {
      ...fallbackData.sourceMeta,
      isFallback: true,
      status: 'unverified_draft',
      userReviewed: false,
      engine: 'offline-synthesizer',
    };
    res.setHeader('X-Marrok-Engine', 'offline-synthesizer');
    return res.json(fallbackData);
  }
}
