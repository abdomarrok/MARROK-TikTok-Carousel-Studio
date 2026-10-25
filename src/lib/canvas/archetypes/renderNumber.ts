import { SlideData, ThemePalette, VisualSystemOptions } from '../../../types.ts';

/**
 * Archetype: Number (Spec §9.4)
 * Big accent numeral (e.g. "01", "02") at y=330, text block at y=700.
 */
export async function drawNumberSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  _options: VisualSystemOptions,
  slideIndex: number = 0
): Promise<number> {
  const stepStr = slide.stepNumber || String(slideIndex + 1).padStart(2, '0');
  const labelStr = slide.stepLabel || `STEP ${stepStr}`;

  // Micro step badge above big number
  ctx.save();
  ctx.font = '700 24px "Plus Jakarta Sans", monospace';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '2px';
  ctx.fillText(labelStr.toUpperCase(), 540, 240);
  ctx.restore();

  // Giant accent numeral centered at y = 470 (baseline)
  ctx.save();
  ctx.font = '800 220px "Plus Jakarta Sans", "Cairo", sans-serif';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = `${theme.accent}40`;
  ctx.shadowBlur = 28;
  ctx.fillText(stepStr, 540, 470);
  ctx.restore();

  // Subtle horizontal divider under number
  ctx.save();
  ctx.strokeStyle = `${theme.accent}33`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(420, 520);
  ctx.lineTo(660, 520);
  ctx.stroke();
  ctx.restore();

  return 540;
}
