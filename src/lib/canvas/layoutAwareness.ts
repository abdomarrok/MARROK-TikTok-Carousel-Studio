import type {
  CarouselData,
  CanvasDimensionPreset,
  GraphicalElementId,
  SlideData,
  ElementLayoutOverride,
  SlideCompositionPreset,
  TextAlignment,
} from '../../types.ts';
import {
  FONT_TITLE_EN,
  FONT_TITLE_AR,
  FONT_BODY_EN,
  FONT_BODY_AR,
  CanvasDimensionSpec,
  getCanvasDimensionSpec,
  getArchetypeGraphicTransform,
} from './constants.ts';
import { fitTextInBox } from './textLayout.ts';

export const MIN_GAP_GRAPHIC_TO_TITLE = 44;
export const MIN_GAP_TITLES = 18;
export const MIN_GAP_TITLE_TO_BODY = 36;
export const MIN_GAP_BODIES = 22;
export const MIN_GAP_TO_FOOTER = 24;

export interface TextBlockLayout {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  top: number;
  bottom: number;
  height: number;
  firstBaselineY: number;
  dx: number;
  dy: number;
  scale: number;
  opacity: number;
  align: TextAlignment;
  hidden: boolean;
}

export interface GraphicCardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  effectiveTop: number;
  effectiveBottom: number;
  dx: number;
  dy: number;
  scale: number;
  opacity: number;
  hidden: boolean;
}

export interface ComputedSlideLayout {
  slideType: string;
  dimensionPreset: CanvasDimensionPreset;
  compositionPreset: SlideCompositionPreset;
  freeMoveLayout: boolean;
  canvasWidth: number;
  canvasHeight: number;
  headerBadge: {
    x: number;
    y: number;
    width: number;
    height: number;
    dx: number;
    dy: number;
    scale: number;
    opacity: number;
    hidden: boolean;
  };
  graphicCard?: GraphicCardLayout;
  titleBlock?: TextBlockLayout;
  arabicTitleBlock?: TextBlockLayout;
  bodyBlock?: TextBlockLayout;
  arabicBodyBlock?: TextBlockLayout;
  takeawaysBlock?: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    bottom: number;
    dx: number;
    dy: number;
    scale: number;
    opacity: number;
    hidden: boolean;
  };
  ctaButton?: {
    x: number;
    y: number;
    width: number;
    height: number;
    dx: number;
    dy: number;
    scale: number;
    opacity: number;
    hidden: boolean;
  };
  attributionCard?: {
    x: number;
    y: number;
    width: number;
    height: number;
    dx: number;
    dy: number;
    scale: number;
    opacity: number;
    hidden: boolean;
  };
  hasCollisionWarning: boolean;
  collisionDetails?: string[];
}

/**
 * Applies a 1-click Slide Composition Preset to a slide, setting clean defaults
 * for layoutOverrides, compositionPreset, and freeMoveLayout.
 */
export function applySlideCompositionPreset(
  slide: SlideData,
  preset: SlideCompositionPreset
): SlideData {
  const existingOverrides = slide.layoutOverrides || {};
  const preserveVisibility = (id: GraphicalElementId): ElementLayoutOverride => {
    const prev = existingOverrides[id];
    return prev?.hidden ? { hidden: true } : {};
  };

  if (preset === 'standard') {
    return {
      ...slide,
      compositionPreset: 'standard',
      freeMoveLayout: false,
      layoutOverrides: undefined,
    };
  }

  if (preset === 'headline-first') {
    return {
      ...slide,
      compositionPreset: 'headline-first',
      freeMoveLayout: false,
      layoutOverrides: {
        headerBadge: { ...preserveVisibility('headerBadge') },
        titleBlock: { ...preserveVisibility('titleBlock'), scale: 1.02, align: 'center' },
        arabicTitleBlock: { ...preserveVisibility('arabicTitleBlock'), scale: 1.02, align: 'center' },
        graphicCard: { ...preserveVisibility('graphicCard'), scale: 0.92 },
        bodyBlock: { ...preserveVisibility('bodyBlock'), align: 'center' },
        arabicBodyBlock: { ...preserveVisibility('arabicBodyBlock'), align: 'center' },
      },
    };
  }

  if (preset === 'visual-hero') {
    return {
      ...slide,
      compositionPreset: 'visual-hero',
      freeMoveLayout: false,
      layoutOverrides: {
        graphicCard: { ...preserveVisibility('graphicCard'), scale: 1.12, dy: 12 },
        titleBlock: { ...preserveVisibility('titleBlock'), scale: 0.94, align: 'center' },
        arabicTitleBlock: { ...preserveVisibility('arabicTitleBlock'), scale: 0.94, align: 'center' },
        bodyBlock: { ...preserveVisibility('bodyBlock'), scale: 0.92, align: 'center' },
        arabicBodyBlock: { ...preserveVisibility('arabicBodyBlock'), scale: 0.92, align: 'center' },
      },
    };
  }

  if (preset === 'split-balanced') {
    return {
      ...slide,
      compositionPreset: 'split-balanced',
      freeMoveLayout: false,
      layoutOverrides: {
        graphicCard: { ...preserveVisibility('graphicCard'), scale: 0.96 },
        titleBlock: { ...preserveVisibility('titleBlock'), align: 'left' },
        arabicTitleBlock: { ...preserveVisibility('arabicTitleBlock'), align: 'right' },
        bodyBlock: { ...preserveVisibility('bodyBlock'), align: 'left' },
        arabicBodyBlock: { ...preserveVisibility('arabicBodyBlock'), align: 'right' },
      },
    };
  }

  // compact-editorial
  return {
    ...slide,
    compositionPreset: 'compact-editorial',
    freeMoveLayout: false,
    layoutOverrides: {
      graphicCard: { ...preserveVisibility('graphicCard'), scale: 0.9, dy: -10 },
      titleBlock: { ...preserveVisibility('titleBlock'), scale: 0.9, dy: -8, align: 'center' },
      arabicTitleBlock: { ...preserveVisibility('arabicTitleBlock'), scale: 0.9, dy: -4, align: 'center' },
      bodyBlock: { ...preserveVisibility('bodyBlock'), scale: 0.9, dy: -4, align: 'center' },
      arabicBodyBlock: { ...preserveVisibility('arabicBodyBlock'), scale: 0.9, dy: -4, align: 'center' },
    },
  };
}

// Cached measure canvas context
let measureCtx: CanvasRenderingContext2D | null = null;
let hasAttemptedContext = false;
function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!hasAttemptedContext) {
    hasAttemptedContext = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      measureCtx = canvas.getContext('2d');
    } catch (_) {
      measureCtx = null;
    }
  }
  return measureCtx;
}

const MAX_LAYOUT_CACHE_ENTRIES = 160;
const slideLayoutCache = new Map<string, ComputedSlideLayout>();

function cloneTextBlock(block?: TextBlockLayout): TextBlockLayout | undefined {
  if (!block) return undefined;
  return {
    ...block,
    lines: [...block.lines],
  };
}

function cloneComputedLayout(layout: ComputedSlideLayout): ComputedSlideLayout {
  return {
    ...layout,
    headerBadge: { ...layout.headerBadge },
    graphicCard: layout.graphicCard ? { ...layout.graphicCard } : undefined,
    titleBlock: cloneTextBlock(layout.titleBlock),
    arabicTitleBlock: cloneTextBlock(layout.arabicTitleBlock),
    bodyBlock: cloneTextBlock(layout.bodyBlock),
    arabicBodyBlock: cloneTextBlock(layout.arabicBodyBlock),
    takeawaysBlock: layout.takeawaysBlock ? { ...layout.takeawaysBlock } : undefined,
    ctaButton: layout.ctaButton ? { ...layout.ctaButton } : undefined,
    attributionCard: layout.attributionCard ? { ...layout.attributionCard } : undefined,
    collisionDetails: layout.collisionDetails ? [...layout.collisionDetails] : undefined,
  };
}

function buildSlideLayoutCacheKey(
  slide: SlideData,
  hasCtx: boolean,
  preset: CanvasDimensionPreset
): string {
  const takeawaysCount = slide.takeaways ? slide.takeaways.length : 0;
  const overridesKey = slide.layoutOverrides ? JSON.stringify(slide.layoutOverrides) : '';
  const compPreset = slide.compositionPreset || 'standard';
  const freeMove = slide.freeMoveLayout ? 1 : 0;
  return `${hasCtx ? 1 : 0}|${preset}|${compPreset}|${freeMove}|${slide.type || ''}|${slide.enTitle || ''}|${slide.arTitle || ''}|${slide.enBody || ''}|${slide.arBody || ''}|${takeawaysCount}|${overridesKey}`;
}

function storeComputedLayout(key: string, layout: ComputedSlideLayout): ComputedSlideLayout {
  if (slideLayoutCache.has(key)) {
    slideLayoutCache.delete(key);
  } else if (slideLayoutCache.size >= MAX_LAYOUT_CACHE_ENTRIES) {
    const oldestKey = slideLayoutCache.keys().next().value;
    if (oldestKey !== undefined) {
      slideLayoutCache.delete(oldestKey);
    }
  }
  slideLayoutCache.set(key, cloneComputedLayout(layout));
  return layout;
}

/**
 * Slide Layout Awareness Engine:
 * Computes exact positions, bounds, and baseline coordinates for all elements on a slide
 * across TikTok 9:16 (1080x1920) and Instagram (4:5 1080x1350, 3:4 1080x1440, 1:1 1080x1080, 9:16 1080x1920).
 * Supports:
 * - Standard Cascade Mode & Free-Move Mode (`slide.freeMoveLayout`)
 * - 1-Click Composition Presets including `headline-first` (Titles above Graphic Card, Body below)
 * - Per-element Scale (`0.6x..1.5x`) for both graphic cards and all text blocks
 * - Per-element Alignment (`left | center | right`), Opacity (`0.1..1.0`), and Visibility (`hidden`)
 */
export function computeSlideLayoutAwareness(
  slide: SlideData,
  carousel?: CarouselData
): ComputedSlideLayout {
  const ctx = getMeasureContext();
  const spec = getCanvasDimensionSpec(carousel?.dimensionPreset);
  const cacheKey = buildSlideLayoutCacheKey(slide, Boolean(ctx), spec.id);
  const cached = slideLayoutCache.get(cacheKey);
  if (cached) {
    return cloneComputedLayout(cached);
  }

  const overrides = slide.layoutOverrides || {};
  const compositionPreset: SlideCompositionPreset = slide.compositionPreset || 'standard';
  const freeMove = Boolean(slide.freeMoveLayout);

  // 1. Header Badge Layout
  const headerOverride = overrides.headerBadge;
  const headerTopY = Math.max(40, spec.headerY - 12);
  const headerBadge = {
    x: 80 + (headerOverride?.dx || 0),
    y: headerTopY + (headerOverride?.dy || 0),
    width: spec.safeMarginRight - 80,
    height: 72,
    dx: headerOverride?.dx || 0,
    dy: headerOverride?.dy || 0,
    scale: headerOverride?.scale ?? 1,
    opacity: headerOverride?.opacity ?? 1,
    hidden: Boolean(headerOverride?.hidden),
  };

  // 2. CTA Slide Layout Awareness
  if (slide.type === 'cta') {
    return storeComputedLayout(
      cacheKey,
      computeCtaSlideLayout(slide, headerBadge, ctx, overrides, spec, compositionPreset, freeMove)
    );
  }

  // 3. Base Graphic Card Transform & Overrides
  const graphicOverride = overrides.graphicCard;
  const gDx = graphicOverride?.dx || 0;
  const gDy = graphicOverride?.dy || 0;
  const gScale = graphicOverride?.scale ?? 1;
  const gOpacity = graphicOverride?.opacity ?? 1;
  const gHidden = Boolean(graphicOverride?.hidden);

  const { cardX, cardY: defaultCardY, cardW, cardH } = getArchetypeGraphicTransform(spec, slide.type);

  // 4. Content Slide Text Measurement & Scaling Pass
  const rawEnTitle = (slide.enTitle || '').trim();
  const rawArTitle = (slide.arTitle || '').trim();
  const rawEnBody = (slide.enBody || '').trim();
  const rawArBody = (slide.arBody || '').trim();

  const titleOverride = overrides.titleBlock;
  const arTitleOverride = overrides.arabicTitleBlock;
  const bodyOverride = overrides.bodyBlock;
  const arBodyOverride = overrides.arabicBodyBlock;
  const takeawaysOverride = overrides.takeawaysBlock;

  const titleScale = titleOverride?.scale ?? 1;
  const arTitleScale = arTitleOverride?.scale ?? 1;
  const bodyScale = bodyOverride?.scale ?? 1;
  const arBodyScale = arBodyOverride?.scale ?? 1;
  const takeawaysScale = takeawaysOverride?.scale ?? 1;

  const titleHidden = Boolean(titleOverride?.hidden);
  const arTitleHidden = Boolean(arTitleOverride?.hidden);
  const bodyHidden = Boolean(bodyOverride?.hidden);
  const arBodyHidden = Boolean(arBodyOverride?.hidden);
  const takeawaysHidden = Boolean(takeawaysOverride?.hidden);

  const isCompactAspect = spec.height < 1920;
  const gapGraphicToTitle = isCompactAspect
    ? Math.max(22, Math.round(MIN_GAP_GRAPHIC_TO_TITLE * spec.graphicScale))
    : MIN_GAP_GRAPHIC_TO_TITLE;
  const minGapTitles = isCompactAspect
    ? Math.max(12, Math.round(MIN_GAP_TITLES * spec.graphicScale))
    : MIN_GAP_TITLES;
  const minGapTitleToBody = isCompactAspect
    ? Math.max(20, Math.round(MIN_GAP_TITLE_TO_BODY * spec.graphicScale))
    : MIN_GAP_TITLE_TO_BODY;
  const minGapBodies = isCompactAspect
    ? Math.max(14, Math.round(MIN_GAP_BODIES * spec.graphicScale))
    : MIN_GAP_BODIES;

  // Takeaway reservation
  const hasTakeaways = Boolean(slide.takeaways && slide.takeaways.length > 0);
  const takeawayCount = hasTakeaways ? Math.min(3, slide.takeaways!.length) : 0;
  const baseTakeawayRowH = (takeawayCount === 1 ? 84 : takeawayCount === 2 ? 80 : 76) * takeawaysScale;
  const takeawayRowH = isCompactAspect
    ? Math.max(54, Math.round(baseTakeawayRowH * Math.max(0.78, spec.graphicScale)))
    : Math.round(baseTakeawayRowH);
  const takeawayGap = isCompactAspect ? 10 : 12;
  const takeawaysTotalH = hasTakeaways ? takeawayCount * takeawayRowH + (takeawayCount - 1) * takeawayGap : 0;
  const activeTakeawaysH = hasTakeaways && !takeawaysHidden ? takeawaysTotalH : 0;
  const takeawayClearance = activeTakeawaysH > 0 ? activeTakeawaysH + minGapBodies : 0;

  const tempCy = defaultCardY + cardH / 2;
  const tempEffectiveBottom = gHidden ? headerBadge.y + headerBadge.height : tempCy + (cardH / 2) * gScale + gDy;
  const baseTextCeilingY = gHidden
    ? headerBadge.y + headerBadge.height + 16
    : Math.max(defaultCardY + cardH, tempEffectiveBottom);

  const totalAvailableHeight = Math.max(
    180,
    spec.safeFooterCeilingY - baseTextCeilingY - gapGraphicToTitle - takeawayClearance
  );

  // Dynamic font fitting pass
  const initialScaleBase = isCompactAspect ? Math.max(0.74, spec.graphicScale + 0.08) : 1.0;
  let textScale = hasTakeaways
    ? Math.min(0.9, initialScaleBase * 0.9)
    : totalAvailableHeight >= 940
    ? 1.06
    : initialScaleBase;
  let bodyCap = hasTakeaways ? 2 : isCompactAspect && spec.height <= 1080 ? 3 : 4;
  const minAllowedScale = isCompactAspect ? 0.56 : 0.65;

  const measureTextPass = (scale: number, cap: number) => {
    const enTitleTarget = Math.max(28, 74 * scale * titleScale);
    const arTitleTarget = Math.max(26, 70 * scale * arTitleScale);
    const enBodyTarget = Math.max(22, 40 * scale * bodyScale);
    const arBodyTarget = Math.max(22, 40 * scale * arBodyScale);

    const enTitleMin = Math.max(24, Math.round((isCompactAspect ? 36 : 44) * Math.min(1, titleScale)));
    const arTitleMin = Math.max(24, Math.round((isCompactAspect ? 34 : 42) * Math.min(1, arTitleScale)));
    const enBodyMin = Math.max(20, Math.round(26 * Math.min(1, bodyScale)));
    const arBodyMin = Math.max(20, Math.round(26 * Math.min(1, arBodyScale)));

    let enTitle = { lines: rawEnTitle ? [rawEnTitle] : [], fontSize: enTitleTarget, lineHeight: enTitleTarget * 1.19 };
    let arTitle = { lines: rawArTitle ? [rawArTitle] : [], fontSize: arTitleTarget, lineHeight: arTitleTarget * 1.457 };
    let enBody = { lines: rawEnBody ? [rawEnBody] : [], fontSize: enBodyTarget, lineHeight: enBodyTarget * 1.42 };
    let arBody = { lines: rawArBody ? [rawArBody] : [], fontSize: arBodyTarget, lineHeight: arBodyTarget * 1.526 };

    if (ctx) {
      if (rawEnTitle) {
        enTitle = fitTextInBox(ctx, rawEnTitle, spec.safeTextWidthTitle, enTitleTarget, FONT_TITLE_EN, '800', {
          maxLines: titleScale > 1.15 ? 3 : 2,
          minFontSize: enTitleMin,
          lineHeightFactor: 1.19,
        });
      }
      if (rawArTitle) {
        arTitle = fitTextInBox(ctx, rawArTitle, spec.safeTextWidthTitle, arTitleTarget, FONT_TITLE_AR, '800', {
          maxLines: arTitleScale > 1.15 ? 3 : 2,
          minFontSize: arTitleMin,
          lineHeightFactor: 1.457,
        });
      }
      if (rawEnBody) {
        enBody = fitTextInBox(ctx, rawEnBody, spec.safeTextWidthBody, enBodyTarget, FONT_BODY_EN, '400', {
          maxLines: cap,
          minFontSize: enBodyMin,
          lineHeightFactor: 1.42,
        });
      }
      if (rawArBody) {
        arBody = fitTextInBox(ctx, rawArBody, spec.safeTextWidthBody, arBodyTarget, FONT_BODY_AR, '400', {
          maxLines: cap,
          minFontSize: arBodyMin,
          lineHeightFactor: 1.526,
        });
      }
    }

    const enTitleHeight =
      enTitle.lines.length > 0 ? (enTitle.lines.length - 1) * enTitle.lineHeight + enTitle.fontSize * 1.05 : 0;
    const arTitleHeight =
      arTitle.lines.length > 0 ? (arTitle.lines.length - 1) * arTitle.lineHeight + arTitle.fontSize * 1.08 : 0;
    const enBodyHeight =
      enBody.lines.length > 0 ? (enBody.lines.length - 1) * enBody.lineHeight + enBody.fontSize * 1.05 : 0;
    const arBodyHeight =
      arBody.lines.length > 0 ? (arBody.lines.length - 1) * arBody.lineHeight + arBody.fontSize * 1.08 : 0;

    const effEnTitleH = titleHidden ? 0 : enTitleHeight;
    const effArTitleH = arTitleHidden ? 0 : arTitleHeight;
    const effEnBodyH = bodyHidden ? 0 : enBodyHeight;
    const effArBodyH = arBodyHidden ? 0 : arBodyHeight;

    const gapTitles = effEnTitleH > 0 && effArTitleH > 0 ? minGapTitles : 0;
    const gapTitlesToBody =
      (effEnTitleH > 0 || effArTitleH > 0) && (effEnBodyH > 0 || effArBodyH > 0) ? minGapTitleToBody : 0;
    const gapBodies = effEnBodyH > 0 && effArBodyH > 0 ? minGapBodies : 0;

    const totalStackHeight =
      effEnTitleH + gapTitles + effArTitleH + gapTitlesToBody + effEnBodyH + gapBodies + effArBodyH;

    return {
      enTitle,
      arTitle,
      enBody,
      arBody,
      gapTitles,
      gapTitlesToBody,
      gapBodies,
      enTitleHeight,
      arTitleHeight,
      enBodyHeight,
      arBodyHeight,
      effEnTitleH,
      effArTitleH,
      effEnBodyH,
      effArBodyH,
      totalStackHeight,
    };
  };

  let measured = measureTextPass(textScale, bodyCap);

  // Progressive compression to guarantee zero overlap and footer safety
  while (measured.totalStackHeight > totalAvailableHeight - 20 && textScale > minAllowedScale) {
    textScale = Math.max(minAllowedScale, textScale - 0.05);
    measured = measureTextPass(textScale, bodyCap);
  }
  while (measured.totalStackHeight > totalAvailableHeight - 15 && bodyCap > 2) {
    bodyCap -= 1;
    measured = measureTextPass(textScale, bodyCap);
  }

  // 5. Layout Awareness: Guaranteed Non-Overlapping Stacking (Standard vs Headline-First vs Free-Move)
  let graphicCard: GraphicCardLayout;
  let titleBlock: TextBlockLayout | undefined;
  let arabicTitleBlock: TextBlockLayout | undefined;
  let bodyBlock: TextBlockLayout | undefined;
  let arabicBodyBlock: TextBlockLayout | undefined;
  let takeawaysBlock: ComputedSlideLayout['takeawaysBlock'] | undefined;

  if (compositionPreset === 'headline-first') {
    // Editorial Headline-First composition:
    // 1) English & Arabic Headlines at top (below headerBadge)
    // 2) Graphic Card in middle
    // 3) English & Arabic Body + Takeaways below Graphic Card
    const topStart = Math.max(136, headerBadge.y + headerBadge.height + (isCompactAspect ? 18 : 28));

    const tDx = titleOverride?.dx || 0;
    const tDy = titleOverride?.dy || 0;
    const actualTitleTop = freeMove ? topStart + tDy : Math.max(120, topStart + tDy);
    const actualTitleBottom = actualTitleTop + measured.enTitleHeight;
    if (measured.enTitle.lines.length > 0) {
      titleBlock = {
        lines: measured.enTitle.lines,
        fontSize: measured.enTitle.fontSize,
        lineHeight: measured.enTitle.lineHeight,
        top: actualTitleTop,
        bottom: actualTitleBottom,
        height: measured.enTitleHeight,
        firstBaselineY: actualTitleTop + measured.enTitle.fontSize * 0.82,
        dx: tDx,
        dy: tDy,
        scale: titleScale,
        opacity: titleOverride?.opacity ?? 1,
        align: titleOverride?.align || 'center',
        hidden: titleHidden,
      };
    }

    const prevTitleBottom = titleBlock && !titleHidden ? titleBlock.bottom : topStart;
    const arTDx = arTitleOverride?.dx || 0;
    const arTDy = arTitleOverride?.dy || 0;
    const naturalArTitleTop = prevTitleBottom + (titleBlock && !titleHidden ? measured.gapTitles : 0);
    const actualArTitleTop = freeMove
      ? naturalArTitleTop + arTDy
      : Math.max(prevTitleBottom + measured.gapTitles, naturalArTitleTop + arTDy);
    const actualArTitleBottom = actualArTitleTop + measured.arTitleHeight;
    if (measured.arTitle.lines.length > 0) {
      arabicTitleBlock = {
        lines: measured.arTitle.lines,
        fontSize: measured.arTitle.fontSize,
        lineHeight: measured.arTitle.lineHeight,
        top: actualArTitleTop,
        bottom: actualArTitleBottom,
        height: measured.arTitleHeight,
        firstBaselineY: actualArTitleTop + measured.arTitle.fontSize * 0.82,
        dx: arTDx,
        dy: arTDy,
        scale: arTitleScale,
        opacity: arTitleOverride?.opacity ?? 1,
        align: arTitleOverride?.align || 'center',
        hidden: arTitleHidden,
      };
    }

    const headlinesBottom =
      arabicTitleBlock && !arTitleHidden
        ? arabicTitleBlock.bottom
        : titleBlock && !titleHidden
        ? titleBlock.bottom
        : topStart;

    const scaledCardH = cardH * gScale;
    const desiredCardTop = headlinesBottom + (isCompactAspect ? 20 : 32) + gDy;
    const cardCenterY = desiredCardTop + scaledCardH / 2;
    const unscaledCardY = cardCenterY - cardH / 2;
    const effectiveTop = cardCenterY - scaledCardH / 2;
    const effectiveBottom = cardCenterY + scaledCardH / 2;

    graphicCard = {
      x: cardX + gDx,
      y: unscaledCardY,
      width: cardW,
      height: cardH,
      effectiveTop,
      effectiveBottom,
      dx: gDx,
      dy: gDy,
      scale: gScale,
      opacity: gOpacity,
      hidden: gHidden,
    };

    const postCardAnchor = gHidden ? headlinesBottom + minGapTitleToBody : effectiveBottom + (isCompactAspect ? 22 : 34);
    const bDx = bodyOverride?.dx || 0;
    const bDy = bodyOverride?.dy || 0;
    const actualBodyTop = freeMove ? postCardAnchor + bDy : Math.max(postCardAnchor, postCardAnchor + bDy);
    const actualBodyBottom = actualBodyTop + measured.enBodyHeight;

    if (measured.enBody.lines.length > 0) {
      bodyBlock = {
        lines: measured.enBody.lines,
        fontSize: measured.enBody.fontSize,
        lineHeight: measured.enBody.lineHeight,
        top: actualBodyTop,
        bottom: actualBodyBottom,
        height: measured.enBodyHeight,
        firstBaselineY: actualBodyTop + measured.enBody.fontSize * 0.82,
        dx: bDx,
        dy: bDy,
        scale: bodyScale,
        opacity: bodyOverride?.opacity ?? 1,
        align: bodyOverride?.align || 'center',
        hidden: bodyHidden,
      };
    }

    const prevBodyBottom = bodyBlock && !bodyHidden ? bodyBlock.bottom : postCardAnchor;
    const arBDx = arBodyOverride?.dx || 0;
    const arBDy = arBodyOverride?.dy || 0;
    const naturalArBodyTop = prevBodyBottom + (bodyBlock && !bodyHidden ? measured.gapBodies : 0);
    const actualArBodyTop = freeMove
      ? naturalArBodyTop + arBDy
      : Math.max(prevBodyBottom + (bodyBlock && !bodyHidden ? measured.gapBodies : 0), naturalArBodyTop + arBDy);
    const actualArBodyBottom = actualArBodyTop + measured.arBodyHeight;

    if (measured.arBody.lines.length > 0) {
      arabicBodyBlock = {
        lines: measured.arBody.lines,
        fontSize: measured.arBody.fontSize,
        lineHeight: measured.arBody.lineHeight,
        top: actualArBodyTop,
        bottom: actualArBodyBottom,
        height: measured.arBodyHeight,
        firstBaselineY: actualArBodyTop + measured.arBody.fontSize * 0.82,
        dx: arBDx,
        dy: arBDy,
        scale: arBodyScale,
        opacity: arBodyOverride?.opacity ?? 1,
        align: arBodyOverride?.align || 'center',
        hidden: arBodyHidden,
      };
    }
  } else {
    // Standard / Visual-Hero / Split-Balanced / Compact-Editorial order:
    // Graphic Card at top, followed by Title -> Arabic Title -> Body -> Arabic Body -> Takeaways
    const cy = defaultCardY + cardH / 2;
    const effectiveTop = cy - (cardH / 2) * gScale + gDy;
    const effectiveBottom = cy + (cardH / 2) * gScale + gDy;

    graphicCard = {
      x: cardX + gDx,
      y: defaultCardY + gDy,
      width: cardW,
      height: cardH,
      effectiveTop,
      effectiveBottom,
      dx: gDx,
      dy: gDy,
      scale: gScale,
      opacity: gOpacity,
      hidden: gHidden,
    };

    const textCeilingY = gHidden
      ? headerBadge.y + headerBadge.height + 20
      : Math.max(defaultCardY + cardH, effectiveBottom);

    const remainingCushion = Math.max(0, totalAvailableHeight - measured.totalStackHeight);
    const naturalTopCushion = Math.min(Math.max(remainingCushion * 0.24, gapGraphicToTitle), 88);
    const baseTitleTop = textCeilingY + naturalTopCushion;

    // Title Block
    const tDx = titleOverride?.dx || 0;
    const tDy = titleOverride?.dy || 0;
    const actualTitleTop = freeMove
      ? baseTitleTop + tDy
      : Math.max(textCeilingY + gapGraphicToTitle, baseTitleTop + tDy);
    const titleFirstBaselineY = actualTitleTop + measured.enTitle.fontSize * 0.82;
    const actualTitleBottom = actualTitleTop + measured.enTitleHeight;

    if (measured.enTitle.lines.length > 0) {
      titleBlock = {
        lines: measured.enTitle.lines,
        fontSize: measured.enTitle.fontSize,
        lineHeight: measured.enTitle.lineHeight,
        top: actualTitleTop,
        bottom: actualTitleBottom,
        height: measured.enTitleHeight,
        firstBaselineY: titleFirstBaselineY,
        dx: tDx,
        dy: tDy,
        scale: titleScale,
        opacity: titleOverride?.opacity ?? 1,
        align: titleOverride?.align || 'center',
        hidden: titleHidden,
      };
    }

    // Arabic Title Block
    const arTDx = arTitleOverride?.dx || 0;
    const arTDy = arTitleOverride?.dy || 0;
    const naturalPrevTitleBottom = baseTitleTop + measured.effEnTitleH;
    const cascadePrevTitleBottom = titleBlock && !titleHidden ? titleBlock.bottom : textCeilingY;
    const naturalArabicTop = (freeMove ? naturalPrevTitleBottom : cascadePrevTitleBottom) + measured.gapTitles;
    const actualArabicTop = freeMove
      ? naturalArabicTop + arTDy
      : Math.max(cascadePrevTitleBottom + measured.gapTitles, naturalArabicTop + arTDy);
    const arabicFirstBaselineY = actualArabicTop + measured.arTitle.fontSize * 0.82;
    const actualArabicBottom = actualArabicTop + measured.arTitleHeight;

    if (measured.arTitle.lines.length > 0) {
      arabicTitleBlock = {
        lines: measured.arTitle.lines,
        fontSize: measured.arTitle.fontSize,
        lineHeight: measured.arTitle.lineHeight,
        top: actualArabicTop,
        bottom: actualArabicBottom,
        height: measured.arTitleHeight,
        firstBaselineY: arabicFirstBaselineY,
        dx: arTDx,
        dy: arTDy,
        scale: arTitleScale,
        opacity: arTitleOverride?.opacity ?? 1,
        align: arTitleOverride?.align || 'center',
        hidden: arTitleHidden,
      };
    }

    // English Body Block
    const bDx = bodyOverride?.dx || 0;
    const bDy = bodyOverride?.dy || 0;
    const naturalPrevHeadlineBottom = naturalPrevTitleBottom + measured.gapTitles + measured.effArTitleH;
    const cascadePrevHeadlineBottom =
      arabicTitleBlock && !arTitleHidden
        ? arabicTitleBlock.bottom
        : titleBlock && !titleHidden
        ? titleBlock.bottom
        : textCeilingY;
    const naturalBodyTop =
      (freeMove ? naturalPrevHeadlineBottom : cascadePrevHeadlineBottom) + measured.gapTitlesToBody;
    const actualBodyTop = freeMove
      ? naturalBodyTop + bDy
      : Math.max(cascadePrevHeadlineBottom + measured.gapTitlesToBody, naturalBodyTop + bDy);
    const bodyFirstBaselineY = actualBodyTop + measured.enBody.fontSize * 0.82;
    const actualBodyBottom = actualBodyTop + measured.enBodyHeight;

    if (measured.enBody.lines.length > 0) {
      bodyBlock = {
        lines: measured.enBody.lines,
        fontSize: measured.enBody.fontSize,
        lineHeight: measured.enBody.lineHeight,
        top: actualBodyTop,
        bottom: actualBodyBottom,
        height: measured.enBodyHeight,
        firstBaselineY: bodyFirstBaselineY,
        dx: bDx,
        dy: bDy,
        scale: bodyScale,
        opacity: bodyOverride?.opacity ?? 1,
        align: bodyOverride?.align || 'center',
        hidden: bodyHidden,
      };
    }

    // Arabic Body Block
    const arBDx = arBodyOverride?.dx || 0;
    const arBDy = arBodyOverride?.dy || 0;
    const naturalPrevBodyBottom = naturalPrevHeadlineBottom + measured.gapTitlesToBody + measured.effEnBodyH;
    const cascadePrevBodyBottom = bodyBlock && !bodyHidden ? bodyBlock.bottom : cascadePrevHeadlineBottom;
    const naturalArBodyTop = (freeMove ? naturalPrevBodyBottom : cascadePrevBodyBottom) + measured.gapBodies;
    const actualArBodyTop = freeMove
      ? naturalArBodyTop + arBDy
      : Math.max(cascadePrevBodyBottom + measured.gapBodies, naturalArBodyTop + arBDy);
    const arBodyFirstBaselineY = actualArBodyTop + measured.arBody.fontSize * 0.82;
    const actualArBodyBottom = actualArBodyTop + measured.arBodyHeight;

    if (measured.arBody.lines.length > 0) {
      arabicBodyBlock = {
        lines: measured.arBody.lines,
        fontSize: measured.arBody.fontSize,
        lineHeight: measured.arBody.lineHeight,
        top: actualArBodyTop,
        bottom: actualArBodyBottom,
        height: measured.arBodyHeight,
        firstBaselineY: arBodyFirstBaselineY,
        dx: arBDx,
        dy: arBDy,
        scale: arBodyScale,
        opacity: arBodyOverride?.opacity ?? 1,
        align: arBodyOverride?.align || 'center',
        hidden: arBodyHidden,
      };
    }
  }

  // 5b. Takeaways Block
  if (hasTakeaways) {
    const prevBottom =
      (arabicBodyBlock && !arBodyHidden ? arabicBodyBlock.bottom : 0) ||
      (bodyBlock && !bodyHidden ? bodyBlock.bottom : 0) ||
      (arabicTitleBlock && !arTitleHidden ? arabicTitleBlock.bottom : 0) ||
      (titleBlock && !titleHidden ? titleBlock.bottom : 0) ||
      graphicCard.effectiveBottom;
    const tDx = takeawaysOverride?.dx || 0;
    const tDy = takeawaysOverride?.dy || 0;
    const naturalTop = prevBottom + minGapBodies;
    const actualTop = freeMove ? naturalTop + tDy : Math.max(prevBottom + minGapBodies, naturalTop + tDy);
    const scaledWidth = Math.round(spec.safeContentWidth * takeawaysScale);
    const centeredX = spec.safeTextCenterX - scaledWidth / 2 + tDx;
    takeawaysBlock = {
      x: centeredX,
      y: actualTop,
      width: scaledWidth,
      height: takeawaysTotalH,
      top: actualTop,
      bottom: actualTop + takeawaysTotalH,
      dx: tDx,
      dy: tDy,
      scale: takeawaysScale,
      opacity: takeawaysOverride?.opacity ?? 1,
      hidden: takeawaysHidden,
    };
  }

  // 6. Safety Ceiling Compression Pass (only in cascade mode so freeMoveLayout stays completely unlocked)
  if (!freeMove && compositionPreset !== 'headline-first') {
    const textCeilingY = gHidden
      ? headerBadge.y + headerBadge.height + 20
      : Math.max(defaultCardY + cardH, graphicCard.effectiveBottom);
    const stackLowestY =
      (takeawaysBlock && !takeawaysHidden ? takeawaysBlock.bottom : 0) ||
      (arabicBodyBlock && !arBodyHidden ? arabicBodyBlock.bottom : 0) ||
      (bodyBlock && !bodyHidden ? bodyBlock.bottom : 0) ||
      (arabicTitleBlock && !arTitleHidden ? arabicTitleBlock.bottom : 0) ||
      (titleBlock && !titleHidden ? titleBlock.bottom : 0) ||
      textCeilingY;
    const footerOverflow = stackLowestY - spec.safeFooterCeilingY;

    if (footerOverflow > 0 && titleBlock) {
      const maxUpwardShift = Math.max(0, titleBlock.top - (textCeilingY + gapGraphicToTitle));
      const shift = Math.min(footerOverflow, maxUpwardShift);
      if (shift > 0) {
        if (titleBlock) {
          titleBlock.top -= shift;
          titleBlock.bottom -= shift;
          titleBlock.firstBaselineY -= shift;
        }
        if (arabicTitleBlock) {
          arabicTitleBlock.top -= shift;
          arabicTitleBlock.bottom -= shift;
          arabicTitleBlock.firstBaselineY -= shift;
        }
        if (bodyBlock) {
          bodyBlock.top -= shift;
          bodyBlock.bottom -= shift;
          bodyBlock.firstBaselineY -= shift;
        }
        if (arabicBodyBlock) {
          arabicBodyBlock.top -= shift;
          arabicBodyBlock.bottom -= shift;
          arabicBodyBlock.firstBaselineY -= shift;
        }
        if (takeawaysBlock) {
          takeawaysBlock.top -= shift;
          takeawaysBlock.bottom -= shift;
          takeawaysBlock.y -= shift;
        }
      }
    }
  }

  return storeComputedLayout(cacheKey, {
    slideType: slide.type,
    dimensionPreset: spec.id,
    compositionPreset,
    freeMoveLayout: freeMove,
    canvasWidth: spec.width,
    canvasHeight: spec.height,
    headerBadge,
    graphicCard,
    titleBlock,
    arabicTitleBlock,
    bodyBlock,
    arabicBodyBlock,
    takeawaysBlock,
    hasCollisionWarning: false,
  });
}

/**
 * CTA Slide Layout Awareness Handler
 */
function computeCtaSlideLayout(
  slide: SlideData,
  headerBadge: ComputedSlideLayout['headerBadge'],
  ctx: CanvasRenderingContext2D | null,
  overrides: Partial<Record<GraphicalElementId, ElementLayoutOverride>>,
  spec: CanvasDimensionSpec,
  compositionPreset: SlideCompositionPreset,
  freeMove: boolean
): ComputedSlideLayout {
  const gOverride = overrides.graphicCard;
  const gDx = gOverride?.dx || 0;
  const gDy = gOverride?.dy || 0;
  const gScale = gOverride?.scale ?? 1;
  const gOpacity = gOverride?.opacity ?? 1;
  const gHidden = Boolean(gOverride?.hidden);

  const { cardX, cardY: baseCardY, cardW, cardH: baseCardH } = getArchetypeGraphicTransform(spec, 'cta');
  const cy = baseCardY + baseCardH / 2;
  const effectiveTop = cy - (baseCardH / 2) * gScale + gDy;
  const effectiveBottom = cy + (baseCardH / 2) * gScale + gDy;

  const graphicCard: GraphicCardLayout = {
    x: cardX + gDx,
    y: baseCardY + gDy,
    width: cardW,
    height: baseCardH,
    effectiveTop,
    effectiveBottom,
    dx: gDx,
    dy: gDy,
    scale: gScale,
    opacity: gOpacity,
    hidden: gHidden,
  };

  const rawEnTitle = (slide.enTitle || '').trim();
  const rawArTitle = (slide.arTitle || '').trim();

  const titleOverride = overrides.titleBlock;
  const arTitleOverride = overrides.arabicTitleBlock;
  const tScale = titleOverride?.scale ?? 1;
  const arTScale = arTitleOverride?.scale ?? 1;

  const ctaFontScale = spec.height < 1920 ? Math.max(0.76, spec.graphicScale + 0.08) : 1;
  let enFontSize = Math.round(56 * ctaFontScale * tScale);
  let enLineHeight = enFontSize * 1.2;
  let enTitleH = Math.round(68 * ctaFontScale * tScale);
  let enTitleLines = rawEnTitle ? [rawEnTitle] : [];

  let arFontSize = Math.round(50 * ctaFontScale * arTScale);
  let arLineHeight = arFontSize * 1.35;
  let arTitleH = Math.round(74 * ctaFontScale * arTScale);
  let arTitleLines = rawArTitle ? [rawArTitle] : [];

  if (ctx) {
    if (rawEnTitle) {
      const enFit = fitTextInBox(ctx, rawEnTitle, spec.safeTextWidthTitle, enFontSize, FONT_TITLE_EN, '800', {
        maxLines: tScale > 1.15 ? 3 : 2,
        minFontSize: Math.round(28 * Math.min(1, tScale)),
        lineHeightFactor: 1.2,
      });
      enTitleLines = enFit.lines;
      enFontSize = enFit.fontSize;
      enLineHeight = enFit.lineHeight;
      enTitleH = enFit.lines.length * enFit.lineHeight;
    }
    if (rawArTitle) {
      const arFit = fitTextInBox(ctx, rawArTitle, spec.safeTextWidthTitle, arFontSize, FONT_TITLE_AR, '800', {
        maxLines: arTScale > 1.15 ? 3 : 2,
        minFontSize: Math.round(26 * Math.min(1, arTScale)),
        lineHeightFactor: 1.35,
      });
      arTitleLines = arFit.lines;
      arFontSize = arFit.fontSize;
      arLineHeight = arFit.lineHeight;
      arTitleH = arFit.lines.length * arFit.lineHeight;
    }
  }

  // Titles start below the graphic emblem (or move freely in freeMove mode):
  const tDx = titleOverride?.dx || 0;
  const tDy = titleOverride?.dy || 0;
  const minTitleStart = baseCardY + baseCardH + Math.round(40 * ctaFontScale);
  const actualTitleTop = freeMove
    ? minTitleStart + tDy
    : Math.max(effectiveBottom + Math.round(28 * ctaFontScale), minTitleStart + tDy);
  const titleFirstBaselineY = actualTitleTop + enFontSize * 0.82;
  const actualTitleBottom = actualTitleTop + enTitleH;

  const titleBlock: TextBlockLayout = {
    lines: enTitleLines,
    fontSize: enFontSize,
    lineHeight: enLineHeight,
    top: actualTitleTop,
    bottom: actualTitleBottom,
    height: enTitleH,
    firstBaselineY: titleFirstBaselineY,
    dx: tDx,
    dy: tDy,
    scale: tScale,
    opacity: titleOverride?.opacity ?? 1,
    align: titleOverride?.align || 'center',
    hidden: Boolean(titleOverride?.hidden),
  };

  const arTDx = arTitleOverride?.dx || 0;
  const arTDy = arTitleOverride?.dy || 0;
  const titleGap = Math.round(16 * ctaFontScale);
  const actualArabicTop = freeMove
    ? actualTitleBottom + titleGap + arTDy
    : Math.max(actualTitleBottom + titleGap, actualTitleBottom + titleGap + arTDy);
  const arabicFirstBaselineY = actualArabicTop + arFontSize * 0.82;
  const actualArabicBottom = actualArabicTop + arTitleH;

  const arabicTitleBlock: TextBlockLayout = {
    lines: arTitleLines,
    fontSize: arFontSize,
    lineHeight: arLineHeight,
    top: actualArabicTop,
    bottom: actualArabicBottom,
    height: arTitleH,
    firstBaselineY: arabicFirstBaselineY,
    dx: arTDx,
    dy: arTDy,
    scale: arTScale,
    opacity: arTitleOverride?.opacity ?? 1,
    align: arTitleOverride?.align || 'center',
    hidden: Boolean(arTitleOverride?.hidden),
  };

  // Attribution card anchored safely above spec.safeFooterCeilingY:
  const attrOverride = overrides.attributionCard;
  const attrScale = attrOverride?.scale ?? 1;
  const cardH = Math.round(92 * Math.max(0.82, ctaFontScale) * attrScale);
  const cardWAttr = Math.round(Math.min(780, spec.safeContentWidth) * attrScale);
  const maxCardY = spec.safeFooterCeilingY - cardH - 12;
  const desiredCardY = maxCardY + (attrOverride?.dy || 0);
  const minGapAboveAttr = Math.round(130 * ctaFontScale);
  const attributionCard = {
    x: spec.safeTextCenterX - cardWAttr / 2 + (attrOverride?.dx || 0),
    y: freeMove ? desiredCardY : Math.min(Math.max(actualArabicBottom + minGapAboveAttr, desiredCardY), maxCardY),
    width: cardWAttr,
    height: cardH,
    dx: attrOverride?.dx || 0,
    dy: attrOverride?.dy || 0,
    scale: attrScale,
    opacity: attrOverride?.opacity ?? 1,
    hidden: Boolean(attrOverride?.hidden),
  };

  // CTA Pill Button in the remaining vertical pocket:
  const ctaOverride = overrides.ctaButton;
  const ctaScale = ctaOverride?.scale ?? 1;
  const pillW = Math.round(640 * Math.max(0.84, ctaFontScale) * ctaScale);
  const pillH = Math.round(96 * Math.max(0.8, ctaFontScale) * ctaScale);
  const urlY = attributionCard.y - Math.round(36 * ctaFontScale);
  const availablePillGap = Math.max(48, urlY - actualArabicBottom - pillH);
  const naturalPillY = Math.min(
    Math.max(actualArabicBottom + availablePillGap * 0.42, actualArabicBottom + 18),
    urlY - pillH - 14
  );
  const actualPillY = freeMove
    ? naturalPillY + (ctaOverride?.dy || 0)
    : Math.min(
        Math.max(actualArabicBottom + 16, naturalPillY + (ctaOverride?.dy || 0)),
        Math.max(actualArabicBottom + 16, urlY - pillH - 12)
      );

  const ctaButton = {
    x: spec.safeTextCenterX - pillW / 2 + (ctaOverride?.dx || 0),
    y: actualPillY,
    width: pillW,
    height: pillH,
    dx: ctaOverride?.dx || 0,
    dy: ctaOverride?.dy || 0,
    scale: ctaScale,
    opacity: ctaOverride?.opacity ?? 1,
    hidden: Boolean(ctaOverride?.hidden),
  };

  return {
    slideType: 'cta',
    dimensionPreset: spec.id,
    compositionPreset,
    freeMoveLayout: freeMove,
    canvasWidth: spec.width,
    canvasHeight: spec.height,
    headerBadge,
    graphicCard,
    titleBlock,
    arabicTitleBlock,
    ctaButton,
    attributionCard,
    hasCollisionWarning: false,
  };
}

/**
 * Layout-Aware Drag Clamping:
 * Enforces boundary and collision limits during viewport dragging and nudging.
 * When `slide.freeMoveLayout` or `headline-first` is active, grants wide vertical freedom
 * across the canvas while keeping elements inside the overall canvas bounds.
 */
export function clampElementDrag(
  elementId: GraphicalElementId,
  desiredDx: number,
  desiredDy: number,
  slide: SlideData,
  carousel?: CarouselData
): { dx: number; dy: number } {
  const spec = getCanvasDimensionSpec(carousel?.dimensionPreset);
  const ceilingY = spec.safeFooterCeilingY;

  // Horizontal bounds: -450 to +450
  const clampedDx = Math.max(-450, Math.min(450, desiredDx));

  // In Free Move mode or Headline-First preset, allow wide vertical positioning (-600..600)
  if (slide.freeMoveLayout || slide.compositionPreset === 'headline-first') {
    const clampedFreeDy = Math.max(-600, Math.min(600, desiredDy));
    return { dx: clampedDx, dy: clampedFreeDy };
  }

  // Compute base layout without the dragged element's override to find neighbor anchor points
  const baseSlide: SlideData = {
    ...slide,
    layoutOverrides: {
      ...(slide.layoutOverrides || {}),
      [elementId]: {
        ...(slide.layoutOverrides?.[elementId] || {}),
        dy: 0,
      },
    },
  };

  const layout = computeSlideLayoutAwareness(baseSlide, carousel);

  let minDy = -600;
  let maxDy = 600;

  if (elementId === 'headerBadge') {
    minDy = -36;
    maxDy = 80;
  } else if (elementId === 'graphicCard' && layout.graphicCard) {
    minDy = Math.max(-180, Math.round(120 * spec.graphicScale) - layout.graphicCard.y);
    maxDy = Math.min(480, ceilingY - Math.round(320 * spec.graphicScale) - layout.graphicCard.y);
  } else if (elementId === 'titleBlock' && layout.titleBlock && layout.graphicCard) {
    const minTop = layout.graphicCard.effectiveBottom + MIN_GAP_GRAPHIC_TO_TITLE;
    minDy = Math.round(minTop - layout.titleBlock.top);
    const followingH =
      (layout.arabicTitleBlock && !layout.arabicTitleBlock.hidden ? layout.arabicTitleBlock.height + MIN_GAP_TITLES : 0) +
      (layout.bodyBlock && !layout.bodyBlock.hidden ? layout.bodyBlock.height + MIN_GAP_TITLE_TO_BODY : 0) +
      (layout.arabicBodyBlock && !layout.arabicBodyBlock.hidden ? layout.arabicBodyBlock.height + MIN_GAP_BODIES : 0);
    maxDy = Math.round(Math.max(minDy, ceilingY - followingH - layout.titleBlock.bottom));
  } else if (elementId === 'arabicTitleBlock' && layout.arabicTitleBlock) {
    const minTop =
      (layout.titleBlock && !layout.titleBlock.hidden
        ? layout.titleBlock.bottom
        : layout.graphicCard && !layout.graphicCard.hidden
        ? layout.graphicCard.effectiveBottom
        : 200) + MIN_GAP_TITLES;
    minDy = Math.round(minTop - layout.arabicTitleBlock.top);
    const followingH =
      (layout.bodyBlock && !layout.bodyBlock.hidden ? layout.bodyBlock.height + MIN_GAP_TITLE_TO_BODY : 0) +
      (layout.arabicBodyBlock && !layout.arabicBodyBlock.hidden ? layout.arabicBodyBlock.height + MIN_GAP_BODIES : 0);
    maxDy = Math.round(Math.max(minDy, ceilingY - followingH - layout.arabicTitleBlock.bottom));
  } else if (elementId === 'bodyBlock' && layout.bodyBlock) {
    const minTop =
      (layout.arabicTitleBlock && !layout.arabicTitleBlock.hidden
        ? layout.arabicTitleBlock.bottom
        : layout.titleBlock && !layout.titleBlock.hidden
        ? layout.titleBlock.bottom
        : 200) + MIN_GAP_TITLE_TO_BODY;
    minDy = Math.round(minTop - layout.bodyBlock.top);
    const followingH =
      layout.arabicBodyBlock && !layout.arabicBodyBlock.hidden ? layout.arabicBodyBlock.height + MIN_GAP_BODIES : 0;
    maxDy = Math.round(Math.max(minDy, ceilingY - followingH - layout.bodyBlock.bottom));
  } else if (elementId === 'arabicBodyBlock' && layout.arabicBodyBlock) {
    const minTop =
      (layout.bodyBlock && !layout.bodyBlock.hidden
        ? layout.bodyBlock.bottom
        : layout.arabicTitleBlock && !layout.arabicTitleBlock.hidden
        ? layout.arabicTitleBlock.bottom
        : 200) + MIN_GAP_BODIES;
    minDy = Math.round(minTop - layout.arabicBodyBlock.top);
    maxDy = Math.round(Math.max(minDy, ceilingY - layout.arabicBodyBlock.bottom));
  } else if (elementId === 'takeawaysBlock' && layout.takeawaysBlock) {
    minDy = -160;
    maxDy = Math.round(Math.max(0, ceilingY - layout.takeawaysBlock.bottom + 24));
  } else if (elementId === 'ctaButton') {
    minDy = -180;
    maxDy = 180;
  } else if (elementId === 'attributionCard') {
    minDy = -220;
    maxDy = 60;
  }

  const clampedDy = Math.max(minDy, Math.min(maxDy, desiredDy));
  return { dx: clampedDx, dy: clampedDy };
}

