import { normalizePunctuation, stripMarkdown } from './markdown';

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
 * Fixes Arabic line ending punctuation jump bug (Spec §8).
 * Ensures the line ends with an Arabic word or properly orders punctuation.
 */
export function fixArabicPunctuation(arabicText: string): string {
  if (!arabicText) return '';
  let text = arabicText.trim();

  // Pattern: Latin token followed by dot/punctuation at the end of the line
  const regex = /([a-zA-Z0-9_-]+)\s*([.?!])$/;
  if (regex.test(text)) {
    // Rephrase to end with an Arabic word like "المعتمد."
    text = text.replace(regex, '$1 المعتمد$2');
  }

  return text;
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

  // Translate math inequalities and constraints into natural Arabic words
  // Eliminates severe BiDi glyph flipping like "('150 >" from "< $150" across line wraps
  clean = clean
    .replace(/<=\s*([\$€£]?\s*\d+(?:\.\d+)?)/g, 'بحد أقصى $1')
    .replace(/>=\s*([\$€£]?\s*\d+(?:\.\d+)?)/g, 'بحد أدنى $1')
    .replace(/<\s*([\$€£]?\s*\d+(?:\.\d+)?)/g, 'أقل من $1')
    .replace(/>\s*([\$€£]?\s*\d+(?:\.\d+)?)/g, 'أكثر من $1')
    .replace(/\(\s*['"]?([^\)]*?)(أقل من|أكثر من|بحد أقصى|بحد أدنى)([^)]*?)['"]?\s*\)/g, '($1$2$3)');


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
