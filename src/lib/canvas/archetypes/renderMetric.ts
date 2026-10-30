import { SlideData, ThemePalette, VisualSystemOptions } from '../../../types.ts';
import { loadIconImage, drawTintedImage } from '../imageLoader.ts';
import { drawRoundRect } from '../background.ts';
import { fitTextInBox } from '../textLayout.ts';
import { SAFE_CONTENT_CENTER_X, SAFE_CONTENT_WIDTH, SAFE_MARGIN_LEFT } from '../constants.ts';
import { resolveSmartSlideVisuals } from '../../synthesis/smartVisualDefaults.ts';

/**
 * Archetype 3: Metric Card (Benchmark, Speedup, Resource ROI)
 * Renders hero statistic value, sparkline curve, gauge ticks, and delta pill.
 */
export async function drawMetricSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  options: VisualSystemOptions
): Promise<number> {
  const cardX = SAFE_MARGIN_LEFT;
  const cardY = 240;
  const cardW = SAFE_CONTENT_WIDTH;
  const cardH = 430;
  const radius = 32;

  // 1. Soft ambient glow behind metric card
  ctx.save();
  const metricGlow = ctx.createRadialGradient(
    cardX + cardW / 2,
    cardY + cardH / 2,
    30,
    cardX + cardW / 2,
    cardY + cardH / 2,
    cardW / 1.8
  );
  metricGlow.addColorStop(0, `${theme.accent}1A`);
  metricGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = metricGlow;
  ctx.fillRect(cardX - 30, cardY - 30, cardW + 60, cardH + 60);
  ctx.restore();

  // 2. Card background & crisp 2px border
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, radius, theme.surface, theme.surfaceBorder, 2);

  // 3. Top accent neon line along upper card border
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.5;
  ctx.moveTo(cardX + radius + 10, cardY);
  ctx.lineTo(cardX + cardW - radius - 10, cardY);
  ctx.stroke();
  ctx.restore();

  // 4. Header Row: Metric Icon Badge + Category Label
  const smart = resolveSmartSlideVisuals(slide, 1, false);
  const iconBadgeSize = 48;
  const iconBadgeX = cardX + 36;
  const iconBadgeY = cardY + 28;
  drawRoundRect(ctx, iconBadgeX, iconBadgeY, iconBadgeSize, iconBadgeSize, 14, `${theme.accent}22`, `${theme.accent}55`, 1.5);

  const mIcon = slide.metricIcon || smart.metricIcon || 'zap';
  const iconImg = await loadIconImage(mIcon, theme.accent);
  drawTintedImage(ctx, iconImg, iconBadgeX + 10, iconBadgeY + 10, 28, 28, theme.accent);

  const metricLabel = (slide.metricLabel || smart.metricLabel || 'KEY PERFORMANCE METRIC').toUpperCase();
  const metricLabelX = iconBadgeX + iconBadgeSize + 16;
  ctx.save();
  const fitMetricLabel = fitTextInBox(
    ctx,
    metricLabel,
    cardX + cardW - metricLabelX - 32,
    20,
    '"Plus Jakarta Sans", monospace',
    '700',
    { minFontSize: 12 }
  );
  ctx.font = `700 ${fitMetricLabel.fontSize}px "Plus Jakarta Sans", monospace`;
  ctx.fillStyle = theme.microLabel;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '1px';
  ctx.fillText(fitMetricLabel.lines[0] || metricLabel, metricLabelX, iconBadgeY + iconBadgeSize / 2);
  ctx.restore();

  // 5. Giant Hero Metric Value with restrained glow
  const metricVal = slide.metricValue || smart.metricValue || '10x';
  ctx.save();
  const valFontSize = metricVal.length > 8 ? 86 : metricVal.length > 5 ? 104 : 124;
  const fitMetricVal = fitTextInBox(
    ctx,
    metricVal,
    cardW - 100,
    valFontSize,
    '"Plus Jakarta Sans", sans-serif',
    '900',
    { minFontSize: 64 }
  );
  ctx.font = `900 ${fitMetricVal.fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = theme.textWhite;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = `${theme.accent}50`;
  ctx.shadowBlur = 12;
  const heroY = cardY + 175;
  ctx.fillText(fitMetricVal.lines[0] || metricVal, SAFE_CONTENT_CENTER_X, heroY);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.restore();

  // 6. SVG/Canvas Acceleration Sparkline Curve & Gauge Meter directly below hero stat
  if (options.showSparklines) {
    const meterStartX = cardX + 50;
    const meterEndX = cardX + cardW - 50;
    const meterW = meterEndX - meterStartX;
    const baseY = cardY + 305;
    const peakY = cardY + 230;

    ctx.save();
    const curveGrad = ctx.createLinearGradient(0, peakY, 0, baseY);
    curveGrad.addColorStop(0, `${theme.accent}26`);
    curveGrad.addColorStop(1, `${theme.accent}00`);

    ctx.beginPath();
    ctx.moveTo(meterStartX, baseY);
    ctx.bezierCurveTo(
      meterStartX + meterW * 0.45,
      baseY - 4,
      meterStartX + meterW * 0.7,
      peakY + 18,
      meterEndX,
      peakY
    );
    ctx.lineTo(meterEndX, baseY);
    ctx.closePath();
    ctx.fillStyle = curveGrad;
    ctx.fill();

    // Sparkline Stroke with restrained glow
    ctx.beginPath();
    ctx.moveTo(meterStartX, baseY);
    ctx.bezierCurveTo(
      meterStartX + meterW * 0.45,
      baseY - 4,
      meterStartX + meterW * 0.7,
      peakY + 18,
      meterEndX,
      peakY
    );
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Focal peak node circle
    ctx.beginPath();
    ctx.arc(meterEndX, peakY, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(meterEndX, peakY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#081216';
    ctx.fill();

    // Gauge Baseline Axis
    ctx.beginPath();
    ctx.strokeStyle = `${theme.accent}40`;
    ctx.lineWidth = 1.5;
    ctx.moveTo(meterStartX, baseY);
    ctx.lineTo(meterEndX, baseY);
    ctx.stroke();

    // 11 Gauge Tick Marks (0% to 100% in 10% steps)
    const tickCount = 11;
    ctx.strokeStyle = `${theme.accent}55`;
    ctx.lineWidth = 1.5;
    for (let t = 0; t < tickCount; t++) {
      const tx = meterStartX + (meterW / (tickCount - 1)) * t;
      const isMajor = t === 0 || t === 5 || t === 10;
      const tLen = isMajor ? 8 : 4;
      ctx.beginPath();
      ctx.moveTo(tx, baseY);
      ctx.lineTo(tx, baseY + tLen);
      ctx.stroke();
    }

    // Gauge Micro Labels
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.textMuted;
    ctx.textAlign = 'left';
    ctx.fillText('BASELINE', meterStartX, baseY + 20);
    ctx.textAlign = 'center';
    ctx.fillText('50%', meterStartX + meterW * 0.5, baseY + 20);
    ctx.textAlign = 'right';
    ctx.fillText('PEAK // P99', meterEndX, baseY + 20);
    ctx.restore();
  }

  // 7. Paired Delta Pill (▲ Emerald / ▼ Crimson / Accent)
  const diffText = slide.metricDiff || smart.metricDiff || '▲ Measurable architectural speedup';
  const isPositive =
    /[▲+]|faster|speedup|drop|gain|reduction|reduced|boost|zero|0\s*(unauthenticated|vulnerabilit|breach|downtime|unauthorized|exploit|error|packet|leak|fail)|mitigat|eliminat|filter|secur|protect|sub-m/i.test(diffText);
  const isNegative =
    (/[▼-]|latency spike|bottleneck|regression|exploit/i.test(diffText) && !isPositive);

  const deltaAccent = isPositive ? '#10B981' : isNegative ? '#F43F5E' : theme.accent;
  const deltaBg = isPositive ? 'rgba(16, 185, 129, 0.14)' : isNegative ? 'rgba(244, 63, 94, 0.14)' : `${theme.accent}20`;
  const deltaBorder = isPositive ? 'rgba(16, 185, 129, 0.50)' : isNegative ? 'rgba(244, 63, 94, 0.50)' : `${theme.accent}60`;

  ctx.save();
  const fitDiff = fitTextInBox(
    ctx,
    diffText,
    712,
    23,
    '"Plus Jakarta Sans", monospace',
    '700',
    { minFontSize: 14 }
  );
  ctx.font = `700 ${fitDiff.fontSize}px "Plus Jakarta Sans", monospace`;
  const diffLabel = fitDiff.lines[0] || diffText;
  const diffMetrics = ctx.measureText(diffLabel);
  const pillW = Math.min(diffMetrics.width + 48, 760);
  const pillH = 46;
  const pillX = SAFE_CONTENT_CENTER_X - pillW / 2;
  const pillY = cardY + cardH - 62;
  drawRoundRect(ctx, pillX, pillY, pillW, pillH, 23, deltaBg, deltaBorder, 1.5);

  ctx.fillStyle = deltaAccent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(diffLabel, SAFE_CONTENT_CENTER_X, pillY + pillH / 2);
  ctx.restore();

  return 670;
}
