import { CarouselData, ThemePalette } from '../../types.ts';
import { drawMarrokVectorBadge } from '../icons.ts';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SPACING,
  GRID_LINE_WIDTH,
  PAGINATION_DOT_Y,
  SAFE_TEXT_CENTER_X,
} from './constants.ts';

/**
 * Draw rounded rectangle helper with fallback for browsers without native ctx.roundRect
 */
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth?: number
) {
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor && lineWidth) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 1. Solid Base Background
 */
export function drawBaseBackground(ctx: CanvasRenderingContext2D, theme: ThemePalette) {
  ctx.fillStyle = theme.baseBg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/**
 * 2. Radial Gradient Glow at (540, 690) with radius 720px
 */
export function drawRadialGlow(ctx: CanvasRenderingContext2D, theme: ThemePalette) {
  const glow = ctx.createRadialGradient(540, 690, 0, 540, 690, 720);
  glow.addColorStop(0, theme.radialGlow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/**
 * 3. Engineering Grid Lines (108px spacing, 2px stroke)
 */
export function drawEngineeringGrid(ctx: CanvasRenderingContext2D, theme: ThemePalette) {
  ctx.save();
  ctx.strokeStyle = theme.gridLine;
  ctx.lineWidth = GRID_LINE_WIDTH;
  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SPACING) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 3b. Canvas Background CAD Reticles & Safe-Zone Tick Marks
 */
export function drawCadReticles(ctx: CanvasRenderingContext2D, theme: ThemePalette) {
  ctx.save();
  ctx.strokeStyle = `${theme.accent}4D`;
  ctx.lineWidth = 1.5;

  const cadCrosshairPoints = [
    { x: 90, y: 200 },
    { x: 945, y: 200 },
    { x: 90, y: 930 },
    { x: 945, y: 930 },
    { x: 90, y: 1720 },
    { x: 945, y: 1720 },
  ];
  const arm = 10;
  for (const pt of cadCrosshairPoints) {
    ctx.beginPath();
    ctx.moveTo(pt.x - arm, pt.y);
    ctx.lineTo(pt.x + arm, pt.y);
    ctx.moveTo(pt.x, pt.y - arm);
    ctx.lineTo(pt.x, pt.y + arm);
    ctx.stroke();
  }

  const vTickYs = [360, 520, 680, 840, 1080, 1260, 1440, 1620];
  for (const ty of vTickYs) {
    ctx.beginPath();
    ctx.moveTo(90, ty);
    ctx.lineTo(96, ty);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(945, ty);
    ctx.lineTo(939, ty);
    ctx.stroke();
  }

  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillStyle = `${theme.accent}66`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SYS_REF // 1080x1920.CAD_SAFE', 106, 196);
  ctx.restore();
}

/**
 * 4. Header: Top-Left Authentic MARROK Vector Badge + Full Wordmark "MARROK" + Pulsing Accent Dot
 */
export function drawHeader(
  ctx: CanvasRenderingContext2D,
  carousel: CarouselData,
  theme: ThemePalette,
  categoryTag: string
) {
  ctx.save();
  const rawBrand = (carousel.brand || 'MARROK').trim();
  const displayBrandText = rawBrand || 'MARROK';

  // Crisp compact authentic MARROK vector logo badge (32x32px)
  const logoBadgeSize = 32;
  const logoBadgeX = 82;
  const logoBadgeY = 112;

  // Ambient badge glow matching studio header
  ctx.save();
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 8;
  drawRoundRect(ctx, logoBadgeX, logoBadgeY, logoBadgeSize, logoBadgeSize, 8, '#0D0D0D', `${theme.accent}66`, 1.2);
  ctx.restore();

  // Render authentic SVG vector mark inside badge using Path2D
  drawMarrokVectorBadge(ctx, logoBadgeX + logoBadgeSize / 2, logoBadgeY + logoBadgeSize / 2, logoBadgeSize - 4, theme.accent, 'transparent');

  // Brand Wordmark: clean 12px gap between the badge and full MARROK wordmark
  const brandTextX = logoBadgeX + logoBadgeSize + 12;
  ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(displayBrandText, brandTextX, 142);

  // Pulsing Accent Dot next to Brand wordmark
  const brandWidth = ctx.measureText(displayBrandText).width;
  const dotX = brandTextX + brandWidth + 12;
  ctx.beginPath();
  ctx.arc(dotX, 129, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = theme.accent;
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Top-Right Category Tag (aligned to right safe CAD boundary x = 945)
  ctx.font = '400 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = theme.categoryTag;
  ctx.textAlign = 'right';
  ctx.fillText(categoryTag, 945, 140);
  ctx.restore();
}

/**
 * 7. Pagination Footer (Multi-slide dots at y = 1826, or Standalone Attribution Footer when totalSlides === 1)
 */
export function drawPaginationFooter(
  ctx: CanvasRenderingContext2D,
  slideIndex: number,
  totalSlides: number,
  theme: ThemePalette,
  carousel?: CarouselData,
  slide?: CarouselData['slides'][number]
) {
  const dotY = PAGINATION_DOT_Y;

  if (totalSlides <= 1) {
    ctx.save();
    const rawDomain = (carousel?.brandUrl || 'marrok.org').replace(/^https?:\/\//i, '').trim() || 'marrok.org';
    const rawCredit = (
      slide?.enCredit ||
      carousel?.channel ||
      carousel?.sourceMeta?.creator ||
      carousel?.sourceMeta?.channel ||
      carousel?.brand ||
      'MARROK'
    )
      .replace(/^Source:\s*/i, '')
      .trim();

    const footerText = rawCredit && rawCredit.toUpperCase() !== rawDomain.toUpperCase()
      ? `${rawDomain}  ·  ${rawCredit}`
      : rawDomain;

    ctx.font = '600 26px "JetBrains Mono", "Plus Jakarta Sans", monospace';
    ctx.fillStyle = theme.textMuted || 'rgba(255, 255, 255, 0.58)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(footerText.slice(0, 64), SAFE_TEXT_CENTER_X, dotY);
    ctx.restore();
    return;
  }

  const dotRadius = 8;
  const dotDiameter = 16;
  const dotGap = 16;
  const step = dotDiameter + dotGap;
  const totalDotsWidth = totalSlides * dotDiameter + (totalSlides - 1) * dotGap;
  const startDotX = SAFE_TEXT_CENTER_X - totalDotsWidth / 2 + dotRadius;

  ctx.save();
  for (let i = 0; i < totalSlides; i++) {
    const dx = startDotX + i * step;
    ctx.beginPath();
    ctx.arc(dx, dotY, dotRadius, 0, Math.PI * 2);
    if (i === slideIndex) {
      ctx.fillStyle = theme.accent;
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    }
    ctx.fill();
  }
  ctx.restore();
}
