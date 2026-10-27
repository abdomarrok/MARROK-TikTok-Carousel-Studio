import { normalizePunctuation, stripMarkdown } from './markdown';

export interface HeadlineOptions {
  isHook?: boolean;
  isCta?: boolean;
  fallbackSubject?: string;
}

/**
 * Formats headline to meet Spec §8: complete, punchy thought ending in a period or question mark.
 */
export function autoPolishHeadline(title: string): string {
  if (!title) return '';
  let clean = title.trim().replace(/\s+/g, ' ');
  // If ending with punctuation, preserve; otherwise add period or question mark
  if (!/[.?!:]$/.test(clean)) {
    const isQuestion = /^(?:why|how|what|is|are|can|could|does|did|should|will|would)\b/i.test(clean);
    clean += isQuestion ? '?' : '.';
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
    const isQuestion = /^(?:why|how|what|is|are|can|could|does|did|should|will|would)\b/i.test(res);
    res += isQuestion ? '?' : '.';
  }
  return res;
}

/**
 * Enforces Spec §8 rule on English headlines:
 * - Slide 1 Hook: Punchy 2 to 8 words (<= 50 chars), ending in '.', '?', or '!'. Zero colons.
 * - CTA Slide: Up to 8 words, ending in '?', '!', or '.'. Allows question hooks.
 * - Content Slides: Up to 8 words (<= 45 chars), clean punctuation.
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
  const isQuestion =
    trimmed.endsWith('?') ||
    /^(?:why|how|what|is|are|can|could|does|did|should|will|would)\b/i.test(trimmed) ||
    (isCta && /^(?:need|how|why|what|ready|scaling)\b/i.test(trimmed));
  let endingPunc = isQuestion ? '?' : '.';
  if (trimmed.endsWith('!')) endingPunc = '!';

  // Clean markdown, symbols, and remove ALL colons (preserve compound hyphens like Zero-Trust)
  const clean = stripMarkdown(rawHeadline)
    .replace(/[:;]+/g, ' ')
    .replace(/[.?!،؟…]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    if (isCta) return 'Need a custom tool?';
    return `${fallbackSubject}, explained${endingPunc}`;
  }

  if (words.length === 1) {
    return isCta ? `${words[0]} at scale?` : `${words[0]}, explained${endingPunc}`;
  }

  const maxWords = isHook ? 8 : isCta ? 8 : 8;
  const maxChars = isHook ? 48 : isCta ? 50 : 45;

  let picked = words.slice(0, maxWords);
  while (picked.length > 2 && picked.join(' ').length > maxChars) {
    picked.pop();
  }

  return `${picked.join(' ')}${endingPunc}`;
}

/**
 * Extracts a clean technical subject noun phrase and natural Arabic equivalent
 * from raw input, stripping question openers, verbs, and punctuation.
 */
export function extractCleanSubject(rawText: string): { cleanSubject: string; arSubject: string } {
  const lower = (rawText || '').toLowerCase();

  if (/\b(?:scion|anthropic)\b/i.test(lower) && /\bgit\b/i.test(lower)) {
    return { cleanSubject: 'Anthropic Scion', arSubject: 'أنظمة Scion' };
  }
  if (/\bscion\b/i.test(lower)) {
    return { cleanSubject: 'Scion VCS', arSubject: 'منظومة Scion' };
  }
  if (/\bgit\b/i.test(lower)) {
    return { cleanSubject: 'Git Architecture', arSubject: 'معمارية Git' };
  }
  if (/\b(?:docker|container|containers)\b/i.test(lower)) {
    return { cleanSubject: 'Docker Containers', arSubject: 'حاويات Docker' };
  }
  if (/\b(?:redis|valkey)\b/i.test(lower)) {
    return { cleanSubject: 'Redis & Caching', arSubject: 'قواعد Redis' };
  }
  if (/\b(?:postgres|postgresql)\b/i.test(lower)) {
    return { cleanSubject: 'PostgreSQL', arSubject: 'قواعد PostgreSQL' };
  }
  if (/\b(?:ebpf|xdp)\b/i.test(lower)) {
    return { cleanSubject: 'eBPF Systems', arSubject: 'تقنية eBPF' };
  }
  if (/\b(?:zero[- ]?trust|zerotrust|mtls)\b/i.test(lower)) {
    return { cleanSubject: 'Zero-Trust Mesh', arSubject: 'معمارية Zero-Trust' };
  }
  if (/\b(?:k8s|kubernetes)\b/i.test(lower)) {
    return { cleanSubject: 'Kubernetes', arSubject: 'منظومة Kubernetes' };
  }
  if (/\b(?:rust|actix|axum)\b/i.test(lower)) {
    return { cleanSubject: 'Rust Runtime', arSubject: 'أنظمة Rust' };
  }
  if (/\b(?:golang?|gin)\b/i.test(lower)) {
    return { cleanSubject: 'Go Runtime', arSubject: 'محرك Go' };
  }
  if (/\b(?:llm|transformer|gpt|ai)\b/i.test(lower)) {
    return { cleanSubject: 'AI Architecture', arSubject: 'بنية نماذج الذكاء' };
  }

  // Generic fallback: clean question words and verbs
  const withoutUrls = (rawText || '').replace(/https?:\/\/\S+/gi, '').trim();
  const firstLine = withoutUrls.split('\n')[0].trim();
  const cleaned = stripMarkdown(firstLine)
    .replace(/^(?:why\s+did|why\s+does|why\s+is|how\s+did|how\s+does|how\s+to|what\s+is|what\s+are|moving\s+beyond|understanding|demystifying|a\s+look\s+at)\s+/i, '')
    .replace(/[:;]+/g, ' ')
    .replace(/[.?!،؟…]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { cleanSubject: 'System Architecture', arSubject: 'الأنظمة المعمارية' };
  }

  const subject = words.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { cleanSubject: subject, arSubject: 'الأنظمة المعمارية' };
}

/**
 * Cleans user prompt / title into a crisp English headline without markdown.
 * Strictly guarantees a complete, punchy thought ending in '.', '?', or '!'.
 */
export function extractCleanHeadline(
  rawText: string,
  fallbackDomain: string = 'SYSTEMS ARCHITECTURE'
): { headline: string; cleanTitle: string; cleanSubject: string; arSubject: string } {
  const { cleanSubject, arSubject } = extractCleanSubject(rawText);
  if (!rawText || !rawText.trim()) {
    const fallback = fallbackDomain.split('&')[0].trim();
    const h = enforceHeadlineSpecRule(fallback, { isHook: true, fallbackSubject: 'Architecture' });
    return { headline: h, cleanTitle: cleanSubject, cleanSubject, arSubject };
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
    if (parts[0] && parts[0].length >= 3 && parts[0].length <= 50) {
      subjectPart = parts[0];
    } else if (parts[1]) {
      subjectPart = parts[1];
    }
  }

  // Generate crisp hook headline preserving questions if present
  const headline = enforceHeadlineSpecRule(subjectPart, { isHook: true, fallbackSubject: 'Architecture' });
  return { headline, cleanTitle: cleanSubject, cleanSubject, arSubject };
}
