import { SlideData, ThemePalette, VisualSystemOptions } from '../../../types.ts';
import { loadIconImage, drawTintedImage } from '../imageLoader.ts';
import { drawRoundRect } from '../background.ts';
import { resolveSmartSlideVisuals } from '../../synthesis/smartVisualDefaults.ts';

/**
 * Archetype: Number (Spec §9.4)
 * Big accent numeral (e.g. "01", "02") at y=470, optional vector icon emblem on divider at y=520.
 */
export async function drawNumberSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  _options: VisualSystemOptions,
  slideIndex: number = 0
): Promise<number> {
  const smart = resolveSmartSlideVisuals(slide, slideIndex, false);
  const stepStr = (slide.stepNumber || smart.stepNumber || String(slideIndex + 1).padStart(2, '0')).trim();
  let labelStr = (slide.stepLabel || smart.stepLabel || `STEP ${stepStr}`).trim();

  // Sync default "STEP XX" counter with stepStr while preserving custom user kicker labels
  if (/^STEP\s*\d+$/i.test(labelStr)) {
    labelStr = `STEP ${stepStr}`;
  }

  // Micro step badge above big number
  ctx.save();
  ctx.font = '700 24px "Plus Jakarta Sans", monospace';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '2px';
  ctx.fillText(labelStr.toUpperCase(), 540, 240);
  ctx.restore();

  // Giant accent numeral centered at y = 465 (baseline)
  ctx.save();
  const numFontSize = stepStr.length > 4 ? 150 : stepStr.length > 2 ? 185 : 220;
  ctx.font = `800 ${numFontSize}px "Plus Jakarta Sans", "Cairo", sans-serif`;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = `${theme.accent}40`;
  ctx.shadowBlur = 28;
  ctx.fillText(stepStr, 540, 465);
  ctx.restore();

  const iconKey = slide.centerIcon || slide.icons?.[0]?.icon;
  if (iconKey) {
    // Split horizontal divider with central glowing vector icon badge
    ctx.save();
    ctx.strokeStyle = `${theme.accent}40`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(380, 520);
    ctx.lineTo(496, 520);
    ctx.moveTo(584, 520);
    ctx.lineTo(700, 520);
    ctx.stroke();
    ctx.restore();

    const badgeSize = 56;
    const badgeX = 540 - badgeSize / 2;
    const badgeY = 520 - badgeSize / 2;
    drawRoundRect(
      ctx,
      badgeX,
      badgeY,
      badgeSize,
      badgeSize,
      16,
      theme.surface || '#0c151c',
      `${theme.accent}66`,
      1.5
    );
    const iconImg = await loadIconImage(iconKey, theme.accent);
    drawTintedImage(ctx, iconImg, badgeX + 12, badgeY + 12, 32, 32, theme.accent);
  } else {
    // Subtle horizontal divider under number
    ctx.save();
    ctx.strokeStyle = `${theme.accent}33`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(420, 520);
    ctx.lineTo(660, 520);
    ctx.stroke();
    ctx.restore();
  }

  return 540;
}

