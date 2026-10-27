import { CarouselData, GraphicalElementId, SlideData } from '../../types.ts';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SAFE_FOOTER_CEILING_Y,
  SAFE_TEXT_WIDTH_TITLE,
  SAFE_TEXT_WIDTH_BODY,
  SAFE_TEXT_CENTER_X,
  SAFE_MARGIN_LEFT,
  SAFE_CONTENT_WIDTH,
} from './constants.ts';
import { fitTextInBox } from './textLayout.ts';

export interface ElementBounds {
  id: GraphicalElementId;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  topPct: string;
  leftPct: string;
  widthPct: string;
  heightPct: string;
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
 * Computes exact 1080x1920 pixel coordinates and percentage bounds
 * for all interactive elements on a slide, matching renderSlide.ts layout calculations.
 */
export function computeSlideElementBounds(
  slide: SlideData,
  carousel?: CarouselData
): Record<GraphicalElementId, ElementBounds> {
  const bounds: Partial<Record<GraphicalElementId, ElementBounds>> = {};
  const ctx = getMeasureContext();

  const toPct = (val: number, total: number) => `${((val / total) * 100).toFixed(2)}%`;

  const makeBound = (
    id: GraphicalElementId,
    label: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): ElementBounds => ({
    id,
    label,
    x,
    y,
    width,
    height,
    leftPct: toPct(x, CANVAS_WIDTH),
    topPct: toPct(y, CANVAS_HEIGHT),
    widthPct: toPct(width, CANVAS_WIDTH),
    heightPct: toPct(height, CANVAS_HEIGHT),
  });

  // 1. Header Badge (Header branding & category)
  bounds.headerBadge = makeBound(
    'headerBadge',
    'Top MARROK Header',
    80,
    100,
    CANVAS_WIDTH - 160,
    72
  );

  // 2. CTA Slide Layout
  if (slide.type === 'cta') {
    let curY = 685;
    const rawEnTitle = (slide.enTitle || '').trim();
    const rawArTitle = (slide.arTitle || '').trim();

    let enH = 68;
    if (ctx && rawEnTitle) {
      const enFit = fitTextInBox(ctx, rawEnTitle, 850, 56, '"Plus Jakarta Sans", sans-serif', '800', {
        maxLines: 2,
        minFontSize: 36,
        lineHeightFactor: 1.2,
      });
      enH = Math.max(56, enFit.lines.length * enFit.lineHeight);
    }
    bounds.titleBlock = makeBound(
      'titleBlock',
      'CTA Question Headline',
      SAFE_TEXT_CENTER_X - 425,
      curY - 10,
      850,
      enH + 16
    );
    curY += enH;

    let arH = 60;
    if (ctx && rawArTitle) {
      const arFit = fitTextInBox(ctx, rawArTitle, 850, 52, '"Cairo", sans-serif', '800', {
        maxLines: 2,
        minFontSize: 34,
        lineHeightFactor: 1.35,
      });
      arH = Math.max(50, arFit.lines.length * arFit.lineHeight);
    }
    bounds.arabicTitleBlock = makeBound(
      'arabicTitleBlock',
      'Arabic Question Subtitle',
      SAFE_TEXT_CENTER_X - 425,
      curY + 4,
      850,
      arH + 16
    );
    curY += arH + 8;

    // CTA Pill Button
    const pillW = 656;
    const pillH = 104;
    const cardH = 96;
    const cardY = 1710 - cardH - 24; // 1590px
    const urlY = cardY - 42; // 1548px
    const availablePillGap = Math.max(80, urlY - curY - pillH);
    const pillY = Math.min(Math.max(curY + availablePillGap * 0.42, 960), urlY - pillH - 40);

    bounds.ctaButton = makeBound(
      'ctaButton',
      'CTA Pill Button',
      SAFE_TEXT_CENTER_X - pillW / 2,
      pillY,
      pillW,
      pillH
    );

    // Attribution Card
    bounds.attributionCard = makeBound(
      'attributionCard',
      'Attribution & Creator Card',
      SAFE_TEXT_CENTER_X - 780 / 2,
      cardY,
      780,
      cardH
    );

    return bounds as Record<GraphicalElementId, ElementBounds>;
  }

  // 3. Graphic Card / Diagram Area
  let yGraphicEnd = 730;
  if (slide.type === 'hub') {
    bounds.graphicCard = makeBound(
      'graphicCard',
      'Central Hub & Orbital Satellites',
      SAFE_MARGIN_LEFT,
      190,
      SAFE_CONTENT_WIDTH,
      790
    );
    yGraphicEnd = 980;
  } else if (slide.type === 'number') {
    bounds.graphicCard = makeBound(
      'graphicCard',
      'Big Number & Metric Badge',
      SAFE_MARGIN_LEFT,
      240,
      SAFE_CONTENT_WIDTH,
      430
    );
    yGraphicEnd = 670;
  } else {
    // row, code, compare, metric, image
    const cardLabel =
      slide.type === 'code'
        ? 'Code Window Terminal'
        : slide.type === 'compare'
        ? 'Comparison Columns'
        : slide.type === 'metric'
        ? 'Metrics Grid Card'
        : slide.type === 'image'
        ? 'Architecture Image Canvas'
        : 'Technical Diagram Card';

    bounds.graphicCard = makeBound(
      'graphicCard',
      cardLabel,
      SAFE_MARGIN_LEFT,
      240,
      SAFE_CONTENT_WIDTH,
      490
    );
    yGraphicEnd = 730;
  }

  // 4. Content Slides Text Layout (identical to renderSlide.ts)
  const rawEnTitle = (slide.enTitle || '').trim();
  const rawArTitle = (slide.arTitle || '').trim();
  const rawEnBody = (slide.enBody || '').trim();
  const rawArBody = (slide.arBody || '').trim();

  const availableHeight = SAFE_FOOTER_CEILING_Y - yGraphicEnd;

  let textScale = availableHeight >= 940 ? 1.06 : 1.0;
  let bodyCap = 4;

  let enTitleLinesCount = rawEnTitle ? (rawEnTitle.length > 28 ? 2 : 1) : 0;
  let arTitleLinesCount = rawArTitle ? (rawArTitle.length > 25 ? 2 : 1) : 0;
  let enBodyLinesCount = rawEnBody ? Math.min(bodyCap, Math.ceil(rawEnBody.length / 42)) : 0;
  let arBodyLinesCount = rawArBody ? Math.min(bodyCap, Math.ceil(rawArBody.length / 38)) : 0;

  let enTitleLineHeight = 74 * textScale * 1.19;
  let arTitleLineHeight = 70 * textScale * 1.457;
  let enBodyLineHeight = 40 * textScale * 1.42;
  let arBodyLineHeight = 40 * textScale * 1.526;

  // Track font sizes for baseline-accurate bounding boxes
  let enTitleFontSize = 74 * textScale;
  let arTitleFontSize = 70 * textScale;
  let enBodyFontSize = 40 * textScale;
  let arBodyFontSize = 40 * textScale;

  if (ctx) {
    const buildLayout = (scale: number, cap: number) => {
      const enTitle = fitTextInBox(ctx, rawEnTitle, SAFE_TEXT_WIDTH_TITLE, 74 * scale, '"Plus Jakarta Sans", sans-serif', '800', {
        maxLines: 2,
        minFontSize: 44,
        lineHeightFactor: 1.19,
      });
      const arTitle = fitTextInBox(ctx, rawArTitle, SAFE_TEXT_WIDTH_TITLE, 70 * scale, '"Cairo", sans-serif', '800', {
        maxLines: 2,
        minFontSize: 42,
        lineHeightFactor: 1.457,
      });
      const enBody = fitTextInBox(ctx, rawEnBody, SAFE_TEXT_WIDTH_BODY, 40 * scale, '"Plus Jakarta Sans", sans-serif', '400', {
        maxLines: cap,
        minFontSize: 26,
        lineHeightFactor: 1.42,
      });
      const arBody = fitTextInBox(ctx, rawArBody, SAFE_TEXT_WIDTH_BODY, 40 * scale, '"Cairo", sans-serif', '400', {
        maxLines: cap,
        minFontSize: 26,
        lineHeightFactor: 1.526,
      });

      const gapTitles = enTitle.lines.length > 0 && arTitle.lines.length > 0 ? 18 : 0;
      const gapTitlesToBody =
        (enTitle.lines.length > 0 || arTitle.lines.length > 0) &&
        (enBody.lines.length > 0 || arBody.lines.length > 0)
          ? 40
          : 0;
      const gapBodies = enBody.lines.length > 0 && arBody.lines.length > 0 ? 24 : 0;

      const hTextTotal =
        enTitle.lines.length * enTitle.lineHeight +
        gapTitles +
        arTitle.lines.length * arTitle.lineHeight +
        gapTitlesToBody +
        enBody.lines.length * enBody.lineHeight +
        gapBodies +
        arBody.lines.length * arBody.lineHeight;

      return { enTitle, arTitle, enBody, arBody, gapTitles, gapTitlesToBody, gapBodies, hTextTotal };
    };

    let layout = buildLayout(textScale, bodyCap);
    while (layout.hTextTotal > availableHeight - 24 && textScale > 0.65) {
      textScale = Math.max(0.65, textScale - 0.05);
      layout = buildLayout(textScale, bodyCap);
    }
    while (layout.hTextTotal > availableHeight - 20 && bodyCap > 2) {
      bodyCap -= 1;
      layout = buildLayout(textScale, bodyCap);
    }

    enTitleLinesCount = layout.enTitle.lines.length;
    arTitleLinesCount = layout.arTitle.lines.length;
    enBodyLinesCount = layout.enBody.lines.length;
    arBodyLinesCount = layout.arBody.lines.length;

    enTitleLineHeight = layout.enTitle.lineHeight;
    arTitleLineHeight = layout.arTitle.lineHeight;
    enBodyLineHeight = layout.enBody.lineHeight;
    arBodyLineHeight = layout.arBody.lineHeight;

    enTitleFontSize = layout.enTitle.fontSize;
    arTitleFontSize = layout.arTitle.fontSize;
    enBodyFontSize = layout.enBody.fontSize;
    arBodyFontSize = layout.arBody.fontSize;
  }

  const gapTitles = enTitleLinesCount > 0 && arTitleLinesCount > 0 ? 18 : 0;
  const gapTitlesToBody =
    (enTitleLinesCount > 0 || arTitleLinesCount > 0) && (enBodyLinesCount > 0 || arBodyLinesCount > 0)
      ? 40
      : 0;
  const gapBodies = enBodyLinesCount > 0 && arBodyLinesCount > 0 ? 24 : 0;

  const hTextTotal =
    enTitleLinesCount * enTitleLineHeight +
    gapTitles +
    arTitleLinesCount * arTitleLineHeight +
    gapTitlesToBody +
    enBodyLinesCount * enBodyLineHeight +
    gapBodies +
    arBodyLinesCount * arBodyLineHeight;

  const remainingSpace = availableHeight - hTextTotal;
  const topCushion = Math.min(Math.max(remainingSpace * 0.44, 34), 260);
  let currentY = yGraphicEnd + topCushion;

  // Title Block (Alphabetic baseline aware)
  if (enTitleLinesCount > 0) {
    const blockTop = currentY - enTitleFontSize * 0.82;
    const blockH = (enTitleLinesCount - 1) * enTitleLineHeight + enTitleFontSize * 1.05;
    bounds.titleBlock = makeBound(
      'titleBlock',
      'English Headline',
      SAFE_TEXT_CENTER_X - SAFE_TEXT_WIDTH_TITLE / 2,
      blockTop,
      SAFE_TEXT_WIDTH_TITLE,
      blockH
    );
    currentY += enTitleLinesCount * enTitleLineHeight;
  }

  // Arabic Title Block
  if (arTitleLinesCount > 0) {
    currentY += gapTitles;
    const blockTop = currentY - arTitleFontSize * 0.82;
    const blockH = (arTitleLinesCount - 1) * arTitleLineHeight + arTitleFontSize * 1.08;
    bounds.arabicTitleBlock = makeBound(
      'arabicTitleBlock',
      'Arabic Headline',
      SAFE_TEXT_CENTER_X - SAFE_TEXT_WIDTH_TITLE / 2,
      blockTop,
      SAFE_TEXT_WIDTH_TITLE,
      blockH
    );
    currentY += arTitleLinesCount * arTitleLineHeight;
  }

  // English Body Block
  if (enBodyLinesCount > 0) {
    currentY += gapTitlesToBody;
    const blockTop = currentY - enBodyFontSize * 0.82;
    const blockH = (enBodyLinesCount - 1) * enBodyLineHeight + enBodyFontSize * 1.05;
    bounds.bodyBlock = makeBound(
      'bodyBlock',
      'English Technical Details',
      SAFE_TEXT_CENTER_X - SAFE_TEXT_WIDTH_BODY / 2,
      blockTop,
      SAFE_TEXT_WIDTH_BODY,
      blockH
    );
    currentY += enBodyLinesCount * enBodyLineHeight;
  }

  // Arabic Body Block
  if (arBodyLinesCount > 0) {
    currentY += gapBodies;
    const blockTop = currentY - arBodyFontSize * 0.82;
    const blockH = (arBodyLinesCount - 1) * arBodyLineHeight + arBodyFontSize * 1.08;
    bounds.arabicBodyBlock = makeBound(
      'arabicBodyBlock',
      'Arabic Technical Details',
      SAFE_TEXT_CENTER_X - SAFE_TEXT_WIDTH_BODY / 2,
      blockTop,
      SAFE_TEXT_WIDTH_BODY,
      blockH
    );
    currentY += arBodyLinesCount * arBodyLineHeight;
  }

  return bounds as Record<GraphicalElementId, ElementBounds>;
}

/**
 * Accurately finds the graphical element clicked in 1080x1920 coordinates.
 */
export function findSlideElementAtPoint(
  canvasX: number,
  canvasY: number,
  boundsMap: Record<GraphicalElementId, ElementBounds>,
  overrides?: Record<string, { dx?: number; dy?: number; scale?: number }>
): GraphicalElementId | null {
  const pad = 14;

  // Priority order for hit testing: text blocks first, then buttons, then graphic card, then header
  const priorityOrder: GraphicalElementId[] = [
    'ctaButton',
    'attributionCard',
    'arabicBodyBlock',
    'bodyBlock',
    'arabicTitleBlock',
    'titleBlock',
    'graphicCard',
    'headerBadge',
  ];

  for (const id of priorityOrder) {
    const bound = boundsMap[id];
    if (!bound) continue;

    const override = overrides?.[id];
    const dx = override?.dx ?? 0;
    const dy = override?.dy ?? 0;
    const scale = override?.scale ?? 1;

    const left = bound.x + dx - (bound.width * (scale - 1)) / 2 - pad;
    const right = bound.x + dx + bound.width + (bound.width * (scale - 1)) / 2 + pad;
    const top = bound.y + dy - (bound.height * (scale - 1)) / 2 - pad;
    const bottom = bound.y + dy + bound.height + (bound.height * (scale - 1)) / 2 + pad;

    if (canvasX >= left && canvasX <= right && canvasY >= top && canvasY <= bottom) {
      return id;
    }
  }

  return null;
}
