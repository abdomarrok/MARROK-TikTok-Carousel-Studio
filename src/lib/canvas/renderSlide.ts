import { CarouselData, DEFAULT_PALETTES, THEME_CONFIGS, ThemePalette, VisualSystemOptions } from '../../types.ts';
import { seedSlideArchetypeData } from '../synthesis/archetypes.ts';
import { getCanvasDimensionSpec, getArchetypeGraphicTransform } from './constants.ts';
import { computeSlideLayoutAwareness } from './layoutAwareness.ts';
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
  drawPosterSlide,
  drawTakeawaysBlock,
} from './archetypes/index.ts';

/**
 * Render a single MARROK slide to an offscreen or provided canvas at the active dimension preset
 * (TikTok 9:16 1080x1920, Instagram 4:5 1080x1350, Instagram 3:4 1080x1440, Instagram 1:1 1080x1080, or IG Reels 9:16).
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

  const spec = getCanvasDimensionSpec(carousel.dimensionPreset);
  const canvas = targetCanvas || document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
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
  drawBaseBackground(ctx, theme, spec);

  // 2. Radial Gradient Glow
  drawRadialGlow(ctx, theme, spec);

  // 3. Engineering Grid Lines
  drawEngineeringGrid(ctx, theme, spec);

  // 3b. Canvas Background CAD Reticles
  if (options.showCadReticles) {
    drawCadReticles(ctx, theme, spec);
  }

  // 4. Header: Top-Left Authentic MARROK Vector Badge + Brand Wordmark + Category Tag
  const headerOverride = slide.layoutOverrides?.headerBadge;
  if (headerOverride) {
    ctx.save();
    ctx.translate(headerOverride.dx || 0, headerOverride.dy || 0);
    if (headerOverride.scale && headerOverride.scale !== 1) {
      ctx.scale(headerOverride.scale, headerOverride.scale);
    }
    drawHeader(ctx, carousel, theme, categoryTag, spec);
    ctx.restore();
  } else {
    drawHeader(ctx, carousel, theme, categoryTag, spec);
  }

  // 5. Render Archetype Specific Graphics & Layouts
  const graphicTransform = getArchetypeGraphicTransform(spec, slide.type);
  let yGraphicEnd = graphicTransform.cardY + graphicTransform.cardH;
  const graphicOverride = slide.layoutOverrides?.graphicCard;

  if (slide.type === 'cta') {
    ctx.save();
    if (graphicOverride) {
      const cx = spec.safeTextCenterX;
      const cy = graphicTransform.cardY + graphicTransform.cardH / 2;
      ctx.translate(cx + (graphicOverride.dx || 0), cy + (graphicOverride.dy || 0));
      const s = graphicOverride.scale ?? 1;
      ctx.scale(s, s);
      ctx.translate(-cx, -cy);
      if (graphicOverride.opacity !== undefined) {
        ctx.globalAlpha *= Math.max(0, Math.min(1, graphicOverride.opacity));
      }
    }
    yGraphicEnd = await drawCtaSlide(ctx, slide, carousel, theme, options, themeMode);
    ctx.restore();
  } else {
    ctx.save();
    if (graphicOverride) {
      const cx = spec.safeTextCenterX;
      const cy = graphicTransform.cardY + graphicTransform.cardH / 2;
      ctx.translate(cx + (graphicOverride.dx || 0), cy + (graphicOverride.dy || 0));
      const s = graphicOverride.scale ?? 1;
      ctx.scale(s, s);
      ctx.translate(-cx, -cy);
      if (graphicOverride.opacity !== undefined) {
        ctx.globalAlpha *= Math.max(0, Math.min(1, graphicOverride.opacity));
      }
    }
    if (
      graphicTransform.scale !== 1 ||
      graphicTransform.translateX !== 0 ||
      graphicTransform.translateY !== 0
    ) {
      ctx.translate(graphicTransform.translateX, graphicTransform.translateY);
      ctx.scale(graphicTransform.scale, graphicTransform.scale);
    }

    let rawGraphicEnd = 670;
    if (slide.type === 'hub') {
      rawGraphicEnd = await drawHubSlide(ctx, slide, theme, options);
    } else if (slide.type === 'row') {
      rawGraphicEnd = await drawRowSlide(ctx, slide, theme, options, slideIndex);
    } else if (slide.type === 'number') {
      rawGraphicEnd = await drawNumberSlide(ctx, slide, theme, options, slideIndex);
    } else if (slide.type === 'metric') {
      rawGraphicEnd = await drawMetricSlide(ctx, slide, theme, options);
    } else if (slide.type === 'code') {
      rawGraphicEnd = await drawCodeSlide(ctx, slide, theme, options);
    } else if (slide.type === 'compare') {
      rawGraphicEnd = await drawCompareSlide(ctx, slide, theme, options);
    } else if (slide.type === 'image') {
      rawGraphicEnd = await drawImageSlide(ctx, slide, theme, options);
    } else if (slide.type === 'poster') {
      rawGraphicEnd = await drawPosterSlide(ctx, slide, theme, options);
    }
    yGraphicEnd = Math.round(rawGraphicEnd * graphicTransform.scale + graphicTransform.translateY);
    ctx.restore();
  }

  // 6. Non-Overlapping Layout-Aware Text Rendering (for hub, row, number, metric, code, compare, image, poster)
  if (slide.type !== 'cta') {
    const layout = computeSlideLayoutAwareness(slide, carousel);
    const graphicBottom = layout.graphicCard ? layout.graphicCard.effectiveBottom : yGraphicEnd;
    const ceilingY = spec.safeFooterCeilingY;
    const textCenterX = spec.safeTextCenterX;

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      spec.safeMarginLeft - 24,
      graphicBottom,
      spec.safeContentWidth + 48,
      Math.max(0, ceilingY - graphicBottom + 12)
    );
    ctx.clip();

    // 6c. Render English Headline (Layout Aware, zero overlap with graphic card)
    if (layout.titleBlock && layout.titleBlock.lines.length > 0) {
      const tb = layout.titleBlock;
      ctx.save();
      ctx.font = `800 ${tb.fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = theme.textWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      let lineY = tb.firstBaselineY;
      for (const line of tb.lines) {
        if (lineY + tb.lineHeight * 0.7 > ceilingY + 8) break;
        ctx.fillText(line, textCenterX + tb.dx, lineY);
        lineY += tb.lineHeight;
      }
      ctx.restore();
    }

    // 6d. Render Arabic Headline (Strictly flows below English headline)
    if (layout.arabicTitleBlock && layout.arabicTitleBlock.lines.length > 0) {
      const atb = layout.arabicTitleBlock;
      ctx.save();
      ctx.font = `800 ${atb.fontSize}px "Cairo", sans-serif`;
      ctx.fillStyle = theme.accent;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      let lineY = atb.firstBaselineY;
      for (const line of atb.lines) {
        if (lineY + atb.lineHeight * 0.7 > ceilingY + 8) break;
        ctx.fillText(line, textCenterX + atb.dx, lineY);
        lineY += atb.lineHeight;
      }
      ctx.restore();
    }

    // 6e. Render English Body Copy (Strictly flows below headlines)
    if (layout.bodyBlock && layout.bodyBlock.lines.length > 0) {
      const bb = layout.bodyBlock;
      ctx.save();
      ctx.font = `400 ${bb.fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = theme.textEnBody;
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.textBaseline = 'alphabetic';
      let lineY = bb.firstBaselineY;
      for (const line of bb.lines) {
        if (lineY + bb.lineHeight * 0.7 > ceilingY + 8) break;
        ctx.fillText(line, textCenterX + bb.dx, lineY);
        lineY += bb.lineHeight;
      }
      ctx.restore();
    }

    // 6f. Render Arabic Body Copy (Strictly flows below English body with RTL alignment)
    if (layout.arabicBodyBlock && layout.arabicBodyBlock.lines.length > 0) {
      const abb = layout.arabicBodyBlock;
      ctx.save();
      ctx.font = `400 ${abb.fontSize}px "Cairo", sans-serif`;
      ctx.fillStyle = theme.textArBody;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.textBaseline = 'alphabetic';
      let lineY = abb.firstBaselineY;
      for (const line of abb.lines) {
        if (lineY + abb.lineHeight * 0.7 > ceilingY + 8) break;
        ctx.fillText(line, textCenterX + abb.dx, lineY);
        lineY += abb.lineHeight;
      }
      ctx.restore();
    }

    ctx.restore();

    // 6g. Render Key Takeaways Block (Single-slide Infographic Posters & Enriched Slides)
    if (layout.takeawaysBlock && slide.takeaways && slide.takeaways.length > 0) {
      await drawTakeawaysBlock(ctx, slide.takeaways, theme, layout.takeawaysBlock, options);
    }
  }

  // 7. Pagination Footer (Dots on multi-slide carousels; standalone attribution bar on single-slide posts)
  drawPaginationFooter(ctx, slideIndex, totalSlides, theme, carousel, slide, spec);

  return canvas;
}

