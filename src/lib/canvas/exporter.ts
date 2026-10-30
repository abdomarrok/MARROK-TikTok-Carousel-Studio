import { CarouselData, DEFAULT_PALETTES, ThemePalette, VisualSystemOptions } from '../../types.ts';
import { getCanvasDimensionSpec } from './constants.ts';
import { renderSlideToCanvas } from './renderSlide.ts';

/**
 * Direct Browser Copy: Copy slide image directly to system clipboard at active dimension preset
 */
export async function copySlideToClipboard(
  carousel: CarouselData,
  slideIndex: number,
  customPalette?: ThemePalette,
  visualOptions?: VisualSystemOptions
): Promise<void> {
  const canvas = await renderSlideToCanvas(carousel, slideIndex, undefined, customPalette, visualOptions);

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
          downloadSingleSlidePng(carousel, slideIndex, undefined, customPalette, visualOptions);
          resolve();
        }
      } catch (err) {
        console.warn('Clipboard write failed, triggering single download fallback:', err);
        downloadSingleSlidePng(carousel, slideIndex, undefined, customPalette, visualOptions);
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
  customPalette?: ThemePalette,
  visualOptions?: VisualSystemOptions
): Promise<boolean> {
  const canvas = await renderSlideToCanvas(carousel, slideIndex, undefined, customPalette, visualOptions);

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
 * Trigger immediate download of single slide as JPG at active dimension preset
 */
export async function downloadSingleSlidePng(
  carousel: CarouselData,
  slideIndex: number,
  filename?: string,
  customPalette?: ThemePalette,
  visualOptions?: VisualSystemOptions
): Promise<void> {
  const spec = getCanvasDimensionSpec(carousel.dimensionPreset);
  const canvas = await renderSlideToCanvas(carousel, slideIndex, undefined, customPalette, visualOptions);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download =
    filename || `MARROK_Slide_${slideIndex + 1}_${spec.width}x${spec.height}_${carousel.theme}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 1-click Download All Slides as ZIP containing high-resolution JPGs
 * Spec §9.8: Complete Metricool bundle for TikTok & Instagram.
 * Yields via microtask setTimeout(0) between slide renders so the browser UI never freezes.
 */
export interface ExportOverrideAudit {
  isOverridden: boolean;
  reviewedDraftConfirmation?: boolean;
  confirmedRisk?: string | null;
  overriddenAt?: string | null;
}

export async function downloadAllSlidesZip(
  carousel: CarouselData,
  customPalette?: ThemePalette,
  onProgress?: (current: number, total: number) => void,
  visualOptions?: VisualSystemOptions,
  overrideAudit?: ExportOverrideAudit,
  exportMode: 'active' | 'dual' = 'active'
): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const total = carousel.slides.length;
  const spec = getCanvasDimensionSpec(carousel.dimensionPreset);
  const totalSteps = exportMode === 'dual' ? total * 2 : total;
  let stepCounter = 0;

  for (let i = 0; i < total; i++) {
    stepCounter += 1;
    if (onProgress) onProgress(stepCounter, totalSteps);
    // Microtask yielding to keep browser UI responsive and allow progress re-renders
    await new Promise((resolve) => setTimeout(resolve, 0));

    const canvas = await renderSlideToCanvas(carousel, i, undefined, customPalette, visualOptions);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    if (blob) {
      zip.file(`slide${i + 1}.jpg`, blob);
      if (exportMode === 'dual') {
        const primaryFolder = spec.id === 'ig-4:5' ? 'instagram-4x5' : 'tiktok-9x16';
        zip.file(`${primaryFolder}/slide${i + 1}.jpg`, blob);
      }
    }
  }

  if (exportMode === 'dual') {
    const secondaryPreset = spec.id === 'ig-4:5' ? 'tiktok-9:16' : 'ig-4:5';
    const secondaryFolder = secondaryPreset === 'ig-4:5' ? 'instagram-4x5' : 'tiktok-9x16';
    const secondaryCarousel: CarouselData = {
      ...carousel,
      dimensionPreset: secondaryPreset,
    };

    for (let i = 0; i < total; i++) {
      stepCounter += 1;
      if (onProgress) onProgress(stepCounter, totalSteps);
      await new Promise((resolve) => setTimeout(resolve, 0));

      const canvas = await renderSlideToCanvas(secondaryCarousel, i, undefined, customPalette, visualOptions);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (blob) {
        zip.file(`${secondaryFolder}/slide${i + 1}.jpg`, blob);
      }
    }
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
  zip.file('caption.txt', fullCaptionText.replace(/\u00A0/g, ' '));

  // ── Metricool Publishing Bundle ──
  const mainCaption = carousel.captionVariants?.[0]?.caption || carousel.caption || '';
  const ctaLine = carousel.slides[carousel.slides.length - 1]?.ctaText || 'DM us  •  رسالة خاصة';
  const screenHookText = carousel.screenHook || carousel.hookVariants?.[0]?.enTitle || carousel.slides[0]?.enTitle || '';

  let metricoolCaption = '';
  if (screenHookText) {
    metricoolCaption += `🎯 ${screenHookText}\n\n`;
  }
  metricoolCaption += mainCaption;

  if (!metricoolCaption.includes('marrok.org') && !metricoolCaption.includes('Reference & Source')) {
    metricoolCaption += `\n\n═════════════════════════════════════\n🎬 MARROK Technical Studio // Verified Engineering Breakdown\n🔗 Reference & Source: https://${carousel.brandUrl || 'marrok.org'}\n💬 Action: [ ${ctaLine} ]\n`;
  }

  if (!metricoolCaption.includes('#')) {
    metricoolCaption += `\n#SoftwareEngineering #SystemDesign #DevOps #MARROK #TechInArabic`;
  }

  const cleanBilingualCaption = metricoolCaption.replace(/\u00A0/g, ' ').trim();
  zip.file('caption-bilingual.txt', cleanBilingualCaption);

  // 2. Serialized CarouselData + active theme and visualOptions
  const carouselManifest = {
    ...carousel,
    dimensionPreset: spec.id,
    activePalette: customPalette || DEFAULT_PALETTES[carousel.theme] || null,
    visualOptions: visualOptions || carousel.visualOptions || {
      showCadReticles: true,
      showSparklines: true,
      terminalScanlines: true,
    },
    exportedAt: new Date().toISOString(),
    generator: 'MARROK TikTok & Instagram Carousel Studio',
    targetPlatform:
      exportMode === 'dual'
        ? 'Metricool Dual Pack (TikTok 9:16 + Instagram 4:5)'
        : `Metricool / ${spec.label}`,
    format: `${spec.width}x${spec.height} JPG (${spec.aspectRatioLabel} Safe-Zone Compliant)`,
    totalSlides: total,
    slideFiles: Array.from({ length: total }, (_, i) => `slide${i + 1}.jpg`),
  };
  const manifestJson = JSON.stringify(carouselManifest, null, 2);
  zip.file('carousel-manifest.json', manifestJson);

  // 3. Separate dedicated claims & citations verification file
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
    zip.file('claims_citations.txt', claimsReport.replace(/\u00A0/g, ' '));
  }

  if (carousel.firstComment) {
    zip.file('first_comment.txt', carousel.firstComment.replace(/\u00A0/g, ' '));
  }
  if (carousel.shortCaption) {
    zip.file('short_caption.txt', carousel.shortCaption.replace(/\u00A0/g, ' '));
  }

  // Structured Post Metadata JSON
  const metadata = {
    exportedAt: new Date().toISOString(),
    generator: 'MARROK TikTok & Instagram Carousel Studio',
    category: carousel.category,
    theme: carousel.theme,
    dimensionPreset: spec.id,
    dimensions: { width: spec.width, height: spec.height, aspectRatio: spec.aspectRatioLabel },
    exportMode,
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
    format: `${spec.width}x${spec.height} JPG (${spec.aspectRatioLabel})`,
    overrideAudit: overrideAudit || {
      isOverridden: false,
      reviewedDraftConfirmation: false,
      confirmedRisk: null,
      overriddenAt: null,
    },
  };
  zip.file('post_metadata.json', JSON.stringify(metadata, null, 2));

  // Quick Creator Publishing Guide
  const readme = `MARROK TIKTOK, INSTAGRAM & METRICOOL PUBLISHING BUNDLE
=======================================================
Deck: ${carousel.category} (${carousel.slides.length} slides)
Theme: ${carousel.theme}
Dimension Preset: ${spec.label}${exportMode === 'dual' ? ' + Dual Pack (TikTok 9:16 & Instagram 4:5)' : ''}
Search Grounded: ${carousel.sourceMeta?.isSearchGrounded ? 'YES (Google Search)' : 'Autonomous Synthesizer'}
Created: ${new Date().toLocaleString()}

FILES IN THIS METRICOOL PACKAGE:
- slide1.jpg to slide${total}.jpg (${spec.width}x${spec.height} ${spec.aspectRatioLabel} high-res JPGs, Safe-Zone compliant)
${exportMode === 'dual' ? `- tiktok-9x16/slide1.jpg..slide${total}.jpg (1080x1920 TikTok Photo Mode)\n- instagram-4x5/slide1.jpg..slide${total}.jpg (1080x1350 Instagram Portrait Carousel)\n` : ''}- caption-bilingual.txt (Metricool ready bilingual copy with hook, CTA, and hashtags)
- carousel-manifest.json (Complete serialized CarouselData schema for archiving and re-import)
- caption.txt (Bilingual post caption with hashtags and verification block)
- claims_citations.txt (Audit log of all verified numbers, benchmarks, and source links)
- first_comment.txt (Pinned first comment to drive engagement and save rate)
- short_caption.txt (Clean 2-line version for quick post)
- post_metadata.json (Machine-readable post schema with grounding metadata)

HOW TO PUBLISH TO METRICOOL / TIKTOK / INSTAGRAM:
1. Open Metricool -> New Post -> Select TikTok / Instagram.
2. Drag and drop slide1.jpg through slide${total}.jpg (or select from tiktok-9x16 / instagram-4x5 folders).
3. Open 'caption-bilingual.txt', copy all and paste into post caption.
4. Schedule or publish immediately!
`;
  zip.file('README.txt', readme);

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  const suffix = exportMode === 'dual' ? 'DualPack' : spec.shortLabel.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `MARROK_${carousel.category.replace(/[^a-zA-Z0-9]/g, '_')}_${suffix}_Carousel.zip`;
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
  onProgress?: (current: number, total: number) => void,
  visualOptions?: VisualSystemOptions
): Promise<void> {
  const spec = getCanvasDimensionSpec(carousel.dimensionPreset);
  const total = carousel.slides.length;
  const cols = total <= 4 ? total : total <= 8 ? 4 : 5;
  const rows = Math.ceil(total / cols);

  const sW = 360;
  const sH = Math.round((sW * spec.height) / spec.width);
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
    `Deck: ${carousel.category}   •   Theme: ${carousel.theme}   •   ${total} Slides (${spec.width}×${spec.height} ${spec.aspectRatioLabel})   •   Format: JPG Q95`,
    pad,
    pad + 74
  );

  // Render each slide
  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total);
    // Yield to let UI update progress
    await new Promise((resolve) => setTimeout(resolve, 0));

    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = pad + c * (sW + gap);
    const y = pad + headerH + r * (sH + gap);

    const slideCanvas = await renderSlideToCanvas(carousel, i, undefined, customPalette, visualOptions);
    mctx.drawImage(slideCanvas, 0, 0, spec.width, spec.height, x, y, sW, sH);

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
  a.download = `MARROK_ContactSheet_${carousel.category.replace(/[^a-zA-Z0-9]/g, '_')}_${spec.shortLabel.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

