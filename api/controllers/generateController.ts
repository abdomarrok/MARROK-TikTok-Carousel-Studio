import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import type { CarouselData, ExtractedFact, GroundingSource } from '../../src/types.ts';
import { synthesizeCarousel } from '../../src/lib/synthesizer.ts';
import { sanitizeFullCarousel } from '../../src/lib/textSanitizer.ts';
import {
  ALLOWED_INPUT_MODES,
  ALLOWED_IMAGE_MIMES,
  sanitizeLogText,
} from '../constants.ts';
import { getServerConfig } from '../config.ts';
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

interface GroundingSupportItem {
  segment?: { text?: string };
  groundingChunkIndices?: number[];
}

const TOTAL_REQUEST_BUDGET_MS = 45_000;
const GROUNDED_ATTEMPT_TIMEOUT_MS = 12_000;
const DIRECT_TEXT_TIMEOUT_MS = 18_000;
const DIRECT_IMAGE_TIMEOUT_MS = 30_000;

const OVERLOAD_COOLDOWN_MS = 60_000;
const NOT_FOUND_COOLDOWN_MS = 300_000;
const modelCooldownUntil = new Map<string, number>();

export function resetModelCooldownsForTest(): void {
  modelCooldownUntil.clear();
}

function classifyModelError(err: unknown): 'overload' | 'not_found' | 'timeout' | 'other' {
  const raw = err instanceof Error ? err.message : String(err);
  const upper = raw.toUpperCase();
  if (
    upper.includes('503') ||
    upper.includes('429') ||
    upper.includes('UNAVAILABLE') ||
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('HIGH DEMAND') ||
    upper.includes('OVERLOADED')
  ) {
    return 'overload';
  }
  if (upper.includes('404') || upper.includes('NOT_FOUND') || upper.includes('NO LONGER AVAILABLE')) {
    return 'not_found';
  }
  if (upper.includes('ABORT') || upper.includes('TIMEOUT') || upper.includes('TIMED OUT')) {
    return 'timeout';
  }
  return 'other';
}

export function recordModelUnavailable(model: string, err: unknown): void {
  const kind = classifyModelError(err);
  if (kind === 'overload') {
    modelCooldownUntil.set(model, Date.now() + OVERLOAD_COOLDOWN_MS);
  } else if (kind === 'not_found') {
    modelCooldownUntil.set(model, Date.now() + NOT_FOUND_COOLDOWN_MS);
  }
}

export function getPrioritizedModels(models: string[], excludeInRequest?: Set<string>): string[] {
  const now = Date.now();
  const available: string[] = [];
  const coolingDown: string[] = [];
  const excluded: string[] = [];

  for (const model of models) {
    if (excludeInRequest?.has(model)) {
      excluded.push(model);
      continue;
    }
    const until = modelCooldownUntil.get(model) || 0;
    if (until > now) {
      coolingDown.push(model);
    } else {
      if (until > 0) modelCooldownUntil.delete(model);
      available.push(model);
    }
  }

  return [...available, ...coolingDown, ...excluded];
}

export function formatModelFallbackReason(err: unknown, key?: string): string {
  const kind = classifyModelError(err);
  if (kind === 'overload') return 'HTTP 503/429 temporary high demand';
  if (kind === 'not_found') return 'HTTP 404 model unavailable';
  if (kind === 'timeout') return 'request timeout budget reached';
  const raw = err instanceof Error ? err.message : String(err);
  const sanitized = sanitizeLogText(raw, key)
    .replace(/[{}"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitized.slice(0, 90) || 'transient generation notice';
}

/**
 * Maps extracted facts to grounded web sources strictly using groundingSupports/groundingChunks.
 * Never cycles through webSources by index (webSources[i % n]).
 * Leaves sourceUrl empty if a fact is not backed by a grounded chunk.
 */
export function mapFactsWithGroundingSupports(
  facts: ExtractedFact[] | undefined,
  webSources: GroundingSource[],
  groundingSupports: GroundingSupportItem[]
): ExtractedFact[] | undefined {
  if (!facts || facts.length === 0) return facts;
  if (webSources.length === 0) {
    // Strip any unverified/hallucinated URLs when no search grounding sources exist
    return facts.map((fact) => ({
      ...fact,
      verified: fact.verified === 'verified' ? 'unconfirmed' : fact.verified,
      sourceUrl: undefined,
      sourceTitle: undefined,
    }));
  }

  const validSourceUrls = new Set(webSources.map((s) => s.url));

  return facts.map((fact) => {
    const factTokens = fact.text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    let matchedSource: GroundingSource | undefined;

    for (const support of groundingSupports) {
      const segText = (support.segment?.text || '').toLowerCase();
      const chunkIdx = support.groundingChunkIndices?.[0];
      if (!segText || chunkIdx === undefined || !webSources[chunkIdx]) continue;

      const overlapCount = factTokens.filter((tok) => segText.includes(tok)).length;
      if (overlapCount >= 2 || (factTokens.length === 1 && overlapCount === 1)) {
        matchedSource = webSources[chunkIdx];
        break;
      }
    }

    if (matchedSource) {
      return {
        ...fact,
        verified: 'verified',
        sourceUrl: matchedSource.url,
        sourceTitle: matchedSource.title,
      };
    }

    // Keep existing sourceUrl only if it exactly matches one of the grounded webSources
    if (fact.sourceUrl && validSourceUrls.has(fact.sourceUrl)) {
      const exact = webSources.find((s) => s.url === fact.sourceUrl);
      return {
        ...fact,
        sourceUrl: exact?.url,
        sourceTitle: exact?.title || fact.sourceTitle,
      };
    }

    return {
      ...fact,
      sourceUrl: undefined,
      sourceTitle: undefined,
    };
  });
}

/**
 * Autonomous Carousel Generation Controller
 * - Enforces strict trust rules: only grounded responses with real webSources get status='verified_live';
 *   userReviewed is always false until the human explicitly confirms review in the UI.
 * - Caps total execution time within Vercel's serverless budget using AbortSignal cancellation.
 */
export async function handleGenerateCarousel(req: Request, res: Response) {
  const requestStartTime = Date.now();
  const config = getServerConfig();

  const rawPromptParts = [
    typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '',
    typeof req.body?.topic === 'string' ? req.body.topic.trim() : '',
    typeof req.body?.notes === 'string' ? req.body.notes.trim() : '',
  ].filter(Boolean);

  const uniqueParts = Array.from(new Set(rawPromptParts));
  const combinedPrompt = uniqueParts.join('\n\n');

  const { inputMode, imageBase64, imageMimeType, categoryHint, imageName, postFormat: rawFormat } = req.body || {};
  const postFormat: 'carousel' | 'single' = rawFormat === 'single' ? 'single' : 'carousel';
  const minSlidesRequired = postFormat === 'single' ? 1 : 3;
  const customKey =
    (req.headers['x-gemini-key'] as string) ||
    (req.headers['x-gemini-api-key'] as string) ||
    req.body?.apiKey;

  // Optional shared-secret protection when relying on the server's GEMINI_API_KEY
  const canUseServerKey =
    Boolean(config.geminiApiKey) &&
    (!config.apiSharedSecret || req.headers['x-api-secret'] === config.apiSharedSecret);
  const systemKey = canUseServerKey ? config.geminiApiKey : '';

  if (!combinedPrompt && !imageBase64) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }

  // Validate and sanitize parameters
  const safeInputMode =
    typeof inputMode === 'string' && ALLOWED_INPUT_MODES.has(inputMode) ? inputMode : 'text';
  const safeCategoryHint =
    typeof categoryHint === 'string' ? categoryHint.slice(0, 100).replace(/[<>{}]/g, '') : 'auto';
  const safeMimeType =
    typeof imageMimeType === 'string' && ALLOWED_IMAGE_MIMES.has(imageMimeType)
      ? imageMimeType
      : 'image/jpeg';
  const safePrompt = combinedPrompt.slice(0, 50000);
  const safeImageName = typeof imageName === 'string' ? imageName.slice(0, 200) : '';

  let imagePayload: { mimeType: string; base64: string } | null = null;
  if (typeof imageBase64 === 'string' && imageBase64.length > 0) {
    if (/^data:/i.test(imageBase64)) {
      const parsedDataUrl = parseImageDataUrl(imageBase64);
      if (!parsedDataUrl) {
        return res.status(400).json({ error: 'Uploaded image data URL is invalid or exceeds size limit.' });
      }
      imagePayload = { mimeType: parsedDataUrl.mimeType, base64: parsedDataUrl.base64 };
    } else {
      const parsedBase64 = parseRawBase64Image(imageBase64, safeMimeType);
      if (!parsedBase64) {
        return res.status(400).json({ error: 'Uploaded image payload is invalid or exceeds size limit.' });
      }
      imagePayload = parsedBase64;
    }
  }

  const hasImage = Boolean(imagePayload);
  const isLongInput = safePrompt.length > 200;

  try {
    const parts: GeminiPart[] = [];

    if (imagePayload) {
      parts.push({
        inlineData: {
          mimeType: imagePayload.mimeType,
          data: imagePayload.base64,
        },
      });
    }

    const userPromptText = buildUserCarouselPrompt({
      rawPrompt: safePrompt,
      safeCategoryHint,
      safeInputMode,
      hasImage,
      imageName: safeImageName,
      postFormat,
    });
    parts.push({ text: userPromptText });

    const candidateKeys: { key: string; isCustom: boolean }[] = [];
    if (typeof customKey === 'string' && customKey.trim().length > 5) {
      candidateKeys.push({ key: customKey.trim(), isCustom: true });
    }
    if (systemKey && systemKey.length > 5 && !candidateKeys.some((k) => k.key === systemKey)) {
      candidateKeys.push({ key: systemKey, isCustom: false });
    }

    let jsonResult: CarouselData | null = null;
    let successfulModel = '';
    let wasGroundedWithSources = false;

    const remainingBudgetMs = () => TOTAL_REQUEST_BUDGET_MS - (Date.now() - requestStartTime);

    keyLoop: for (const { key, isCustom } of candidateKeys) {
      if (remainingBudgetMs() < 4000) break;

      const activeAi = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const failedModelsInAttempt = new Set<string>();
      const prioritizedForGrounded = getPrioritizedModels(config.generationModels);
      const primaryModel = prioritizedForGrounded[0] || 'gemini-3.8-flash';

      // Attempt 1: Single Grounded Attempt (only for short text prompts without images)
      if (!isLongInput && !hasImage && remainingBudgetMs() >= 6000) {
        const timeoutMs = Math.min(GROUNDED_ATTEMPT_TIMEOUT_MS, remainingBudgetMs() - 1000);
        try {
          console.info(
            `[AI-Gateway] Trying grounded attempt on ${primaryModel} (${isCustom ? 'custom key' : 'system key'})...`
          );

          const response = await activeAi.models.generateContent({
            model: primaryModel,
            contents: { parts },
            config: {
              systemInstruction: MARROK_SYSTEM_PROMPT,
              temperature: 0.2,
              tools: [{ googleSearch: {} }],
              responseMimeType: 'application/json',
              responseSchema: CAROUSEL_RESPONSE_SCHEMA,
              abortSignal: AbortSignal.timeout(timeoutMs),
            },
          });

          const rawText = response.text;
          if (rawText) {
            const cleanText = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
            const parsed = parseCarouselData(JSON.parse(cleanText), {
              minSlides: minSlidesRequired,
              requireSlideContent: true,
            });

            if (parsed) {
              const groundingMeta = response.candidates?.[0]?.groundingMetadata;
              const searchQueries: string[] = (groundingMeta?.webSearchQueries as string[]) || [];
              const groundingChunks =
                (groundingMeta?.groundingChunks as Array<{ web?: { uri?: string; title?: string } }>) || [];
              const groundingSupports =
                (groundingMeta?.groundingSupports as GroundingSupportItem[]) || [];
              const webSources: GroundingSource[] = [];

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

              parsed.facts = mapFactsWithGroundingSupports(
                parsed.facts,
                webSources,
                groundingSupports
              );

              parsed.sourceMeta = parsed.sourceMeta || {};
              parsed.sourceMeta.isSearchGrounded = webSources.length > 0;
              if (searchQueries.length > 0) parsed.sourceMeta.groundingQueries = searchQueries;
              if (webSources.length > 0) parsed.sourceMeta.groundingSources = webSources;

              wasGroundedWithSources = webSources.length > 0;
              jsonResult = parsed;
              successfulModel = primaryModel;
              modelCooldownUntil.delete(primaryModel);
              break keyLoop;
            }
          }
        } catch (groundingErr: unknown) {
          recordModelUnavailable(primaryModel, groundingErr);
          if (classifyModelError(groundingErr) !== 'timeout') {
            failedModelsInAttempt.add(primaryModel);
          }
          console.info(
            `[AI-Gateway] Grounded mode on ${primaryModel} unavailable (${formatModelFallbackReason(groundingErr, key)}); cascading to direct schema mode.`
          );
        }
      }

      // Attempt 2: Ungrounded Direct Schema Attempt across prioritized fallback models
      const directCandidates = getPrioritizedModels(config.generationModels, failedModelsInAttempt);
      for (const model of directCandidates) {
        if (remainingBudgetMs() < 4000) break;
        const baseTimeout = hasImage ? DIRECT_IMAGE_TIMEOUT_MS : DIRECT_TEXT_TIMEOUT_MS;
        const timeoutMs = Math.min(baseTimeout, remainingBudgetMs() - 500);

        try {
          console.info(
            `[AI-Gateway] Calling direct schema mode on ${model} (${isCustom ? 'custom key' : 'system key'})...`
          );

          const directResponse = await activeAi.models.generateContent({
            model,
            contents: { parts },
            config: {
              systemInstruction: MARROK_SYSTEM_PROMPT,
              temperature: 0.2,
              responseMimeType: 'application/json',
              responseSchema: CAROUSEL_RESPONSE_SCHEMA,
              abortSignal: AbortSignal.timeout(timeoutMs),
            },
          });

          const directText = directResponse.text;
          if (directText) {
            const cleanText = directText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
            const parsed = parseCarouselData(JSON.parse(cleanText), {
              minSlides: minSlidesRequired,
              requireSlideContent: true,
            });
            if (parsed) {
              parsed.facts = mapFactsWithGroundingSupports(parsed.facts, [], []);
              jsonResult = parsed;
              successfulModel = model;
              wasGroundedWithSources = false;
              modelCooldownUntil.delete(model);
              break keyLoop;
            }
          }
        } catch (directErr: unknown) {
          recordModelUnavailable(model, directErr);
          failedModelsInAttempt.add(model);
          console.info(
            `[AI-Gateway] Direct mode on ${model} unavailable (${formatModelFallbackReason(directErr, key)}); trying next fallback.`
          );
        }
      }
    }

    if (jsonResult) {
      const engineType = wasGroundedWithSources ? 'grounded' : 'ungrounded';
      jsonResult.brand = 'MARROK';
      jsonResult.postFormat = postFormat;
      if (postFormat === 'single' && jsonResult.slides.length > 1) {
        const firstSlide = jsonResult.slides[0];
        const lastSlide = jsonResult.slides[jsonResult.slides.length - 1];
        jsonResult.slides = [
          {
            ...firstSlide,
            enCredit: firstSlide.enCredit || lastSlide?.enCredit || `Source: ${jsonResult.sourceMeta?.creator || 'MARROK'}`,
            arCredit: firstSlide.arCredit || lastSlide?.arCredit || `المصدر: ${jsonResult.sourceMeta?.creator || 'MARROK'}`,
          },
        ];
      }
      jsonResult.sourceMeta = {
        ...jsonResult.sourceMeta,
        isFallback: false,
        isSearchGrounded: wasGroundedWithSources,
        status: wasGroundedWithSources ? 'verified_live' : 'unverified_draft',
        userReviewed: false, // Only explicit user action in UI may mark userReviewed=true
        engine: engineType,
        model: successfulModel,
      };

      jsonResult = sanitizeFullCarousel(jsonResult);

      res.setHeader('X-Marrok-Engine', engineType);
      res.setHeader('X-Marrok-Model', successfulModel);
      return res.json(jsonResult);
    }

    // Offline Fallback Synthesizer
    console.info('[AI-Gateway] AI attempts exhausted. Activating MARROK offline synthesizer.');
    const synthesizedData = synthesizeCarousel({
      prompt: safePrompt,
      categoryHint: safeCategoryHint,
      inputMode: safeInputMode,
      imageFileName: safeImageName,
      postFormat,
    });

    synthesizedData.brand = 'MARROK';
    synthesizedData.postFormat = postFormat;
    synthesizedData.sourceMeta = {
      ...synthesizedData.sourceMeta,
      isFallback: true,
      isSearchGrounded: false,
      status: 'unverified_draft',
      userReviewed: false,
      engine: 'offline',
    };

    res.setHeader('X-Marrok-Engine', 'offline');
    return res.json(synthesizedData);
  } catch (error: unknown) {
    console.info(
      '[AI-Gateway] Fallback synthesizer activated due to unexpected controller exception:',
      formatModelFallbackReason(error, customKey)
    );
    const fallbackData = synthesizeCarousel({
      prompt: safePrompt,
      categoryHint: safeCategoryHint,
      inputMode: safeInputMode,
      imageFileName: safeImageName,
      postFormat,
    });
    fallbackData.brand = 'MARROK';
    fallbackData.postFormat = postFormat;
    fallbackData.sourceMeta = {
      ...fallbackData.sourceMeta,
      isFallback: true,
      isSearchGrounded: false,
      status: 'unverified_draft',
      userReviewed: false,
      engine: 'offline',
    };
    res.setHeader('X-Marrok-Engine', 'offline');
    return res.json(fallbackData);
  }
}

/**
 * Per-Slide Bilingual AI Refinement Controller
 */
export async function handleRefineSlide(req: Request, res: Response) {
  const config = getServerConfig();
  const { slide, mode = 'punchy', category = 'SOFTWARE ARCHITECTURE' } = req.body || {};
  if (!slide || typeof slide !== 'object') {
    return res.status(400).json({ error: 'Slide object is required' });
  }

  const customKey =
    (req.headers['x-gemini-key'] as string) ||
    (req.headers['x-gemini-api-key'] as string) ||
    req.body?.apiKey;
  const canUseServerKey =
    Boolean(config.geminiApiKey) &&
    (!config.apiSharedSecret || req.headers['x-api-secret'] === config.apiSharedSecret);
  const systemKey = canUseServerKey ? config.geminiApiKey : '';

  const candidateKeys: string[] = [];
  if (typeof customKey === 'string' && customKey.trim().length > 5) {
    candidateKeys.push(customKey.trim());
  }
  if (systemKey && systemKey.length > 5 && !candidateKeys.includes(systemKey)) {
    candidateKeys.push(systemKey);
  }

  const enTitle = String(slide.enTitle || '').slice(0, 200);
  const arTitle = String(slide.arTitle || '').slice(0, 200);
  const enBody = String(slide.enBody || '').slice(0, 500);
  const arBody = String(slide.arBody || '').slice(0, 500);

  const modeInstructions: Record<string, string> = {
    punchy:
      'Make the English and Arabic headlines sharper, contrarian, and high-impact (<= 42 chars). Tighten body copy to crisp engineering mechanisms (<= 135 chars).',
    shorten:
      'Compress English and Arabic titles and body copy for instant mobile glanceability while preserving exact technical numbers and mechanisms.',
    arabic_sync:
      'Keep the English headline and body accurate, and produce a natural, authoritative Modern Standard Arabic technical translation with proper BiDi terminology.',
    analogy:
      'Reframe the body explanation using a concrete systems engineering mental model or architectural contrast while staying under 135 characters.',
  };

  const directive = modeInstructions[String(mode)] || modeInstructions.punchy;

  for (const key of candidateKeys) {
    const activeAi = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const refineModels = getPrioritizedModels(config.generationModels);
    for (const model of refineModels) {
      try {
        const response = await activeAi.models.generateContent({
          model,
          contents: `Refine this single engineering carousel slide for topic "${String(category).slice(0, 80)}".
Directive: ${directive}
Rules:
- enTitle: 2 to 6 words ending with a period (.) or question mark (?), max 45 characters.
- arTitle: Natural Arabic technical headline ending with . or ؟, max 40 characters.
- enBody: Direct technical explanation, max 140 characters.
- arBody: Natural Arabic technical explanation ending with an Arabic word and period, max 150 characters.
- Return ONLY valid JSON with keys: enTitle, arTitle, enBody, arBody.

Current Slide:
enTitle: ${enTitle}
arTitle: ${arTitle}
enBody: ${enBody}
arBody: ${arBody}`,
          config: {
            temperature: 0.3,
            responseMimeType: 'application/json',
            abortSignal: AbortSignal.timeout(12_000),
          },
        });

        const rawText = response.text;
        if (rawText) {
          const cleanText = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
          const parsed = JSON.parse(cleanText);
          if (parsed && typeof parsed.enTitle === 'string' && typeof parsed.enBody === 'string') {
            modelCooldownUntil.delete(model);
            res.setHeader('X-Marrok-Engine', 'ungrounded');
            res.setHeader('X-Marrok-Model', model);
            return res.json({
              enTitle: parsed.enTitle.trim(),
              arTitle: typeof parsed.arTitle === 'string' ? parsed.arTitle.trim() : arTitle,
              enBody: parsed.enBody.trim(),
              arBody: typeof parsed.arBody === 'string' ? parsed.arBody.trim() : arBody,
              engine: 'ungrounded',
              model,
            });
          }
        }
      } catch (err: unknown) {
        recordModelUnavailable(model, err);
        console.info(
          `[AI-Gateway] Slide refine on ${model} unavailable (${formatModelFallbackReason(err, key)}); trying next fallback.`
        );
      }
    }
  }

  res.setHeader('X-Marrok-Engine', 'offline');
  return res.json({
    enTitle,
    arTitle,
    enBody,
    arBody,
    engine: 'offline',
  });
}
