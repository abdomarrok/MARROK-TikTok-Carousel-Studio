import { CarouselData, SlideData, ThemePalette } from '../types';
import { sanitizeFullCarousel } from './textSanitizer';
import { autoFitTextToLimits, autoPolishHeadline, fixArabicPunctuation } from './smartEditor';
import { runQAChecks, CHAR_LIMITS } from './qaChecks';
import { synthesizeCarousel } from './synthesizer';

export interface AutonomousPipelineOptions {
  onProgress?: (status: string) => void;
  theme?: ThemePalette;
  generateDiagram?: boolean;
}

/**
 * Autonomously runs the entire synthesis, sanitization, localization,
 * character limit fitting, and 9:16 diagram generation pipeline.
 * No manual knobs needed: the engine does all the work end-to-end.
 */
export async function runAutonomousPipeline(
  rawInput: string,
  options: AutonomousPipelineOptions = {}
): Promise<CarouselData> {
  const { onProgress, theme, generateDiagram = true } = options;

  // Step 1: Synthesize Content & Bilingual Structure
  onProgress?.('Synthesizing 8-slide architecture carousel...');
  let rawCarousel: CarouselData | null = null;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: rawInput,
        notes: rawInput,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.slides && Array.isArray(data.slides) && data.slides.length >= 3) {
        rawCarousel = data as CarouselData;
      }
    }
  } catch (err) {
    console.warn('API generation failed, falling back to local synthesizer:', err);
  }

  // Fallback to local synthesizer if API fails or returns invalid structure
  if (!rawCarousel) {
    rawCarousel = synthesizeCarousel({ prompt: rawInput });
  }

  // Step 2: Auto-Sanitize Markdown, Hashes, Orphan Dots & BiDi order
  onProgress?.('Auto-cleaning markdown noise & BiDi character order...');
  let cleanCarousel = sanitizeFullCarousel(rawCarousel);

  // Step 3: Auto-Fit Character Limits & Polish Headlines
  onProgress?.('Enforcing Spec §8 character limits & polishing headlines...');
  const polishedSlides: SlideData[] = cleanCarousel.slides.map((slide) => {
    // Polish headline (2-5 crisp words ending in period)
    const polishedTitle = autoPolishHeadline(slide.enTitle || '');
    const fittedEnTitle = autoFitTextToLimits(polishedTitle, CHAR_LIMITS.enTitle);
    const fittedEnBody = autoFitTextToLimits(slide.enBody || '', CHAR_LIMITS.enBody);
    const fittedArTitle = autoFitTextToLimits(slide.arTitle || '', CHAR_LIMITS.arTitle);

    // Auto-fix Arabic line punctuation jump if applicable
    const fixedArabicBody = fixArabicPunctuation(slide.arBody || '');
    const fittedArBody = autoFitTextToLimits(fixedArabicBody, CHAR_LIMITS.arBody);

    return {
      ...slide,
      enTitle: fittedEnTitle,
      enBody: fittedEnBody,
      arTitle: fittedArTitle,
      arBody: fittedArBody,
    };
  });

  cleanCarousel = {
    ...cleanCarousel,
    slides: polishedSlides,
  };

  // Step 4: Auto-Generate 9:16 Architecture Diagram for Key Mechanism Slide
  if (generateDiagram && cleanCarousel.slides.length >= 3) {
    // Choose slide 2 or 3 (core technical mechanism)
    const targetIdx = Math.min(2, cleanCarousel.slides.length - 2);
    const targetSlide = cleanCarousel.slides[targetIdx];

    if (targetSlide && (!targetSlide.imageUrl || targetSlide.type !== 'image')) {
      onProgress?.('Generating native 9:16 architecture diagram with gemini-nano-banana-2.1...');
      try {
        const diagramPrompt = `Architectural system diagram for ${targetSlide.enTitle || 'distributed systems'}: ${targetSlide.enBody?.slice(0, 120) || ''}. Isometric vector blueprint, high contrast, glowing neon accents, deep carbon background.`;

        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: diagramPrompt,
            aspectRatio: '9:16',
            stylePreset: 'blueprint',
          }),
        });

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          if (imgData.imageUrl) {
            cleanCarousel.slides[targetIdx] = {
              ...targetSlide,
              type: 'image',
              imageUrl: imgData.imageUrl,
              imagePrompt: diagramPrompt,
              imageModel: imgData.model || 'gemini-nano-banana-2.1',
              imageFilter: 'hud',
              imageFit: 'contain',
              imageCaption: targetSlide.enTitle || 'System Architecture',
            };
          }
        }
      } catch (err) {
        console.warn('Autonomous image generation encountered an error (continuing with icon layout):', err);
      }
    }
  }

  // Step 5: Final Quality Verification Scan
  onProgress?.('Running final QA compliance verification...');
  const qaReport = runQAChecks(cleanCarousel);
  if (qaReport.warnCount > 0) {
    cleanCarousel = sanitizeFullCarousel(cleanCarousel);
  }

  onProgress?.('Ready!');
  return cleanCarousel;
}
