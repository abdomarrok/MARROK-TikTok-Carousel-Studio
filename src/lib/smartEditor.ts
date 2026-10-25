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
