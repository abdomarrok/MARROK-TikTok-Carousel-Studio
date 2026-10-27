import { CarouselData, DEFAULT_PALETTES, SlideData, THEME_CONFIGS, ThemePalette, VisualSystemOptions } from '../../types.ts';
import { seedSlideArchetypeData } from '../synthesis/archetypes.ts';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SAFE_MARGIN_LEFT,
  SAFE_MARGIN_RIGHT,
  SAFE_TEXT_CENTER_X,
  SAFE_TEXT_WIDTH_TITLE,
  SAFE_TEXT_WIDTH_BODY,
  SAFE_FOOTER_CEILING_Y,
} from './constants.ts';
import { fitTextInBox } from './textLayout.ts';
import {
  drawBaseBackground,
  drawRadialGlow,
  drawEngineeringGrid,
  drawCadReticles,
  drawHeader,
  drawPaginationFooter,
} from './background.ts';
import {
  drawHubSlide,
  drawRowSlide,
  drawNumberSlide,
  drawMetricSlide,
  drawCodeSlide,
  drawCompareSlide,
  drawImageSlide,
  drawCtaSlide,
} from './archetypes/index.ts';

/**
 * Render a single MARROK slide at 1080x1920 to an offscreen or provided canvas.
 * Note: Pure read-only projection of state; does not re-sanitize or mutate text during drawing.
 */
export async function renderSlideToCanvas(
  carousel: CarouselData,
  slideIndex: number,
  targetCanvas?: HTMLCanvasElement,
  customPalette?: ThemePalette,
  visualOptions?: VisualSystemOptions
): Promise<HTMLCanvasElement> {
  // Ensure custom webfonts are loaded
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const canvas = targetCanvas || document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  const rawSlide = carousel.slides[slideIndex];
  if (!rawSlide) throw new Error(`Slide at index ${slideIndex} not found`);

  // Seed archetype defaults gracefully if a field is missing
  const slide = seedSlideArchetypeData(rawSlide, rawSlide.type);
  const themeMode = carousel.theme || 'engineering';
  const theme: ThemePalette =
    customPalette ||
    DEFAULT_PALETTES[themeMode] ||
    THEME_CONFIGS[themeMode] ||
    DEFAULT_PALETTES.teal;
  const categoryTag = carousel.category || (themeMode === 'security' ? 'AI + SECURITY' : 'AI + ENGINEERING');
  const totalSlides = carousel.slides.length;

  // Resolve visual system toggles
  const options: VisualSystemOptions = {
    showCadReticles: visualOptions?.showCadReticles ?? carousel.visualOptions?.showCadReticles ?? customPalette?.showCadReticles ?? true,
    showSparklines: visualOptions?.showSparklines ?? carousel.visualOptions?.showSparklines ?? customPalette?.showSparklines ?? true,
    terminalScanlines: visualOptions?.terminalScanlines ?? carousel.visualOptions?.terminalScanlines ?? customPalette?.terminalScanlines ?? true,
  };

  // 1. Solid Base Background
  drawBaseBackground(ctx, theme);

  // 2. Radial Gradient Glow
  drawRadialGlow(ctx, theme);

  // 3. Engineering Grid Lines
  drawEngineeringGrid(ctx, theme);

  // 3b. Canvas Background CAD Reticles
  if (options.showCadReticles) {
    drawCadReticles(ctx, theme);
  }

  // 4. Header: Top-Left Authentic MARROK Vector Badge + Brand Wordmark + Category Tag
  const headerOverride = slide.layoutOverrides?.headerBadge;
  if (headerOverride) {
    ctx.save();
    ctx.translate(headerOverride.dx || 0, headerOverride.dy || 0);
    if (headerOverride.scale && headerOverride.scale !== 1) {
      ctx.scale(headerOverride.scale, headerOverride.scale);
    }
    drawHeader(ctx, carousel, theme, categoryTag);
    ctx.restore();
  } else {
    drawHeader(ctx, carousel, theme, categoryTag);
  }

  // 5. Render Archetype Specific Graphics & Layouts
  let yGraphicEnd = 670;
  const graphicOverride = slide.layoutOverrides?.graphicCard;
  ctx.save();
  if (graphicOverride) {
    const cx = CANVAS_WIDTH / 2;
    const cy = 460;
    ctx.translate(cx + (graphicOverride.dx || 0), cy + (graphicOverride.dy || 0));
    const s = graphicOverride.scale ?? 1;
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    if (graphicOverride.opacity !== undefined) {
      ctx.globalAlpha *= Math.max(0, Math.min(1, graphicOverride.opacity));
    }
  }

  if (slide.type === 'hub') {
    yGraphicEnd = await drawHubSlide(ctx, slide, theme, options);
  } else if (slide.type === 'row') {
    yGraphicEnd = await drawRowSlide(ctx, slide, theme, options, slideIndex);
  } else if (slide.type === 'number') {
    yGraphicEnd = await drawNumberSlide(ctx, slide, theme, options, slideIndex);
  } else if (slide.type === 'metric') {
    yGraphicEnd = await drawMetricSlide(ctx, slide, theme, options);
  } else if (slide.type === 'code') {
    yGraphicEnd = await drawCodeSlide(ctx, slide, theme, options);
  } else if (slide.type === 'compare') {
    yGraphicEnd = await drawCompareSlide(ctx, slide, theme, options);
  } else if (slide.type === 'image') {
    yGraphicEnd = await drawImageSlide(ctx, slide, theme, options);
  } else if (slide.type === 'cta') {
    yGraphicEnd = await drawCtaSlide(ctx, slide, carousel, theme, options, themeMode);
  }
  ctx.restore();

  // 6. Text Zone Rendering (for hub, row, metric, code, and compare slides)
  // Strict Safe-Zone Rule: Center at x = 518 with maxWidth 850 (titles) and 820 (body)
  // to enforce right safe margin >= 135px (x <= 945) clearing TikTok native right-side action buttons.
  // Rendering is a pure read-only projection: NO regex re-sanitization passes in the draw loop!
  if (slide.type !== 'cta') {
    const rawEnTitle = (slide.enTitle || '').trim();
    const rawArTitle = (slide.arTitle || '').trim();
    const rawEnBody = (slide.enBody || '').trim();
    const rawArBody = (slide.arBody || '').trim();

    // Real font scaling + line caps (never line-height squashing).
    const availableHeight = SAFE_FOOTER_CEILING_Y - yGraphicEnd;

    const buildTextLayout = (scale: number, bodyLinesCap: number = 4) => {
      const enTitle = fitTextInBox(ctx, rawEnTitle, SAFE_TEXT_WIDTH_TITLE, 74 * scale, '"Plus Jakarta Sans", sans-serif', '800', {
        maxLines: 2,
        minFontSize: 44,
        lineHeightFactor: 1.19,
      });
      const arTitle = fitTextInBox(ctx, rawArTitle, SAFE_TEXT_WIDTH_TITLE, 70 * scale, '"Cairo", sans-serif', '800', {
        maxLines: 2,
        minFontSize: 42,
        lineHeightFactor: 1.457,
      });
      // Spec: Mobile typography minimum 26px floor for phone readability
      const enBody = fitTextInBox(ctx, rawEnBody, SAFE_TEXT_WIDTH_BODY, 40 * scale, '"Plus Jakarta Sans", sans-serif', '400', {
        maxLines: bodyLinesCap,
        minFontSize: 26,
        lineHeightFactor: 1.42,
      });
      const arBody = fitTextInBox(ctx, rawArBody, SAFE_TEXT_WIDTH_BODY, 40 * scale, '"Cairo", sans-serif', '400', {
        maxLines: bodyLinesCap,
        minFontSize: 26,
        lineHeightFactor: 1.526,
      });

      const gapTitles = (enTitle.lines.length > 0 && arTitle.lines.length > 0) ? 18 : 0;
      const gapTitlesToBody = ((enTitle.lines.length > 0 || arTitle.lines.length > 0) && (enBody.lines.length > 0 || arBody.lines.length > 0)) ? 40 : 0;
      const gapBodies = (enBody.lines.length > 0 && arBody.lines.length > 0) ? 24 : 0;

      const hTextTotal =
        (enTitle.lines.length * enTitle.lineHeight) +
        gapTitles +
        (arTitle.lines.length * arTitle.lineHeight) +
        gapTitlesToBody +
        (enBody.lines.length * enBody.lineHeight) +
        gapBodies +
        (arBody.lines.length * arBody.lineHeight);

      return { enTitle, arTitle, enBody, arBody, gapTitles, gapTitlesToBody, gapBodies, hTextTotal };
    };

    let textScale = availableHeight >= 940 ? 1.06 : 1.0;
    let bodyCap = 4;
    let layout = buildTextLayout(textScale, bodyCap);

    // Phase A: Scale down font size smoothly if text overflows
    while (layout.hTextTotal > availableHeight - 24 && textScale > 0.65) {
      textScale = Math.max(0.65, textScale - 0.05);
      layout = buildTextLayout(textScale, bodyCap);
    }

    // Phase B: If still overflows tight graphic, progressively cap body lines
    while (layout.hTextTotal > availableHeight - 20 && bodyCap > 2) {
      bodyCap -= 1;
      layout = buildTextLayout(textScale, bodyCap);
    }

    const { enTitle, arTitle, enBody, arBody, gapTitles, gapTitlesToBody, gapBodies } = layout;
    const enTitleLines = enTitle.lines;
    const arTitleLines = arTitle.lines;
    const enBodyLines = enBody.lines;
    const arBodyLines = arBody.lines;
    const hTextTotal = layout.hTextTotal;

    // 6b. Dynamic Vertical Optical Centering:
    // Upper bound: yGraphicEnd
    // Lower ceiling: 1710px (clearing the footer pagination dots at y=1826 with 116px padding)
    // Eliminates empty bottom third by scaling cushion with generous ceiling up to 260px
    const remainingSpace = availableHeight - hTextTotal;
    const topCushion = Math.min(Math.max(remainingSpace * 0.44, 34), 260);
    let currentY = yGraphicEnd + topCushion;

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      SAFE_MARGIN_LEFT,
      yGraphicEnd,
      SAFE_MARGIN_RIGHT - SAFE_MARGIN_LEFT,
      Math.max(0, SAFE_FOOTER_CEILING_Y - yGraphicEnd)
    );
    ctx.clip();

    // 6c. Render English Headline
    if (enTitleLines.length > 0) {
      const titleOverride = slide.layoutOverrides?.titleBlock;
      const tDx = titleOverride?.dx || 0;
      const tDy = titleOverride?.dy || 0;
      ctx.save();
      ctx.font = `800 ${enTitle.fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = theme.textWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (const line of enTitleLines) {
        if (currentY + tDy + enTitle.lineHeight * 0.7 > SAFE_FOOTER_CEILING_Y) break;
        ctx.fillText(line, SAFE_TEXT_CENTER_X + tDx, currentY + tDy);
        currentY += enTitle.lineHeight;
      }
      ctx.restore();
    }

    // 6d. Render Arabic Headline with generous line-height
    if (arTitleLines.length > 0) {
      currentY += gapTitles;
      const arTitleOverride = slide.layoutOverrides?.arabicTitleBlock;
      const arTDx = arTitleOverride?.dx || 0;
      const arTDy = arTitleOverride?.dy || 0;
      ctx.save();
      ctx.font = `800 ${arTitle.fontSize}px "Cairo", sans-serif`;
      ctx.fillStyle = theme.accent;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      for (const line of arTitleLines) {
        if (currentY + arTDy + arTitle.lineHeight * 0.7 > SAFE_FOOTER_CEILING_Y) break;
        ctx.fillText(line, SAFE_TEXT_CENTER_X + arTDx, currentY + arTDy);
        currentY += arTitle.lineHeight;
      }
      ctx.restore();
    }

    // 6e. Render English Body Copy
    if (enBodyLines.length > 0) {
      currentY += gapTitlesToBody;
      const bodyOverride = slide.layoutOverrides?.bodyBlock;
      const bDx = bodyOverride?.dx || 0;
      const bDy = bodyOverride?.dy || 0;
      ctx.save();
      ctx.font = `400 ${enBody.fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = theme.textEnBody;
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.textBaseline = 'alphabetic';
      for (const line of enBodyLines) {
        if (currentY + bDy + enBody.lineHeight * 0.7 > SAFE_FOOTER_CEILING_Y) break;
        ctx.fillText(line, SAFE_TEXT_CENTER_X + bDx, currentY + bDy);
        currentY += enBody.lineHeight;
      }
      ctx.restore();
    }

    // 6f. Render Arabic Body Copy with generous line-height and strict right margin safe-zone
    if (arBodyLines.length > 0) {
      currentY += gapBodies;
      const arBodyOverride = slide.layoutOverrides?.arabicBodyBlock;
      const arBDx = arBodyOverride?.dx || 0;
      const arBDy = arBodyOverride?.dy || 0;
      ctx.save();
      ctx.font = `400 ${arBody.fontSize}px "Cairo", sans-serif`;
      ctx.fillStyle = theme.textArBody;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      for (const line of arBodyLines) {
        if (currentY + arBDy + arBody.lineHeight * 0.7 > SAFE_FOOTER_CEILING_Y) break;
        ctx.fillText(line, SAFE_TEXT_CENTER_X + arBDx, currentY + arBDy);
        currentY += arBody.lineHeight;
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // 7. Pagination Footer (Present on EVERY slide at y = 1826, centered at x = 518)
  drawPaginationFooter(ctx, slideIndex, totalSlides, theme);

  return canvas;
}
