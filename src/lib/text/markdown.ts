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
