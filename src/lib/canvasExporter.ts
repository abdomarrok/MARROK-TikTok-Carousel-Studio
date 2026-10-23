import { CarouselData, DEFAULT_PALETTES, SlideData, THEME_CONFIGS, ThemePalette } from '../types';
import { getIconDataUrl } from './icons';
import JSZip from 'jszip';

// Helper to wrap text with max width and handle manual newlines
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
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

  return lines;
}

// Helper to load an SVG or custom image icon as an HTMLImageElement
function loadIconImage(iconName: string, strokeColor: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Failed to load icon ${iconName}`);
      resolve(img);
    };
    img.src = getIconDataUrl(iconName, strokeColor);
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

  // 4. Header: Top-Left Logo + Accent Dot
  ctx.save();
  ctx.font = '800 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('MARROK', 82, 142);

  // Accent Dot next to MARROK wordmark
  const logoWidth = ctx.measureText('MARROK').width;
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
    ctx.drawImage(centerImg, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);

    // 6 Satellite Boxes: 132x132 rounded rect (radius 34) at angles [-90°, -30°, 30°, 90°, 150°, 210°]
    const satAngles = [-90, -30, 30, 90, 150, 210];
    const satIcons = slide.satIcons || ['server', 'database', 'gauge', 'users', 'robot', 'gitMerge'];
    const satW = 132;
    const satH = 132;
    const satIconSize = 68;

    for (let i = 0; i < satAngles.length; i++) {
      const rad = (satAngles[i] * Math.PI) / 180;
      const sx = cx + r * Math.cos(rad);
      const sy = cy + r * Math.sin(rad);

      drawRoundRect(ctx, sx - satW / 2, sy - satH / 2, satW, satH, 34, theme.accent);

      const sIconName = satIcons[i % satIcons.length] || 'gitMerge';
      const sImg = await loadIconImage(sIconName, theme.iconStroke);
      ctx.drawImage(sImg, sx - satIconSize / 2, sy - satIconSize / 2, satIconSize, satIconSize);
    }

    textZoneStartY = 1120;
  } else if (slide.type === 'row') {
    const icons = slide.icons || [{ icon: 'database', label: '' }];
    const count = Math.min(Math.max(icons.length, 1), 3);

    if (count === 1) {
      // Archetype 2: 1 Icon (300x300, radius 72)
      const boxW = 300;
      const boxH = 300;
      const boxX = 390;
      const boxY = 290;
      drawRoundRect(ctx, boxX, boxY, boxW, boxH, 72, theme.accent);

      const iconImg = await loadIconImage(icons[0].icon, theme.iconStroke);
      ctx.drawImage(iconImg, 540 - 71, 290 + 150 - 71, 142, 142);

      if (icons[0].label) {
        ctx.save();
        ctx.font = '400 28px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = theme.microLabel;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(icons[0].label, 540, 290 + 300 + 52);
        ctx.restore();
      }

      textZoneStartY = 755;
    } else if (count === 2) {
      // Archetype 3: 2 Icons (266x266, radius 64, gap 36)
      const boxW = 266;
      const boxH = 266;
      const gap = 36;
      const startX = 256;
      const topY = 290;
      const iconSize = 126;

      for (let i = 0; i < 2; i++) {
        const curX = startX + i * (boxW + gap);
        drawRoundRect(ctx, curX, topY, boxW, boxH, 64, theme.accent);

        const iconImg = await loadIconImage(icons[i].icon, theme.iconStroke);
        ctx.drawImage(iconImg, curX + boxW / 2 - iconSize / 2, topY + boxH / 2 - iconSize / 2, iconSize, iconSize);

        if (icons[i].label) {
          ctx.save();
          ctx.font = '400 28px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = theme.microLabel;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(icons[i].label, curX + boxW / 2, topY + boxH + 52);
          ctx.restore();
        }
      }

      textZoneStartY = 721;
    } else {
      // Archetype 4: 3 Icons (224x224, radius 54, gap 36)
      const boxW = 224;
      const boxH = 224;
      const gap = 36;
      const startX = 168;
      const topY = 290;
      const iconSize = 106;

      for (let i = 0; i < 3; i++) {
        const curX = startX + i * (boxW + gap);
        drawRoundRect(ctx, curX, topY, boxW, boxH, 54, theme.accent);

        const iconImg = await loadIconImage(icons[i].icon, theme.iconStroke);
        ctx.drawImage(iconImg, curX + boxW / 2 - iconSize / 2, topY + boxH / 2 - iconSize / 2, iconSize, iconSize);

        if (icons[i].label) {
          ctx.save();
          ctx.font = '400 28px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = theme.microLabel;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(icons[i].label, curX + boxW / 2, topY + boxH + 52);
          ctx.restore();
        }
      }

      textZoneStartY = 679;
    }
  } else if (slide.type === 'cta') {
    // Archetype 5: CTA (Slide 8 or 9)
    ctx.save();
    ctx.font = '800 146px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('MARROK', 540, 610);

    // Accent Divider Line: 120x10 pill at (480, 655)
    drawRoundRect(ctx, 480, 655, 120, 10, 5, theme.accent);

    // Domain Question Hook
    ctx.font = '800 74px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    const ctaEnTitle = slide.enTitle || (themeMode === 'security' ? 'Building secure\nsoftware?' : 'Building with AI agents\nat scale?');
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
    const ctaArTitle = slide.arTitle || (themeMode === 'security' ? 'تبني برمجيات\nآمنة؟' : 'تبني بوكلاء الذكاء\nالاصطناعي على نطاق\nواسع؟');
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

    // Website URL: marrok.org in 42px regular #E2E8EC
    ctx.save();
    ctx.font = '400 42px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#E2E8EC';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(slide.url || 'marrok.org', 540, pillY + pillH + 112);
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

  // 6. Text Zone Rendering (for hub and row slides)
  if (slide.type === 'hub' || slide.type === 'row') {
    let currentY = textZoneStartY;

    // English Headline: 74px, line-height 86px, 800 weight, #FFFFFF
    if (slide.enTitle) {
      ctx.save();
      ctx.font = '800 74px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.textWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const enLines = wrapTextLines(ctx, slide.enTitle, 900);
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
      const arLines = wrapTextLines(ctx, slide.arTitle, 900);
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
      const enBodyLines = wrapTextLines(ctx, slide.enBody, 860);
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
      const arBodyLines = wrapTextLines(ctx, slide.arBody, 860);
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
        const file = new File([blob], `MARROK_Slide_${slideIndex + 1}.png`, { type: 'image/png' });
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
    }, 'image/png');
  });
}

/**
 * Trigger immediate download of single slide as PNG
 */
export async function downloadSingleSlidePng(
  carousel: CarouselData,
  slideIndex: number,
  filename?: string,
  customPalette?: ThemePalette
): Promise<void> {
  const canvas = await renderSlideToCanvas(carousel, slideIndex, undefined, customPalette);
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename || `MARROK_Slide_${slideIndex + 1}_${carousel.theme}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 1-click Download All Slides as ZIP containing high-resolution 1080x1920 PNGs
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
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    folder?.file(`Slide_${String(i + 1).padStart(2, '0')}.png`, base64, { base64: true });
  }

  // Include the TikTok caption as a text file in the zip
  folder?.file('tiktok_caption.txt', carousel.caption);

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
