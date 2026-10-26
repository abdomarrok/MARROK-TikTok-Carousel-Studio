import { SlideData, ThemePalette, VisualSystemOptions } from '../../../types.ts';
import { fitTextInBox } from '../textLayout.ts';
import { loadIconImage, safeDrawImage } from '../imageLoader.ts';
import { drawRoundRect } from '../background.ts';

/**
 * Archetype 5: Side-by-Side Comparison (Legacy vs Modern)
 * Renders dual cards with crimson and accent highlights, check/x markers, and centered "VS" badge.
 */
export async function drawCompareSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  _options: VisualSystemOptions
): Promise<number> {
  const cardY = 240;
  const cardH = 430;
  const cardW = 420;
  const leftX = 100;
  const rightX = 560;
  const radius = 28;

  // 1. Left Card: The Legacy / Bottleneck (Crimson 10% contrast tint)
  drawRoundRect(ctx, leftX, cardY, cardW, cardH, radius, '#11171d', 'rgba(244, 63, 94, 0.40)', 2);
  ctx.save();
  ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(leftX, cardY, cardW, cardH, radius);
  } else {
    ctx.rect(leftX, cardY, cardW, cardH);
  }
  ctx.fill();

  // Top Crimson Accent line
  ctx.beginPath();
  ctx.strokeStyle = '#F43F5E';
  ctx.lineWidth = 2.5;
  ctx.moveTo(leftX + radius, cardY);
  ctx.lineTo(leftX + cardW - radius, cardY);
  ctx.stroke();
  ctx.restore();

  // Left Header Badge (BEFORE · LEGACY)
  drawRoundRect(ctx, leftX + 20, cardY + 22, cardW - 40, 50, 14, 'rgba(244, 63, 94, 0.16)', 'rgba(244, 63, 94, 0.35)', 1);
  const xImg = await loadIconImage('xCircle', '#F43F5E');
  safeDrawImage(ctx, xImg, leftX + 34, cardY + 33, 26, 26);

  const leftTitle = slide.compareLeftTitle || 'Legacy Method';
  ctx.save();
  const fitLeftTitle = fitTextInBox(ctx, `BEFORE · ${leftTitle}`.toUpperCase(), cardW - 100, 21, '"Plus Jakarta Sans", sans-serif', '800', { minFontSize: 13 });
  ctx.font = `800 ${fitLeftTitle.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#FDA4AF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitLeftTitle.lines[0] || `BEFORE · ${leftTitle}`.toUpperCase(), leftX + 72, cardY + 47);
  ctx.restore();

  // Left Body Lines with crisp red ✖ bullets, 20px bold typography, and full card height distribution
  const leftText = slide.compareLeftBody || '• Full repository clone\n• High disk footprint\n• Stalls CI pipelines';
  const leftLines = leftText.split('\n').filter((l) => l.trim().length > 0).slice(0, 5);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  const leftStep = leftLines.length > 1
    ? Math.min(Math.floor((cardH - 165) / (leftLines.length - 1)), 82)
    : 70;
  let lY = cardY + 125;
  for (const rawLine of leftLines) {
    const cleanLine = rawLine.replace(/^[•\-\*✖\s]+/, '').trim();
    ctx.fillStyle = '#F87171';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('✖', leftX + 28, lY);

    const fitLine = fitTextInBox(ctx, cleanLine, cardW - 75, 20, '"Plus Jakarta Sans", sans-serif', '600', { minFontSize: 16, maxLines: 2 });
    ctx.fillStyle = '#F1F5F9';
    ctx.font = `600 ${fitLine.fontSize}px "Plus Jakarta Sans", sans-serif`;
    if (fitLine.lines.length <= 1) {
      ctx.fillText(fitLine.lines[0] || cleanLine, leftX + 58, lY);
      lY += leftStep;
    } else {
      ctx.fillText(fitLine.lines[0], leftX + 58, lY - 6);
      ctx.fillText(fitLine.lines[1], leftX + 58, lY - 6 + fitLine.lineHeight);
      lY += Math.max(leftStep, fitLine.lineHeight + 36);
    }
  }
  ctx.restore();

  // 2. Right Card: The Modern Approach (Theme Accent contrast tint)
  drawRoundRect(ctx, rightX, cardY, cardW, cardH, radius, '#11171d', `${theme.accent}65`, 2);
  ctx.save();
  ctx.fillStyle = `${theme.accent}12`;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(rightX, cardY, cardW, cardH, radius);
  } else {
    ctx.rect(rightX, cardY, cardW, cardH);
  }
  ctx.fill();

  // Top Neon Accent line
  ctx.beginPath();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.5;
  ctx.moveTo(rightX + radius, cardY);
  ctx.lineTo(rightX + cardW - radius, cardY);
  ctx.stroke();
  ctx.restore();

  // Right Header Badge (AFTER · OPTIMIZED)
  drawRoundRect(ctx, rightX + 20, cardY + 22, cardW - 40, 50, 14, `${theme.accent}20`, `${theme.accent}45`, 1);
  const checkImg = await loadIconImage('checkCircle', theme.accent);
  safeDrawImage(ctx, checkImg, rightX + 34, cardY + 33, 26, 26);

  const rightTitle = slide.compareRightTitle || 'Modern Approach';
  ctx.save();
  const fitRightTitle = fitTextInBox(ctx, `AFTER · ${rightTitle}`.toUpperCase(), cardW - 100, 21, '"Plus Jakarta Sans", sans-serif', '800', { minFontSize: 13 });
  ctx.font = `800 ${fitRightTitle.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitRightTitle.lines[0] || `AFTER · ${rightTitle}`.toUpperCase(), rightX + 72, cardY + 47);
  ctx.restore();

  // Right Body Lines with crisp green ✔ bullets, 20px bold typography, and full card height distribution
  const rightText = slide.compareRightBody || '• Virtualized file system\n• Instant sparse checkout\n• Zero local developer wait';
  const rightLines = rightText.split('\n').filter((l) => l.trim().length > 0).slice(0, 5);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  const rightStep = rightLines.length > 1
    ? Math.min(Math.floor((cardH - 165) / (rightLines.length - 1)), 82)
    : 70;
  let rY = cardY + 125;
  for (const rawLine of rightLines) {
    const cleanLine = rawLine.replace(/^[•\-\*✔\s]+/, '').trim();
    ctx.fillStyle = '#34D399';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('✔', rightX + 28, rY);

    const fitLine = fitTextInBox(ctx, cleanLine, cardW - 75, 20, '"Plus Jakarta Sans", sans-serif', '600', { minFontSize: 16, maxLines: 2 });
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 ${fitLine.fontSize}px "Plus Jakarta Sans", sans-serif`;
    if (fitLine.lines.length <= 1) {
      ctx.fillText(fitLine.lines[0] || cleanLine, rightX + 58, rY);
      rY += rightStep;
    } else {
      ctx.fillText(fitLine.lines[0], rightX + 58, rY - 6);
      ctx.fillText(fitLine.lines[1], rightX + 58, rY - 6 + fitLine.lineHeight);
      rY += Math.max(rightStep, fitLine.lineHeight + 36);
    }
  }
  ctx.restore();

  // 3. Centered 48px Circular "VS" Badge at x = 540
  const vsX = 540;
  const vsY = cardY + cardH / 2;
  const vsRadius = 24;

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = `${theme.accent}40`;
  ctx.lineWidth = 2;
  ctx.moveTo(leftX + cardW, vsY);
  ctx.lineTo(rightX, vsY);
  ctx.stroke();

  // VS Circle badge background
  ctx.beginPath();
  ctx.arc(vsX, vsY, vsRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#081216';
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 12;
  ctx.fill();

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.font = '900 18px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '1px';
  ctx.fillText('VS', vsX, vsY);
  ctx.restore();

  return 670;
}
