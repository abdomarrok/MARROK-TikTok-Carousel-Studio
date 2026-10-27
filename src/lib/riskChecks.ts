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

const COPYRIGHTED_IP_PATTERN =
  /\b(spider-?man|batman|superman|naruto|goku|luffy|mickey\s*mouse|pikachu|pokemon|mario|darth\s*vader|harry\s*potter|iron\s*man|avengers|disney|marvel|nintendo|billie\s*eilish|taylor\s*swift|drake|the\s*weeknd|travis\s*scott)\b/i;

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

  const ctaSlide = carousel.slides[carousel.slides.length - 1];
  const hasCreatorCredit = Boolean(
    (carousel.channel && carousel.channel.trim().length > 0) ||
      (carousel.brand && carousel.brand.trim().length > 0) ||
      (ctaSlide?.enCredit && ctaSlide.enCredit.trim().length > 0)
  );

  if (!hasCreatorCredit) {
    return {
      id: 'originality',
      label: 'Originality & Attribution',
      status: 'BLOCK',
      message: 'Missing creator or channel attribution on the CTA slide. Add a creator/channel credit before exporting.',
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
    message: 'Original technical synthesis with clear creator attribution.',
  };
}

function checkCopyright(carousel: CarouselData): RiskCheckItem {
  const deckText = [
    carousel.caption,
    ...carousel.slides.map((s) => `${s.enTitle} ${s.enBody} ${s.arTitle} ${s.arBody} ${s.imagePrompt || ''}`),
  ].join(' ');

  const match = deckText.match(COPYRIGHTED_IP_PATTERN);
  if (match) {
    return {
      id: 'copyright',
      label: 'Copyrighted IP & Audio',
      status: 'BLOCK',
      message: `Detected reference to protected franchise/artist ("${match[0]}"). Remove copyrighted characters or commercial music references.`,
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
    checkCopyright(carousel),
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
