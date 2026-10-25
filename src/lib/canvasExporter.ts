import { CarouselData, DEFAULT_PALETTES, SlideData, THEME_CONFIGS, ThemePalette } from '../types.ts';
import { getIconDataUrl, getIconSvg } from './icons.ts';
import { sanitizeArabicSlideText, sanitizeEnglishSlideText } from './textSanitizer.ts';
import JSZip from 'jszip';

// Helper to wrap text with max width, handle manual newlines, and prevent splitting metrics
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  maxWidth: number
): string[] {
  if (!rawText) return [];

  // Protect units and metrics from being split across lines (e.g. "510 GB", "10 ms")
  let textWithNbsp = rawText
    .replace(/\b(\d+(?:\.\d+)?)\s+(GB|TB|MB|KB|ms|s|μs|req|rps|x|X)\b/gi, '$1\u00A0$2')
    .replace(/\b(\d+(?:\.\d+)?)\s+(جيجابايت|تيرابايت|ميجابايت|مللي ثانية|ثواني|ضعفاً)\b/g, '$1\u00A0$2');

  // Prevent isolated Latin technical terms from wrapping as orphans in Arabic text (e.g. "منظومة Zero-Trust")
  textWithNbsp = textWithNbsp.replace(/([\u0600-\u06FF]+)\s+([A-Za-z0-9_\-]+)\b/g, '$1\u00A0$2');

  const paragraphs = textWithNbsp.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const rawWords = para.split(' ');
    const safeWords: string[] = [];

    // Safety check: if an NBSP-bound chunk exceeds maxWidth, unbind \u00A0 back to spaces
    for (const w of rawWords) {
      if (w.includes('\u00A0') && ctx.measureText(w).width > maxWidth) {
        safeWords.push(...w.split('\u00A0'));
      } else {
        safeWords.push(w);
      }
    }

    // Secondary safety: if any single word still exceeds maxWidth, split characters so it cannot overflow canvas
    const expandedWords: string[] = [];
    for (const w of safeWords) {
      if (ctx.measureText(w).width > maxWidth) {
        let chunk = '';
        for (const char of w) {
          if (ctx.measureText(chunk + char).width > maxWidth) {
            if (chunk) expandedWords.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        if (chunk) expandedWords.push(chunk);
      } else {
        expandedWords.push(w);
      }
    }

    let currentLine = '';

    for (const word of expandedWords) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  // Typographic orphan prevention:
  // If the last line has only 1 word and the preceding line has 3+ words, reflow the last word of the preceding line
  if (lines.length >= 2) {
    const lastLine = lines[lines.length - 1].trim();
    const prevLine = lines[lines.length - 2].trim();
    const lastWords = lastLine.split(/\s+/);
    const prevWords = prevLine.split(/\s+/);

    if (lastWords.length === 1 && prevWords.length >= 3) {
      const movedWord = prevWords.pop()!;
      lines[lines.length - 2] = prevWords.join(' ');
      lines[lines.length - 1] = `${movedWord} ${lastLine}`;
    }
  }

  return lines;
}

// In-memory image cache for fast re-renders without repeated network round-trips
const CANVAS_IMAGE_CACHE = new Map<string, HTMLImageElement>();

/**
 * Creates a guaranteed valid fallback SVG image so canvas operations never crash
 */
function createFallbackIcon(strokeColor: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const fallbackSvg = getIconSvg('gitMerge', strokeColor);
    const fallbackUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fallbackSvg)}`;
    const fb = new Image();
    fb.onload = () => resolve(fb);
    fb.onerror = () => resolve(fb);
    fb.src = fallbackUrl;
  });
}

// Helper to load an SVG, custom image icon, or web image as an HTMLImageElement
function loadIconImage(iconName: string, strokeColor: string): Promise<HTMLImageElement> {
  const url = getIconDataUrl(iconName, strokeColor);
  if (CANVAS_IMAGE_CACHE.has(url)) {
    const cached = CANVAS_IMAGE_CACHE.get(url)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve) => {
    let settled = false;
    const img = new Image();
    // Only set crossOrigin for remote http(s) URLs, never for data: or blob:
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    // Safety timeout: never block canvas render for more than 1000ms
    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      console.warn(`Timeout loading icon/image: ${iconName}, falling back to SVG`);
      const fb = await createFallbackIcon(strokeColor);
      CANVAS_IMAGE_CACHE.set(url, fb);
      resolve(fb);
    }, 1000);

    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      CANVAS_IMAGE_CACHE.set(url, img);
      resolve(img);
    };

    img.onerror = async () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.warn(`Failed to load icon/image: ${iconName}, falling back to SVG`);
      const fb = await createFallbackIcon(strokeColor);
      CANVAS_IMAGE_CACHE.set(url, fb);
      resolve(fb);
    };

    img.src = url;
  });
}

// Helper to load full web images / diagrams via CORS proxy with theme recoloring
function loadWebImage(imageUrl: string, color?: string): Promise<HTMLImageElement> {
  const isSvg = imageUrl.toLowerCase().includes('.svg') || imageUrl.includes('simple-icons');
  let safeUrl = imageUrl;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const colorParam = isSvg && color ? `&color=${encodeURIComponent(color)}` : '';
    safeUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}${colorParam}`;
  }

  if (CANVAS_IMAGE_CACHE.has(safeUrl)) {
    return Promise.resolve(CANVAS_IMAGE_CACHE.get(safeUrl)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (!safeUrl.startsWith('data:') && !safeUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    const timer = setTimeout(() => {
      resolve(img);
    }, 1500);

    img.onload = () => {
      clearTimeout(timer);
      CANVAS_IMAGE_CACHE.set(safeUrl, img);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      console.warn(`Failed to load web image: ${imageUrl}`);
      resolve(img);
    };
    img.src = safeUrl;
  });
}

// Draw rounded rectangle helper
function drawRoundRect(
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
    // Fallback if roundRect is not supported
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
 * Safely draws an image to canvas without throwing InvalidStateError on broken images
 */
function safeDrawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (!img || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0 || w <= 0 || h <= 0) {
    return;
  }
  try {
    ctx.drawImage(img, x, y, w, h);
  } catch (err) {
    console.warn('safeDrawImage caught error:', err);
  }
}

// Tinted image drawer helper (replaces non-transparent pixels with theme color via source-in)
function drawTintedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  tintColor?: string
) {
  // Never attempt to draw if image is incomplete or broken (naturalWidth is 0)
  if (!img || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0 || w <= 0 || h <= 0) {
    return;
  }
  if (!tintColor) {
    safeDrawImage(ctx, img, x, y, w, h);
    return;
  }
  try {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = Math.max(1, Math.round(w));
    offCanvas.height = Math.max(1, Math.round(h));
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) {
      safeDrawImage(ctx, img, x, y, w, h);
      return;
    }
    offCtx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
    offCtx.globalCompositeOperation = 'source-in';
    offCtx.fillStyle = tintColor;
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

    ctx.drawImage(offCanvas, x, y, w, h);
  } catch (_err) {
    safeDrawImage(ctx, img, x, y, w, h);
  }
}

/**
 * Render a single MARROK slide at 1080x1920 to an offscreen or provided canvas
 */
export async function renderSlideToCanvas(
  carousel: CarouselData,
  slideIndex: number,
  targetCanvas?: HTMLCanvasElement,
  customPalette?: ThemePalette
): Promise<HTMLCanvasElement> {
  // Ensure custom webfonts are loaded
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const canvas = targetCanvas || document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  const slide = carousel.slides[slideIndex];
  const themeMode = carousel.theme || 'engineering';
  const theme: ThemePalette =
    customPalette ||
    DEFAULT_PALETTES[themeMode] ||
    THEME_CONFIGS[themeMode] ||
    DEFAULT_PALETTES.teal;
  const categoryTag = carousel.category || (themeMode === 'security' ? 'AI + SECURITY' : 'AI + ENGINEERING');
  const totalSlides = carousel.slides.length;

  // 1. Solid Base Background
  ctx.fillStyle = theme.baseBg;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Radial Gradient Glow at (540, 690) with radius 720px
  const glow = ctx.createRadialGradient(540, 690, 0, 540, 690, 720);
  glow.addColorStop(0, theme.radialGlow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1920);

  // 3. Engineering Grid Lines (108px spacing, 2px stroke)
  ctx.save();
  ctx.strokeStyle = theme.gridLine;
  ctx.lineWidth = 2;
  for (let x = 0; x <= 1080; x += 108) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1920);
    ctx.stroke();
  }
  for (let y = 0; y <= 1920; y += 108) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1080, y);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Header: Top-Left Brand Logo + Accent Dot
  ctx.save();
  ctx.font = '800 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const brandName = carousel.brand || 'MARROK';
  ctx.fillText(brandName, 82, 142);

  // Accent Dot next to Brand wordmark
  const logoWidth = ctx.measureText(brandName).width;
  ctx.beginPath();
  ctx.arc(82 + logoWidth + 14, 128, 8.5, 0, Math.PI * 2);
  ctx.fillStyle = theme.accent;
  ctx.fill();

  // Top-Right Category Tag
  ctx.font = '400 31px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = theme.categoryTag;
  ctx.textAlign = 'right';
  ctx.fillText(categoryTag, 998, 140);
  ctx.restore();

  // 5. Render Archetype Specific Graphics & Layouts
  let textZoneStartY = 755;

  if (slide.type === 'hub') {
    // Archetype 1: Hub (Exclusively on Slide 1)
    const cx = 540;
    const cy = 600;
    const r = 325;

    // Outer circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = theme.accent + '4D'; // rgba(accent, 0.3)
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3 intersecting spoke lines through center at angles -90°, -30°, 30°
    const spokeAngles = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6];
    for (const angle of spokeAngles) {
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const x2 = cx - r * Math.cos(angle);
      const y2 = cy - r * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = theme.accent + '4D';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.restore();

    // Center Hub Box: 280x280 rounded rect (radius 64) filled with accent
    const centerBoxW = 280;
    const centerBoxH = 280;
    const centerBoxX = cx - centerBoxW / 2;
    const centerBoxY = cy - centerBoxH / 2;
    drawRoundRect(ctx, centerBoxX, centerBoxY, centerBoxW, centerBoxH, 64, theme.accent);

    // Center Hub Icon: 140x140 in icon-stroke
    const centerIconName = slide.centerIcon || 'gitMerge';
    const centerImg = await loadIconImage(centerIconName, theme.iconStroke);
    const iconSize = 140;
    drawTintedImage(ctx, centerImg, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize, theme.iconStroke);

    // 6 Satellite Boxes: 132x132 rounded rect (radius 34) at angles [-90°, -30°, 30°, 90°, 150°, 210°]
    const satAngles = [-90, -30, 30, 90, 150, 210];
    const satIcons = slide.satIcons || ['server', 'database', 'gauge', 'users', 'robot', 'gitMerge'];
    const satW = 132;
    const satH = 132;
    const satIconSize = 68;

    for (let i = 0; i < satAngles.length; i++) {
      try {
        const rad = (satAngles[i] * Math.PI) / 180;
        const sx = cx + r * Math.cos(rad);
        const sy = cy + r * Math.sin(rad);

        drawRoundRect(ctx, sx - satW / 2, sy - satH / 2, satW, satH, 34, theme.accent);

        const sIconName = satIcons[i % satIcons.length] || 'gitMerge';
        const sImg = await loadIconImage(sIconName, theme.iconStroke);
        drawTintedImage(ctx, sImg, sx - satIconSize / 2, sy - satIconSize / 2, satIconSize, satIconSize, theme.iconStroke);
      } catch (satErr) {
        console.warn(`Error rendering satellite ${i}:`, satErr);
      }
    }

    textZoneStartY = 1120;
  } else if (slide.type === 'row') {
    const icons = slide.icons || [{ icon: 'database', label: '' }];
    const count = Math.min(Math.max(icons.length, 1), 5);

    // Spec §9.4: 1=300, 2=260, 3=220, 4=190, 5=156. Gap 36 (26 for five). Row at y=290.
    let boxW = 220;
    let boxH = 220;
    let gap = 36;
    let radius = 54;
    let iconSize = 106;
    let labelFontSize = 28;

    if (count === 1) {
      boxW = 300; boxH = 300; gap = 0; radius = 72; iconSize = 142; labelFontSize = 28;
    } else if (count === 2) {
      boxW = 260; boxH = 260; gap = 36; radius = 64; iconSize = 126; labelFontSize = 28;
    } else if (count === 3) {
      boxW = 220; boxH = 220; gap = 36; radius = 54; iconSize = 106; labelFontSize = 28;
    } else if (count === 4) {
      boxW = 190; boxH = 190; gap = 36; radius = 46; iconSize = 92; labelFontSize = 26;
    } else if (count === 5) {
      boxW = 156; boxH = 156; gap = 26; radius = 38; iconSize = 76; labelFontSize = 24;
    }

    const totalRowWidth = count * boxW + (count - 1) * gap;
    const startX = 540 - totalRowWidth / 2;
    const topY = 290;

    for (let i = 0; i < count; i++) {
      const curX = startX + i * (boxW + gap);
      drawRoundRect(ctx, curX, topY, boxW, boxH, radius, theme.accent);

      const iconName = icons[i]?.icon || 'database';
      const iconImg = await loadIconImage(iconName, theme.iconStroke);
      drawTintedImage(
        ctx,
        iconImg,
        curX + boxW / 2 - iconSize / 2,
        topY + boxH / 2 - iconSize / 2,
        iconSize,
        iconSize,
        theme.iconStroke
      );

      if (icons[i]?.label) {
        ctx.save();
        ctx.font = `500 ${labelFontSize}px "Cairo", "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = theme.microLabel;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(icons[i].label, curX + boxW / 2, topY + boxH + 42);
        ctx.restore();
      }
    }

    textZoneStartY = topY + boxH + 110;
  } else if (slide.type === 'number') {
    // Spec §9.4 Number Archetype: Big accent numeral (e.g. "01", "02") at y=330, text block at y=700
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

    textZoneStartY = 660;
  } else if (slide.type === 'metric') {
    // Archetype: Metric Card (Benchmark, Speedup, Resource ROI)
    const cardX = 110;
    const cardY = 240;
    const cardW = 860;
    const cardH = 390;
    const radius = 44;

    // Card background & subtle border
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, radius, theme.surface, theme.surfaceBorder, 2.5);

    // Accent line at top inside border
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.arc(cardX + radius, cardY + radius, radius, Math.PI, 1.5 * Math.PI);
    ctx.lineTo(cardX + cardW - radius, cardY);
    ctx.arc(cardX + cardW - radius, cardY + radius, radius, 1.5 * Math.PI, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // Top Row: Icon badge + Metric Label
    const iconBadgeSize = 64;
    const iconBadgeX = cardX + 44;
    const iconBadgeY = cardY + 36;
    drawRoundRect(ctx, iconBadgeX, iconBadgeY, iconBadgeSize, iconBadgeSize, 18, theme.accent);

    const mIcon = slide.metricIcon || 'zap';
    const iconImg = await loadIconImage(mIcon, theme.iconStroke);
    drawTintedImage(ctx, iconImg, iconBadgeX + 14, iconBadgeY + 14, 36, 36, theme.iconStroke);

    const metricLabel = (slide.metricLabel || 'KEY PERFORMANCE METRIC').toUpperCase();
    ctx.save();
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = theme.microLabel;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(metricLabel, iconBadgeX + iconBadgeSize + 20, iconBadgeY + iconBadgeSize / 2);
    ctx.restore();

    // Giant Hero Metric Value (center of card)
    const metricVal = slide.metricValue || '10x';
    ctx.save();
    const valFontSize = metricVal.length > 8 ? 96 : metricVal.length > 5 ? 116 : 138;
    ctx.font = `900 ${valFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = theme.textWhite;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(metricVal, 540, cardY + 230);
    ctx.restore();

    // Metric Improvement / Delta Pill
    const diffText = slide.metricDiff || '▲ Measurable architectural speedup';
    ctx.save();
    ctx.font = '600 26px "Plus Jakarta Sans", monospace';
    const diffMetrics = ctx.measureText(diffText);
    const pillW = Math.min(diffMetrics.width + 56, 760);
    const pillH = 50;
    const pillX = 540 - pillW / 2;
    const pillY = cardY + cardH - 80;
    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 25, `${theme.accent}20`, `${theme.accent}60`, 2);

    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(diffText, 540, pillY + pillH / 2);
    ctx.restore();

    textZoneStartY = 715;
  } else if (slide.type === 'code') {
    // Archetype: Terminal / Code Window
    const winX = 100;
    const winY = 230;
    const winW = 880;
    const winH = 430;
    const winRadius = 32;

    // Window container
    drawRoundRect(ctx, winX, winY, winW, winH, winRadius, '#080d11', theme.surfaceBorder, 2.5);

    // Header bar background
    drawRoundRect(ctx, winX, winY, winW, 60, winRadius, '#0f181e');
    // Square off the bottom of the header bar
    ctx.fillStyle = '#0f181e';
    ctx.fillRect(winX, winY + 30, winW, 30);
    // Header divider line
    ctx.strokeStyle = theme.surfaceBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(winX, winY + 60);
    ctx.lineTo(winX + winW, winY + 60);
    ctx.stroke();

    // macOS window dots
    const dotY = winY + 30;
    ctx.save();
    ctx.beginPath();
    ctx.arc(winX + 36, dotY, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FF5F56'; // Red
    ctx.fill();

    ctx.beginPath();
    ctx.arc(winX + 60, dotY, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFBD2E'; // Yellow
    ctx.fill();

    ctx.beginPath();
    ctx.arc(winX + 84, dotY, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#27C93F'; // Green
    ctx.fill();
    ctx.restore();

    // Tab / Filename
    const fileName = slide.codeFileName || (slide.codeLanguage ? `source.${slide.codeLanguage}` : 'terminal.sh');
    ctx.save();
    ctx.font = '500 22px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fileName, 540, dotY);
    ctx.restore();

    // Code lines
    const snippet = slide.codeSnippet || '$ git fetch --depth=1\n> Initializing lazy checkout...\n+ Fetched 100GB repository in 1.2s\n✔ Zero local disk stalls';
    const lines = snippet.split('\n').slice(0, 7);
    let lineY = winY + 105;
    const lineSpacing = 44;

    ctx.save();
    ctx.font = '500 27px "JetBrains Mono", monospace';
    ctx.textBaseline = 'alphabetic';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Line number
      ctx.fillStyle = theme.textMuted + '80';
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), winX + 54, lineY);

      // Syntax styling
      ctx.textAlign = 'left';
      if (line.startsWith('$') || line.startsWith('>')) {
        ctx.fillStyle = theme.accent;
      } else if (line.startsWith('+') || line.startsWith('✔')) {
        ctx.fillStyle = '#34D399'; // Emerald
      } else if (line.startsWith('-') || line.startsWith('✖')) {
        ctx.fillStyle = '#F87171'; // Red
      } else if (line.startsWith('#') || line.startsWith('//')) {
        ctx.fillStyle = theme.textMuted;
      } else {
        ctx.fillStyle = '#E2E8EC';
      }
      ctx.fillText(line, winX + 76, lineY);
      lineY += lineSpacing;
    }
    ctx.restore();

    textZoneStartY = 745;
  } else if (slide.type === 'compare') {
    // Archetype: Side-by-Side Comparison (Legacy vs Modern)
    const cardY = 240;
    const cardH = 410;
    const cardW = 420;
    const leftX = 100;
    const rightX = 560;
    const radius = 32;

    // Left Card: Legacy / Problem
    drawRoundRect(ctx, leftX, cardY, cardW, cardH, radius, theme.surface, 'rgba(244,63,94,0.35)', 2.5);

    // Left Header Badge
    drawRoundRect(ctx, leftX + 24, cardY + 24, cardW - 48, 52, 16, 'rgba(244,63,94,0.18)');
    const xImg = await loadIconImage('xCircle', '#F43F5E');
    safeDrawImage(ctx, xImg, leftX + 38, cardY + 36, 28, 28);

    const leftTitle = slide.compareLeftTitle || 'Legacy Method';
    ctx.save();
    ctx.font = '800 25px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FDA4AF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(leftTitle, leftX + 78, cardY + 50);
    ctx.restore();

    // Left Body Lines
    const leftText = slide.compareLeftBody || '• Full repository clone\n• High disk footprint\n• Stalls CI pipelines';
    const leftLines = leftText.split('\n').slice(0, 5);
    ctx.save();
    ctx.font = '400 25px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = theme.textEnBody;
    ctx.textAlign = 'left';
    let lY = cardY + 125;
    for (const l of leftLines) {
      ctx.fillText(l, leftX + 32, lY);
      lY += 46;
    }
    ctx.restore();

    // Right Card: Modern / Solution
    drawRoundRect(ctx, rightX, cardY, cardW, cardH, radius, theme.surface, `${theme.accent}60`, 2.5);

    // Right Header Badge
    drawRoundRect(ctx, rightX + 24, cardY + 24, cardW - 48, 52, 16, `${theme.accent}22`);
    const checkImg = await loadIconImage('checkCircle', theme.accent);
    safeDrawImage(ctx, checkImg, rightX + 38, cardY + 36, 28, 28);

    const rightTitle = slide.compareRightTitle || 'Modern Approach';
    ctx.save();
    ctx.font = '800 25px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(rightTitle, rightX + 78, cardY + 50);
    ctx.restore();

    // Right Body Lines
    const rightText = slide.compareRightBody || '• Virtualized file system\n• Instant sparse checkout\n• Zero local developer wait';
    const rightLines = rightText.split('\n').slice(0, 5);
    ctx.save();
    ctx.font = '400 25px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = theme.textEnBody;
    ctx.textAlign = 'left';
    let rY = cardY + 125;
    for (const r of rightLines) {
      ctx.fillText(r, rightX + 32, rY);
      rY += 46;
    }
    ctx.restore();

    // Center VS Badge
    const vsX = 540;
    const vsY = cardY + cardH / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(vsX, vsY, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#081216';
    ctx.fill();
    ctx.strokeStyle = theme.surfaceBorder;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = '800 21px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.microLabel;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', vsX, vsY);
    ctx.restore();

    textZoneStartY = 745;
  } else if (slide.type === 'image') {
    // Archetype: Image / Web Visual Card (Architecture Diagram, Hero Illustration, or Web Photo)
    const cardX = 100;
    const cardY = 240;
    const cardW = 880;
    const cardH = 430;
    const radius = 32;

    // 1. Soft ambient theme glow behind the card matching active post theme
    ctx.save();
    const glowGrad = ctx.createRadialGradient(
      cardX + cardW / 2,
      cardY + cardH / 2,
      40,
      cardX + cardW / 2,
      cardY + cardH / 2,
      cardW / 1.5
    );
    glowGrad.addColorStop(0, `${theme.accent}20`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(cardX - 40, cardY - 40, cardW + 80, cardH + 80);
    ctx.restore();

    // 2. Card surface strictly inherits active post theme surface & border
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, radius, theme.surface, theme.surfaceBorder, 2.5);

    // 3. Clip inside card for blueprint grid and visual rendering
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.clip();

    // Technical blueprint grid aligned with post theme
    ctx.strokeStyle = `${theme.accent}0A`;
    ctx.lineWidth = 1;
    const gridStep = 32;
    for (let gx = cardX; gx <= cardX + cardW; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, cardY);
      ctx.lineTo(gx, cardY + cardH);
      ctx.stroke();
    }
    for (let gy = cardY; gy <= cardY + cardH; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(cardX, gy);
      ctx.lineTo(cardX + cardW, gy);
      ctx.stroke();
    }

    // Technical corner HUD brackets in theme accent
    const brk = 18;
    ctx.strokeStyle = `${theme.accent}45`;
    ctx.lineWidth = 2;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(cardX + 22, cardY + 22 + brk);
    ctx.lineTo(cardX + 22, cardY + 22);
    ctx.lineTo(cardX + 22 + brk, cardY + 22);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(cardX + cardW - 22 - brk, cardY + 22);
    ctx.lineTo(cardX + cardW - 22, cardY + 22);
    ctx.lineTo(cardX + cardW - 22, cardY + 22 + brk);
    ctx.stroke();

    if (slide.imageUrl) {
      const filterMode = slide.imageFilter || 'hud';
      // If SVG or logo, colorize with theme.accent in hud/tint mode
      const isSvg = slide.imageUrl.toLowerCase().includes('.svg') || slide.imageUrl.includes('simple-icons');
      const svgColor = filterMode === 'clean' ? undefined : theme.accent;
      const img = await loadWebImage(slide.imageUrl, svgColor);

      if (img.width > 0 && img.height > 0) {
        // Calculate aspect fit inside card
        const imgAspect = img.width / img.height;
        const cardAspect = cardW / cardH;
        let dw = cardW;
        let dh = cardH;
        let dx = cardX;
        let dy = cardY;

        if (slide.imageFit === 'cover') {
          if (imgAspect > cardAspect) {
            dh = cardH;
            dw = cardH * imgAspect;
            dx = cardX + (cardW - dw) / 2;
          } else {
            dw = cardW;
            dh = cardW / imgAspect;
            dy = cardY + (cardH - dh) / 2;
          }
        } else {
          // Contain with 24px padding
          const pad = 24;
          const availW = cardW - pad * 2;
          const availH = cardH - pad * 2;
          const availAspect = availW / availH;

          if (imgAspect > availAspect) {
            dw = availW;
            dh = availW / imgAspect;
          } else {
            dh = availH;
            dw = availH * imgAspect;
          }
          dx = cardX + (cardW - dw) / 2;
          dy = cardY + (cardH - dh) / 2;
        }

        // Apply theme harmonization filter to image
        ctx.save();
        if (filterMode === 'invert') {
          // Invert white background diagrams into dark terminal mode
          ctx.filter = 'invert(0.92) hue-rotate(180deg) contrast(1.2) brightness(0.95)';
          safeDrawImage(ctx, img, dx, dy, dw, dh);
        } else if ((filterMode === 'hud' || filterMode === 'tint') && isSvg) {
          // In HUD / Tint mode, colorize SVG logo/graphic directly with active post theme accent!
          drawTintedImage(ctx, img, dx, dy, dw, dh, theme.accent);
        } else if (filterMode === 'tint') {
          drawTintedImage(ctx, img, dx, dy, dw, dh, theme.accent);
        } else if (filterMode === 'hud') {
          // Subtle high-contrast terminal blend for raster diagrams
          ctx.filter = 'contrast(1.1) brightness(1.02)';
          safeDrawImage(ctx, img, dx, dy, dw, dh);
        } else {
          safeDrawImage(ctx, img, dx, dy, dw, dh);
        }
        ctx.restore();
      }
    } else {
      // Sleek placeholder if no image URL yet
      ctx.save();
      const pIcon = await loadIconImage('codeFile', theme.accent);
      safeDrawImage(ctx, pIcon, 540 - 36, cardY + 140, 72, 72);
      ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.textMuted;
      ctx.textAlign = 'center';
      ctx.fillText('Select or search an image from the web in the Slide Editor', 540, cardY + 260);
      ctx.restore();
    }
    ctx.restore(); // End clipping

    // 4. Top border neon accent line (indicates active theme)
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.moveTo(cardX + 60, cardY);
    ctx.lineTo(cardX + cardW - 60, cardY);
    ctx.stroke();
    ctx.restore();

    // 5. Optional Image Caption / Micro-badge matching theme
    if (slide.imageCaption) {
      ctx.save();
      const badgeText = slide.imageCaption.toUpperCase();
      ctx.font = '700 20px "Plus Jakarta Sans", monospace';
      const bMetrics = ctx.measureText(badgeText);
      const bW = Math.min(bMetrics.width + 36, 760);
      const bH = 40;
      const bX = cardX + 24;
      const bY = cardY + cardH - 54;
      drawRoundRect(ctx, bX, bY, bW, bH, 12, theme.baseBg, theme.surfaceBorder, 1.5);

      ctx.fillStyle = theme.accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, bX + 18, bY + bH / 2);
      ctx.restore();
    }

    textZoneStartY = 745;
  } else if (slide.type === 'cta') {
    // Archetype 5: CTA (Slide 8 or 9)
    ctx.save();
    const ctaBrand = carousel.brand || 'MARROK';
    const brandFontSize = ctaBrand.length > 12 ? 92 : ctaBrand.length > 7 ? 116 : 146;
    ctx.font = `800 ${brandFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ctaBrand, 540, 610);

    // Accent Divider Line: 120x10 pill at (480, 655)
    drawRoundRect(ctx, 480, 655, 120, 10, 5, theme.accent);

    // Domain Question Hook
    ctx.font = '800 74px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    const rawCtaEnTitle = slide.enTitle || (themeMode === 'security' ? 'Building secure\nsoftware?' : 'Building with AI agents\nat scale?');
    const ctaEnTitle = sanitizeEnglishSlideText(rawCtaEnTitle, { isTitle: true });
    const enCtaLines = wrapTextLines(ctx, ctaEnTitle, 900);
    let curY = 795;
    for (const line of enCtaLines) {
      ctx.fillText(line, 540, curY);
      curY += 86;
    }

    curY += 12;
    ctx.font = '800 70px "Cairo", sans-serif';
    ctx.fillStyle = theme.accent;
    ctx.direction = 'rtl';
    const rawCtaArTitle = slide.arTitle || (themeMode === 'security' ? 'تبني برمجيات\nآمنة؟' : 'تبني بوكلاء الذكاء\nالاصطناعي على نطاق\nواسع؟');
    const ctaArTitle = sanitizeArabicSlideText(rawCtaArTitle, { isTitle: true });
    const arCtaLines = wrapTextLines(ctx, ctaArTitle, 900);
    for (const line of arCtaLines) {
      ctx.fillText(line, 540, curY);
      curY += 88;
    }
    ctx.restore();

    // CTA Pill Button: 656x118, radius 59
    const pillW = 656;
    const pillH = 118;
    const pillX = (1080 - pillW) / 2;
    const pillY = 1390;
    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 59, theme.accent);

    ctx.save();
    ctx.font = '800 42px "Cairo", "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#11131A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.ctaText || 'DM us  •  رسالة خاصة', 540, pillY + pillH / 2);
    ctx.restore();

    // Website URL: dynamic brandUrl or slide url or marrok.org
    const displayUrl = carousel.brandUrl || slide.url || 'marrok.org';
    ctx.save();
    ctx.font = '400 42px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#E2E8EC';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(displayUrl, 540, pillY + pillH + 112);
    ctx.restore();

    // Bilingual Source Attribution Footer
    if (slide.enCredit) {
      ctx.save();
      ctx.font = '400 25px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.textMuted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(slide.enCredit, 540, 1715);
      ctx.restore();
    }
    if (slide.arCredit) {
      ctx.save();
      ctx.font = '400 25px "Cairo", sans-serif';
      ctx.fillStyle = theme.textMuted;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(slide.arCredit, 540, 1755);
      ctx.restore();
    }
  }

  // 6. Text Zone Rendering (for hub, row, metric, code, and compare slides)
  if (slide.type !== 'cta') {
    let currentY = textZoneStartY;

    // English Headline: 74px, line-height 86px, 800 weight, #FFFFFF
    if (slide.enTitle) {
      ctx.save();
      ctx.font = '800 74px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.textWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const cleanEnTitle = sanitizeEnglishSlideText(slide.enTitle, { isTitle: true });
      const enLines = wrapTextLines(ctx, cleanEnTitle, 900);
      for (const line of enLines) {
        ctx.fillText(line, 540, currentY);
        currentY += 86;
      }
      ctx.restore();
    }

    // Arabic Headline: 70px, line-height 88px, 800 weight, var(--accent)
    if (slide.arTitle) {
      currentY += 6;
      ctx.save();
      ctx.font = '800 70px "Cairo", sans-serif';
      ctx.fillStyle = theme.accent;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      const cleanArTitle = sanitizeArabicSlideText(slide.arTitle, { isTitle: true });
      const arLines = wrapTextLines(ctx, cleanArTitle, 900);
      for (const line of arLines) {
        ctx.fillText(line, 540, currentY);
        currentY += 88;
      }
      ctx.restore();
    }

    // English Body Copy: 38px, line-height 54px, 400 weight, #CDD5D9
    if (slide.enBody) {
      currentY += 34;
      ctx.save();
      ctx.font = '400 38px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.textEnBody;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const cleanEnBody = sanitizeEnglishSlideText(slide.enBody, { isTitle: false });
      const enBodyLines = wrapTextLines(ctx, cleanEnBody, 860);
      for (const line of enBodyLines) {
        ctx.fillText(line, 540, currentY);
        currentY += 54;
      }
      ctx.restore();
    }

    // Arabic Body Copy: 38px, line-height 56px, 400 weight, #9BA5AB
    if (slide.arBody) {
      currentY += 18;
      ctx.save();
      ctx.font = '400 38px "Cairo", sans-serif';
      ctx.fillStyle = theme.textArBody;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      const cleanArBody = sanitizeArabicSlideText(slide.arBody, { isTitle: false });
      const arBodyLines = wrapTextLines(ctx, cleanArBody, 860);
      for (const line of arBodyLines) {
        ctx.fillText(line, 540, currentY);
        currentY += 56;
      }
      ctx.restore();
    }
  }

  // 7. Pagination Footer (Present on EVERY slide at y = 1826)
  const dotRadius = 8;
  const dotDiameter = 16;
  const dotGap = 16;
  const step = dotDiameter + dotGap;
  const totalDotsWidth = totalSlides * dotDiameter + (totalSlides - 1) * dotGap;
  const startDotX = 540 - totalDotsWidth / 2 + dotRadius;
  const dotY = 1826;

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

  return canvas;
}

/**
 * Direct Browser Copy: Copy 1080x1920 slide image directly to system clipboard
 */
export async function copySlideToClipboard(
  carousel: CarouselData,
  slideIndex: number,
  customPalette?: ThemePalette
): Promise<void> {
  const canvas = await renderSlideToCanvas(carousel, slideIndex, undefined, customPalette);

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Failed to create PNG blob from canvas'));
        return;
      }
      try {
        if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
          const item = new (window as any).ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve();
        } else {
          // Fallback: download if clipboard API image/png not permitted
          downloadSingleSlidePng(carousel, slideIndex, undefined, customPalette);
          resolve();
        }
      } catch (err) {
        console.warn('Clipboard write failed, triggering single download fallback:', err);
        downloadSingleSlidePng(carousel, slideIndex, undefined, customPalette);
        resolve();
      }
    }, 'image/png');
  });
}

/**
 * Web Share API: Share slide image directly on mobile (TikTok, Instagram, WhatsApp, etc.)
 */
export async function shareSlide(
  carousel: CarouselData,
  slideIndex: number,
  customPalette?: ThemePalette
): Promise<boolean> {
  const canvas = await renderSlideToCanvas(carousel, slideIndex, undefined, customPalette);

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        const file = new File([blob], `MARROK_Slide_${slideIndex + 1}.jpg`, { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `MARROK Slide ${slideIndex + 1}`,
            text: carousel.caption.substring(0, 100),
          });
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (err) {
        console.warn('Web Share failed:', err);
        resolve(false);
      }
    }, 'image/jpeg', 0.95);
  });
}

/**
 * Trigger immediate download of single slide as JPG (TikTok requires JPG, not PNG)
 */
export async function downloadSingleSlidePng(
  carousel: CarouselData,
  slideIndex: number,
  filename?: string,
  customPalette?: ThemePalette
): Promise<void> {
  const canvas = await renderSlideToCanvas(carousel, slideIndex, undefined, customPalette);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename || `MARROK_Slide_${slideIndex + 1}_${carousel.theme}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 1-click Download All Slides as ZIP containing high-resolution 1080x1920 JPGs
 * Spec §9.8: JPG only, quality 95, ~250-300 KB per slide. TikTok rejects PNG.
 */
export async function downloadAllSlidesZip(
  carousel: CarouselData,
  customPalette?: ThemePalette,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(`MARROK_Carousel_${carousel.theme}`);
  const total = carousel.slides.length;

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total);
    const canvas = await renderSlideToCanvas(carousel, i, undefined, customPalette);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const base64 = dataUrl.split(',')[1];
    folder?.file(`slide${i + 1}.jpg`, base64, { base64: true });
  }

  // Spec §18 Complete Deliverables: Caption, Pinned First Comment, Short Caption, Metadata, and Claims Citations
  // 1. Formatted Bilingual Caption
  let fullCaptionText = carousel.caption || '';
  if (carousel.facts && carousel.facts.length > 0 && !fullCaptionText.includes('Verified Facts:')) {
    const factsBlock = carousel.facts
      .map(
        (f) =>
          `• [${f.verified.toUpperCase()}] ${f.text}${f.sourceTitle ? ` (Ref: ${f.sourceTitle})` : ''}${f.sourceUrl ? `\n  Link: ${f.sourceUrl}` : ''}`
      )
      .join('\n');
    fullCaptionText += `\n\n═════════════════════════════════════\n🔍 Verified Claims & Citations:\n${factsBlock}`;
  }
  folder?.file('caption.txt', fullCaptionText.replace(/\u00A0/g, ' '));

  // 2. Separate dedicated claims & citations verification file
  if (carousel.facts && carousel.facts.length > 0) {
    const claimsReport = `MARROK VERIFIED CLAIMS & GROUNDING REPORT
══════════════════════════════════════════════
Topic: ${carousel.category}
Brand/Source: ${carousel.brand || 'Engineering Source'} (${carousel.brandUrl || 'marrok.org'})
Search Grounded: ${carousel.sourceMeta?.isSearchGrounded ? 'YES (Google Search Grounding)' : 'Synthesizer Intelligence'}
Generated: ${new Date().toISOString()}

EXTRACTED & VERIFIED CLAIMS:
${carousel.facts
  .map(
    (f, idx) =>
      `[#${idx + 1}] ${f.type.toUpperCase()} · Status: ${f.verified.toUpperCase()}
Claim: ${f.text}
Evidence: ${f.evidence || 'Attributed to source documentation'}
${f.sourceTitle ? `Source: ${f.sourceTitle}` : ''}
${f.sourceUrl ? `URL: ${f.sourceUrl}` : ''}
`
  )
  .join('\n')}

GROUNDING QUERIES EXECUTED:
${(carousel.sourceMeta?.groundingQueries || []).map((q) => `• ${q}`).join('\n') || '• Direct contextual extraction'}

AUTHORITATIVE SOURCES & DOCUMENTATION:
${(carousel.sourceMeta?.groundingSources || []).map((s) => `• ${s.title}: ${s.url}`).join('\n') || `• https://${carousel.brandUrl || 'marrok.org'}`}
`;
    folder?.file('claims_citations.txt', claimsReport.replace(/\u00A0/g, ' '));
  }

  if (carousel.firstComment) {
    folder?.file('first_comment.txt', carousel.firstComment.replace(/\u00A0/g, ' '));
  }
  if (carousel.shortCaption) {
    folder?.file('short_caption.txt', carousel.shortCaption.replace(/\u00A0/g, ' '));
  }

  // Structured Post Metadata JSON (for automation, analytics, and archiving)
  const metadata = {
    exportedAt: new Date().toISOString(),
    generator: 'MARROK TikTok Carousel Studio',
    category: carousel.category,
    theme: carousel.theme,
    totalSlides: carousel.slides.length,
    brand: carousel.brand,
    brandUrl: carousel.brandUrl,
    scheduleSlot: carousel.scheduleSlot,
    sourceMeta: carousel.sourceMeta,
    facts: carousel.facts || [],
    notesForHuman: carousel.notesForHuman || [],
    archetypes: carousel.slides.map((s, idx) => ({ slide: idx + 1, type: s.type, enTitle: s.enTitle, arTitle: s.arTitle })),
    caption: carousel.caption,
    firstComment: carousel.firstComment,
    screenHook: carousel.screenHook,
    captionVariants: carousel.captionVariants || [],
    hookVariants: carousel.hookVariants || [],
  };
  folder?.file('post_metadata.json', JSON.stringify(metadata, null, 2));

  // Quick Creator Publishing Guide
  const readme = `MARROK TIKTOK CAROUSEL EXPORT PACKAGE
=====================================
Deck: ${carousel.category} (${carousel.slides.length} slides)
Theme: ${carousel.theme}
Search Grounded: ${carousel.sourceMeta?.isSearchGrounded ? 'YES (Google Search)' : 'Autonomous Synthesizer'}
Created: ${new Date().toLocaleString()}

FILES IN THIS PACKAGE:
- slide1.jpg to slide${total}.jpg (1080x1920 9:16 high-res JPGs, Safe-Zone compliant)
- caption.txt (Bilingual TikTok post caption with hashtags and verification block)
- claims_citations.txt (Audit log of all verified numbers, benchmarks, and source links)
- first_comment.txt (Pinned first comment to drive engagement and save rate)
- short_caption.txt (Clean 2-line version for TikTok quick post)
- post_metadata.json (Machine-readable post schema with grounding metadata)

HOW TO PUBLISH TO TIKTOK:
1. Transfer slide1.jpg through slide${total}.jpg to your phone (AirDrop, Google Drive, etc.).
2. Open TikTok -> Tap '+' -> Choose 'Photos' -> Select all ${total} slides in numerical order.
3. Copy text from 'caption.txt' and paste into TikTok's description box.
4. Hit 'Post'. Immediately open your video comments and paste 'first_comment.txt', then pin it!
`;
  folder?.file('README.txt', readme);

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MARROK_${carousel.category.replace(/[^a-zA-Z0-9]/g, '_')}_Carousel.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Spec §10: Contact Sheet Generator for Visual QA
 * Renders all slides tiled in a grid onto a single high-resolution master JPG canvas.
 */
export async function downloadContactSheetJpg(
  carousel: CarouselData,
  customPalette?: ThemePalette,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const total = carousel.slides.length;
  const cols = total <= 4 ? total : total <= 8 ? 4 : 5;
  const rows = Math.ceil(total / cols);

  // Scaled dimensions per slide on contact sheet
  const sW = 360;
  const sH = 640;
  const gap = 32;
  const headerH = 120;
  const pad = 40;

  const masterW = pad * 2 + cols * sW + (cols - 1) * gap;
  const masterH = headerH + pad * 2 + rows * sH + (rows - 1) * gap;

  const master = document.createElement('canvas');
  master.width = masterW;
  master.height = masterH;
  const mctx = master.getContext('2d');
  if (!mctx) return;

  // Background
  mctx.fillStyle = '#080d11';
  mctx.fillRect(0, 0, masterW, masterH);

  // Header banner
  mctx.fillStyle = '#ffffff';
  mctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
  mctx.fillText('MARROK STUDIO · VISUAL QA CONTACT SHEET', pad, pad + 38);

  mctx.fillStyle = '#9BA5AB';
  mctx.font = '500 20px "Plus Jakarta Sans", monospace';
  mctx.fillText(
    `Deck: ${carousel.category}   •   Theme: ${carousel.theme}   •   ${total} Slides (1080×1920 9:16)   •   Format: JPG Q95`,
    pad,
    pad + 74
  );

  // Render each slide
  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total);
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = pad + c * (sW + gap);
    const y = pad + headerH + r * (sH + gap);

    const slideCanvas = await renderSlideToCanvas(carousel, i, undefined, customPalette);
    mctx.drawImage(slideCanvas, 0, 0, 1080, 1920, x, y, sW, sH);

    // Slide border & index tag
    mctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    mctx.lineWidth = 2;
    mctx.strokeRect(x, y, sW, sH);

    mctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    mctx.fillRect(x + 12, y + 12, 80, 28);
    mctx.fillStyle = '#ffffff';
    mctx.font = '700 14px "Plus Jakarta Sans", monospace';
    mctx.fillText(`SLIDE ${String(i + 1).padStart(2, '0')}`, x + 20, y + 31);
  }

  const dataUrl = master.toDataURL('image/jpeg', 0.95);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `MARROK_ContactSheet_${carousel.category.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

