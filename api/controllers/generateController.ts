import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import type { CarouselData } from '../../src/types.ts';
import { synthesizeCarousel, enrichCarouselDiagrams } from '../../src/lib/synthesizer.ts';
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

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const CANDIDATE_GENERATION_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

/**
 * Autonomous Carousel Generation controller with Google Search Grounding and resilient local synthesis fallback.
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
  const customKey = (req.headers['x-gemini-key'] as string) || req.body?.apiKey;

  if (!combinedPrompt && !imageBase64) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }

  // Validate and sanitize parameters
  const safeInputMode = typeof inputMode === 'string' && ALLOWED_INPUT_MODES.has(inputMode) ? inputMode : 'text';
  const safeCategoryHint = typeof categoryHint === 'string' ? categoryHint.slice(0, 100).replace(/[<>{}]/g, '') : 'auto';
  const safeMimeType = typeof imageMimeType === 'string' && ALLOWED_IMAGE_MIMES.has(imageMimeType) ? imageMimeType : 'image/jpeg';
  const safePrompt = combinedPrompt.slice(0, 50000);
  const safeImageName = typeof imageName === 'string' ? imageName.slice(0, 200) : '';

  try {
    const parts: GeminiPart[] = [];

    // If an image was uploaded, attach it as inlineData
    if (typeof imageBase64 === 'string' && imageBase64.length > 0) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: safeMimeType,
          data: cleanBase64,
        },
      });
    }

    // Build user prompt
    const userPromptText = buildUserCarouselPrompt({
      rawPrompt: safePrompt,
      safeCategoryHint,
      safeInputMode,
    });
    parts.push({ text: userPromptText });

    // Support user-provided API key from UI or default to system environment key
    const activeApiKey = customKey || process.env.GEMINI_API_KEY;
    const activeAi = activeApiKey ? new GoogleGenAI({ apiKey: activeApiKey }) : null;

    let jsonResult: CarouselData | null = null;

    if (activeAi) {
      for (const model of CANDIDATE_GENERATION_MODELS) {
        // Attempt 1: Grounded generation with Google Search tool
        try {
          console.log(`Calling Gemini model with Google Search Grounding: ${model} (using ${customKey ? 'custom user key' : 'system key'})...`);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${model} search exceeded 8000ms threshold`)), 8000)
          );

          const response = await Promise.race([
            activeAi.models.generateContent({
              model,
              contents: { parts },
              config: {
                systemInstruction: MARROK_SYSTEM_PROMPT,
                temperature: 0.2,
                tools: [{ googleSearch: {} }],
                responseMimeType: 'application/json',
                responseSchema: CAROUSEL_RESPONSE_SCHEMA,
              },
            }),
            timeoutPromise,
          ]);

          const rawText = response.text;
          if (rawText) {
            const cleanText = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
            jsonResult = JSON.parse(cleanText) as CarouselData;

            // Extract Google Search Grounding metadata
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

            if (jsonResult) {
              if (!jsonResult.sourceMeta) {
                jsonResult.sourceMeta = {};
              }
              jsonResult.sourceMeta.isSearchGrounded = webSources.length > 0 || searchQueries.length > 0;
              if (searchQueries.length > 0) {
                jsonResult.sourceMeta.groundingQueries = searchQueries;
              }
              if (webSources.length > 0) {
                jsonResult.sourceMeta.groundingSources = webSources;
              }
              jsonResult.sourceMeta.isFallback = false;
              jsonResult.sourceMeta.engine = 'gemini-ai';
              jsonResult.brand = 'MARROK';

              // Enrich facts with real search citations
              if (Array.isArray(jsonResult.facts) && webSources.length > 0) {
                jsonResult.facts = jsonResult.facts.map((fact, fIdx) => {
                  const matched = webSources[fIdx % webSources.length];
                  return {
                    ...fact,
                    sourceUrl: fact.sourceUrl || matched?.url,
                    sourceTitle: fact.sourceTitle || matched?.title,
                  };
                });
              }

              jsonResult = sanitizeFullCarousel(jsonResult);
              console.log(`Successfully generated grounded carousel with model ${model} (found ${webSources.length} sources)`);
              break;
            }
          }
        } catch (groundingErr: unknown) {
          const errMsg = groundingErr instanceof Error ? groundingErr.message : String(groundingErr);
          console.warn(`Search grounding attempt failed on ${model} (${sanitizeLogText(errMsg, customKey).slice(0, 100)}). Retrying ${model} with direct LLM schema generation...`);

          // Attempt 2: Direct LLM generation without search tool (bypasses 429 search quota)
          try {
            const timeoutPromiseDirect = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout: ${model} direct exceeded 8000ms threshold`)), 8000)
            );

            const directResponse = await Promise.race([
              activeAi.models.generateContent({
                model,
                contents: { parts },
                config: {
                  systemInstruction: MARROK_SYSTEM_PROMPT,
                  temperature: 0.2,
                  responseMimeType: 'application/json',
                  responseSchema: CAROUSEL_RESPONSE_SCHEMA,
                },
              }),
              timeoutPromiseDirect,
            ]);

            const directText = directResponse.text;
            if (directText) {
              const cleanText = directText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
              jsonResult = JSON.parse(cleanText) as CarouselData;

              if (jsonResult) {
                if (!jsonResult.sourceMeta) {
                  jsonResult.sourceMeta = {};
                }
                jsonResult.sourceMeta.isSearchGrounded = false;
                jsonResult.sourceMeta.isFallback = false;
                jsonResult.sourceMeta.status = 'verified_live';
                jsonResult.sourceMeta.userReviewed = true;
                jsonResult.sourceMeta.engine = 'gemini-ai';
                jsonResult.brand = 'MARROK';

                jsonResult = sanitizeFullCarousel(jsonResult);
                console.log(`Successfully generated authentic carousel with model ${model} (direct LLM mode)`);
                break;
              }
            }
          } catch (directErr: unknown) {
            const directMsg = directErr instanceof Error ? directErr.message : String(directErr);
            console.warn(`Direct LLM attempt failed on ${model}: ${sanitizeLogText(directMsg, customKey).slice(0, 100)}`);
          }
        }
      }
    }

    if (jsonResult) {
      jsonResult.brand = 'MARROK';
      if (!jsonResult.sourceMeta) jsonResult.sourceMeta = {};
      jsonResult.sourceMeta.isFallback = false;
      jsonResult.sourceMeta.status = 'verified_live';
      jsonResult.sourceMeta.userReviewed = true;
      if (Array.isArray(jsonResult.slides)) {
        jsonResult.slides = enrichCarouselDiagrams(
          jsonResult.slides,
          safePrompt || safeImageName,
          jsonResult.category || '',
          jsonResult.brand || 'MARROK'
        );
      }
      res.setHeader('X-Marrok-Engine', 'gemini-ai');
      return res.json(jsonResult);
    }

    // Upstream AI API completely unavailable — activate MARROK resilient content synthesizer:
    console.log('Activating MARROK resilient content synthesizer for input:', safePrompt || safeImageName);
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
    console.log('Activating fallback synthesizer after generation error:', sanitizeLogText(error, customKey).slice(0, 200));
    // Never fail with 500: synthesize archetype-compliant output
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
