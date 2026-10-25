/**
 * qaChecks.ts — Pre-export Quality Assurance checks (Spec §10)
 *
 * Automated checks that block or warn before export:
 * - Slide count (8–10 per spec, 3–12 relaxed for current archetypes)
 * - Character limits on titles and bodies
 * - Arabic line-ending lint (no Latin word + punctuation at line end)
 * - Text overflow (content past safe zone y=1760)
 * - Missing credit on CTA slide for third-party sources
 * - Placeholder detection ("CHANNEL NAME", "Lorem", etc.)
 * - First-frame (Slide 1) readability
 */

import { CarouselData, SlideData } from '../types';

// ─── Character Limits (Spec §8) ────────────────────────────────────
export const CHAR_LIMITS = {
  enTitle: 45,
  arTitle: 40,
  enBody: 140,
  arBody: 150,
  iconLabel: 16,
  hookTitle: 60,  // Hook titles allowed slightly longer (2-line @ 96px)
} as const;

// ─── QA Result Types ────────────────────────────────────────────────
export type QASeverity = 'pass' | 'warn' | 'fail';

export interface QACheckResult {
  id: string;
  severity: QASeverity;
  slideIndex?: number;       // undefined = deck-level check
  field?: string;
  message: string;
  value?: string | number;   // current value for display
  limit?: string | number;   // limit for display
}

export interface QAReport {
  results: QACheckResult[];
  passCount: number;
  warnCount: number;
  failCount: number;
  canExport: boolean;        // true if no 'fail' results
}

// ─── Individual Check Functions ─────────────────────────────────────

/** Check slide count is within acceptable range */
function checkSlideCount(slides: SlideData[]): QACheckResult {
  const count = slides.length;
  if (count < 3) {
    return { id: 'slide-count', severity: 'fail', message: `Only ${count} slide(s). Minimum is 3.`, value: count, limit: '3–12' };
  }
  if (count > 12) {
    return { id: 'slide-count', severity: 'warn', message: `${count} slides is very long. Consider trimming to 8–10.`, value: count, limit: '8–10' };
  }
  if (count < 5) {
    return { id: 'slide-count', severity: 'warn', message: `${count} slides is short. Spec recommends 8–10 for full carousels.`, value: count, limit: '8–10' };
  }
  return { id: 'slide-count', severity: 'pass', message: `${count} slides — within range.`, value: count };
}

/** Check character limits on a single slide's text fields */
function checkCharLimits(slide: SlideData, idx: number, isHook: boolean): QACheckResult[] {
  const results: QACheckResult[] = [];

  const enTitleLimit = isHook ? CHAR_LIMITS.hookTitle : CHAR_LIMITS.enTitle;

  if (slide.enTitle && slide.enTitle.length > enTitleLimit) {
    results.push({
      id: `char-en-title-${idx}`,
      severity: 'warn',
      slideIndex: idx,
      field: 'enTitle',
      message: `EN title is ${slide.enTitle.length} chars (limit: ${enTitleLimit}).`,
      value: slide.enTitle.length,
      limit: enTitleLimit,
    });
  }

  if (slide.arTitle && slide.arTitle.length > CHAR_LIMITS.arTitle) {
    results.push({
      id: `char-ar-title-${idx}`,
      severity: 'warn',
      slideIndex: idx,
      field: 'arTitle',
      message: `AR title is ${slide.arTitle.length} chars (limit: ${CHAR_LIMITS.arTitle}).`,
      value: slide.arTitle.length,
      limit: CHAR_LIMITS.arTitle,
    });
  }

  if (slide.enBody && slide.enBody.length > CHAR_LIMITS.enBody) {
    results.push({
      id: `char-en-body-${idx}`,
      severity: 'warn',
      slideIndex: idx,
      field: 'enBody',
      message: `EN body is ${slide.enBody.length} chars (limit: ${CHAR_LIMITS.enBody}).`,
      value: slide.enBody.length,
      limit: CHAR_LIMITS.enBody,
    });
  }

  if (slide.arBody && slide.arBody.length > CHAR_LIMITS.arBody) {
    results.push({
      id: `char-ar-body-${idx}`,
      severity: 'warn',
      slideIndex: idx,
      field: 'arBody',
      message: `AR body is ${slide.arBody.length} chars (limit: ${CHAR_LIMITS.arBody}).`,
      value: slide.arBody.length,
      limit: CHAR_LIMITS.arBody,
    });
  }

  // Check icon labels
  if (slide.icons) {
    for (let i = 0; i < slide.icons.length; i++) {
      const label = slide.icons[i].label;
      if (label && label.length > CHAR_LIMITS.iconLabel) {
        results.push({
          id: `char-icon-label-${idx}-${i}`,
          severity: 'warn',
          slideIndex: idx,
          field: `icons[${i}].label`,
          message: `Icon label "${label}" is ${label.length} chars (limit: ${CHAR_LIMITS.iconLabel}).`,
          value: label.length,
          limit: CHAR_LIMITS.iconLabel,
        });
      }
    }
  }

  return results;
}

/**
 * Arabic line-ending and BiDi punctuation lint (Spec §8):
 * - No Arabic line should end with a Latin word followed by punctuation.
 * - No colon or punctuation should directly touch a Latin word in an Arabic string (e.g. "رحلة :Scion").
 */
function hasArabicPunctuationJump(text?: string): boolean {
  if (!text) return false;
  // Ends with Latin word + punctuation
  const badEndingPattern = /[A-Za-z0-9]+[.?!،؟:؛]\s*$/;
  // Colon touching Latin word
  const colonTouchingLatin = /:[a-zA-Z0-9]|[a-zA-Z0-9]:/;
  return text.split(/\n/).some((line) => badEndingPattern.test(line.trim()) || colonTouchingLatin.test(line.trim()));
}

function checkArabicLineEndings(slide: SlideData, idx: number): QACheckResult[] {
  const results: QACheckResult[] = [];

  const fieldsToCheck: { key: keyof SlideData; label: string }[] = [
    { key: 'arTitle', label: 'AR title' },
    { key: 'arBody', label: 'AR body' },
    { key: 'arCredit', label: 'AR credit' },
  ];

  for (const { key, label } of fieldsToCheck) {
    const text = slide[key];
    if (typeof text !== 'string' || !text) continue;

    // Check for colon touching Latin word (BiDi scrambling bug)
    if (/:[a-zA-Z0-9]|[a-zA-Z0-9]:/.test(text)) {
      results.push({
        id: `arabic-bidi-colon-${idx}-${key}`,
        severity: 'fail',
        slideIndex: idx,
        field: key,
        message: `Slide ${idx + 1} ${label}: colon touches Latin word, causing BiDi order reversal. Separate colon or remove it.`,
      });
    }

    // Check line endings
    const lines = text.split(/\n/);
    for (const line of lines) {
      if (hasArabicPunctuationJump(line)) {
        results.push({
          id: `arabic-line-end-${idx}-${key}`,
          severity: 'fail',
          slideIndex: idx,
          field: key,
          message: `Slide ${idx + 1} ${label}: ends with Latin word + punctuation ("${line.trim().slice(-20)}"). Rephrase so the line ends with an Arabic word.`,
        });
        break;
      }
    }
  }

  return results;
}

/**
 * Spec §8 Headline Rule:
 * - Slide 1 Hook: Strictly 2 to 5 words, ending in '.', '?', or '!'. Zero colons.
 * - CTA Slide: Up to 8 words, ending in '?', '!', or '.'. Allows question hooks.
 * - Content Slides: Up to 8 words, clean punctuation, no trailing colons.
 */
function checkHeadlineSpecRule(slide: SlideData, idx: number, totalSlides: number): QACheckResult[] {
  const results: QACheckResult[] = [];
  if (!slide.enTitle || typeof slide.enTitle !== 'string') return results;

  const title = slide.enTitle.trim();
  const words = title.split(/\s+/).filter(Boolean);
  const isHook = idx === 0 || slide.type === 'hub';
  const isCta = idx === totalSlides - 1 || slide.type === 'cta';

  if (isHook) {
    if (title.includes(':')) {
      results.push({
        id: `headline-colon-${idx}`,
        severity: 'fail',
        slideIndex: idx,
        field: 'enTitle',
        message: `Slide 1 hook contains a colon (':'). Hooks must not contain colons.`,
        value: title,
      });
    }

    if (!/[.?!]$/.test(title)) {
      results.push({
        id: `headline-punctuation-${idx}`,
        severity: 'fail',
        slideIndex: idx,
        field: 'enTitle',
        message: `Slide 1 hook must end with '.', '?', or '!'.`,
        value: title,
      });
    }

    if (words.length < 2 || words.length > 5) {
      results.push({
        id: `headline-length-${idx}`,
        severity: 'fail',
        slideIndex: idx,
        field: 'enTitle',
        message: `Slide 1 hook has ${words.length} words (rule is 2 to 5 words). Shorten or lengthen to 2–5 words.`,
        value: words.length,
        limit: '2–5 words',
      });
    }
  } else if (isCta) {
    if (title.includes(':')) {
      results.push({
        id: `headline-colon-${idx}`,
        severity: 'fail',
        slideIndex: idx,
        field: 'enTitle',
        message: `CTA slide title contains a colon (':'). Remove colon.`,
        value: title,
      });
    }

    if (!/[.?!]$/.test(title)) {
      results.push({
        id: `headline-punctuation-${idx}`,
        severity: 'warn',
        slideIndex: idx,
        field: 'enTitle',
        message: `CTA slide title should end with '?' or '.'.`,
        value: title,
      });
    }

    if (words.length > 8) {
      results.push({
        id: `headline-length-${idx}`,
        severity: 'fail',
        slideIndex: idx,
        field: 'enTitle',
        message: `CTA slide headline has ${words.length} words (limit is 8 words). Shorten to 8 words or less.`,
        value: words.length,
        limit: '≤ 8 words',
      });
    }
  } else {
    // Content slide titles: up to 8 words
    if (title.endsWith(':') || /::/.test(title)) {
      results.push({
        id: `headline-colon-${idx}`,
        severity: 'fail',
        slideIndex: idx,
        field: 'enTitle',
        message: `Slide ${idx + 1} title ends with a colon. Remove trailing colon.`,
        value: title,
      });
    }

    if (words.length > 8) {
      results.push({
        id: `headline-length-${idx}`,
        severity: 'fail',
        slideIndex: idx,
        field: 'enTitle',
        message: `Slide ${idx + 1} title has ${words.length} words (spec allows up to 8 words). Shorten to 8 words or less.`,
        value: words.length,
        limit: '≤ 8 words',
      });
    }
  }

  return results;
}

// ─── Known Boilerplate & Template Patterns ─────────────────────────
const KNOWN_BOILERPLATE_PATTERNS: { pattern: RegExp; description: string }[] = [
  {
    pattern: /A breakdown of technical mechanisms/i,
    description: 'Generic fallback template summary ("A breakdown of technical mechanisms...")',
  },
  {
    pattern: /النقلة المعمارية لمنظومة/i,
    description: 'Generic template Arabic title ("النقلة المعمارية لمنظومة...")',
  },
  {
    pattern: /When system frequency increases, legacy architectures become memory bottlenecks/i,
    description: 'Generic fallback body ("When system frequency increases...")',
  },
  {
    pattern: /A breakdown of technical mechanisms, benchmarks, and production architecture/i,
    description: 'Boilerplate body text',
  },
];

/** Check that slide does not contain unedited generic boilerplate phrases */
function checkBoilerplatePhrases(slide: SlideData, idx: number): QACheckResult[] {
  const results: QACheckResult[] = [];
  const fieldsToCheck: (keyof SlideData)[] = ['enTitle', 'arTitle', 'enBody', 'arBody', 'ctaText'];

  for (const field of fieldsToCheck) {
    const val = slide[field];
    if (typeof val !== 'string' || !val) continue;

    for (const { pattern, description } of KNOWN_BOILERPLATE_PATTERNS) {
      if (pattern.test(val)) {
        results.push({
          id: `boilerplate-${idx}-${field}`,
          severity: 'fail',
          slideIndex: idx,
          field,
          message: `Slide ${idx + 1} ${field} contains known template boilerplate: ${description}. Replace with authentic content.`,
          value: val.substring(0, 50),
        });
        break;
      }
    }
  }

  return results;
}

/** Check that no two slides share identical body copy */
function checkDuplicateBodyText(slides: SlideData[]): QACheckResult[] {
  const results: QACheckResult[] = [];
  const seenEn = new Map<string, number>();
  const seenAr = new Map<string, number>();

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    // Normalize English body
    const en = (slide.enBody || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (en.length > 20) {
      if (seenEn.has(en)) {
        const prevIdx = seenEn.get(en)!;
        results.push({
          id: `duplicate-en-body-${i}`,
          severity: 'fail',
          slideIndex: i,
          field: 'enBody',
          message: `Slide ${i + 1} English body is identical to Slide ${prevIdx + 1}. Each slide must have unique copy.`,
          value: slide.enBody?.substring(0, 60),
        });
      } else {
        seenEn.set(en, i);
      }
    }

    // Normalize Arabic body
    const ar = (slide.arBody || '')
      .replace(/[^\u0600-\u06FF\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (ar.length > 20) {
      if (seenAr.has(ar)) {
        const prevIdx = seenAr.get(ar)!;
        results.push({
          id: `duplicate-ar-body-${i}`,
          severity: 'fail',
          slideIndex: i,
          field: 'arBody',
          message: `Slide ${i + 1} Arabic body is identical to Slide ${prevIdx + 1}. Each slide must have unique copy.`,
          value: slide.arBody?.substring(0, 60),
        });
      } else {
        seenAr.set(ar, i);
      }
    }
  }

  return results;
}

/** Check that CTA slide has credit lines when applicable */
function checkCreditPresence(slides: SlideData[]): QACheckResult[] {
  const results: QACheckResult[] = [];
  const ctaSlides = slides.filter((s) => s.type === 'cta');

  for (const cta of ctaSlides) {
    const idx = slides.indexOf(cta);
    if (!cta.enCredit && !cta.arCredit) {
      results.push({
        id: `missing-credit-${idx}`,
        severity: 'warn',
        slideIndex: idx,
        field: 'enCredit',
        message: `CTA slide ${idx + 1} has no source attribution. Add credit lines for third-party content.`,
      });
    }
  }

  return results;
}

/** Check for leftover placeholder text */
function checkPlaceholders(slide: SlideData, idx: number): QACheckResult[] {
  const results: QACheckResult[] = [];
  const placeholderPatterns = [
    /CHANNEL NAME/i,
    /YOUR (?:BRAND|NAME|COMPANY)/i,
    /Lorem ipsum/i,
    /TODO/i,
    /PLACEHOLDER/i,
    /\[INSERT/i,
    /XXX/,
  ];

  const textFields: (keyof SlideData)[] = ['enTitle', 'arTitle', 'enBody', 'arBody', 'enCredit', 'arCredit', 'ctaText'];

  for (const field of textFields) {
    const text = slide[field];
    if (typeof text !== 'string') continue;

    for (const pattern of placeholderPatterns) {
      if (pattern.test(text)) {
        results.push({
          id: `placeholder-${idx}-${field}`,
          severity: 'fail',
          slideIndex: idx,
          field,
          message: `Slide ${idx + 1} ${field} contains placeholder text: "${text.substring(0, 40)}..."`,
        });
        break;
      }
    }
  }

  return results;
}

/** Check first slide (hook/hub) has meaningful content for thumbnail readability */
function checkFirstFrame(slides: SlideData[]): QACheckResult[] {
  const results: QACheckResult[] = [];
  if (slides.length === 0) return results;

  const first = slides[0];
  if (first.type !== 'hub' && first.type !== 'row') {
    results.push({
      id: 'first-frame-type',
      severity: 'warn',
      slideIndex: 0,
      message: `Slide 1 type is "${first.type}" — should be "hub" (hook slide) for best thumbnail impact.`,
    });
  }

  if (!first.enTitle || first.enTitle.length < 3) {
    results.push({
      id: 'first-frame-title',
      severity: 'fail',
      slideIndex: 0,
      field: 'enTitle',
      message: 'Slide 1 has no English headline. The cover must be readable at thumbnail size.',
    });
  }

  return results;
}

/** Check that the last slide is a CTA */
function checkLastSlideCta(slides: SlideData[]): QACheckResult {
  if (slides.length === 0) {
    return { id: 'last-slide-cta', severity: 'fail', message: 'No slides in deck.' };
  }
  const last = slides[slides.length - 1];
  if (last.type !== 'cta') {
    return {
      id: 'last-slide-cta',
      severity: 'warn',
      slideIndex: slides.length - 1,
      message: `Last slide type is "${last.type}" — should be "cta" for engagement.`,
    };
  }
  return { id: 'last-slide-cta', severity: 'pass', message: 'Last slide is CTA.' };
}

/** Check for raw markdown syntax in slide fields */
function checkMarkdownAndPunctuation(slide: SlideData, idx: number): QACheckResult[] {
  const results: QACheckResult[] = [];
  const textFields: (keyof SlideData)[] = ['enTitle', 'arTitle', 'enBody', 'arBody'];

  for (const field of textFields) {
    const text = slide[field];
    if (typeof text !== 'string' || !text) continue;

    if (/(?:^|\s)#+(?=\s|[a-zA-Z0-9\u0600-\u06FF])/.test(text)) {
      results.push({
        id: `raw-markdown-hash-${idx}-${field}`,
        severity: 'warn',
        slideIndex: idx,
        field,
        message: `Slide ${idx + 1} ${field} has raw markdown '#' symbols. Remove '#' for clean canvas typography.`,
      });
    }

    if (/\s+\./.test(text) || /\.{2,}/.test(text) || /\.:/.test(text)) {
      results.push({
        id: `broken-punctuation-${idx}-${field}`,
        severity: 'warn',
        slideIndex: idx,
        field,
        message: `Slide ${idx + 1} ${field} has broken punctuation (e.g. ' .', '..', or '.:'). Clean up punctuation.`,
      });
    }
  }

  return results;
}

/**
 * Validate archetype-specific fields (codeLanguage, diff prefixes, metric diff polarity, compare titles, cta)
 */
function checkArchetypeFields(slide: SlideData, idx: number): QACheckResult[] {
  const results: QACheckResult[] = [];

  if (slide.type === 'code') {
    if (!slide.codeSnippet || slide.codeSnippet.trim().length === 0) {
      results.push({
        id: `archetype-code-missing-snippet-${idx}`,
        severity: 'fail',
        slideIndex: idx,
        field: 'codeSnippet',
        message: `Slide ${idx + 1} (code archetype) is missing a codeSnippet.`,
      });
    } else {
      const lines = slide.codeSnippet.split('\n');
      if (lines.length > 7) {
        results.push({
          id: `archetype-code-lines-${idx}`,
          severity: 'warn',
          slideIndex: idx,
          field: 'codeSnippet',
          message: `Slide ${idx + 1} code snippet has ${lines.length} lines (recommended: max 7 for canvas window).`,
          value: lines.length,
          limit: '≤ 7 lines',
        });
      }

      // Check for terminal diff highlighting prefixes ($, +, -, ✔, >, #)
      const hasDiffPrefixes = lines.some((l) => /^[+$>\-✔#]/.test(l.trim()));
      if (!hasDiffPrefixes) {
        results.push({
          id: `archetype-code-prefixes-${idx}`,
          severity: 'warn',
          slideIndex: idx,
          field: 'codeSnippet',
          message: `Slide ${idx + 1} code lines lack diff prefixes ($, +, -, ✔) for terminal syntax highlighting.`,
        });
      }
    }

    if (!slide.codeLanguage || slide.codeLanguage.trim().length === 0) {
      results.push({
        id: `archetype-code-language-${idx}`,
        severity: 'warn',
        slideIndex: idx,
        field: 'codeLanguage',
        message: `Slide ${idx + 1} (code archetype) has no codeLanguage badge specified (e.g. BASH, TS, RUST, YAML).`,
      });
    }
  } else if (slide.type === 'metric') {
    if (!slide.metricValue || slide.metricValue.trim().length === 0) {
      results.push({
        id: `archetype-metric-missing-value-${idx}`,
        severity: 'fail',
        slideIndex: idx,
        field: 'metricValue',
        message: `Slide ${idx + 1} (metric archetype) has no metricValue.`,
      });
    }

    if (!slide.metricDiff || slide.metricDiff.trim().length === 0) {
      results.push({
        id: `archetype-metric-missing-diff-${idx}`,
        severity: 'warn',
        slideIndex: idx,
        field: 'metricDiff',
        message: `Slide ${idx + 1} (metric archetype) is missing a metricDiff comparison badge.`,
      });
    } else {
      // Confirm polarity indicator exists (▲, ▼, +, -)
      const hasPolarity = /[▲▼+\-]/.test(slide.metricDiff);
      if (!hasPolarity) {
        results.push({
          id: `archetype-metric-polarity-${idx}`,
          severity: 'warn',
          slideIndex: idx,
          field: 'metricDiff',
          message: `Slide ${idx + 1} metricDiff ("${slide.metricDiff}") lacks a polarity indicator (▲ or ▼).`,
        });
      }
    }
  } else if (slide.type === 'compare') {
    if (!slide.compareLeftTitle || !slide.compareRightTitle) {
      results.push({
        id: `archetype-compare-titles-${idx}`,
        severity: 'warn',
        slideIndex: idx,
        field: 'compareLeftTitle',
        message: `Slide ${idx + 1} (compare archetype) is missing left or right comparison column titles.`,
      });
    }
  } else if (slide.type === 'cta') {
    if (!slide.ctaText || slide.ctaText.trim().length === 0) {
      results.push({
        id: `archetype-cta-missing-text-${idx}`,
        severity: 'warn',
        slideIndex: idx,
        field: 'ctaText',
        message: `Slide ${idx + 1} (CTA archetype) has no action button text.`,
      });
    }
  }

  return results;
}

/**
 * Check Arabic RTL text safe-zone bounds (right margin clearance >= 135px and vertical boundary y <= 1760)
 */
function checkArabicSafeZone(slide: SlideData, idx: number): QACheckResult[] {
  const results: QACheckResult[] = [];

  if (slide.arBody) {
    const lines = slide.arBody.split('\n');
    if (lines.length > 4) {
      results.push({
        id: `arabic-safezone-lines-${idx}`,
        severity: 'warn',
        slideIndex: idx,
        field: 'arBody',
        message: `Slide ${idx + 1} Arabic body has ${lines.length} lines (max 4 recommended to avoid clipping past y=1760 safe zone).`,
        value: lines.length,
        limit: '≤ 4 lines',
      });
    }

    // Check for overly long unbroken words/tokens in Arabic body that could clip on the right
    const words = slide.arBody.split(/\s+/);
    for (const w of words) {
      if (w.length > 35) {
        results.push({
          id: `arabic-safezone-word-length-${idx}`,
          severity: 'warn',
          slideIndex: idx,
          field: 'arBody',
          message: `Slide ${idx + 1} Arabic body contains an unbroken string of ${w.length} chars ("${w.slice(0, 15)}..."), which may overflow the right safe-zone margin.`,
        });
        break;
      }
    }
  }

  return results;
}

// ─── Main QA Runner ─────────────────────────────────────────────────

/**
 * Run all QA checks on a carousel deck. Returns a full report.
 */
export function runQAChecks(carousel: CarouselData): QAReport {
  const results: QACheckResult[] = [];
  const { slides } = carousel;

  // Deck-level checks
  results.push(checkSlideCount(slides));
  results.push(checkLastSlideCta(slides));
  results.push(...checkCreditPresence(slides));
  results.push(...checkFirstFrame(slides));
  results.push(...checkDuplicateBodyText(slides));

  // Check if deck is an offline fallback draft
  if (carousel.sourceMeta?.isFallback && !carousel.sourceMeta?.userReviewed) {
    results.push({
      id: 'fallback-draft-blocker',
      severity: 'fail',
      message: 'Unverified offline draft detected. Review slide copy and click "I reviewed this" before export.',
      field: 'sourceMeta.userReviewed',
    });
  }

  // Per-slide checks
  for (let i = 0; i < slides.length; i++) {
    const isHook = i === 0 && (slides[i].type === 'hub');
    results.push(...checkHeadlineSpecRule(slides[i], i, slides.length));
    results.push(...checkBoilerplatePhrases(slides[i], i));
    results.push(...checkCharLimits(slides[i], i, isHook));
    results.push(...checkArabicLineEndings(slides[i], i));
    results.push(...checkArabicSafeZone(slides[i], i));
    results.push(...checkArchetypeFields(slides[i], i));
    results.push(...checkMarkdownAndPunctuation(slides[i], i));
    results.push(...checkPlaceholders(slides[i], i));
  }

  const passCount = results.filter((r) => r.severity === 'pass').length;
  const warnCount = results.filter((r) => r.severity === 'warn').length;
  const failCount = results.filter((r) => r.severity === 'fail').length;

  return {
    results,
    passCount,
    warnCount,
    failCount,
    canExport: failCount === 0,
  };
}

/**
 * Quick summary string for toast display
 */
export function qaReportSummary(report: QAReport): string {
  if (report.failCount > 0) {
    return `QA: ${report.failCount} issue(s) must be fixed before export.`;
  }
  if (report.warnCount > 0) {
    return `QA passed with ${report.warnCount} warning(s).`;
  }
  return `QA: All ${report.passCount} checks passed.`;
}
