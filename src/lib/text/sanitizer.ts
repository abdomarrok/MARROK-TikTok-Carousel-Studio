import type { CarouselData, SlideData } from '../../types.ts';
import { normalizePunctuation, stripMarkdown } from './markdown.ts';
import { sanitizeArabicSlideText } from './arabicBiDi.ts';
import { enforceHeadlineSpecRule } from './headlines.ts';

/**
 * Sanitizes English slide text to ensure clean typography, no markdown,
 * and proper sentence endings without orphan dots.
 */
export function sanitizeEnglishSlideText(
  text: string,
  options: { isTitle?: boolean } = {}
): string {
  if (!text) return '';

  let clean = stripMarkdown(text);
  clean = normalizePunctuation(clean);

  // Strip stray leading colons, dashes
  clean = clean.replace(/^[:\-\s]+/, '').trim();

  // Remove trailing period preceded by space e.g. "Speedup ." -> "Speedup."
  clean = clean.replace(/\s+\.$/, '.');

  if (options.isTitle) {
    // Slide titles: allow clean period or question mark, but avoid double colons
    clean = clean.replace(/[:.]\s*:\s*/g, ': ');
  }

  return clean;
}

/**
 * Deeply sanitizes a single slide to guarantee crisp, defect-free rendering on canvas and UI.
 */
export function sanitizeSlide(
  slide: SlideData,
  slideIndex: number = 0,
  totalSlides: number = 8
): SlideData {
  const safeType =
    slide.type || (slideIndex === 0 ? 'hub' : totalSlides > 1 && slideIndex === totalSlides - 1 ? 'cta' : 'row');
  const isHook = slideIndex === 0 && safeType === 'hub';
  const isCta = (totalSlides > 1 && slideIndex === totalSlides - 1) || safeType === 'cta';

  return {
    ...slide,
    type: safeType,
    enTitle: slide.enTitle
      ? enforceHeadlineSpecRule(slide.enTitle, { isHook, isCta })
      : slide.enTitle,
    arTitle: slide.arTitle
      ? sanitizeArabicSlideText(slide.arTitle, { isTitle: true })
      : slide.arTitle,
    enBody: slide.enBody
      ? sanitizeEnglishSlideText(slide.enBody, { isTitle: false })
      : slide.enBody,
    arBody: slide.arBody
      ? sanitizeArabicSlideText(slide.arBody, { isTitle: false })
      : slide.arBody,
    metricValue: slide.metricValue
      ? normalizePunctuation(stripMarkdown(slide.metricValue))
      : slide.metricValue,
    metricLabel: slide.metricLabel
      ? stripMarkdown(slide.metricLabel).toUpperCase()
      : slide.metricLabel,
    metricDiff: slide.metricDiff
      ? normalizePunctuation(stripMarkdown(slide.metricDiff))
      : slide.metricDiff,
    compareLeftTitle: slide.compareLeftTitle
      ? stripMarkdown(slide.compareLeftTitle)
      : slide.compareLeftTitle,
    compareRightTitle: slide.compareRightTitle
      ? stripMarkdown(slide.compareRightTitle)
      : slide.compareRightTitle,
    ctaText: slide.ctaText
      ? stripMarkdown(slide.ctaText)
      : slide.ctaText,
    satLabels: slide.satLabels
      ? slide.satLabels.map((l) => stripMarkdown(l))
      : slide.satLabels,
    diagramVariant: slide.diagramVariant,
    diagramNodes: slide.diagramNodes
      ? slide.diagramNodes.map((n) => ({
          ...n,
          label: stripMarkdown(n.label || ''),
          sublabel: n.sublabel ? stripMarkdown(n.sublabel) : undefined,
          status: n.status ? stripMarkdown(n.status).toUpperCase() : undefined,
        }))
      : slide.diagramNodes,
    diagramEdges: slide.diagramEdges
      ? slide.diagramEdges.map((e) => stripMarkdown(e))
      : slide.diagramEdges,
    diagramFooter: slide.diagramFooter
      ? stripMarkdown(slide.diagramFooter)
      : slide.diagramFooter,
  };
}

/**
 * Cleans the full caption text to eliminate markdown headings, duplicate prefixes,
 * double punctuation, and strips non-breaking spaces (\u00A0).
 */
export function sanitizeCaption(caption: string): string {
  if (!caption) return '';

  return caption
    .replace(/\u00A0/g, ' ')
    .split('\n')
    .map((line) => {
      // Don't strip hashtags from the hashtags line at the bottom
      if (line.trim().startsWith('#') && line.includes(' #')) {
        return line.trim();
      }
      // Strip markdown header hashes inside caption text
      let cleaned = line.replace(/^#+\s*/, '').trim();
      cleaned = normalizePunctuation(cleaned);
      return cleaned;
    })
    .join('\n')
    // Remove triple or more empty newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Comprehensive sanitize function for full CarouselData before rendering or saving.
 */
export function sanitizeFullCarousel(carousel: CarouselData): CarouselData {
  const slideCount = carousel.slides?.length || 8;
  const rawBrand = carousel.brand || 'MARROK';
  const cleanBrand = stripMarkdown(rawBrand).replace(/^ARROK$/i, 'MARROK') || 'MARROK';

  return {
    ...carousel,
    category: stripMarkdown(carousel.category || '').toUpperCase(),
    brand: cleanBrand,
    caption: sanitizeCaption(carousel.caption || ''),
    shortCaption: carousel.shortCaption ? sanitizeCaption(carousel.shortCaption) : undefined,
    firstComment: carousel.firstComment ? sanitizeCaption(carousel.firstComment) : undefined,
    screenHook: carousel.screenHook
      ? sanitizeEnglishSlideText(carousel.screenHook, { isTitle: true }).replace(/[.?!]$/, '')
      : undefined,
    slides: (carousel.slides || []).map((s, idx) => sanitizeSlide(s, idx, slideCount)),
    hookVariants: (carousel.hookVariants || []).map((h) => ({
      ...h,
      enTitle: sanitizeEnglishSlideText(h.enTitle, { isTitle: true }),
      arTitle: sanitizeArabicSlideText(h.arTitle, { isTitle: true }),
      enBody: sanitizeEnglishSlideText(h.enBody, { isTitle: false }),
      arBody: sanitizeArabicSlideText(h.arBody, { isTitle: false }),
    })),
  };
}
