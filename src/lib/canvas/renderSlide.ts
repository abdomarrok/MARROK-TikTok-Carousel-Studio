import { CarouselData, DEFAULT_PALETTES, SlideData, THEME_CONFIGS, ThemePalette, VisualSystemOptions } from '../../types.ts';
import { seedSlideArchetypeData } from '../synthesis/archetypes.ts';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SAFE_TEXT_CENTER_X,
  SAFE_TEXT_WIDTH_TITLE,
  SAFE_TEXT_WIDTH_BODY,
  SAFE_FOOTER_CEILING_Y,
} from './constants.ts';
import { wrapTextLines } from './textLayout.ts';
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
  drawHeader(ctx, carousel, theme, categoryTag);

  // 5. Render Archetype Specific Graphics & Layouts
  let yGraphicEnd = 670;

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

  // 6. Text Zone Rendering (for hub, row, metric, code, and compare slides)
  // Strict Safe-Zone Rule: Center at x = 518 with maxWidth 850 (titles) and 820 (body)
  // to enforce right safe margin >= 135px (x <= 945) clearing TikTok native right-side action buttons.
  // Rendering is a pure read-only projection: NO regex re-sanitization passes in the draw loop!
  if (slide.type !== 'cta') {
    const rawEnTitle = (slide.enTitle || '').trim();
    let enTitleLines: string[] = [];
    if (rawEnTitle) {
      ctx.save();
      ctx.font = '800 74px "Plus Jakarta Sans", sans-serif';
      enTitleLines = wrapTextLines(ctx, rawEnTitle, SAFE_TEXT_WIDTH_TITLE);
      ctx.restore();
    }

    const rawArTitle = (slide.arTitle || '').trim();
    let arTitleLines: string[] = [];
    if (rawArTitle) {
      ctx.save();
      ctx.font = '800 70px "Cairo", sans-serif';
      arTitleLines = wrapTextLines(ctx, rawArTitle, SAFE_TEXT_WIDTH_TITLE);
      ctx.restore();
    }

    const rawEnBody = (slide.enBody || '').trim();
    let enBodyLines: string[] = [];
    if (rawEnBody) {
      ctx.save();
      ctx.font = '400 38px "Plus Jakarta Sans", sans-serif';
      enBodyLines = wrapTextLines(ctx, rawEnBody, SAFE_TEXT_WIDTH_BODY);
      ctx.restore();
    }

    const rawArBody = (slide.arBody || '').trim();
    let arBodyLines: string[] = [];
    if (rawArBody) {
      ctx.save();
      ctx.font = '400 38px "Cairo", sans-serif';
      arBodyLines = wrapTextLines(ctx, rawArBody, SAFE_TEXT_WIDTH_BODY);
      ctx.restore();
    }

    // Baseline Line-Heights:
    // English Headline: 74px font => 88px line-height (1.19x)
    // Arabic Headline: 70px font => 102px line-height (generous 1.457x for ascenders/descenders/diacritics)
    // English Body: 38px font => 54px line-height (1.42x)
    // Arabic Body: 38px font => 58px line-height (generous 1.526x for Arabic baseline balance)
    let enTitleLH = 88;
    let arTitleLH = 102;
    let enBodyLH = 54;
    let arBodyLH = 58;

    let gapTitles = (enTitleLines.length > 0 && arTitleLines.length > 0) ? 16 : 0;
    let gapTitlesToBody = ((enTitleLines.length > 0 || arTitleLines.length > 0) && (enBodyLines.length > 0 || arBodyLines.length > 0)) ? 36 : 0;
    let gapBodies = (enBodyLines.length > 0 && arBodyLines.length > 0) ? 20 : 0;

    let hTextTotal =
      (enTitleLines.length * enTitleLH) +
      gapTitles +
      (arTitleLines.length * arTitleLH) +
      gapTitlesToBody +
      (enBodyLines.length * enBodyLH) +
      gapBodies +
      (arBodyLines.length * arBodyLH);

    // 6b. Dynamic Vertical Optical Centering:
    // Upper bound: yGraphicEnd
    // Lower ceiling: 1710px (clearing the footer pagination dots at y=1826 with 116px padding)
    const availableHeight = SAFE_FOOTER_CEILING_Y - yGraphicEnd;

    // Self-healing vertical compression if text is exceptionally long
    let scale = 1.0;
    if (hTextTotal > availableHeight - 30) {
      scale = Math.max((availableHeight - 30) / hTextTotal, 0.82);
      enTitleLH = Math.round(enTitleLH * scale);
      arTitleLH = Math.round(arTitleLH * scale);
      enBodyLH = Math.round(enBodyLH * scale);
      arBodyLH = Math.round(arBodyLH * scale);
      gapTitles = Math.round(gapTitles * scale);
      gapTitlesToBody = Math.round(gapTitlesToBody * scale);
      gapBodies = Math.round(gapBodies * scale);
      hTextTotal = Math.round(hTextTotal * scale);
    }

    const remainingSpace = availableHeight - hTextTotal;
    // Optical distribution: 38% top cushion, 62% bottom breathing room
    // Clamped between 28px min and 135px max so content neither hugs the graphic nor floats awkwardly low
    const topCushion = Math.min(Math.max(remainingSpace * 0.38, 28), 135);
    let currentY = yGraphicEnd + topCushion;

    // 6c. Render English Headline
    if (enTitleLines.length > 0) {
      ctx.save();
      ctx.font = '800 74px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.textWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (const line of enTitleLines) {
        ctx.fillText(line, SAFE_TEXT_CENTER_X, currentY);
        currentY += enTitleLH;
      }
      ctx.restore();
    }

    // 6d. Render Arabic Headline with generous line-height
    if (arTitleLines.length > 0) {
      currentY += gapTitles;
      ctx.save();
      ctx.font = '800 70px "Cairo", sans-serif';
      ctx.fillStyle = theme.accent;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      for (const line of arTitleLines) {
        ctx.fillText(line, SAFE_TEXT_CENTER_X, currentY);
        currentY += arTitleLH;
      }
      ctx.restore();
    }

    // 6e. Render English Body Copy
    if (enBodyLines.length > 0) {
      currentY += gapTitlesToBody;
      ctx.save();
      ctx.font = '400 38px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = theme.textEnBody;
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.textBaseline = 'alphabetic';
      for (const line of enBodyLines) {
        ctx.fillText(line, SAFE_TEXT_CENTER_X, currentY);
        currentY += enBodyLH;
      }
      ctx.restore();
    }

    // 6f. Render Arabic Body Copy with generous line-height and strict right margin safe-zone
    if (arBodyLines.length > 0) {
      currentY += gapBodies;
      ctx.save();
      ctx.font = '400 38px "Cairo", sans-serif';
      ctx.fillStyle = theme.textArBody;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      for (const line of arBodyLines) {
        ctx.fillText(line, SAFE_TEXT_CENTER_X, currentY);
        currentY += arBodyLH;
      }
      ctx.restore();
    }
  }

  // 7. Pagination Footer (Present on EVERY slide at y = 1826, centered at x = 518)
  drawPaginationFooter(ctx, slideIndex, totalSlides, theme);

  return canvas;
}
