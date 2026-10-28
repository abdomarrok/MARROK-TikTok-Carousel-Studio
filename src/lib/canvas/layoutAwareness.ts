import type { CarouselData, GraphicalElementId, SlideData, ElementLayoutOverride } from '../../types.ts';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SAFE_FOOTER_CEILING_Y,
  SAFE_TEXT_WIDTH_TITLE,
  SAFE_TEXT_WIDTH_BODY,
  SAFE_TEXT_CENTER_X,
  SAFE_MARGIN_LEFT,
  SAFE_MARGIN_RIGHT,
  SAFE_CONTENT_WIDTH,
  FONT_TITLE_EN,
  FONT_TITLE_AR,
  FONT_BODY_EN,
  FONT_BODY_AR,
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

/**
 * Slide Layout Awareness Engine:
 * Computes exact positions, bounds, and baseline coordinates for all elements on a slide.
 * Strictly guarantees that no element overlays or collides with another:
 * 1. Graphic card bottom + safe clearance (44px) dynamically bounds the top of the title block.
 * 2. Downward stacking is collision-aware: each subsequent block strictly flows below its predecessor.
 * 3. Incorporates user layout overrides (dx, dy, scale) with automatic anti-collision clamping.
 * 4. Smooth ceiling compression prevents text from overflowing into the bottom footer dots.
 */
export function computeSlideLayoutAwareness(
  slide: SlideData,
  _carousel?: CarouselData
): ComputedSlideLayout {
  const ctx = getMeasureContext();
  const overrides = slide.layoutOverrides || {};

  // 1. Header Badge Layout
  const headerOverride = overrides.headerBadge;
  const headerBadge = {
    x: 80 + (headerOverride?.dx || 0),
    y: 100 + (headerOverride?.dy || 0),
    width: CANVAS_WIDTH - 160,
    height: 72,
    dx: headerOverride?.dx || 0,
    dy: headerOverride?.dy || 0,
  };

  // 2. CTA Slide Layout Awareness
  if (slide.type === 'cta') {
    return computeCtaSlideLayout(slide, headerBadge, ctx, overrides);
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

  const cy = baseCardY + baseCardH / 2;
  const effectiveTop = cy - (baseCardH / 2) * gScale + gDy;
  const effectiveBottom = cy + (baseCardH / 2) * gScale + gDy;

  const graphicCard: GraphicCardLayout = {
    x: SAFE_MARGIN_LEFT + gDx,
    y: baseCardY + gDy,
    width: SAFE_CONTENT_WIDTH,
    height: baseCardH,
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
  const textCeilingY = Math.max(baseCardY + baseCardH, effectiveBottom);

  // Takeaway reservation
  const hasTakeaways = Boolean(slide.takeaways && slide.takeaways.length > 0);
  const takeawayCount = hasTakeaways ? Math.min(3, slide.takeaways!.length) : 0;
  const takeawayRowH = takeawayCount === 1 ? 84 : takeawayCount === 2 ? 80 : 76;
  const takeawayGap = 12;
  const takeawaysTotalH = hasTakeaways ? takeawayCount * takeawayRowH + (takeawayCount - 1) * takeawayGap : 0;
  const takeawayClearance = hasTakeaways ? takeawaysTotalH + MIN_GAP_BODIES : 0;

  const totalAvailableHeight = Math.max(
    240,
    SAFE_FOOTER_CEILING_Y - textCeilingY - MIN_GAP_GRAPHIC_TO_TITLE - takeawayClearance
  );

  // Dynamic font fitting pass
  let textScale = hasTakeaways ? 0.90 : (totalAvailableHeight >= 940 ? 1.06 : 1.0);
  let bodyCap = hasTakeaways ? 2 : 4;

  const measureTextPass = (scale: number, cap: number) => {
    let enTitle = { lines: rawEnTitle ? [rawEnTitle] : [], fontSize: 74 * scale, lineHeight: 74 * scale * 1.19 };
    let arTitle = { lines: rawArTitle ? [rawArTitle] : [], fontSize: 70 * scale, lineHeight: 70 * scale * 1.457 };
    let enBody = { lines: rawEnBody ? [rawEnBody] : [], fontSize: 40 * scale, lineHeight: 40 * scale * 1.42 };
    let arBody = { lines: rawArBody ? [rawArBody] : [], fontSize: 40 * scale, lineHeight: 40 * scale * 1.526 };

    if (ctx) {
      if (rawEnTitle) {
        enTitle = fitTextInBox(ctx, rawEnTitle, SAFE_TEXT_WIDTH_TITLE, 74 * scale, FONT_TITLE_EN, '800', {
          maxLines: 2,
          minFontSize: 44,
          lineHeightFactor: 1.19,
        });
      }
      if (rawArTitle) {
        arTitle = fitTextInBox(ctx, rawArTitle, SAFE_TEXT_WIDTH_TITLE, 70 * scale, FONT_TITLE_AR, '800', {
          maxLines: 2,
          minFontSize: 42,
          lineHeightFactor: 1.457,
        });
      }
      if (rawEnBody) {
        enBody = fitTextInBox(ctx, rawEnBody, SAFE_TEXT_WIDTH_BODY, 40 * scale, FONT_BODY_EN, '400', {
          maxLines: cap,
          minFontSize: 26,
          lineHeightFactor: 1.42,
        });
      }
      if (rawArBody) {
        arBody = fitTextInBox(ctx, rawArBody, SAFE_TEXT_WIDTH_BODY, 40 * scale, FONT_BODY_AR, '400', {
          maxLines: cap,
          minFontSize: 26,
          lineHeightFactor: 1.526,
        });
      }
    }

    const gapTitles = enTitle.lines.length > 0 && arTitle.lines.length > 0 ? MIN_GAP_TITLES : 0;
    const gapTitlesToBody = (enTitle.lines.length > 0 || arTitle.lines.length > 0) && (enBody.lines.length > 0 || arBody.lines.length > 0) ? MIN_GAP_TITLE_TO_BODY : 0;
    const gapBodies = enBody.lines.length > 0 && arBody.lines.length > 0 ? MIN_GAP_BODIES : 0;

    const enTitleHeight = enTitle.lines.length > 0 ? (enTitle.lines.length - 1) * enTitle.lineHeight + enTitle.fontSize * 1.05 : 0;
    const arTitleHeight = arTitle.lines.length > 0 ? (arTitle.lines.length - 1) * arTitle.lineHeight + arTitle.fontSize * 1.08 : 0;
    const enBodyHeight = enBody.lines.length > 0 ? (enBody.lines.length - 1) * enBody.lineHeight + enBody.fontSize * 1.05 : 0;
    const arBodyHeight = arBody.lines.length > 0 ? (arBody.lines.length - 1) * arBody.lineHeight + arBody.fontSize * 1.08 : 0;

    const totalStackHeight = enTitleHeight + gapTitles + arTitleHeight + gapTitlesToBody + enBodyHeight + gapBodies + arBodyHeight;

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
  while (measured.totalStackHeight > totalAvailableHeight - 20 && textScale > 0.65) {
    textScale = Math.max(0.65, textScale - 0.05);
    measured = measureTextPass(textScale, bodyCap);
  }
  while (measured.totalStackHeight > totalAvailableHeight - 15 && bodyCap > 2) {
    bodyCap -= 1;
    measured = measureTextPass(textScale, bodyCap);
  }

  // 5. Layout Awareness: Guaranteed Non-Overlapping Stacking
  // Top cushion for optical vertical balance
  const remainingCushion = Math.max(0, totalAvailableHeight - measured.totalStackHeight);
  const naturalTopCushion = Math.min(Math.max(remainingCushion * 0.44, MIN_GAP_GRAPHIC_TO_TITLE), 240);

  // Base starting Y position (ensures top of headline is strictly >= graphicCard.effectiveBottom + 44)
  const baseTitleTop = textCeilingY + naturalTopCushion;

  // Title Block with anti-collision clamping:
  const titleOverride = overrides.titleBlock;
  const tDx = titleOverride?.dx || 0;
  const tDy = titleOverride?.dy || 0;
  const actualTitleTop = Math.max(textCeilingY + MIN_GAP_GRAPHIC_TO_TITLE, baseTitleTop + tDy);
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
    const prevBottom = arabicBodyBlock?.bottom || bodyBlock?.bottom || arabicTitleBlock?.bottom || titleBlock?.bottom || textCeilingY;
    const tOverride = overrides.takeawaysBlock;
    const tDx = tOverride?.dx || 0;
    const tDy = tOverride?.dy || 0;
    const naturalTop = prevBottom + MIN_GAP_BODIES;
    const actualTop = Math.max(prevBottom + MIN_GAP_BODIES, naturalTop + tDy);
    takeawaysBlock = {
      x: SAFE_MARGIN_LEFT + tDx,
      y: actualTop,
      width: SAFE_CONTENT_WIDTH,
      height: takeawaysTotalH,
      top: actualTop,
      bottom: actualTop + takeawaysTotalH,
      dx: tDx,
      dy: tDy,
    };
  }

  // 6. Safety Ceiling Compression Pass:
  // If user applied large positive dy offsets that push the stack past SAFE_FOOTER_CEILING_Y,
  // shift the blocks upward proportionally so they never clip footer pagination
  const stackLowestY = takeawaysBlock?.bottom || arabicBodyBlock?.bottom || bodyBlock?.bottom || arabicTitleBlock?.bottom || titleBlock?.bottom || textCeilingY;
  const footerOverflow = stackLowestY - SAFE_FOOTER_CEILING_Y;

  if (footerOverflow > 0 && titleBlock) {
    const maxUpwardShift = Math.max(0, titleBlock.top - (textCeilingY + MIN_GAP_GRAPHIC_TO_TITLE));
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

  return {
    slideType: slide.type,
    headerBadge,
    graphicCard,
    titleBlock,
    arabicTitleBlock,
    bodyBlock,
    arabicBodyBlock,
    takeawaysBlock,
    hasCollisionWarning: false,
  };
}

/**
 * CTA Slide Layout Awareness Handler
 */
function computeCtaSlideLayout(
  slide: SlideData,
  headerBadge: ComputedSlideLayout['headerBadge'],
  ctx: CanvasRenderingContext2D | null,
  overrides: Partial<Record<GraphicalElementId, ElementLayoutOverride>>
): ComputedSlideLayout {
  const gOverride = overrides.graphicCard;
  const gDx = gOverride?.dx || 0;
  const gDy = gOverride?.dy || 0;
  const gScale = gOverride?.scale ?? 1;

  // Graphic Emblem on CTA slide: y=250..640
  const baseCardY = 250;
  const baseCardH = 390;
  const cy = baseCardY + baseCardH / 2;
  const effectiveTop = cy - (baseCardH / 2) * gScale + gDy;
  const effectiveBottom = cy + (baseCardH / 2) * gScale + gDy;

  const graphicCard: GraphicCardLayout = {
    x: SAFE_MARGIN_LEFT + gDx,
    y: baseCardY + gDy,
    width: SAFE_CONTENT_WIDTH,
    height: baseCardH,
    effectiveTop,
    effectiveBottom,
    dx: gDx,
    dy: gDy,
    scale: gScale,
  };

  const rawEnTitle = (slide.enTitle || '').trim();
  const rawArTitle = (slide.arTitle || '').trim();

  let enTitleH = 68;
  let enTitleLines = rawEnTitle ? [rawEnTitle] : [];
  let enFontSize = 56;
  let enLineHeight = 56 * 1.2;

  let arTitleH = 74;
  let arTitleLines = rawArTitle ? [rawArTitle] : [];
  let arFontSize = 50;
  let arLineHeight = 50 * 1.35;

  if (ctx) {
    if (rawEnTitle) {
      const enFit = fitTextInBox(ctx, rawEnTitle, 850, 56, FONT_TITLE_EN, '800', {
        maxLines: 2,
        minFontSize: 36,
        lineHeightFactor: 1.2,
      });
      enTitleLines = enFit.lines;
      enFontSize = enFit.fontSize;
      enLineHeight = enFit.lineHeight;
      enTitleH = enFit.lines.length * enFit.lineHeight;
    }
    if (rawArTitle) {
      const arFit = fitTextInBox(ctx, rawArTitle, 850, 50, FONT_TITLE_AR, '800', {
        maxLines: 2,
        minFontSize: 34,
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
  const actualTitleTop = Math.max(effectiveBottom + 32, 680 + tDy);
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
  const actualArabicTop = Math.max(actualTitleBottom + 16, actualTitleBottom + 16 + arTDy);
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

  // Attribution card at bottom:
  const attrOverride = overrides.attributionCard;
  const cardH = 96;
  const cardY = 1710 - cardH - 24 + (attrOverride?.dy || 0);
  const attributionCard = {
    x: SAFE_TEXT_CENTER_X - 780 / 2 + (attrOverride?.dx || 0),
    y: Math.min(Math.max(actualArabicBottom + 140, cardY), 1620),
    width: 780,
    height: cardH,
    dx: attrOverride?.dx || 0,
    dy: attrOverride?.dy || 0,
  };

  // CTA Pill Button in the remaining vertical pocket:
  const ctaOverride = overrides.ctaButton;
  const pillW = 656;
  const pillH = 104;
  const urlY = attributionCard.y - 42;
  const availablePillGap = Math.max(80, urlY - actualArabicBottom - pillH);
  const naturalPillY = Math.min(Math.max(actualArabicBottom + availablePillGap * 0.42, actualArabicBottom + 32), urlY - pillH - 24);
  const actualPillY = Math.min(Math.max(actualArabicBottom + 24, naturalPillY + (ctaOverride?.dy || 0)), urlY - pillH - 16);

  const ctaButton = {
    x: SAFE_TEXT_CENTER_X - pillW / 2 + (ctaOverride?.dx || 0),
    y: actualPillY,
    width: pillW,
    height: pillH,
    dx: ctaOverride?.dx || 0,
    dy: ctaOverride?.dy || 0,
  };

  return {
    slideType: 'cta',
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
    minDy = Math.max(-120, 190 - layout.graphicCard.y);
    maxDy = Math.min(400, SAFE_FOOTER_CEILING_Y - 450 - layout.graphicCard.y);
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
    maxDy = Math.round(Math.max(minDy, SAFE_FOOTER_CEILING_Y - followingH - layout.titleBlock.bottom));
  } else if (elementId === 'arabicTitleBlock' && layout.arabicTitleBlock) {
    const minTop = (layout.titleBlock ? layout.titleBlock.bottom : (layout.graphicCard ? layout.graphicCard.effectiveBottom : 240)) + MIN_GAP_TITLES;
    minDy = Math.round(minTop - layout.arabicTitleBlock.top);
    const followingH =
      (layout.bodyBlock?.height || 0) +
      MIN_GAP_TITLE_TO_BODY +
      (layout.arabicBodyBlock?.height || 0) +
      MIN_GAP_BODIES;
    maxDy = Math.round(Math.max(minDy, SAFE_FOOTER_CEILING_Y - followingH - layout.arabicTitleBlock.bottom));
  } else if (elementId === 'bodyBlock' && layout.bodyBlock) {
    const minTop = (layout.arabicTitleBlock ? layout.arabicTitleBlock.bottom : (layout.titleBlock ? layout.titleBlock.bottom : 240)) + MIN_GAP_TITLE_TO_BODY;
    minDy = Math.round(minTop - layout.bodyBlock.top);
    const followingH = (layout.arabicBodyBlock?.height || 0) + MIN_GAP_BODIES;
    maxDy = Math.round(Math.max(minDy, SAFE_FOOTER_CEILING_Y - followingH - layout.bodyBlock.bottom));
  } else if (elementId === 'arabicBodyBlock' && layout.arabicBodyBlock) {
    const minTop = (layout.bodyBlock ? layout.bodyBlock.bottom : (layout.arabicTitleBlock ? layout.arabicTitleBlock.bottom : 240)) + MIN_GAP_BODIES;
    minDy = Math.round(minTop - layout.arabicBodyBlock.top);
    maxDy = Math.round(SAFE_FOOTER_CEILING_Y - layout.arabicBodyBlock.bottom);
  }

  const clampedDy = Math.max(minDy, Math.min(maxDy, desiredDy));
  return { dx: clampedDx, dy: clampedDy };
}
