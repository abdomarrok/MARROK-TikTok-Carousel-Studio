import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Copy,
  Check,
  Share2,
  Sparkles,
} from 'lucide-react';
import { CarouselData, DEFAULT_PALETTES, HookVariant, THEME_CONFIGS, ThemePalette } from '../types';
import {
  renderSlideToCanvas,
  downloadSingleSlidePng,
  copySlideToClipboard,
  shareSlide,
} from '../lib/canvasExporter';

interface SlideCanvasPreviewProps {
  carousel: CarouselData;
  currentSlideIndex: number;
  customPalette?: ThemePalette;
  onSelectSlide: (index: number) => void;
  onSelectHookVariant?: (variant: HookVariant) => void;
  onShowToast: (msg: string) => void;
}

export const SlideCanvasPreview: React.FC<SlideCanvasPreviewProps> = ({
  carousel,
  currentSlideIndex,
  customPalette,
  onSelectSlide,
  onSelectHookVariant,
  onShowToast,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scaleMode, setScaleMode] = useState<0.3 | 0.36 | 0.42>(0.3);
  const [isRendering, setIsRendering] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const themeMode = carousel.theme || 'engineering';
  const theme: ThemePalette =
    customPalette ||
    DEFAULT_PALETTES[themeMode] ||
    THEME_CONFIGS[themeMode] ||
    DEFAULT_PALETTES.teal;
  const totalSlides = carousel.slides.length;
  const currentSlide = carousel.slides[currentSlideIndex];

  // Re-render canvas whenever carousel, currentSlideIndex, or theme changes
  useEffect(() => {
    let active = true;

    async function draw() {
      if (!canvasRef.current) return;
      setIsRendering(true);
      try {
        await renderSlideToCanvas(carousel, currentSlideIndex, canvasRef.current, customPalette);
      } catch (err) {
        console.error('Error rendering slide:', err);
      } finally {
        if (active) setIsRendering(false);
      }
    }

    draw();

    return () => {
      active = false;
    };
  }, [carousel, currentSlideIndex, themeMode, customPalette]);

  // Handle Fullscreen modal rendering
  useEffect(() => {
    if (isFullscreenModalOpen && fullCanvasRef.current) {
      renderSlideToCanvas(carousel, currentSlideIndex, fullCanvasRef.current, customPalette);
    }
  }, [isFullscreenModalOpen, carousel, currentSlideIndex, customPalette]);

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      onSelectSlide(currentSlideIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentSlideIndex < totalSlides - 1) {
      onSelectSlide(currentSlideIndex + 1);
    }
  };

  const handleSingleDownload = () => {
    downloadSingleSlidePng(
      carousel,
      currentSlideIndex,
      `MARROK_Slide_${currentSlideIndex + 1}_${carousel.category.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
      customPalette
    );
    onShowToast(`Downloaded Slide ${currentSlideIndex + 1} PNG`);
  };

  // Direct Browser Copy to Clipboard
  const handleCopyClipboard = async () => {
    try {
      await copySlideToClipboard(carousel, currentSlideIndex, customPalette);
      setIsCopied(true);
      onShowToast(`Copied Slide ${currentSlideIndex + 1} to clipboard! Paste directly into TikTok or mobile chat.`);
      setTimeout(() => setIsCopied(false), 2200);
    } catch (err) {
      console.warn('Clipboard copy error:', err);
      onShowToast('Slide downloaded as PNG fallback');
    }
  };

  // Web Share API
  const handleShare = async () => {
    const shared = await shareSlide(carousel, currentSlideIndex, customPalette);
    if (shared) {
      onShowToast('Slide shared successfully');
    } else {
      // Fallback to copy or download
      handleCopyClipboard();
    }
  };

  const previewWidth = Math.round(1080 * scaleMode);
  const previewHeight = Math.round(1920 * scaleMode);

  const getArchetypeLabel = () => {
    if (!currentSlide) return '';
    if (currentSlide.type === 'hub') return 'The Hook (hub)';
    if (currentSlide.type === 'metric') return 'Metric Card (stat hero)';
    if (currentSlide.type === 'code') return 'Code / Terminal (window)';
    if (currentSlide.type === 'compare') return 'Comparison (split vs)';
    if (currentSlide.type === 'image') return 'Image Card (web visual)';
    if (currentSlide.type === 'cta') return 'Final CTA (brand)';
    const iconCount = currentSlide.icons?.length || 1;
    return `${iconCount}-Icon Layout (row)`;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Top Bar for Slide controls */}
      <div className="w-full max-w-xl flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2 text-xs">
          <span
            className="font-bold px-2 py-0.5 rounded font-mono"
            style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
          >
            Slide {currentSlideIndex + 1} / {totalSlides}
          </span>
          <span className="text-slate-400 font-medium hidden sm:inline">
            {getArchetypeLabel()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Direct Copy to Clipboard for Mobile/Desktop Posting */}
          <button
            onClick={handleCopyClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
            style={{
              backgroundColor: theme.accent,
              color: '#0e1117',
            }}
            title="Copy 1080x1920 slide image directly to clipboard for instant pasting into TikTok/Instagram"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied Image!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Image</span>
              </>
            )}
          </button>

          {/* Share on mobile */}
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Share Slide directly (Mobile Share Sheet)"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Single Download button */}
          <button
            onClick={handleSingleDownload}
            className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Download this slide as 1080x1920 PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Inspector */}
          <button
            onClick={() => setIsFullscreenModalOpen(true)}
            className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Inspect 1080x1920 Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Scale toggles */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 text-xs text-slate-300 ml-1">
            <button
              onClick={() => setScaleMode(0.3)}
              className={`px-1.5 py-1 rounded transition-colors ${
                scaleMode === 0.3 ? 'bg-white/15 text-white font-bold' : 'hover:text-white'
              }`}
              title="0.3 scale (324x576px standard)"
            >
              .3x
            </button>
            <button
              onClick={() => setScaleMode(0.36)}
              className={`px-1.5 py-1 rounded transition-colors ${
                scaleMode === 0.36 ? 'bg-white/15 text-white font-bold' : 'hover:text-white'
              }`}
              title="0.36 scale (388x691px medium)"
            >
              .36x
            </button>
            <button
              onClick={() => setScaleMode(0.42)}
              className={`px-1.5 py-1 rounded transition-colors ${
                scaleMode === 0.42 ? 'bg-white/15 text-white font-bold' : 'hover:text-white'
              }`}
              title="0.42 scale (453x806px large)"
            >
              .42x
            </button>
          </div>
        </div>
      </div>

      {/* Slide 1 A/B Hook Variants Quick Switcher */}
      {currentSlideIndex === 0 && carousel.hookVariants && carousel.hookVariants.length > 0 && (
        <div className="w-full max-w-xl mb-3 p-2 rounded-xl border border-white/10 bg-black/30 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 shrink-0 font-medium text-[11px]">
            <Sparkles className="w-3 h-3" style={{ color: theme.accent }} />
            <span>A/B Hooks:</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {carousel.hookVariants.map((variant, hIdx) => {
              const isSelected =
                currentSlide.enTitle?.trim() === variant.enTitle?.trim();
              return (
                <button
                  key={hIdx}
                  onClick={() => onSelectHookVariant && onSelectHookVariant(variant)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                  style={{
                    color: isSelected ? theme.accent : undefined,
                  }}
                >
                  {variant.tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Slide Canvas Wrapper with Frame & Glow */}
      <div className="relative group">
        <div
          className="absolute -inset-3 rounded-3xl opacity-20 blur-xl pointer-events-none transition-colors duration-500"
          style={{ backgroundColor: theme.accent }}
        />

        <div
          className="relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl transition-all duration-200 bg-[#081216]"
          style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            style={{
              width: `${previewWidth}px`,
              height: `${previewHeight}px`,
              display: 'block',
            }}
          />

          {isRendering && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-xs font-mono text-slate-300">Rendering...</span>
            </div>
          )}
        </div>

        {/* Floating Navigation Chevrons */}
        <button
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className="absolute left-[-22px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition-all z-10 cursor-pointer"
          title="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={handleNext}
          disabled={currentSlideIndex === totalSlides - 1}
          className="absolute right-[-22px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition-all z-10 cursor-pointer"
          title="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Thumbnails Filmstrip Ribbon */}
      <div className="w-full max-w-2xl mt-5 px-2">
        <div className="text-[11px] font-mono uppercase text-slate-500 tracking-wider mb-2 flex items-center justify-between">
          <span>Carousel Sequence ({totalSlides} Slides)</span>
          <span>Click to Jump</span>
        </div>
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
          {carousel.slides.map((slide, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <button
                key={idx}
                onClick={() => onSelectSlide(idx)}
                className={`group relative flex-shrink-0 rounded-lg p-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'ring-2 ring-offset-2 ring-offset-[#080d11] bg-white/[0.08]'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] opacity-70 hover:opacity-100'
                }`}
                style={{
                  outlineColor: isActive ? theme.accent : undefined,
                  boxShadow: isActive ? `0 0 12px ${theme.accent}40` : undefined,
                }}
              >
                <div
                  className="w-14 h-24 rounded flex flex-col justify-between p-1 text-[9px] font-mono border border-white/10 overflow-hidden relative"
                  style={{
                    backgroundColor: theme.baseBg,
                    borderColor: isActive ? theme.accent : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="flex justify-between items-center text-[8px] text-slate-400">
                    <span className="font-bold text-white">#{idx + 1}</span>
                    <span className="uppercase text-[7px] truncate max-w-[28px]">{slide.type}</span>
                  </div>

                  <div className="flex items-center justify-center my-auto">
                    <span
                      className="w-5 h-3.5 rounded-sm flex items-center justify-center text-[7px] font-bold"
                      style={{ backgroundColor: theme.accent, color: theme.iconStroke }}
                    >
                      {slide.type === 'hub'
                        ? 'HUB'
                        : slide.type === 'metric'
                        ? 'MTR'
                        : slide.type === 'code'
                        ? 'CLI'
                        : slide.type === 'compare'
                        ? 'VS'
                        : slide.type === 'image'
                        ? 'IMG'
                        : slide.type === 'cta'
                        ? 'CTA'
                        : 'ROW'}
                    </span>
                  </div>

                  <div className="text-[7px] text-slate-300 truncate font-sans text-center">
                    {slide.enTitle?.split('\n')[0]?.substring(0, 10) || `Slide ${idx + 1}`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Inspector Modal */}
      {isFullscreenModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsFullscreenModalOpen(false)}
        >
          <div
            className="relative max-h-[92vh] max-w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full mb-3 text-white">
              <span className="text-sm font-bold font-jakarta">
                Slide {currentSlideIndex + 1}: 1080×1920 Master Output
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyClipboard}
                  className="px-3 py-1 text-xs font-semibold rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Copy Image
                </button>
                <button
                  onClick={handleSingleDownload}
                  className="px-3 py-1 text-xs font-semibold rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Download PNG
                </button>
                <button
                  onClick={() => setIsFullscreenModalOpen(false)}
                  className="px-3 py-1 text-xs font-semibold rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden shadow-2xl border border-white/20 max-h-[82vh] aspect-[1080/1920]">
              <canvas
                ref={fullCanvasRef}
                width={1080}
                height={1920}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
