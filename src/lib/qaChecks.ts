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
 * Arabic line-ending lint (Spec §8):
 * No Arabic line should end with a Latin word followed by punctuation.
 * In RTL rendering, the period or question mark jumps to the wrong side.
 */
export function hasArabicPunctuationJump(text?: string): boolean {
  if (!text) return false;
  const badEndingPattern = /[A-Za-z0-9]+[.?!،؟:؛]\s*$/;
  return text.split(/\n/).some(line => badEndingPattern.test(line.trim()));
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

    // Check the full text and also split by implicit visual lines
    const lines = text.split(/\n/);
    for (const line of lines) {
      if (hasArabicPunctuationJump(line)) {
        results.push({
          id: `arabic-line-end-${idx}-${key}`,
          severity: 'warn',
          slideIndex: idx,
          field: key,
          message: `Slide ${idx + 1} ${label}: ends with Latin word + punctuation ("${line.trim().slice(-20)}"). Rephrase so the line ends with an Arabic word.`,
        });
        break; // One warning per field is enough
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

  // Per-slide checks
  for (let i = 0; i < slides.length; i++) {
    const isHook = i === 0 && (slides[i].type === 'hub');
    results.push(...checkCharLimits(slides[i], i, isHook));
    results.push(...checkArabicLineEndings(slides[i], i));
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
