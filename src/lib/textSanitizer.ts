import { CarouselData, SlideData } from '../types';

/**
 * Normalizes and strips raw markdown symbols (#, ##, *, _, `, etc.)
 * from slide headlines, titles, and body copies.
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    // Remove markdown heading hashes at beginning of lines or anywhere in title
    .replace(/^#+\s*/gm, '')
    .replace(/(?:^|\s)#+(?=\s|[a-zA-Z0-9\u0600-\u06FF])/g, ' ')
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove list markers
    .replace(/^[\s*•\-]+(?=[a-zA-Z0-9\u0600-\u06FF])/gm, '')
    .trim();
}

/**
 * Fixes broken punctuation patterns such as:
 * - Stray space before dots: "Speedup ." -> "Speedup."
 * - Double dots: "Speedup.." -> "Speedup."
 * - Period before colon: "Speedup.:" -> "Speedup:"
 * - Double colons: "::" -> ":"
 * - Leading stray colons: ":Deepseek" -> "Deepseek"
 */
export function normalizePunctuation(text: string): string {
  if (!text) return '';
  return text
    // Replace multiple spaces with single space
    .replace(/[ \t]+/g, ' ')
    // Fix space before period, comma, colon, semicolon, question mark
    .replace(/\s+([.,:;?!،؟])/g, '$1')
    // Fix double punctuation
    .replace(/\.{2,}/g, '.')
    .replace(/:{2,}/g, ':')
    .replace(/\.,|,\./g, '.')
    .replace(/\.:/g, ':')
    .replace(/:\./g, ':')
    // Strip orphan punctuation at start of text or lines
    .replace(/^[:;.,،؟\-—]\s*/gm, '')
    // Strip orphan dots at end of line preceded by spaces
    .replace(/\s+\.$/gm, '')
    .trim();
}

/**
 * Standard technical metrics translator for natural Arabic presentation.
 * Converts trailing Latin unit tokens that cause BiDi punctuation inversion (e.g. "510 GB.")
 * into safe, natural Arabic words or un-flippable token structures.
 */
export function sanitizeMetricForArabic(rawMetric: string): string {
  if (!rawMetric) return '';
  const clean = normalizePunctuation(stripMarkdown(rawMetric)).trim();

  // Handle standard storage/memory units
  if (/\b(\d+(?:\.\d+)?)\s*GB\b/i.test(clean)) {
    return clean.replace(/\b(\d+(?:\.\d+)?)\s*GB\b/gi, '$1 جيجابايت');
  }
  if (/\b(\d+(?:\.\d+)?)\s*TB\b/i.test(clean)) {
    return clean.replace(/\b(\d+(?:\.\d+)?)\s*TB\b/gi, '$1 تيرابايت');
  }
  if (/\b(\d+(?:\.\d+)?)\s*MB\b/i.test(clean)) {
    return clean.replace(/\b(\d+(?:\.\d+)?)\s*MB\b/gi, '$1 ميجابايت');
  }

  // Handle speed / latency units
  if (/\b(\d+(?:\.\d+)?)\s*ms\b/i.test(clean)) {
    return clean.replace(/\b(\d+(?:\.\d+)?)\s*ms\b/gi, '$1 مللي ثانية');
  }
  if (/\b(\d+(?:\.\d+)?)\s*s\b/i.test(clean)) {
    return clean.replace(/\b(\d+(?:\.\d+)?)\s*s\b/gi, '$1 ثواني');
  }
  if (/\b(\d+(?:\.\d+)?)\s*μs\b/i.test(clean)) {
    return clean.replace(/\b(\d+(?:\.\d+)?)\s*μs\b/gi, '$1 ميكروثانية');
  }

  // Handle multipliers: 10x -> 10 أضعاف or 10x
  if (/\b(\d+(?:\.\d+)?)\s*x\b/i.test(clean)) {
    return clean.replace(/\b(\d+(?:\.\d+)?)\s*x\b/gi, '$1 ضعفاً');
  }

  // Strip trailing periods so BiDi won't invert
  return clean.replace(/[.?!]$/, '');
}

/**
 * Cleans user prompt / title into a crisp English headline without markdown.
 */
/**
 * Enforces Spec §8 rule on English headlines:
 * Must be strictly 2 to 5 words ending in a period ('.').
 * Zero colons, dashes, or ellipses.
 */
export interface HeadlineOptions {
  isHook?: boolean;
  isCta?: boolean;
  fallbackSubject?: string;
}

/**
 * Enforces Spec §8 rule on English headlines:
 * - Slide 1 Hook: Strictly 2 to 5 words, ending in '.', '?', or '!'. Zero colons.
 * - CTA Slide: Up to 8 words, ending in '?', '!', or '.'. Allows question hooks.
 * - Content Slides: Up to 8 words, clean punctuation.
 */
export function enforceHeadlineSpecRule(
  rawHeadline: string,
  options: HeadlineOptions | string = {}
): string {
  const opts: HeadlineOptions = typeof options === 'string' ? { fallbackSubject: options } : options;
  const { isHook = false, isCta = false, fallbackSubject = 'System' } = opts;

  if (!rawHeadline || !rawHeadline.trim()) {
    if (isCta) return 'Need a custom tool?';
    return `${fallbackSubject}, explained.`;
  }

  const trimmed = rawHeadline.trim();
  let endingPunc = '.';
  if (trimmed.endsWith('?')) endingPunc = '?';
  else if (trimmed.endsWith('!')) endingPunc = '!';
  else if (isCta && /^(?:need|how|why|what|ready|scaling)\b/i.test(trimmed)) endingPunc = '?';

  // Clean markdown, symbols, and remove ALL colons (preserve compound hyphens like Zero-Trust)
  let clean = stripMarkdown(rawHeadline)
    .replace(/[:;]+/g, ' ')
    .replace(/[.?!،؟…]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);

  if (isHook) {
    let pickedWords: string[] = [];
    if (words.length >= 2 && words.length <= 5) {
      pickedWords = words;
    } else if (words.length > 5) {
      pickedWords = words.slice(0, 5);
    } else if (words.length === 1) {
      pickedWords = [words[0], 'explained'];
    } else {
      pickedWords = [fallbackSubject, 'overview'];
    }
    return `${pickedWords.join(' ')}${endingPunc}`;
  }

  if (isCta) {
    const pickedWords = words.length > 8 ? words.slice(0, 8) : words;
    return `${pickedWords.join(' ')}${endingPunc}`;
  }

  // Content slides: allow up to 8 words
  const pickedWords = words.length > 8 ? words.slice(0, 8) : words;
  return `${pickedWords.join(' ')}${endingPunc}`;
}

/**
 * Cleans user prompt / title into a crisp English headline without markdown.
 * Strictly guarantees 2 to 5 words ending in '.', '?', or '!'.
 */
export function extractCleanHeadline(
  rawText: string,
  fallbackDomain: string = 'SYSTEMS ARCHITECTURE'
): { headline: string; cleanTitle: string } {
  if (!rawText || !rawText.trim()) {
    const fallback = fallbackDomain.split('&')[0].trim();
    const h = enforceHeadlineSpecRule(fallback, { isHook: true, fallbackSubject: 'Architecture' });
    return { headline: h, cleanTitle: h };
  }

  // Strip initial URLs
  const withoutUrls = rawText.replace(/https?:\/\/\S+/gi, '').trim();
  const firstLine = withoutUrls.split('\n')[0].trim();

  let sanitized = stripMarkdown(firstLine);
  sanitized = normalizePunctuation(sanitized);

  // If a colon is present (e.g. "Scion: Moving Beyond Git"), extract the core subject
  let subjectPart = sanitized;
  if (sanitized.includes(':')) {
    const parts = sanitized.split(':').map((p) => p.trim()).filter(Boolean);
    if (parts[0] && parts[0].length >= 3 && parts[0].length <= 40) {
      subjectPart = parts[0];
    } else if (parts[1]) {
      subjectPart = parts[1];
    }
  }

  // Generate crisp 2-5 word hook headline preserving questions if present
  const headline = enforceHeadlineSpecRule(subjectPart, { isHook: true, fallbackSubject: 'Architecture' });
  return { headline, cleanTitle: headline };
}

/**
 * Sanitizes Arabic slide titles and body text to prevent BiDi reordering bugs (Spec §8).
 * - Strips raw English markdown headers accidentally prepended (like ":Deepseek 4.1 Flash 1017 #")
 * - Fixes colons touching Latin words (e.g. "رحلة :Scion" -> "رحلة Scion")
 * - Replaces trailing Latin words before periods that cause ".GB" or ".Git" flips
 * - Strips trailing periods from Arabic slide titles (slide graphic titles never need periods)
 */
export function sanitizeArabicSlideText(
  text: string,
  options: { isTitle?: boolean } = {}
): string {
  if (!text) return '';

  let clean = stripMarkdown(text);
  clean = normalizePunctuation(clean);

  // Remove rogue Latin title copy-pastes at the start of Arabic strings
  // E.g. ":Deepseek 4.1 Flash 1017 # قفزة في الأداء" -> "قفزة في الأداء"
  clean = clean.replace(/^[\s:#\-_]*[a-zA-Z0-9.\-_ ]+[:#\-_]+\s*(?=[\u0600-\u06FF])/g, '');

  // Strip leading colons, hashes, dashes
  clean = clean.replace(/^[:#\-_،؛\s]+/, '').trim();

  // Fix colons adjacent to Latin characters which causes BiDi character order scrambling
  // E.g. ":Anthropic" -> " Anthropic", "Scion:" -> "Scion "
  clean = clean.replace(/:\s*([a-zA-Z0-9])/g, ' $1').replace(/([a-zA-Z0-9])\s*:/g, '$1 ');

  // Prevent trailing Latin unit with period inversion (e.g. "510 GB." or "510 .GB" -> "510 جيجابايت")
  clean = clean
    .replace(/\b(\d+(?:\.\d+)?)\s*\.?GB\.?/gi, '$1 جيجابايت')
    .replace(/\b(\d+(?:\.\d+)?)\s*\.?TB\.?/gi, '$1 تيرابايت')
    .replace(/\b(\d+(?:\.\d+)?)\s*\.?MB\.?/gi, '$1 ميجابايت')
    .replace(/\b(\d+(?:\.\d+)?)\s*\.?ms\.?/gi, '$1 مللي ثانية');

  // Fix orphan Latin words on their own line (prevents "Zero-Trust" hanging alone on line 2)
  const lines = clean.split('\n');
  if (lines.length > 1) {
    const fixedLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // If line is just a single Latin token, merge with previous line
      if (line && /^[a-zA-Z0-9\-_.]+$/.test(line) && fixedLines.length > 0) {
        fixedLines[fixedLines.length - 1] = `${fixedLines[fixedLines.length - 1]} ${line}`;
      } else {
        fixedLines.push(line);
      }
    }
    clean = fixedLines.join('\n');
  }

  // If title, never end with a period or colon (prevents BiDi flipping on line end)
  if (options.isTitle) {
    clean = clean.replace(/[.:;،؛\s]+$/, '').trim();
  } else {
    // If body ends with a Latin token followed by punctuation (Spec §8: .Git bug)
    const latinEndingRegex = /([a-zA-Z0-9_\-]+)\s*([.?!،؟])$/;
    if (latinEndingRegex.test(clean)) {
      clean = clean.replace(latinEndingRegex, '$1 المعتمد$2');
    }
  }

  return clean;
}

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
  const isHook = slideIndex === 0 || slide.type === 'hub';
  const isCta = slideIndex === totalSlides - 1 || slide.type === 'cta';

  return {
    ...slide,
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
  return {
    ...carousel,
    category: stripMarkdown(carousel.category || '').toUpperCase(),
    brand: stripMarkdown(carousel.brand || 'MARROK'),
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
