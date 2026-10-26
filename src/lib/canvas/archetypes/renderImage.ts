import { SlideData, ThemePalette, VisualSystemOptions } from '../../../types.ts';
import { loadWebImage, loadIconImage, safeDrawImage, drawTintedImage } from '../imageLoader.ts';
import { drawRoundRect } from '../background.ts';
import { fitTextInBox } from '../textLayout.ts';
import { SAFE_CONTENT_WIDTH, SAFE_MARGIN_LEFT } from '../constants.ts';

/**
 * Archetype 6: Image / Web Visual Card (Architecture Diagram, Hero Illustration, or Web Photo)
 * Renders blueprints, HUD frames, theme harmonization filters (invert/hud/tint/clean), and captions.
 */
export async function drawImageSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  theme: ThemePalette,
  _options: VisualSystemOptions
): Promise<number> {
  const cardX = SAFE_MARGIN_LEFT;
  const cardY = 240;
  const cardW = SAFE_CONTENT_WIDTH;
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
    const isSvg = slide.imageUrl.toLowerCase().includes('.svg') || slide.imageUrl.includes('simple-icons');
    const svgColor = filterMode === 'clean' ? undefined : theme.accent;
    const img = await loadWebImage(slide.imageUrl, svgColor);

    if (img.width > 0 && img.height > 0) {
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

      ctx.save();
      if (filterMode === 'invert') {
        ctx.filter = 'invert(0.92) hue-rotate(180deg) contrast(1.2) brightness(0.95)';
        safeDrawImage(ctx, img, dx, dy, dw, dh);
      } else if ((filterMode === 'hud' || filterMode === 'tint') && isSvg) {
        drawTintedImage(ctx, img, dx, dy, dw, dh, theme.accent);
      } else if (filterMode === 'tint') {
        drawTintedImage(ctx, img, dx, dy, dw, dh, theme.accent);
      } else if (filterMode === 'hud') {
        ctx.filter = 'contrast(1.1) brightness(1.02)';
        safeDrawImage(ctx, img, dx, dy, dw, dh);
      } else {
        safeDrawImage(ctx, img, dx, dy, dw, dh);
      }
      ctx.restore();
    }
  } else {
    ctx.save();
    const pIcon = await loadIconImage('codeFile', theme.accent);
    const centerX = cardX + cardW / 2;
    safeDrawImage(ctx, pIcon, centerX - 36, cardY + 140, 72, 72);
    const placeholder = fitTextInBox(
      ctx,
      'Select or search an image from the web in the Slide Editor',
      cardW - 80,
      24,
      '"Plus Jakarta Sans", sans-serif',
      '600',
      { minFontSize: 14 }
    );
    ctx.font = `600 ${placeholder.fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = theme.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText(placeholder.lines[0] || 'Select or search an image from the web in the Slide Editor', centerX, cardY + 260);
    ctx.restore();
  }
  ctx.restore(); // End clipping

  // 4. Top border neon accent line
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
    const maxBadgeW = Math.min(760, cardW - 48);
    const fitCaption = fitTextInBox(
      ctx,
      badgeText,
      maxBadgeW - 36,
      20,
      '"Plus Jakarta Sans", monospace',
      '700',
      { minFontSize: 12 }
    );
    ctx.font = `700 ${fitCaption.fontSize}px "Plus Jakarta Sans", monospace`;
    const captionText = fitCaption.lines[0] || badgeText;
    const bW = Math.min(ctx.measureText(captionText).width + 36, maxBadgeW);
    const bH = 40;
    const bX = cardX + 24;
    const bY = cardY + cardH - 54;
    drawRoundRect(ctx, bX, bY, bW, bH, 12, theme.baseBg, theme.surfaceBorder, 1.5);

    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(captionText, bX + 18, bY + bH / 2);
    ctx.restore();
  }

  return 670;
}
