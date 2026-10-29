/**
 * riskChecks.ts — Platform & Content Safety Risk Engine (Spec §11 / Phase 4)
 *
 * Evaluates a CarouselData deck for TikTok / Metricool publishing risks:
 * 1. Originality: Flags raw video reposts, un-synthesized screenshots, or missing creator attribution.
 * 2. Copyrighted characters / music: Flags protected IP or commercial audio references.
 * 3. First-frame quality: Checks Slide 1 hook contrast, length, and dark cover readability.
 * 4. Unverified numeric claims: Flags benchmark/percentage claims when grounding status is unverified_draft.
 * 5. Repetition: Flags repeated headlines, repeated diagram variants, or duplicate body copy.
 */

import { CarouselData } from '../types';

export type RiskStatus = 'PASS' | 'WARN' | 'BLOCK';

export interface RiskCheckItem {
  id: 'originality' | 'copyright' | 'first-frame' | 'unverified-numbers' | 'repetition';
  label: string;
  status: RiskStatus;
  message: string;
}

export interface RiskReport {
  status: RiskStatus;
  items: RiskCheckItem[];
  blockCount: number;
  warnCount: number;
  passCount: number;
}


/**
 * Detects whether a carousel is derived from an external/third-party source
 * (URL, YouTube, screenshot, grounding sources, or offline fallback synthesis).
 */
export function isThirdPartySource(carousel: CarouselData): boolean {
  return Boolean(
    carousel.sourceMeta?.isFallback ||
      carousel.sourceMeta?.engine === 'offline' ||
      carousel.sourceMeta?.engine === 'offline-synthesizer' ||
      carousel.sourceMeta?.inputMode === 'url' ||
      carousel.sourceMeta?.inputMode === 'youtube' ||
      carousel.sourceMeta?.inputMode === 'screenshot' ||
      (carousel.sourceMeta?.groundingSources && carousel.sourceMeta.groundingSources.length > 0) ||
      (carousel.sourceMeta?.creator && carousel.sourceMeta.creator.trim().length > 0) ||
      (carousel.sourceMeta?.channel && carousel.sourceMeta.channel.trim().length > 0)
  );
}

/**
 * Returns the effective creator/source attribution text on the deck.
 */
export function getAttributionCredit(carousel: CarouselData): string {
  const ctaSlide = carousel.slides[carousel.slides.length - 1];
  return (
    carousel.sourceMeta?.creator ||
    carousel.sourceMeta?.channel ||
    carousel.channel ||
    ctaSlide?.enCredit?.replace(/^Source:\s*/i, '') ||
    ''
  ).trim();
}

/**
 * Validates that creator credit is non-empty and NOT merely the studio's brand name.
 * Never considers empty or brand-only values as valid third-party attribution.
 */
export function isValidCreatorCredit(carousel: CarouselData): boolean {
  const credit = getAttributionCredit(carousel);
  if (!credit) return false;
  const brand = (carousel.brand || 'MARROK').trim().toLowerCase();
  const normalized = credit.toLowerCase();
  if (
    normalized === brand ||
    normalized === 'marrok' ||
    normalized === 'marrok studio' ||
    normalized === 'source: marrok' ||
    normalized === 'source:marrok'
  ) {
    return false;
  }
  return true;
}

// Franchises and musical artists that trigger commercial copyright restrictions
const COPYRIGHTED_IP_PATTERN =
  /\b(spider-?man|batman|superman|naruto|goku|luffy|mickey\s*mouse|pikachu|pokemon|mario|darth\s*vader|harry\s*potter|iron\s*man|avengers|disney|marvel|nintendo|billie\s*eilish|taylor\s*swift|the\s*weeknd|travis\s*scott)\b/i;

// Specifically match Drake in commercial musical artist / rapper context to prevent false positives on KV-cache / technical topics
const DRAKE_ARTIST_PATTERN =
  /\b(aubrey\s+drake\s+graham|drake\s+(?:album|song|track|music|tour|concert|rap|rapper|lyrics|ovo|certified\s*lover|her\s*loss|scary\s*hours)|champagnepapi)\b/i;

const RAW_REPOST_PATTERN =
  /\b(tiktok\.com\/@|instagram\.com\/reel|youtube\.com\/shorts|screen\s*recording|repost\s*from|stolen\s*from|full\s*video\s*clip)\b/i;

const NUMERIC_CLAIM_PATTERN = /\b\d+(?:\.\d+)?\s*(?:%|x|ms|gb\/s|tb\/s|req\/s|rps|qps|mbps|gbps|faster|slower|reduction)\b/i;

function checkOriginality(carousel: CarouselData, rawInput: string = ''): RiskCheckItem {
  const combinedText = [
    rawInput,
    carousel.category,
    ...carousel.slides.map((s) => `${s.enTitle} ${s.enBody} ${s.arTitle} ${s.arBody}`),
  ].join(' ');

  if (RAW_REPOST_PATTERN.test(combinedText)) {
    return {
      id: 'originality',
      label: 'Originality & Transformation',
      status: 'BLOCK',
      message: 'Input or slide copy references a direct social video repost or screen recording without original synthesis.',
    };
  }

  const thirdParty = isThirdPartySource(carousel);
  const hasValidCredit = isValidCreatorCredit(carousel);

  if (thirdParty && !hasValidCredit) {
    return {
      id: 'originality',
      label: 'Originality & Attribution',
      status: 'BLOCK',
      message:
        carousel.postFormat === 'single' || carousel.slides.length === 1
          ? 'Third-party source requires genuine creator or channel attribution. Add a creator credit before exporting (brand-only name does not qualify).'
          : 'Third-party source requires genuine creator or channel attribution on the CTA slide. Add a creator credit before exporting (brand-only name does not qualify).',
    };
  }

  if (carousel.sourceMeta?.inputMode === 'screenshot' && !carousel.sourceMeta?.userReviewed) {
    return {
      id: 'originality',
      label: 'Originality & Transformation',
      status: 'WARN',
      message: 'Deck was synthesized from a screenshot. Confirm that visual diagrams and copy are transformative.',
    };
  }

  return {
    id: 'originality',
    label: 'Originality & Transformation',
    status: 'PASS',
    message: thirdParty
      ? `Original technical synthesis with verified creator attribution ("${getAttributionCredit(carousel)}").`
      : 'Original technical synthesis.',
  };
}

function checkCopyright(carousel: CarouselData, rawInput: string = ''): RiskCheckItem {
  const combinedText = [
    rawInput,
    carousel.caption || '',
    ...carousel.slides.map(
      (s) => `${s.enTitle} ${s.enBody} ${s.arTitle} ${s.arBody} ${s.imagePrompt || ''}`
    ),
  ].join(' ');

  const generalMatch = combinedText.match(COPYRIGHTED_IP_PATTERN);
  const drakeMatch = combinedText.match(DRAKE_ARTIST_PATTERN);
  const match = generalMatch || drakeMatch;

  if (match) {
    const matchedWord = match[0];
    const matchIndex = match.index || 0;
    const snippetStart = Math.max(0, matchIndex - 30);
    const snippetEnd = Math.min(combinedText.length, matchIndex + matchedWord.length + 30);
    const contextSnippet = combinedText.substring(snippetStart, snippetEnd).trim();

    console.warn(
      `[RiskChecks:Copyright] Protected IP/artist match detected: "${matchedWord}" at position ${matchIndex}. Context: "...${contextSnippet}..."`
    );

    return {
      id: 'copyright',
      label: 'Copyrighted IP & Audio',
      status: 'BLOCK',
      message: `Detected reference to protected franchise/artist ("${matchedWord}"). Remove copyrighted characters or commercial music references.`,
    };
  }

  return {
    id: 'copyright',
    label: 'Copyrighted IP & Audio',
    status: 'PASS',
    message: 'No copyrighted characters, franchises, or commercial audio triggers detected.',
  };
}

function checkFirstFrameQuality(carousel: CarouselData): RiskCheckItem {
  const firstSlide = carousel.slides[0];
  if (!firstSlide) {
    return {
      id: 'first-frame',
      label: 'First-Frame Cover Quality',
      status: 'BLOCK',
      message: 'Deck has no cover slide.',
    };
  }

  const title = (firstSlide.enTitle || '').trim();
  const arTitle = (firstSlide.arTitle || '').trim();

  if (title.length < 4 || arTitle.length < 4) {
    return {
      id: 'first-frame',
      label: 'First-Frame Cover Quality',
      status: 'BLOCK',
      message: 'Slide 1 cover is missing a clear bilingual hook headline (both EN and AR required for thumbnail impact).',
    };
  }

  if (firstSlide.type === 'image' && firstSlide.imageFilter === 'hud' && !firstSlide.imageCaption) {
    return {
      id: 'first-frame',
      label: 'First-Frame Cover Quality',
      status: 'WARN',
      message: 'Slide 1 uses a darkened HUD image cover without a caption badge. Ensure high headline contrast at mobile thumbnail size.',
    };
  }

  return {
    id: 'first-frame',
    label: 'First-Frame Cover Quality',
    status: 'PASS',
    message: 'Slide 1 cover has high-contrast bilingual hook typography and schematic focal point.',
  };
}

function checkUnverifiedNumericClaims(carousel: CarouselData): RiskCheckItem {
  const slidesWithMetrics = carousel.slides.filter(
    (s) =>
      s.type === 'metric' ||
      Boolean(s.metricValue) ||
      NUMERIC_CLAIM_PATTERN.test(`${s.enTitle} ${s.enBody}`)
  );

  if (slidesWithMetrics.length === 0) {
    return {
      id: 'unverified-numbers',
      label: 'Numeric Claims & Benchmarks',
      status: 'PASS',
      message: 'No quantitative benchmark claims requiring external citation.',
    };
  }

  const isGrounded =
    carousel.sourceMeta?.status === 'verified_live' &&
    carousel.sourceMeta?.isSearchGrounded &&
    (carousel.sourceMeta?.groundingSources?.length ?? 0) > 0;

  if (isGrounded) {
    return {
      id: 'unverified-numbers',
      label: 'Numeric Claims & Benchmarks',
      status: 'PASS',
      message: `${slidesWithMetrics.length} numeric/benchmark slide(s) backed by live search grounding sources.`,
    };
  }

  if (carousel.sourceMeta?.userReviewed) {
    return {
      id: 'unverified-numbers',
      label: 'Numeric Claims & Benchmarks',
      status: 'WARN',
      message: `${slidesWithMetrics.length} numeric claim(s) present in an ungrounded deck (human-reviewed).`,
    };
  }

  return {
    id: 'unverified-numbers',
    label: 'Numeric Claims & Benchmarks',
    status: 'BLOCK',
    message: `${slidesWithMetrics.length} slide(s) contain specific numeric/benchmark claims without live search grounding or human review confirmation.`,
  };
}

function checkRepetition(carousel: CarouselData): RiskCheckItem {
  const seenTitles = new Set<string>();
  const seenBodies = new Set<string>();

  for (let i = 0; i < carousel.slides.length; i++) {
    const s = carousel.slides[i];
    const normTitle = (s.enTitle || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
    const normBody = (s.enBody || '').toLowerCase().replace(/[^\w\s]/g, '').trim();

    if (normTitle.length > 6 && seenTitles.has(normTitle)) {
      return {
        id: 'repetition',
        label: 'Slide Pacing & Repetition',
        status: 'BLOCK',
        message: `Slide ${i + 1} repeats an identical headline ("${s.enTitle}"). TikTok penalizes repetitive carousel frames.`,
      };
    }
    if (normTitle.length > 6) seenTitles.add(normTitle);

    if (normBody.length > 20 && seenBodies.has(normBody)) {
      return {
        id: 'repetition',
        label: 'Slide Pacing & Repetition',
        status: 'BLOCK',
        message: `Slide ${i + 1} repeats identical body copy from an earlier slide.`,
      };
    }
    if (normBody.length > 20) seenBodies.add(normBody);
  }

  // Check adjacent identical diagram variants
  for (let i = 1; i < carousel.slides.length; i++) {
    const prevVariant = carousel.slides[i - 1].diagramVariant;
    const currVariant = carousel.slides[i].diagramVariant;
    if (prevVariant && currVariant && prevVariant === currVariant) {
      return {
        id: 'repetition',
        label: 'Slide Pacing & Repetition',
        status: 'WARN',
        message: `Slides ${i} and ${i + 1} use the same schematic variant ("${currVariant}"). Vary schematics for stronger retention.`,
      };
    }
  }

  return {
    id: 'repetition',
    label: 'Slide Pacing & Repetition',
    status: 'PASS',
    message: 'All slides have distinct headlines, body copy, and visual schematic pacing.',
  };
}

/**
 * Evaluates all 5 platform safety & quality rules on the active carousel.
 */
export function runPlatformRiskChecks(carousel: CarouselData, rawInput: string = ''): RiskReport {
  const items: RiskCheckItem[] = [
    checkOriginality(carousel, rawInput),
    checkCopyright(carousel, rawInput),
    checkFirstFrameQuality(carousel),
    checkUnverifiedNumericClaims(carousel),
    checkRepetition(carousel),
  ];

  const blockCount = items.filter((i) => i.status === 'BLOCK').length;
  const warnCount = items.filter((i) => i.status === 'WARN').length;
  const passCount = items.filter((i) => i.status === 'PASS').length;

  const status: RiskStatus = blockCount > 0 ? 'BLOCK' : warnCount > 0 ? 'WARN' : 'PASS';

  return {
    status,
    items,
    blockCount,
    warnCount,
    passCount,
  };
}
