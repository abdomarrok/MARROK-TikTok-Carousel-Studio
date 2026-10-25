import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { sanitizeLogText } from '../constants.ts';
import { decorateImagePrompt } from '../prompts/systemPrompt.ts';

const VALID_ASPECT_RATIOS = new Set(['9:16', '16:9', '1:1', '4:3', '3:4']);
const CANDIDATE_IMAGE_MODELS = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];

/**
 * AI Image Generation & Editing endpoint powered by gemini-nano-banana-2.1.
 */
export async function handleGenerateImage(req: Request, res: Response) {
  const {
    prompt,
    baseImageBase64,
    baseImageMimeType = 'image/png',
    aspectRatio = '9:16',
    imageSize = '1K',
    stylePreset = 'blueprint',
    themeAccent,
    themeBg,
    themeSurface,
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required for image generation or editing.' });
  }

  const customKey = (req.headers['x-gemini-key'] as string) || req.body.apiKey;
  const activeApiKey = customKey || process.env.GEMINI_API_KEY;
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

  // Apply technical style decorator and theme hex colors
  const decoratedPrompt = decorateImagePrompt(prompt, {
    stylePreset,
    themeAccent,
    themeBg,
    themeSurface,
  });

  try {
    for (const model of CANDIDATE_IMAGE_MODELS) {
      try {
        console.log(`Generating/editing image using model: ${model} (aspectRatio: ${safeAspectRatio})...`);

        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        // If baseImageBase64 is provided, this is an image-to-image edit operation
        if (typeof baseImageBase64 === 'string' && baseImageBase64.length > 50) {
          const cleanData = baseImageBase64.replace(/^data:[^;]+;base64,/, '');
          parts.push({
            inlineData: {
              data: cleanData,
              mimeType: baseImageMimeType,
            },
          });
          parts.push({
            text: `Edit instruction for the provided image: ${decoratedPrompt}. Maintain high visual quality and technical clarity.`,
          });
        } else {
          parts.push({ text: decoratedPrompt });
        }

        const config: Record<string, unknown> = {
          imageConfig: {
            aspectRatio: safeAspectRatio,
            imageSize: safeImageSize,
          },
        };

        const response = await activeAi.models.generateContent({
          model,
          contents: { parts },
          config,
        });

        // Scan candidate parts for the generated image
        const candidateParts = response.candidates?.[0]?.content?.parts || [];
        for (const part of candidateParts) {
          if (part.inlineData?.data) {
            const dataUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.json({
              imageUrl: dataUrl,
              prompt: decoratedPrompt,
              model,
              aspectRatio: safeAspectRatio,
            });
          }
        }
      } catch (modelErr: unknown) {
        const msg = modelErr instanceof Error ? modelErr.message : String(modelErr);
        console.log(`Image model ${model} notice: ${sanitizeLogText(msg, customKey).slice(0, 150)}`);
        // If it's the last model, rethrow to outer catch
        if (model === CANDIDATE_IMAGE_MODELS[CANDIDATE_IMAGE_MODELS.length - 1]) {
          throw modelErr;
        }
      }
    }

    return res.status(500).json({ error: 'No image data returned from generation models.' });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Image generation error:', sanitizeLogText(errMsg, customKey).slice(0, 200));
    return res.status(500).json({
      error: 'Failed to generate image',
      details: sanitizeLogText(errMsg, customKey).slice(0, 200),
    });
  }
}
