import { normalizePunctuation, stripMarkdown } from './markdown';

export interface HeadlineOptions {
  isHook?: boolean;
  isCta?: boolean;
  fallbackSubject?: string;
}

/**
 * Formats headline to meet Spec §8: complete 2 to 5 word thought ending in a period or question mark.
 */
export function autoPolishHeadline(title: string): string {
  if (!title) return '';
  let clean = title.trim().replace(/\s+/g, ' ');
  // If ending with punctuation, preserve; otherwise add period
  if (!/[.?!:]$/.test(clean)) {
    clean += '.';
  }
  return clean;
}

/**
 * Trims text to fit within character limits without breaking words.
 */
export function autoFitTextToLimits(text: string, limit: number): string {
  if (!text || text.length <= limit) return text;
  const words = text.trim().split(/\s+/);
  let res = '';
  for (const w of words) {
    if ((res + ' ' + w).trim().length > limit - 1) break;
    res = (res + ' ' + w).trim();
  }
  if (!/[.?!]$/.test(res)) {
    res += '.';
  }
  return res;
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
  const clean = stripMarkdown(rawHeadline)
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
