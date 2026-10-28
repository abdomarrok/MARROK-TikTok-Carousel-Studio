import {
  MotionBrandConfig,
  MotionSceneConfig,
  MotionTemplateConfig,
} from '../../types.ts';
import { MARROK_LOGO_PATHS, drawMarrokVectorBadge } from '../icons.ts';
import { DEFAULT_BRAND, MOTION_W, MOTION_H, clamp, spring } from './base.ts';

export const SAFE_LEFT = 82;
export const SAFE_RIGHT = 945;
export const SAFE_WIDTH = SAFE_RIGHT - SAFE_LEFT; // 863px
export const SAFE_CENTER_X = (SAFE_LEFT + SAFE_RIGHT) / 2; // 513.5px

export function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || '#6EA0FF').replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 110;
    const g = parseInt(clean[1] + clean[1], 16) || 160;
    const b = parseInt(clean[2] + clean[2], 16) || 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const r = parseInt(clean.slice(0, 2), 16) || 110;
  const g = parseInt(clean.slice(2, 4), 16) || 160;
  const b = parseInt(clean.slice(4, 6), 16) || 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Word-wraps text into lines that fit within maxWidth on the given Canvas 2D context.
 */
export function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3
): string[] {
  const cleaned = (text || '').trim();
  if (!cleaned) return [];
  const words = cleaned.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth || !currentLine) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines - 1) {
        break;
      }
    }
  }

  const consumedWords = lines.join(' ').split(/\s+/).filter(Boolean).length;
  const remainingWords = words.slice(consumedWords);
  if (remainingWords.length > 0) {
    let lastLine = remainingWords.join(' ');
    if (ctx.measureText(lastLine).width > maxWidth) {
      while (lastLine.length > 3 && ctx.measureText(`${lastLine}…`).width > maxWidth) {
        lastLine = lastLine.slice(0, -1).trim();
      }
      lastLine = `${lastLine}…`;
    }
    lines.push(lastLine);
  } else if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines.slice(0, maxLines);
}

/**
 * 1. Base Background + Radial Ambient Glow + 108px Engineering Grid + CAD Reticles
 * Matches MARROK's static slide background.ts 1:1 with subtle live motion pulse.
 */
export function drawMarrokReelBackground(
  ctx: CanvasRenderingContext2D,
  config: MotionTemplateConfig,
  globalTime: number
): void {
  const b: MotionBrandConfig = { ...DEFAULT_BRAND, ...(config?.brand || {}) };
  const bg = b.bgColor || '#080A12';
  const accent = b.accentColor || '#6EA0FF';

  // Solid OLED base fill
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, MOTION_W, MOTION_H);

  // Radial ambient glow centered at (540, 690), radius 720px with subtle breathing
  const pulse = 0.14 + 0.03 * Math.sin(globalTime * 2.0);
  const grad = ctx.createRadialGradient(540, 690, 0, 540, 690, 720);
  grad.addColorStop(0, hexToRgba(accent, pulse));
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, MOTION_W, MOTION_H);

  // 108px Engineering Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.032)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= MOTION_W; x += 108) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MOTION_H);
  }
  for (let y = 0; y <= MOTION_H; y += 108) {
    ctx.moveTo(0, y);
    ctx.lineTo(MOTION_W, y);
  }
  ctx.stroke();

  // CAD Reticles & Safe Zone Boundary Ticks
  if (config.showCadReticles !== false) {
    const crosshairs = [
      { x: 60, y: 195 },
      { x: 945, y: 195 },
      { x: 60, y: 1710 },
      { x: 945, y: 1710 },
    ];
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    const arm = 8;
    for (const pt of crosshairs) {
      ctx.beginPath();
      ctx.moveTo(pt.x - arm, pt.y);
      ctx.lineTo(pt.x + arm, pt.y);
      ctx.moveTo(pt.x, pt.y - arm);
      ctx.lineTo(pt.x, pt.y + arm);
      ctx.stroke();
    }

    // Subtle right & bottom safe-zone ticks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 324; y <= 1620; y += 216) {
      ctx.beginPath();
      ctx.moveTo(941, y);
      ctx.lineTo(949, y);
      ctx.stroke();
    }
    for (let x = 162; x <= 864; x += 216) {
      ctx.beginPath();
      ctx.moveTo(x, 1706);
      ctx.lineTo(x, 1714);
      ctx.stroke();
    }

    // Technical Coordinate Stamp
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 13px "JetBrains Mono", "Plus Jakarta Sans", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillText('SYS_REF // 1080x1920.CAD_SAFE // MOTION_REEL', 76, 199);
  }

  ctx.restore();
}

/**
 * 2. Authentic MARROK Slide Header
 * Renders the 32x32 glowing MARROK vector logo badge, MARROK wordmark, pulsing dot, and right-aligned category tag.
 */
export function drawMarrokReelHeader(
  ctx: CanvasRenderingContext2D,
  config: MotionTemplateConfig,
  globalTime: number,
  categoryOverride?: string
): void {
  const b: MotionBrandConfig = { ...DEFAULT_BRAND, ...(config?.brand || {}) };
  const accent = b.accentColor || '#6EA0FF';
  const brandName = (b.name || 'MARROK').toUpperCase();
  const category = (
    categoryOverride ||
    config.category ||
    b.category ||
    'AI + SECURITY'
  ).toUpperCase();

  ctx.save();
  ctx.direction = 'ltr';
  ctx.textBaseline = 'alphabetic';

  const logoSize = 32;
  const logoX = 82;
  const logoY = 112;
  const cx = logoX + logoSize / 2;
  const cy = logoY + logoSize / 2;

  // 1. Glowing dark rounded badge plate matching drawHeader in background.ts
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 10 + 4 * Math.sin(globalTime * 3);
  ctx.fillStyle = '#0D0D0D';
  ctx.strokeStyle = hexToRgba(accent, 0.45);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(logoX, logoY, logoSize, logoSize, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 2. Crisp vector MARROK logo inside the badge
  drawMarrokVectorBadge(ctx, cx, cy, logoSize - 4, accent, 'transparent');

  // 3. MARROK Wordmark (exact 38px Plus Jakarta Sans at y = 142 matching static slides)
  const textX = logoX + logoSize + 12;
  ctx.font = '800 38px "Plus Jakarta Sans", "Outfit", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(brandName, textX, 142);

  // 4. Pulsing Accent Dot next to wordmark
  const brandWidth = ctx.measureText(brandName).width;
  const dotPulse = 7.0 + 1.0 * Math.sin(globalTime * 4.5);
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 10;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(textX + brandWidth + 12, 129, dotPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 5. Right-aligned Category Tag at x = 945, y = 140
  ctx.font = '400 30px "Plus Jakarta Sans", "Outfit", sans-serif';
  ctx.fillStyle = '#A0A5B1';
  ctx.textAlign = 'right';
  ctx.fillText(category, SAFE_RIGHT, 140);

  ctx.restore();
}

/**
 * 3. Authentic MARROK Pagination & Attribution Footer at y = 1826
 * Renders animated scene progress dots (active pill expands), @MARROK handle, and scene counter.
 */
export function drawMarrokReelFooter(
  ctx: CanvasRenderingContext2D,
  config: MotionTemplateConfig,
  globalTime: number,
  activeSceneIdx: number,
  totalScenes: number
): void {
  const b: MotionBrandConfig = { ...DEFAULT_BRAND, ...(config?.brand || {}) };
  const accent = b.accentColor || '#6EA0FF';
  const brandName = (b.name || 'MARROK').toUpperCase();
  const channel = (config.channel || b.channel || brandName).replace(/^@/, '');
  const count = Math.max(1, totalScenes);
  const currentIdx = Math.max(0, Math.min(count - 1, activeSceneIdx));

  const footerY = 1826;
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textBaseline = 'middle';

  // Left handle watermark
  ctx.font = '600 25px "Plus Jakarta Sans", "Outfit", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.textAlign = 'left';
  ctx.fillText(`@${channel}`, SAFE_LEFT, footerY);

  // Center pagination dots with spring-expanded active pill
  const dotRadius = 5;
  const activePillW = 30;
  const gap = 14;
  const totalDotsW = (count - 1) * (dotRadius * 2 + gap) + activePillW;
  let curX = SAFE_CENTER_X - totalDotsW / 2;

  for (let i = 0; i < count; i++) {
    if (i === currentIdx) {
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 10;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(curX, footerY - dotRadius, activePillW, dotRadius * 2, dotRadius);
      ctx.fill();
      ctx.restore();
      curX += activePillW + gap;
    } else {
      ctx.fillStyle =
        i < currentIdx ? hexToRgba(accent, 0.45) : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(curX + dotRadius, footerY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      curX += dotRadius * 2 + gap;
    }
  }

  // Right scene index / progress stamp
  const sceneNum = String(currentIdx + 1).padStart(2, '0');
  const totalNum = String(count).padStart(2, '0');
  ctx.font = '700 22px "JetBrains Mono", "Plus Jakarta Sans", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.textAlign = 'right';
  ctx.fillText(`${sceneNum} / ${totalNum}`, SAFE_RIGHT, footerY);

  // Subtle bottom progress bar inside safe zone at y = 1862
  const duration = Math.max(1, config.duration || 20);
  const progress = clamp(globalTime / duration, 0, 1);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.beginPath();
  ctx.roundRect(SAFE_LEFT, 1862, SAFE_WIDTH, 4, 2);
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(SAFE_LEFT, 1862, SAFE_WIDTH * progress, 4, 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 4. MARROK Elevated Surface Card with Technical Corner Reticles & Top Micro-Bar
 */
export function drawMarrokSurfaceCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: string,
  surfaceColor = '#12131C',
  surfaceBorder = '#252838',
  leftMicroLabel = 'SYS_MODULE // 01',
  rightMicroLabel = 'LIVE_SYNC',
  revealProgress = 1
): void {
  const s = clamp(revealProgress, 0, 1);
  if (s <= 0.01) return;

  ctx.save();
  const slideOffsetY = (1 - s) * 36;
  ctx.translate(0, slideOffsetY);
  ctx.globalAlpha = s;

  // Card dark surface fill
  ctx.fillStyle = surfaceColor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 24);
  ctx.fill();

  // Subtle radial inner glow inside card
  const innerGrad = ctx.createRadialGradient(
    x + w / 2,
    y + h / 2,
    10,
    x + w / 2,
    y + h / 2,
    Math.max(w, h) * 0.65
  );
  innerGrad.addColorStop(0, hexToRgba(accent, 0.1));
  innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 24);
  ctx.fill();

  // Card border stroke
  ctx.strokeStyle = surfaceBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 24);
  ctx.stroke();

  // Glowing top accent bar
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(x + 32, y, Math.max(40, (w - 64) * s), 3.5, 2);
  ctx.fill();

  // Top micro-header bar inside card
  ctx.direction = 'ltr';
  ctx.textBaseline = 'middle';
  ctx.font = '700 16px "JetBrains Mono", "Plus Jakarta Sans", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.textAlign = 'left';
  ctx.fillText(leftMicroLabel, x + 28, y + 30);

  // Right status pill
  ctx.textAlign = 'right';
  ctx.fillStyle = accent;
  ctx.fillText(rightMicroLabel, x + w - 28, y + 30);

  // Divider line below micro-header
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 24, y + 52);
  ctx.lineTo(x + w - 24, y + 52);
  ctx.stroke();

  ctx.restore();
}

/**
 * 5. Animated Bilingual Slide Copy Block (EN Title + AR Title + EN Body + AR Body)
 * Matches MARROK's static slide typography hierarchy with spring-physics reveals.
 */
export function drawAnimatedBilingualSlideCopy(
  ctx: CanvasRenderingContext2D,
  scene: MotionSceneConfig,
  brand: MotionBrandConfig,
  t: number,
  startY = 740
): void {
  const accent = brand.accentColor || '#6EA0FF';
  const textColor = brand.textColor || '#FFFFFF';
  const k = scene.springK || 220;
  const d = scene.springD || 22;

  // Determine English & Arabic titles/bodies with smart fallbacks from scene.text
  const hasArabicChars = /[\u0600-\u06FF]/.test(scene.text || '');
  const enTitle =
    scene.enTitle?.trim() ||
    (!hasArabicChars && !scene.text?.includes('|') ? scene.text?.trim() : '') ||
    scene.label?.toUpperCase() ||
    'SYSTEM ARCHITECTURE';
  const arTitle =
    scene.arTitle?.trim() ||
    (hasArabicChars && !scene.text?.includes('|') ? scene.text?.trim() : '') ||
    'هندسة الأنظمة المتقدمة';
  const enBody = scene.enBody?.trim() || '';
  const arBody = scene.arBody?.trim() || '';

  let cursorY = startY;

  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // 1. Step / Archetype Tag Pill
  const tagSpring = spring(t - 0.04, k, d);
  const stepTag = scene.stepNumber
    ? `SLIDE ${scene.stepNumber} // ${(scene.slideType || 'ARCH').toUpperCase()}`
    : `${(scene.label || 'KEYNOTE').toUpperCase()} // ${(scene.slideType || 'SLIDE').toUpperCase()}`;

  ctx.save();
  ctx.direction = 'ltr';
  ctx.globalAlpha = clamp(t * 5);
  ctx.font = '800 20px "JetBrains Mono", "Plus Jakarta Sans", monospace';
  const tagW = Math.min(SAFE_WIDTH, ctx.measureText(stepTag).width + 36);
  ctx.fillStyle = hexToRgba(accent, 0.14);
  ctx.strokeStyle = hexToRgba(accent, 0.45);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(SAFE_LEFT, cursorY - 28, tagW * clamp(tagSpring, 0.2, 1), 38, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.textAlign = 'left';
  ctx.fillText(stepTag, SAFE_LEFT + 18, cursorY - 2);
  ctx.restore();

  cursorY += 56;

  // 2. English Headline (Plus Jakarta Sans 800, LTR, White)
  if (enTitle) {
    ctx.save();
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '800 48px "Plus Jakarta Sans", "Outfit", sans-serif';
    const enLines = wrapCanvasLines(ctx, enTitle.toUpperCase(), SAFE_WIDTH, 2);

    enLines.forEach((line, lineIdx) => {
      const lt = t - 0.08 - lineIdx * 0.06;
      const ls = spring(lt, k, d);
      ctx.save();
      ctx.globalAlpha = clamp(lt * 5);
      ctx.translate(SAFE_LEFT, cursorY + (1 - ls) * 28);
      ctx.scale(0.96 + 0.04 * ls, 0.96 + 0.04 * ls);
      ctx.fillStyle = textColor;
      ctx.fillText(line, 0, 0, SAFE_WIDTH);
      ctx.restore();
      cursorY += 58;
    });
    ctx.restore();
  }

  cursorY += 12;

  // 3. Arabic Headline (Cairo 800, RTL, Accent Color)
  if (arTitle) {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.font = '800 46px "Cairo", "Noto Sans Arabic", sans-serif';
    const arLines = wrapCanvasLines(ctx, arTitle, SAFE_WIDTH, 2);

    arLines.forEach((line, lineIdx) => {
      const lt = t - 0.16 - lineIdx * 0.06;
      const ls = spring(lt, k, d);
      ctx.save();
      ctx.globalAlpha = clamp(lt * 5);
      ctx.translate(SAFE_RIGHT, cursorY + (1 - ls) * 28);
      ctx.scale(0.96 + 0.04 * ls, 0.96 + 0.04 * ls);
      ctx.fillStyle = accent;
      ctx.fillText(line, 0, 0, SAFE_WIDTH);
      ctx.restore();
      cursorY += 60;
    });
    ctx.restore();
  }

  // 4. Expanding Accent Divider Line between Headlines and Body
  const divSpring = spring(t - 0.22, 190, 22);
  ctx.save();
  ctx.fillStyle = accent;
  ctx.globalAlpha = clamp((t - 0.2) * 4) * 0.85;
  ctx.beginPath();
  ctx.roundRect(SAFE_LEFT, cursorY - 18, SAFE_WIDTH * clamp(divSpring, 0, 1), 5, 2.5);
  ctx.fill();
  ctx.restore();

  cursorY += 26;

  // 5. English Body Copy (LTR, left accent guide bar)
  if (enBody) {
    const bt = t - 0.26;
    const bs = spring(bt, k, d);
    ctx.save();
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '500 29px "Plus Jakarta Sans", "Outfit", sans-serif';
    const bodyLines = wrapCanvasLines(ctx, enBody, SAFE_WIDTH - 28, 3);
    const blockH = bodyLines.length * 40;

    ctx.globalAlpha = clamp(bt * 4);
    ctx.fillStyle = hexToRgba(accent, 0.65);
    ctx.beginPath();
    ctx.roundRect(SAFE_LEFT, cursorY - 26, 5, Math.max(12, blockH * bs), 2.5);
    ctx.fill();

    ctx.fillStyle = '#B8BeCA';
    bodyLines.forEach((line, idx) => {
      ctx.fillText(line, SAFE_LEFT + 22, cursorY + idx * 40 + (1 - bs) * 20, SAFE_WIDTH - 28);
    });
    ctx.restore();
    cursorY += blockH + 28;
  }

  // 6. Arabic Body Copy (RTL, right accent guide bar)
  if (arBody && cursorY <= 1620) {
    const bt = t - 0.34;
    const bs = spring(bt, k, d);
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.font = '600 31px "Cairo", "Noto Sans Arabic", sans-serif';
    const arBodyLines = wrapCanvasLines(ctx, arBody, SAFE_WIDTH - 28, 3);
    const blockH = arBodyLines.length * 44;

    ctx.globalAlpha = clamp(bt * 4);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(SAFE_RIGHT - 5, cursorY - 28, 5, Math.max(12, blockH * bs), 2.5);
    ctx.fill();

    ctx.fillStyle = '#DCE0EA';
    arBodyLines.forEach((line, idx) => {
      ctx.fillText(line, SAFE_RIGHT - 22, cursorY + idx * 44 + (1 - bs) * 20, SAFE_WIDTH - 28);
    });
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Self-contained JS helper injected into standalone HTML exports so exported .html files
 * render the exact same MARROK vector logo, radial glow, 108px grid, CAD reticles, header, and footer.
 */
export const MARROK_CHROME_SCRIPT = `
const MARROK_LOGO_PATHS = ${JSON.stringify(MARROK_LOGO_PATHS)};

function hexToRgba(hex, alpha) {
  const clean = (hex || '#6EA0FF').replace('#', '').trim();
  const r = parseInt(clean.slice(0, 2), 16) || 110;
  const g = parseInt(clean.slice(2, 4), 16) || 160;
  const b = parseInt(clean.slice(4, 6), 16) || 255;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function drawMarrokVectorBadge(ctx, cx, cy, size, accentColor, bgColor) {
  if (bgColor && bgColor !== 'transparent') {
    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.22);
    ctx.fill();
    ctx.restore();
  }
  const scale = size / 240;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-MARROK_LOGO_PATHS.center.x, -MARROK_LOGO_PATHS.center.y);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill(new Path2D(MARROK_LOGO_PATHS.pathMain));
  ctx.fill(new Path2D(MARROK_LOGO_PATHS.pathRightBottom));
  ctx.fill(new Path2D(MARROK_LOGO_PATHS.pathLeftFrame));
  ctx.fillStyle = accentColor || '#6EA0FF';
  ctx.fill(new Path2D(MARROK_LOGO_PATHS.pathAccent));
  ctx.restore();
}

function drawMarrokChrome(ctx, config, globalTime) {
  const b = config.brand || {};
  const bg = b.bgColor || '#080A12';
  const accent = b.accentColor || '#6EA0FF';
  const brandName = (b.name || 'MARROK').toUpperCase();
  const category = (config.category || b.category || 'AI + SECURITY').toUpperCase();

  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createRadialGradient(540, 690, 0, 540, 690, 720);
  grad.addColorStop(0, hexToRgba(accent, 0.14 + 0.03 * Math.sin(globalTime * 2)));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.032)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 108) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 108) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  const pts = [{x:60,y:195},{x:945,y:195},{x:60,y:1710},{x:945,y:1710}];
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  for (const pt of pts) {
    ctx.beginPath();
    ctx.moveTo(pt.x - 8, pt.y); ctx.lineTo(pt.x + 8, pt.y);
    ctx.moveTo(pt.x, pt.y - 8); ctx.lineTo(pt.x, pt.y + 8);
    ctx.stroke();
  }

  ctx.direction = 'ltr';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.textAlign = 'left';
  ctx.fillText('SYS_REF // 1080x1920.CAD_SAFE // MOTION_REEL', 76, 199);

  // Header Badge + MARROK Logo
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#0D0D0D';
  ctx.beginPath();
  ctx.roundRect(82, 112, 32, 32, 7);
  ctx.fill();
  ctx.restore();
  drawMarrokVectorBadge(ctx, 98, 128, 32, accent, 'transparent');

  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(brandName, 128, 140);
  const bw = ctx.measureText(brandName).width;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(128 + bw + 12, 131, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '700 25px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#A0A5B1';
  ctx.textAlign = 'right';
  ctx.fillText(category, 945, 140);
  ctx.restore();
}

function drawMarrokFooter(ctx, config, globalTime, activeIdx, totalCount) {
  const b = config.brand || {};
  const accent = b.accentColor || '#6EA0FF';
  const brandName = (b.name || 'MARROK').toUpperCase();
  const footerY = 1826;
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textBaseline = 'middle';
  ctx.font = '600 25px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.textAlign = 'left';
  ctx.fillText('@' + brandName, 82, footerY);

  const count = Math.max(1, totalCount || 1);
  const dotR = 5, pillW = 30, gap = 14;
  const totalW = (count - 1) * (dotR * 2 + gap) + pillW;
  let curX = 513.5 - totalW / 2;
  for (let i = 0; i < count; i++) {
    if (i === activeIdx) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(curX, footerY - dotR, pillW, dotR * 2, dotR);
      ctx.fill();
      curX += pillW + gap;
    } else {
      ctx.fillStyle = i < activeIdx ? hexToRgba(accent, 0.45) : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(curX + dotR, footerY, dotR, 0, Math.PI * 2);
      ctx.fill();
      curX += dotR * 2 + gap;
    }
  }
  ctx.restore();
}
`;
