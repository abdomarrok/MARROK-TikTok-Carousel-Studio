import { SlideData, ThemePalette, VisualSystemOptions } from '../../../types.ts';
import { drawRoundRect } from '../background.ts';
import { fitTextInBox, truncateTextToWidth } from '../textLayout.ts';
import { SAFE_CONTENT_WIDTH, SAFE_MARGIN_LEFT } from '../constants.ts';

/**
 * Archetype 4: Precision Silicon & Terminal Window
 * Renders syntax-highlighted terminal window, CRT scanlines, file badge, gutter, and diff markers.
 */
export async function drawCodeSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  options: VisualSystemOptions
): Promise<number> {
  const winX = SAFE_MARGIN_LEFT;
  const winY = 240;
  const winW = SAFE_CONTENT_WIDTH;
  const winH = 490;
  const winRadius = 28;

  // 1. Ambient glow behind terminal window
  ctx.save();
  const termGlow = ctx.createRadialGradient(
    winX + winW / 2,
    winY + winH / 2,
    40,
    winX + winW / 2,
    winY + winH / 2,
    winW / 1.8
  );
  termGlow.addColorStop(0, `${theme.accent}14`);
  termGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = termGlow;
  ctx.fillRect(winX - 30, winY - 30, winW + 60, winH + 60);
  ctx.restore();

  // 2. Window container: deep OLED background
  drawRoundRect(ctx, winX, winY, winW, winH, winRadius, '#060a0d', theme.surfaceBorder, 2);

  // 3. Clip interior for header, CRT scanlines, and code gutter
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(winX, winY, winW, winH, winRadius);
  } else {
    ctx.rect(winX, winY, winW, winH);
  }
  ctx.clip();

  // Subtle CRT scanline texture
  if (options.terminalScanlines) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let sy = winY; sy <= winY + winH; sy += 4) {
      ctx.fillRect(winX, sy, winW, 1.5);
    }
  }

  // Title Bar
  const titleBarH = 56;
  ctx.fillStyle = '#0d151c';
  ctx.fillRect(winX, winY, winW, titleBarH);
  // Title bar bottom divider
  ctx.strokeStyle = theme.surfaceBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(winX, winY + titleBarH);
  ctx.lineTo(winX + winW, winY + titleBarH);
  ctx.stroke();

  // macOS window traffic dots
  const dotY = winY + titleBarH / 2;
  ctx.beginPath();
  ctx.arc(winX + 32, dotY, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FF5F56';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(winX + 54, dotY, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFBD2E';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(winX + 76, dotY, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = '#27C93F';
  ctx.fill();

  // Top-Right Syntax Language Badge (BASH, RUST, TS, SQL, YAML)
  const fileName = slide.codeFileName || (slide.codeLanguage ? `source.${slide.codeLanguage}` : 'terminal.sh');
  let lang = (slide.codeLanguage || '').toUpperCase();
  if (!lang) {
    if (fileName.endsWith('.sh') || fileName.includes('terminal')) lang = 'BASH';
    else if (fileName.endsWith('.rs')) lang = 'RUST';
    else if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) lang = 'TS';
    else if (fileName.endsWith('.sql')) lang = 'SQL';
    else if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) lang = 'YAML';
    else if (fileName.endsWith('.py')) lang = 'PYTHON';
    else if (fileName.endsWith('.go')) lang = 'GO';
    else lang = 'BASH';
  }
  const badgePad = 12;
  ctx.font = '700 13px "JetBrains Mono", monospace';
  const langMetrics = ctx.measureText(lang);
  const badgeW = langMetrics.width + badgePad * 2;
  const badgeH = 26;
  const badgeX = winX + winW - badgeW - 20;
  const badgeY = dotY - badgeH / 2;
  drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6, `${theme.accent}1C`, `${theme.accent}55`, 1);

  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lang, badgeX + badgeW / 2, dotY);

  // Breadcrumb / File Name, constrained between traffic dots and language badge
  const fileNameLeft = winX + 96;
  const fileNameRight = badgeX - 12;
  const fileNameMaxWidth = Math.max(80, fileNameRight - fileNameLeft);
  const fittedFileName = fitTextInBox(
    ctx,
    fileName,
    fileNameMaxWidth,
    20,
    '"JetBrains Mono", monospace',
    '500',
    { minFontSize: 12 }
  );
  ctx.font = `500 ${fittedFileName.fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#8B9DA8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    fittedFileName.lines[0] || fileName,
    fileNameLeft + fileNameMaxWidth / 2,
    dotY
  );

  // Left Gutter for line numbers
  const gutterW = 64;
  ctx.fillStyle = '#080f14';
  ctx.fillRect(winX, winY + titleBarH, gutterW, winH - titleBarH);
  // Gutter divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(winX + gutterW, winY + titleBarH);
  ctx.lineTo(winX + gutterW, winY + winH);
  ctx.stroke();

  // Code lines rendering with line-level diff highlights
  const snippet = slide.codeSnippet || '$ git fetch --depth=1\n> Initializing lazy checkout...\n+ Fetched 100GB repository in 1.2s\n✔ Zero local disk stalls';
  const lines = snippet.split('\n').slice(0, 7);
  const lineSpacing = 48;
  let lineBaselineY = winY + titleBarH + 38;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTop = lineBaselineY - 30;
    const lineH = 42;

    // Subtle line-level background diff highlights
    if (line.startsWith('+') || line.startsWith('✔')) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.fillRect(winX + gutterW + 1, lineTop, winW - gutterW - 1, lineH);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(winX + gutterW + 1, lineTop, 3, lineH);
    } else if (line.startsWith('-') || line.startsWith('✖')) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
      ctx.fillRect(winX + gutterW + 1, lineTop, winW - gutterW - 1, lineH);
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(winX + gutterW + 1, lineTop, 3, lineH);
    } else if (line.startsWith('$') || line.startsWith('>')) {
      ctx.fillStyle = `${theme.accent}0A`;
      ctx.fillRect(winX + gutterW + 1, lineTop, winW - gutterW - 1, lineH);
    }

    // Line number in gutter
    ctx.font = '500 22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#455964';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(i + 1), winX + gutterW - 16, lineBaselineY);

    // Monospace code line (Spec: >= 26px font for mobile readability)
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.font = '500 26px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    if (line.startsWith('$') || line.startsWith('>')) {
      ctx.fillStyle = theme.accent;
    } else if (line.startsWith('+') || line.startsWith('✔')) {
      ctx.fillStyle = '#34D399';
    } else if (line.startsWith('-') || line.startsWith('✖')) {
      ctx.fillStyle = '#F87171';
    } else if (line.startsWith('#') || line.startsWith('//')) {
      ctx.fillStyle = '#677E8C';
    } else {
      ctx.fillStyle = '#E2E8EC';
    }

    const codeMaxWidth = winW - gutterW - 40;
    const fittedLine = truncateTextToWidth(ctx, line, codeMaxWidth);
    ctx.fillText(fittedLine, winX + gutterW + 20, lineBaselineY);
    lineBaselineY += lineSpacing;
  }

  ctx.restore(); // End clipping

  return 730;
}
