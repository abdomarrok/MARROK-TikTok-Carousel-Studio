import { SlideData, ThemePalette, VisualSystemOptions } from '../../../types.ts';
import { fitTextInBox } from '../textLayout.ts';
import { loadIconImage, drawTintedImage } from '../imageLoader.ts';
import { drawRoundRect } from '../background.ts';

const DEFAULT_ICON_LABELS: Record<string, string> = {
  server: 'SERVICE POD',
  database: 'STORAGE',
  gauge: 'TELEMETRY',
  users: 'IDENTITY',
  robot: 'AI AGENT',
  gitMerge: 'VCS ENGINE',
  cpu: 'EXEC ENGINE',
  box: 'CONTAINER',
  activity: 'HEALTH P99',
  shieldAlert: 'POLICY GATE',
  lock: 'CRYPTO CORE',
  network: 'NETWORK',
  key: 'AUTH / KEY',
  code: 'VIRTUAL FS',
  terminal: 'CLI GATEWAY',
  cloud: 'CLOUD HOST',
  zap: 'LOW LATENCY',
  hardDrive: 'DISK / WAL',
};

/**
 * Archetype 1: Hub (Slide 1 Hero Diagram)
 * Renders center hero box with 6 surrounding orbital satellites and spoke arrows.
 */
export async function drawHubSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  _options: VisualSystemOptions
): Promise<number> {
  const cx = 540;
  const cy = 600;
  const r = 325;

  // Determine active satellite nodes (supports dynamic add/delete from 1 to 6 nodes)
  const rawLabels = slide.satLabels && slide.satLabels.length > 0 ? slide.satLabels : null;
  const numNodes = rawLabels ? Math.min(6, Math.max(1, rawLabels.length)) : 6;
  const satAngles = Array.from({ length: numNodes }, (_, i) => -90 + (360 / numNodes) * i);

  // 1. Outer orbital circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = theme.accent + '4D'; // rgba(accent, 0.3)
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Spoke lines radiating through center directly to each active satellite position
  for (const deg of satAngles) {
    const rad = (deg * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = theme.accent + '4D';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Coordinate crosshairs (+) at the orbital ring tangents
  const tangentCoords = [
    { x: cx + r, y: cy },
    { x: cx - r, y: cy },
    { x: cx, y: cy + r },
    { x: cx, y: cy - r },
  ];
  ctx.strokeStyle = `${theme.accent}80`;
  ctx.lineWidth = 1.5;
  const tArm = 8;
  for (const tc of tangentCoords) {
    ctx.beginPath();
    ctx.moveTo(tc.x - tArm, tc.y);
    ctx.lineTo(tc.x + tArm, tc.y);
    ctx.moveTo(tc.x, tc.y - tArm);
    ctx.lineTo(tc.x, tc.y + tArm);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Clean concentric calibration ring around the 280x280 Center Hero Badge
  ctx.save();
  const calR = 192;
  // Ambient pulse glow behind center hub
  const centerGlow = ctx.createRadialGradient(cx, cy, 60, cx, cy, 230);
  centerGlow.addColorStop(0, `${theme.accent}2E`);
  centerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(cx - 230, cy - 230, 460, 460);

  // Inner calibration circle
  ctx.beginPath();
  ctx.arc(cx, cy, calR, 0, Math.PI * 2);
  ctx.strokeStyle = `${theme.accent}3D`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Outer segmented dashed ring
  ctx.beginPath();
  ctx.arc(cx, cy, calR + 10, 0, Math.PI * 2);
  ctx.strokeStyle = `${theme.accent}26`;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 10]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 12 calibration tick marks at 30° intervals
  ctx.strokeStyle = `${theme.accent}70`;
  ctx.lineWidth = 1.5;
  for (let deg = 0; deg < 360; deg += 30) {
    const rad = (deg * Math.PI) / 180;
    const x1 = cx + (calR - 5) * Math.cos(rad);
    const y1 = cy + (calR - 5) * Math.sin(rad);
    const x2 = cx + (calR + 5) * Math.cos(rad);
    const y2 = cy + (calR + 5) * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();

  // Center Hub Box: 280x280 rounded rect (radius 48) with dark glassmorphic styling
  const centerBoxW = 280;
  const centerBoxH = 280;
  const centerBoxX = cx - centerBoxW / 2;
  const centerBoxY = cy - centerBoxH / 2;
  ctx.save();
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 14;
  drawRoundRect(ctx, centerBoxX, centerBoxY, centerBoxW, centerBoxH, 48, '#081216', theme.accent, 2.5);
  ctx.restore();

  // Center Hub Icon: 130x130 in theme.accent
  const centerIconName = slide.centerIcon || 'gitMerge';
  const centerImg = await loadIconImage(centerIconName, theme.accent);
  const iconSize = 130;
  drawTintedImage(ctx, centerImg, cx - iconSize / 2, cy - iconSize / 2 - 14, iconSize, iconSize, theme.accent);

  // Center Core Tag Pill at bottom of center box (auto-sized to content)
  const centerText = (slide.centerTag || 'SYSTEM CORE').toUpperCase();
  ctx.save();
  ctx.font = '700 12px "JetBrains Mono", monospace';
  const tagMetrics = ctx.measureText(centerText);
  const tagW = Math.max(150, Math.min(240, Math.round(tagMetrics.width + 28)));
  drawRoundRect(ctx, cx - tagW / 2, centerBoxY + centerBoxH - 42, tagW, 26, 8, `${theme.accent}20`, `${theme.accent}70`, 1.2);
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(centerText, cx, centerBoxY + centerBoxH - 29);
  ctx.restore();

  // Satellite Badges with crisp technical label pills and spoke flow indicators
  const defaultIcons = ['server', 'database', 'gauge', 'users', 'robot', 'gitMerge'];
  const satIcons = slide.satIcons && slide.satIcons.length > 0 ? slide.satIcons : defaultIcons;
  const satLabels = rawLabels || ['SERVICE POD', 'STORAGE', 'TELEMETRY', 'IDENTITY', 'AI AGENT', 'VCS ENGINE'];
  const satW = 168;
  const satH = 120;
  const satIconSize = 50;

  for (let i = 0; i < numNodes; i++) {
    try {
      const rad = (satAngles[i] * Math.PI) / 180;
      const sx = cx + r * Math.cos(rad);
      const sy = cy + r * Math.sin(rad);

      // Glowing connection node at intersection
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, 70, 0, Math.PI * 2);
      ctx.strokeStyle = `${theme.accent}30`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fillStyle = theme.accent;
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#081216';
      ctx.fill();
      ctx.restore();

      // Directional spoke arrow chevrons radiating from center to satellite
      const arrowDist = r * 0.58;
      const ax = cx + arrowDist * Math.cos(rad);
      const ay = cy + arrowDist * Math.sin(rad);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(rad);
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Dark Glassmorphic Satellite Box
      drawRoundRect(ctx, sx - satW / 2, sy - satH / 2, satW, satH, 22, '#091319', `${theme.accent}80`, 2);

      // CAD Corner marks on satellite
      ctx.save();
      ctx.strokeStyle = `${theme.accent}60`;
      ctx.lineWidth = 1.2;
      const sm = 6;
      ctx.beginPath();
      ctx.moveTo(sx - satW / 2 + 5, sy - satH / 2 + 5 + sm);
      ctx.lineTo(sx - satW / 2 + 5, sy - satH / 2 + 5);
      ctx.lineTo(sx - satW / 2 + 5 + sm, sy - satH / 2 + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + satW / 2 - 5 - sm, sy + satH / 2 - 5);
      ctx.lineTo(sx + satW / 2 - 5, sy + satH / 2 - 5);
      ctx.lineTo(sx + satW / 2 - 5, sy + satH / 2 - 5 - sm);
      ctx.stroke();
      ctx.restore();

      // Satellite Icon
      const sIconName = satIcons[i % satIcons.length] || 'gitMerge';
      const sImg = await loadIconImage(sIconName, theme.accent);
      drawTintedImage(ctx, sImg, sx - satIconSize / 2, sy - satH / 2 + 14, satIconSize, satIconSize, theme.accent);

      // Crisp Technical Label Pill (18px-20px bold font, high contrast on mobile)
      const labelText = satLabels[i] || DEFAULT_ICON_LABELS[sIconName] || sIconName.toUpperCase();
      const pillW = 154;
      const pillH = 34;
      const pillX = sx - pillW / 2;
      const pillY = sy + satH / 2 - 42;

      drawRoundRect(ctx, pillX, pillY, pillW, pillH, 8, '#060a0d', `${theme.accent}90`, 1.5);
      ctx.save();
      const fitSat = fitTextInBox(ctx, labelText, pillW - 12, 18, '"Plus Jakarta Sans", "JetBrains Mono", sans-serif', '800', { minFontSize: 14 });
      ctx.font = `800 ${fitSat.fontSize}px "Plus Jakarta Sans", "JetBrains Mono", sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fitSat.lines[0] || labelText, sx, pillY + pillH / 2);
      ctx.restore();
    } catch (satErr) {
      console.warn(`Error rendering satellite ${i}:`, satErr);
    }
  }

  return 980;
}
