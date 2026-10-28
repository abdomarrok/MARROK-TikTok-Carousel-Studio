import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { sanitizeLogText } from '../constants.ts';
import { getServerConfig } from '../config.ts';
import { decorateImagePrompt } from '../prompts/systemPrompt.ts';
import { parseImageDataUrl } from '../../src/lib/validation/image.ts';

const VALID_ASPECT_RATIOS = new Set(['9:16', '16:9', '1:1', '4:3', '3:4']);
const IMAGE_MODEL_TIMEOUT_MS = 25000;
const MAX_EDIT_BASE64_CHARS = 3_800_000; // ~2.8 MB raw binary to stay safely under Vercel 4.5 MB limit

/**
 * AI Image Generation & Editing endpoint powered by configurable Gemini image models.
 */
export async function handleGenerateImage(req: Request, res: Response) {
  const {
    prompt,
    baseImageBase64,
    aspectRatio = '9:16',
    imageSize = '1K',
    stylePreset = 'blueprint',
    themeAccent,
    themeBg,
    themeSurface,
  } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required for image generation or editing.' });
  }

  const serverConfig = getServerConfig();
  const customKey =
    (req.headers['x-gemini-key'] as string) ||
    (req.headers['x-gemini-api-key'] as string) ||
    req.body?.apiKey;

  if (!customKey && serverConfig.apiSharedSecret) {
    const providedSecret = req.headers['x-api-secret'] as string | undefined;
    if (providedSecret !== serverConfig.apiSharedSecret) {
      return res.status(401).json({
        error: 'Server API key requires valid x-api-secret or a client-provided Gemini API key.',
      });
    }
  }

  const activeApiKey = customKey || serverConfig.geminiApiKey;
  if (!activeApiKey) {
    return res.status(401).json({ error: 'Gemini API key is required for image generation.' });
  }

  const activeAi = new GoogleGenAI({
    apiKey: activeApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const safeAspectRatio = VALID_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : '9:16';
  const safeImageSize = imageSize === '2K' ? '2K' : '1K';
  const safePrompt = prompt.trim().slice(0, 4000);

  let editImage: ReturnType<typeof parseImageDataUrl> = null;
  if (typeof baseImageBase64 === 'string' && baseImageBase64.length > 0) {
    if (baseImageBase64.length > MAX_EDIT_BASE64_CHARS) {
      return res.status(413).json({
        error: 'Image edit payload exceeds Vercel 4.5 MB function limit. Please use an image under 2.5 MB.',
      });
    }
    editImage = parseImageDataUrl(baseImageBase64);
    if (!editImage) {
      return res.status(400).json({
        error: 'Image editing requires a valid PNG, JPEG, WEBP, or GIF data URL within the size limit.',
      });
    }
  }

  // Apply technical style decorator and theme hex colors
  const decoratedPrompt = decorateImagePrompt(safePrompt, {
    stylePreset,
    themeAccent,
    themeBg,
    themeSurface,
  });

  const candidateModels = serverConfig.imageModels;

  try {
    for (const model of candidateModels) {
      try {
        console.log(`Generating/editing image using model: ${model} (aspectRatio: ${safeAspectRatio})...`);

        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        // If a data URL was provided, this is an image-to-image edit operation
        if (editImage) {
          parts.push({
            inlineData: {
              data: editImage.base64,
              mimeType: editImage.mimeType,
            },
          });
          parts.push({
            text: `Edit instruction for the provided image: ${decoratedPrompt}. Maintain high visual quality and technical clarity.`,
          });
        } else {
          parts.push({ text: decoratedPrompt });
        }

        const abortSignal = AbortSignal.timeout(IMAGE_MODEL_TIMEOUT_MS);
        const response = await activeAi.models.generateContent({
          model,
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: safeAspectRatio,
              imageSize: safeImageSize,
            },
            abortSignal,
          },
        });

        // Scan candidate parts for the generated image
        const candidateParts = response.candidates?.[0]?.content?.parts || [];
        for (const part of candidateParts) {
          if (part.inlineData?.data) {
            const parsedImage = parseImageDataUrl(
              `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
            );
            if (!parsedImage) {
              console.warn(`Image model ${model} returned an invalid or oversized image payload.`);
              continue;
            }
            return res.json({
              imageUrl: parsedImage.dataUrl,
              prompt: decoratedPrompt,
              model,
              aspectRatio: safeAspectRatio,
            });
          }
        }
      } catch (modelErr: unknown) {
        const msg = modelErr instanceof Error ? modelErr.message : String(modelErr);
        const cleanNotice = sanitizeLogText(msg, customKey).replace(/[{}"]/g, '').slice(0, 120);
        console.info(`Image model ${model} unavailable (${cleanNotice}); trying next fallback.`);
        if (model === candidateModels[candidateModels.length - 1]) {
          throw modelErr;
        }
      }
    }

    return res.status(500).json({ error: 'No image data returned from generation models.' });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const cleanDetails = sanitizeLogText(errMsg, customKey).replace(/[{}"]/g, '').slice(0, 200);
    console.info('Image generation models unavailable:', cleanDetails);
    return res.status(500).json({
      error: 'Failed to generate image',
      details: cleanDetails,
    });
  }
}

