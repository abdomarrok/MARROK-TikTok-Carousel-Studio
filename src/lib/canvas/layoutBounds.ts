import type { CarouselData, GraphicalElementId, SlideData } from '../../types.ts';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SAFE_TEXT_WIDTH_TITLE,
  SAFE_TEXT_WIDTH_BODY,
  SAFE_TEXT_CENTER_X,
} from './constants.ts';
import { computeSlideLayoutAwareness } from './layoutAwareness.ts';

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

/**
 * Computes exact 1080x1920 pixel coordinates and percentage bounds
 * for all interactive elements on a slide, powered by the non-overlapping
 * Slide Layout Awareness Engine.
 */
export function computeSlideElementBounds(
  slide: SlideData,
  carousel?: CarouselData
): Record<GraphicalElementId, ElementBounds> {
  const bounds: Partial<Record<GraphicalElementId, ElementBounds>> = {};
  const layout = computeSlideLayoutAwareness(slide, carousel);

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

  // 1. Header Badge
  bounds.headerBadge = makeBound(
    'headerBadge',
    'Top MARROK Header',
    layout.headerBadge.x,
    layout.headerBadge.y,
    layout.headerBadge.width,
    layout.headerBadge.height
  );

  // 2. Graphic Card
  if (layout.graphicCard) {
    const cardLabel =
      slide.type === 'hub'
        ? 'Central Hub & Orbital Satellites'
        : slide.type === 'number'
        ? 'Big Number & Metric Badge'
        : slide.type === 'code'
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
      layout.graphicCard.x,
      layout.graphicCard.y,
      layout.graphicCard.width,
      layout.graphicCard.height
    );
  }

  // 3. CTA Buttons / Attribution
  if (layout.ctaButton) {
    bounds.ctaButton = makeBound(
      'ctaButton',
      'CTA Pill Button',
      layout.ctaButton.x,
      layout.ctaButton.y,
      layout.ctaButton.width,
      layout.ctaButton.height
    );
  }
  if (layout.attributionCard) {
    bounds.attributionCard = makeBound(
      'attributionCard',
      'Attribution & Creator Card',
      layout.attributionCard.x,
      layout.attributionCard.y,
      layout.attributionCard.width,
      layout.attributionCard.height
    );
  }

  // 4. Content Text Blocks
  if (layout.titleBlock) {
    bounds.titleBlock = makeBound(
      'titleBlock',
      'English Headline',
      SAFE_TEXT_CENTER_X - SAFE_TEXT_WIDTH_TITLE / 2 + layout.titleBlock.dx,
      layout.titleBlock.top,
      SAFE_TEXT_WIDTH_TITLE,
      layout.titleBlock.height
    );
  }

  if (layout.arabicTitleBlock) {
    bounds.arabicTitleBlock = makeBound(
      'arabicTitleBlock',
      'Arabic Headline',
      SAFE_TEXT_CENTER_X - SAFE_TEXT_WIDTH_TITLE / 2 + layout.arabicTitleBlock.dx,
      layout.arabicTitleBlock.top,
      SAFE_TEXT_WIDTH_TITLE,
      layout.arabicTitleBlock.height
    );
  }

  if (layout.bodyBlock) {
    bounds.bodyBlock = makeBound(
      'bodyBlock',
      'English Technical Details',
      SAFE_TEXT_CENTER_X - SAFE_TEXT_WIDTH_BODY / 2 + layout.bodyBlock.dx,
      layout.bodyBlock.top,
      SAFE_TEXT_WIDTH_BODY,
      layout.bodyBlock.height
    );
  }

  if (layout.arabicBodyBlock) {
    bounds.arabicBodyBlock = makeBound(
      'arabicBodyBlock',
      'Arabic Technical Details',
      SAFE_TEXT_CENTER_X - SAFE_TEXT_WIDTH_BODY / 2 + layout.arabicBodyBlock.dx,
      layout.arabicBodyBlock.top,
      SAFE_TEXT_WIDTH_BODY,
      layout.arabicBodyBlock.height
    );
  }

  if (layout.takeawaysBlock) {
    bounds.takeawaysBlock = makeBound(
      'takeawaysBlock',
      'Key Takeaways Bento List',
      layout.takeawaysBlock.x,
      layout.takeawaysBlock.y,
      layout.takeawaysBlock.width,
      layout.takeawaysBlock.height
    );
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

  // Priority order for hit testing: takeaways & text blocks first, then buttons, then graphic card, then header
  const priorityOrder: GraphicalElementId[] = [
    'ctaButton',
    'attributionCard',
    'takeawaysBlock',
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

    // Note: bounds from computeSlideLayoutAwareness already incorporate dx and dy for text & cards!
    // But if overrides are passed separately, ensure we do not double count
    const hasAlreadyShifted = bound.x !== SAFE_TEXT_CENTER_X - SAFE_TEXT_WIDTH_TITLE / 2 && bound.id.includes('Block');
    const effDx = hasAlreadyShifted ? 0 : dx;
    const effDy = hasAlreadyShifted ? 0 : dy;

    const left = bound.x + effDx - (bound.width * (scale - 1)) / 2 - pad;
    const right = bound.x + effDx + bound.width + (bound.width * (scale - 1)) / 2 + pad;
    const top = bound.y + effDy - (bound.height * (scale - 1)) / 2 - pad;
    const bottom = bound.y + effDy + bound.height + (bound.height * (scale - 1)) / 2 + pad;

    if (canvasX >= left && canvasX <= right && canvasY >= top && canvasY <= bottom) {
      return id;
    }
  }

  return null;
}
