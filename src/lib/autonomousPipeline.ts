import { CarouselData, SlideData, ThemePalette } from '../types';
import { sanitizeFullCarousel } from './text/sanitizer';
import { autoFitTextToLimits, autoPolishHeadline } from './text/headlines';
import { fixArabicPunctuation } from './text/arabicBiDi';
import { runQAChecks, CHAR_LIMITS } from './qaChecks';
import {
  synthesizeCarousel,
  resolveDomainTheme,
  enrichCarouselDiagrams,
  balanceCarouselVisualPacing,
} from './synthesis';

export interface AutonomousPipelineOptions {
  onProgress?: (status: string) => void;
  theme?: ThemePalette;
  generateDiagram?: boolean;
  inputMode?: string;
  imageBase64?: string | null;
  imageMimeType?: string;
  imageName?: string;
  categoryHint?: string;
}

/**
 * Enforces Spec §8 sanitization, character limit auto-fitting,
 * headline polishing, multi-node diagram enrichment, and visual pacing.
 */
export function enrichAndPaceCarousel(
  carousel: CarouselData,
  rawInput: string = ''
): CarouselData {
  // Step 1: Auto-Sanitize Markdown, Hashes, Orphan Dots & BiDi order
  let cleanCarousel = sanitizeFullCarousel(carousel);

  // Step 2: Auto-Fit Character Limits & Polish Headlines
  const polishedSlides: SlideData[] = cleanCarousel.slides.map((slide) => {
    const polishedTitle = autoPolishHeadline(slide.enTitle || '');
    const fittedEnTitle = autoFitTextToLimits(polishedTitle, CHAR_LIMITS.enTitle);
    const fittedEnBody = autoFitTextToLimits(slide.enBody || '', CHAR_LIMITS.enBody);
    const fittedArTitle = autoFitTextToLimits(slide.arTitle || '', CHAR_LIMITS.arTitle);

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

  // Step 3: Enrich diagrams and satellites with topic-relevant specifications
  const enrichedSlides = enrichCarouselDiagrams(
    polishedSlides,
    rawInput,
    cleanCarousel.category || '',
    cleanCarousel.brand || 'MARROK'
  );
  const balancedSlides = balanceCarouselVisualPacing(enrichedSlides);

  cleanCarousel = {
    ...cleanCarousel,
    slides: balancedSlides,
  };

  // Step 4: Quality verification check
  const qaReport = runQAChecks(cleanCarousel);
  if (qaReport.warnCount > 0) {
    cleanCarousel = sanitizeFullCarousel(cleanCarousel);
  }

  return cleanCarousel;
}

/**
 * Autonomously runs the entire synthesis, sanitization, localization,
 * character limit fitting, visual pacing, and optional 9:16 diagram generation pipeline.
 * No manual knobs needed: the engine does all the work end-to-end.
 */
export async function runAutonomousPipeline(
  rawInput: string,
  options: AutonomousPipelineOptions = {}
): Promise<CarouselData> {
  const {
    onProgress,
    theme,
    generateDiagram = true,
    inputMode,
    imageBase64,
    imageMimeType,
    imageName,
    categoryHint,
  } = options;

  // Step 1: Synthesize Content & Bilingual Structure
  onProgress?.('Synthesizing 8-slide architecture carousel...');
  let rawCarousel: CarouselData | null = null;

  const customKey = typeof window !== 'undefined' ? localStorage.getItem('marrok_custom_gemini_key') : null;
  const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (customKey) {
    requestHeaders['x-gemini-key'] = customKey;
  }

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        prompt: rawInput,
        topic: rawInput,
        notes: rawInput,
        inputMode,
        imageBase64,
        imageMimeType,
        imageName,
        categoryHint,
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
    rawCarousel = synthesizeCarousel({
      prompt: rawInput,
      categoryHint,
      inputMode,
      imageFileName: imageName,
    });
  }

  // Domain-Aware Theme Routing: match input topic to best visual theme
  const domainTheme = resolveDomainTheme(rawInput);
  if (!rawCarousel.theme || rawCarousel.theme === 'default') {
    rawCarousel.theme = domainTheme;
  }

  // Step 2 & 3: Auto-Sanitize, Fit Limits, Polish Headlines, Enrich & Pace
  onProgress?.('Enforcing Spec §8 character limits, polishing headlines & pacing...');
  let cleanCarousel = enrichAndPaceCarousel(rawCarousel, rawInput);

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
          headers: requestHeaders,
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
