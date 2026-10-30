import type {
  CarouselData,
  CanvasDimensionPreset,
  GraphicalElementId,
  SlideData,
  ElementLayoutOverride,
} from '../../types.ts';
import {
  CANVAS_WIDTH,
  SAFE_MARGIN_LEFT,
  SAFE_CONTENT_WIDTH,
  FONT_TITLE_EN,
  FONT_TITLE_AR,
  FONT_BODY_EN,
  FONT_BODY_AR,
  CanvasDimensionSpec,
  getCanvasDimensionSpec,
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
}

export interface ComputedSlideLayout {
  slideType: string;
  dimensionPreset: CanvasDimensionPreset;
  canvasWidth: number;
  canvasHeight: number;
  headerBadge: {
    x: number;
    y: number;
    width: number;
    height: number;
    dx: number;
    dy: number;
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
  };
  ctaButton?: {
    x: number;
    y: number;
    width: number;
    height: number;
    dx: number;
    dy: number;
  };
  attributionCard?: {
    x: number;
    y: number;
    width: number;
    height: number;
    dx: number;
    dy: number;
  };
  hasCollisionWarning: boolean;
  collisionDetails?: string[];
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
  return `${hasCtx ? 1 : 0}|${preset}|${slide.type || ''}|${slide.enTitle || ''}|${slide.arTitle || ''}|${slide.enBody || ''}|${slide.arBody || ''}|${takeawaysCount}|${overridesKey}`;
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
 * Strictly guarantees that no element overlays or collides with another:
 * 1. Graphic card bottom + safe clearance dynamically bounds the top of the title block.
 * 2. Downward stacking is collision-aware: each subsequent block strictly flows below its predecessor.
 * 3. Incorporates user layout overrides (dx, dy, scale) with automatic anti-collision clamping.
 * 4. Smooth ceiling compression prevents text from overflowing into the bottom footer dots or platform UI.
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
  };

  // 2. CTA Slide Layout Awareness
  if (slide.type === 'cta') {
    return storeComputedLayout(cacheKey, computeCtaSlideLayout(slide, headerBadge, ctx, overrides, spec));
  }

  // 3. Graphic Card Layout & Effective Physical Bounds
  const graphicOverride = overrides.graphicCard;
  const gDx = graphicOverride?.dx || 0;
  const gDy = graphicOverride?.dy || 0;
  const gScale = graphicOverride?.scale ?? 1;

  let baseCardY = 240;
  let baseCardH = 490;
  if (slide.type === 'hub') {
    baseCardY = 190;
    baseCardH = 790;
  } else if (slide.type === 'poster') {
    baseCardY = 200;
    baseCardH = 430;
  } else if (slide.type === 'number') {
    baseCardY = 240;
    baseCardH = 430;
  }

  const cardY = Math.round(baseCardY * spec.graphicScale + spec.graphicOffsetY);
  const cardH = Math.round(baseCardH * spec.graphicScale);
  const cardW = Math.round(SAFE_CONTENT_WIDTH * spec.graphicScale);
  const cardX = Math.round(SAFE_MARGIN_LEFT * spec.graphicScale + spec.graphicOffsetX);

  const cy = cardY + cardH / 2;
  const effectiveTop = cy - (cardH / 2) * gScale + gDy;
  const effectiveBottom = cy + (cardH / 2) * gScale + gDy;

  const graphicCard: GraphicCardLayout = {
    x: cardX + gDx,
    y: cardY + gDy,
    width: cardW,
    height: cardH,
    effectiveTop,
    effectiveBottom,
    dx: gDx,
    dy: gDy,
    scale: gScale,
  };

  // 4. Content Slide Text Measurement & Scaling Pass
  const rawEnTitle = (slide.enTitle || '').trim();
  const rawArTitle = (slide.arTitle || '').trim();
  const rawEnBody = (slide.enBody || '').trim();
  const rawArBody = (slide.arBody || '').trim();

  // Floor ceiling for text zone:
  const textCeilingY = Math.max(cardY + cardH, effectiveBottom);

  const isCompactAspect = spec.height < 1920;
  const gapGraphicToTitle = isCompactAspect
    ? Math.max(24, Math.round(MIN_GAP_GRAPHIC_TO_TITLE * spec.graphicScale))
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
  const baseTakeawayRowH = takeawayCount === 1 ? 84 : takeawayCount === 2 ? 80 : 76;
  const takeawayRowH = isCompactAspect
    ? Math.max(62, Math.round(baseTakeawayRowH * Math.max(0.78, spec.graphicScale)))
    : baseTakeawayRowH;
  const takeawayGap = isCompactAspect ? 10 : 12;
  const takeawaysTotalH = hasTakeaways ? takeawayCount * takeawayRowH + (takeawayCount - 1) * takeawayGap : 0;
  const takeawayClearance = hasTakeaways ? takeawaysTotalH + minGapBodies : 0;

  const totalAvailableHeight = Math.max(
    180,
    spec.safeFooterCeilingY - textCeilingY - gapGraphicToTitle - takeawayClearance
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
    const enTitleTarget = Math.max(38, 74 * scale);
    const arTitleTarget = Math.max(36, 70 * scale);
    const bodyTarget = Math.max(26, 40 * scale);

    let enTitle = { lines: rawEnTitle ? [rawEnTitle] : [], fontSize: enTitleTarget, lineHeight: enTitleTarget * 1.19 };
    let arTitle = { lines: rawArTitle ? [rawArTitle] : [], fontSize: arTitleTarget, lineHeight: arTitleTarget * 1.457 };
    let enBody = { lines: rawEnBody ? [rawEnBody] : [], fontSize: bodyTarget, lineHeight: bodyTarget * 1.42 };
    let arBody = { lines: rawArBody ? [rawArBody] : [], fontSize: bodyTarget, lineHeight: bodyTarget * 1.526 };

    if (ctx) {
      if (rawEnTitle) {
        enTitle = fitTextInBox(ctx, rawEnTitle, spec.safeTextWidthTitle, enTitleTarget, FONT_TITLE_EN, '800', {
          maxLines: 2,
          minFontSize: isCompactAspect ? 36 : 44,
          lineHeightFactor: 1.19,
        });
      }
      if (rawArTitle) {
        arTitle = fitTextInBox(ctx, rawArTitle, spec.safeTextWidthTitle, arTitleTarget, FONT_TITLE_AR, '800', {
          maxLines: 2,
          minFontSize: isCompactAspect ? 34 : 42,
          lineHeightFactor: 1.457,
        });
      }
      if (rawEnBody) {
        enBody = fitTextInBox(ctx, rawEnBody, spec.safeTextWidthBody, bodyTarget, FONT_BODY_EN, '400', {
          maxLines: cap,
          minFontSize: 26,
          lineHeightFactor: 1.42,
        });
      }
      if (rawArBody) {
        arBody = fitTextInBox(ctx, rawArBody, spec.safeTextWidthBody, bodyTarget, FONT_BODY_AR, '400', {
          maxLines: cap,
          minFontSize: 26,
          lineHeightFactor: 1.526,
        });
      }
    }

    const gapTitles = enTitle.lines.length > 0 && arTitle.lines.length > 0 ? minGapTitles : 0;
    const gapTitlesToBody =
      (enTitle.lines.length > 0 || arTitle.lines.length > 0) && (enBody.lines.length > 0 || arBody.lines.length > 0)
        ? minGapTitleToBody
        : 0;
    const gapBodies = enBody.lines.length > 0 && arBody.lines.length > 0 ? minGapBodies : 0;

    const enTitleHeight = enTitle.lines.length > 0 ? (enTitle.lines.length - 1) * enTitle.lineHeight + enTitle.fontSize * 1.05 : 0;
    const arTitleHeight = arTitle.lines.length > 0 ? (arTitle.lines.length - 1) * arTitle.lineHeight + arTitle.fontSize * 1.08 : 0;
    const enBodyHeight = enBody.lines.length > 0 ? (enBody.lines.length - 1) * enBody.lineHeight + enBody.fontSize * 1.05 : 0;
    const arBodyHeight = arBody.lines.length > 0 ? (arBody.lines.length - 1) * arBody.lineHeight + arBody.fontSize * 1.08 : 0;

    const totalStackHeight =
      enTitleHeight + gapTitles + arTitleHeight + gapTitlesToBody + enBodyHeight + gapBodies + arBodyHeight;

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

  // 5. Layout Awareness: Guaranteed Non-Overlapping Stacking
  // Top cushion for optical vertical balance
  const remainingCushion = Math.max(0, totalAvailableHeight - measured.totalStackHeight);
  const naturalTopCushion = Math.min(Math.max(remainingCushion * 0.44, gapGraphicToTitle), 220);

  // Base starting Y position (ensures top of headline is strictly >= graphicCard.effectiveBottom + gapGraphicToTitle)
  const baseTitleTop = textCeilingY + naturalTopCushion;

  // Title Block with anti-collision clamping:
  const titleOverride = overrides.titleBlock;
  const tDx = titleOverride?.dx || 0;
  const tDy = titleOverride?.dy || 0;
  const actualTitleTop = Math.max(textCeilingY + gapGraphicToTitle, baseTitleTop + tDy);
  const titleFirstBaselineY = actualTitleTop + measured.enTitle.fontSize * 0.82;
  const actualTitleBottom = actualTitleTop + measured.enTitleHeight;

  let titleBlock: TextBlockLayout | undefined;
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
    };
  }

  // Arabic Title Block: strictly flows below titleBlock
  const arTitleOverride = overrides.arabicTitleBlock;
  const arTDx = arTitleOverride?.dx || 0;
  const arTDy = arTitleOverride?.dy || 0;
  const prevTitleBottom = titleBlock ? titleBlock.bottom : textCeilingY;
  const naturalArabicTop = prevTitleBottom + measured.gapTitles;
  const actualArabicTop = Math.max(prevTitleBottom + measured.gapTitles, naturalArabicTop + arTDy);
  const arabicFirstBaselineY = actualArabicTop + measured.arTitle.fontSize * 0.82;
  const actualArabicBottom = actualArabicTop + measured.arTitleHeight;

  let arabicTitleBlock: TextBlockLayout | undefined;
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
    };
  }

  // English Body Block: strictly flows below headlines
  const bodyOverride = overrides.bodyBlock;
  const bDx = bodyOverride?.dx || 0;
  const bDy = bodyOverride?.dy || 0;
  const prevHeadlineBottom = arabicTitleBlock ? arabicTitleBlock.bottom : (titleBlock ? titleBlock.bottom : textCeilingY);
  const naturalBodyTop = prevHeadlineBottom + measured.gapTitlesToBody;
  const actualBodyTop = Math.max(prevHeadlineBottom + measured.gapTitlesToBody, naturalBodyTop + bDy);
  const bodyFirstBaselineY = actualBodyTop + measured.enBody.fontSize * 0.82;
  const actualBodyBottom = actualBodyTop + measured.enBodyHeight;

  let bodyBlock: TextBlockLayout | undefined;
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
    };
  }

  // Arabic Body Block: strictly flows below English body
  const arBodyOverride = overrides.arabicBodyBlock;
  const arBDx = arBodyOverride?.dx || 0;
  const arBDy = arBodyOverride?.dy || 0;
  const prevBodyBottom = bodyBlock ? bodyBlock.bottom : prevHeadlineBottom;
  const naturalArBodyTop = prevBodyBottom + measured.gapBodies;
  const actualArBodyTop = Math.max(prevBodyBottom + measured.gapBodies, naturalArBodyTop + arBDy);
  const arBodyFirstBaselineY = actualArBodyTop + measured.arBody.fontSize * 0.82;
  const actualArBodyBottom = actualArBodyTop + measured.arBodyHeight;

  let arabicBodyBlock: TextBlockLayout | undefined;
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
    };
  }

  // 5b. Takeaways Block: strictly flows below Arabic body (or English body / headlines)
  let takeawaysBlock: ComputedSlideLayout['takeawaysBlock'] | undefined;
  if (hasTakeaways) {
    const prevBottom =
      arabicBodyBlock?.bottom || bodyBlock?.bottom || arabicTitleBlock?.bottom || titleBlock?.bottom || textCeilingY;
    const tOverride = overrides.takeawaysBlock;
    const tDx = tOverride?.dx || 0;
    const tDy = tOverride?.dy || 0;
    const naturalTop = prevBottom + minGapBodies;
    const actualTop = Math.max(prevBottom + minGapBodies, naturalTop + tDy);
    takeawaysBlock = {
      x: spec.safeMarginLeft + tDx,
      y: actualTop,
      width: spec.safeContentWidth,
      height: takeawaysTotalH,
      top: actualTop,
      bottom: actualTop + takeawaysTotalH,
      dx: tDx,
      dy: tDy,
    };
  }

  // 6. Safety Ceiling Compression Pass:
  // If user applied large positive dy offsets or compact aspect ratio pushes the stack past safeFooterCeilingY,
  // shift the blocks upward proportionally so they never clip footer pagination or social HUD overlays
  const stackLowestY =
    takeawaysBlock?.bottom ||
    arabicBodyBlock?.bottom ||
    bodyBlock?.bottom ||
    arabicTitleBlock?.bottom ||
    titleBlock?.bottom ||
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

  return storeComputedLayout(cacheKey, {
    slideType: slide.type,
    dimensionPreset: spec.id,
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
  spec: CanvasDimensionSpec
): ComputedSlideLayout {
  const gOverride = overrides.graphicCard;
  const gDx = gOverride?.dx || 0;
  const gDy = gOverride?.dy || 0;
  const gScale = gOverride?.scale ?? 1;

  // Graphic Emblem on CTA slide: y=250..640 on 9:16, scaled cleanly on shorter aspect ratios
  const baseCardY = Math.round(250 * spec.graphicScale + spec.graphicOffsetY);
  const baseCardH = Math.round(390 * spec.graphicScale);
  const cardW = Math.round(SAFE_CONTENT_WIDTH * spec.graphicScale);
  const cardX = Math.round(SAFE_MARGIN_LEFT * spec.graphicScale + spec.graphicOffsetX);
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
  };

  const rawEnTitle = (slide.enTitle || '').trim();
  const rawArTitle = (slide.arTitle || '').trim();

  const ctaFontScale = spec.height < 1920 ? Math.max(0.76, spec.graphicScale + 0.08) : 1;
  let enFontSize = Math.round(56 * ctaFontScale);
  let enLineHeight = enFontSize * 1.2;
  let enTitleH = Math.round(68 * ctaFontScale);
  let enTitleLines = rawEnTitle ? [rawEnTitle] : [];

  let arFontSize = Math.round(50 * ctaFontScale);
  let arLineHeight = arFontSize * 1.35;
  let arTitleH = Math.round(74 * ctaFontScale);
  let arTitleLines = rawArTitle ? [rawArTitle] : [];

  if (ctx) {
    if (rawEnTitle) {
      const enFit = fitTextInBox(ctx, rawEnTitle, spec.safeTextWidthTitle, enFontSize, FONT_TITLE_EN, '800', {
        maxLines: 2,
        minFontSize: 32,
        lineHeightFactor: 1.2,
      });
      enTitleLines = enFit.lines;
      enFontSize = enFit.fontSize;
      enLineHeight = enFit.lineHeight;
      enTitleH = enFit.lines.length * enFit.lineHeight;
    }
    if (rawArTitle) {
      const arFit = fitTextInBox(ctx, rawArTitle, spec.safeTextWidthTitle, arFontSize, FONT_TITLE_AR, '800', {
        maxLines: 2,
        minFontSize: 30,
        lineHeightFactor: 1.35,
      });
      arTitleLines = arFit.lines;
      arFontSize = arFit.fontSize;
      arLineHeight = arFit.lineHeight;
      arTitleH = arFit.lines.length * arFit.lineHeight;
    }
  }

  // Titles strictly start below the graphic emblem:
  const titleOverride = overrides.titleBlock;
  const tDx = titleOverride?.dx || 0;
  const tDy = titleOverride?.dy || 0;
  const minTitleStart = Math.round(680 * spec.graphicScale + spec.graphicOffsetY);
  const actualTitleTop = Math.max(effectiveBottom + Math.round(28 * ctaFontScale), minTitleStart + tDy);
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
  };

  const arTitleOverride = overrides.arabicTitleBlock;
  const arTDx = arTitleOverride?.dx || 0;
  const arTDy = arTitleOverride?.dy || 0;
  const titleGap = Math.round(16 * ctaFontScale);
  const actualArabicTop = Math.max(actualTitleBottom + titleGap, actualTitleBottom + titleGap + arTDy);
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
  };

  // Attribution card anchored safely above spec.safeFooterCeilingY:
  const attrOverride = overrides.attributionCard;
  const cardH = Math.round(92 * Math.max(0.82, ctaFontScale));
  const cardWAttr = Math.min(780, spec.safeContentWidth);
  const maxCardY = spec.safeFooterCeilingY - cardH - 12;
  const desiredCardY = maxCardY + (attrOverride?.dy || 0);
  const minGapAboveAttr = Math.round(130 * ctaFontScale);
  const attributionCard = {
    x: spec.safeTextCenterX - cardWAttr / 2 + (attrOverride?.dx || 0),
    y: Math.min(Math.max(actualArabicBottom + minGapAboveAttr, desiredCardY), maxCardY),
    width: cardWAttr,
    height: cardH,
    dx: attrOverride?.dx || 0,
    dy: attrOverride?.dy || 0,
  };

  // CTA Pill Button in the remaining vertical pocket:
  const ctaOverride = overrides.ctaButton;
  const pillW = Math.round(640 * Math.max(0.84, ctaFontScale));
  const pillH = Math.round(96 * Math.max(0.8, ctaFontScale));
  const urlY = attributionCard.y - Math.round(36 * ctaFontScale);
  const availablePillGap = Math.max(48, urlY - actualArabicBottom - pillH);
  const naturalPillY = Math.min(
    Math.max(actualArabicBottom + availablePillGap * 0.42, actualArabicBottom + 18),
    urlY - pillH - 14
  );
  const actualPillY = Math.min(
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
  };

  return {
    slideType: 'cta',
    dimensionPreset: spec.id,
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
 * Enforces strict boundary and collision limits during viewport dragging and nudging,
 * ensuring no element can ever be dragged on top of an adjacent element or outside safe zones.
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
    minDy = -30;
    maxDy = 40;
  } else if (elementId === 'graphicCard' && layout.graphicCard) {
    minDy = Math.max(-120, Math.round(140 * spec.graphicScale) - layout.graphicCard.y);
    maxDy = Math.min(400, ceilingY - Math.round(380 * spec.graphicScale) - layout.graphicCard.y);
  } else if (elementId === 'titleBlock' && layout.titleBlock && layout.graphicCard) {
    const minTop = layout.graphicCard.effectiveBottom + MIN_GAP_GRAPHIC_TO_TITLE;
    minDy = Math.round(minTop - layout.titleBlock.top);
    const followingH =
      (layout.arabicTitleBlock?.height || 0) +
      MIN_GAP_TITLES +
      (layout.bodyBlock?.height || 0) +
      MIN_GAP_TITLE_TO_BODY +
      (layout.arabicBodyBlock?.height || 0) +
      MIN_GAP_BODIES;
    maxDy = Math.round(Math.max(minDy, ceilingY - followingH - layout.titleBlock.bottom));
  } else if (elementId === 'arabicTitleBlock' && layout.arabicTitleBlock) {
    const minTop =
      (layout.titleBlock ? layout.titleBlock.bottom : layout.graphicCard ? layout.graphicCard.effectiveBottom : 240) +
      MIN_GAP_TITLES;
    minDy = Math.round(minTop - layout.arabicTitleBlock.top);
    const followingH =
      (layout.bodyBlock?.height || 0) +
      MIN_GAP_TITLE_TO_BODY +
      (layout.arabicBodyBlock?.height || 0) +
      MIN_GAP_BODIES;
    maxDy = Math.round(Math.max(minDy, ceilingY - followingH - layout.arabicTitleBlock.bottom));
  } else if (elementId === 'bodyBlock' && layout.bodyBlock) {
    const minTop =
      (layout.arabicTitleBlock
        ? layout.arabicTitleBlock.bottom
        : layout.titleBlock
        ? layout.titleBlock.bottom
        : 240) + MIN_GAP_TITLE_TO_BODY;
    minDy = Math.round(minTop - layout.bodyBlock.top);
    const followingH = (layout.arabicBodyBlock?.height || 0) + MIN_GAP_BODIES;
    maxDy = Math.round(Math.max(minDy, ceilingY - followingH - layout.bodyBlock.bottom));
  } else if (elementId === 'arabicBodyBlock' && layout.arabicBodyBlock) {
    const minTop =
      (layout.bodyBlock ? layout.bodyBlock.bottom : layout.arabicTitleBlock ? layout.arabicTitleBlock.bottom : 240) +
      MIN_GAP_BODIES;
    minDy = Math.round(minTop - layout.arabicBodyBlock.top);
    maxDy = Math.round(ceilingY - layout.arabicBodyBlock.bottom);
  }

  const clampedDy = Math.max(minDy, Math.min(maxDy, desiredDy));
  return { dx: clampedDx, dy: clampedDy };
}

