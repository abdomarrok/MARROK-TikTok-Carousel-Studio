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
  Smartphone,
  Heart,
  MessageCircle,
  Bookmark,
  Music2,
  Plus,
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
  onAddSlideAt?: (index: number) => void;
  onShowToast: (msg: string) => void;
}

export const SlideCanvasPreview: React.FC<SlideCanvasPreviewProps> = ({
  carousel,
  currentSlideIndex,
  customPalette,
  onSelectSlide,
  onSelectHookVariant,
  onAddSlideAt,
  onShowToast,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scaleMode, setScaleMode] = useState<0.3 | 0.36 | 0.42>(0.3);
  const [isRendering, setIsRendering] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [showTikTokOverlay, setShowTikTokOverlay] = useState(false);
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

  // Global Keyboard Navigation (ArrowLeft / ArrowRight / 1-9 / T for HUD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentSlideIndex > 0) onSelectSlide(currentSlideIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentSlideIndex < totalSlides - 1) onSelectSlide(currentSlideIndex + 1);
      } else if (e.key >= '1' && e.key <= '9') {
        const target = parseInt(e.key, 10) - 1;
        if (target < totalSlides) {
          e.preventDefault();
          onSelectSlide(target);
        }
      } else if (e.key === 't' || e.key === 'T') {
        setShowTikTokOverlay((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, totalSlides, onSelectSlide]);

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
      `MARROK_Slide_${currentSlideIndex + 1}_${carousel.category.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
      customPalette
    );
    onShowToast(`Downloaded Slide ${currentSlideIndex + 1} JPG (1080×1920)`);
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

          {/* TikTok In-App Safe Zone HUD Toggle */}
          <button
            onClick={() => setShowTikTokOverlay((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              showTikTokOverlay
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle authentic TikTok mobile app UI overlay simulation and safe zones (Spec §9.7). Shortcut: T"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TikTok HUD</span>
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

          {/* TikTok In-App Mobile UI Simulator (Spec §9.7 Safe Zones) */}
          {showTikTokOverlay && (
            <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 font-sans z-20">
              {/* Top Header Ticker (Following | For You) */}
              <div className="flex items-center justify-between text-white text-[11px] font-semibold drop-shadow-md pt-1">
                <div className="flex items-center gap-3 mx-auto">
                  <span className="opacity-60">Following</span>
                  <span className="border-b-2 border-white pb-0.5">For You</span>
                </div>
              </div>

              {/* Safe Zone Y=1760 Guideline (Spec §9.7: Red boundary where TikTok covers content) */}
              <div
                className="absolute left-0 right-0 border-b border-dashed border-rose-500/80 flex items-center justify-between px-2 text-[8px] font-mono text-rose-300 pointer-events-none"
                style={{ top: `${(1760 / 1920) * previewHeight}px` }}
              >
                <span className="bg-black/80 px-1 py-0.5 rounded font-bold">⚠️ SAFE ZONE LIMIT (y=1760)</span>
                <span className="bg-black/80 px-1 py-0.5 rounded">NATIVE TIKTOK OVERLAY BELOW</span>
              </div>

              {/* Main Overlay Content */}
              <div className="flex items-end justify-between w-full mt-auto pb-1">
                {/* Bottom Left: Creator Username, Bilingual Caption snippet & Sound */}
                <div className="max-w-[75%] space-y-1.5 text-white drop-shadow-lg text-left">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold">
                    <span>@{carousel.brand?.toLowerCase().replace(/\s+/g, '_') || 'marrok_tech'}</span>
                    <span className="w-3 h-3 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[8px] font-bold">✓</span>
                    <span className="text-[10px] text-slate-300 font-normal">• 1d ago</span>
                  </div>

                  <p className="text-[10px] leading-snug line-clamp-2 text-white/95 font-medium">
                    {carousel.caption.slice(0, 85)}...
                  </p>

                  <div className="flex items-center gap-1.5 text-[9px] text-white/80 font-mono">
                    <Music2 className="w-3 h-3 animate-spin text-white" style={{ animationDuration: '4s' }} />
                    <span className="truncate max-w-[140px]">Original Sound · {carousel.brand || 'MARROK'}</span>
                  </div>
                </div>

                {/* Bottom Right: TikTok Floating Actions Column */}
                <div className="flex flex-col items-center gap-2.5 text-white drop-shadow-md pb-1">
                  {/* Avatar */}
                  <div className="relative mb-1">
                    <div className="w-7 h-7 rounded-full border border-white bg-slate-900 flex items-center justify-center text-[10px] font-bold font-mono">
                      {carousel.brand?.slice(0, 2) || 'MK'}
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-bold">
                      +
                    </div>
                  </div>

                  {/* Like */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                      <Heart className="w-4 h-4 fill-white" />
                    </div>
                    <span className="text-[8px] font-bold font-mono mt-0.5">24.8K</span>
                  </div>

                  {/* Comment */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                      <MessageCircle className="w-4 h-4 fill-white" />
                    </div>
                    <span className="text-[8px] font-bold font-mono mt-0.5">642</span>
                  </div>

                  {/* Bookmark */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                      <Bookmark className="w-4 h-4 fill-white" />
                    </div>
                    <span className="text-[8px] font-bold font-mono mt-0.5">3.8K</span>
                  </div>

                  {/* Share */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <span className="text-[8px] font-bold font-mono mt-0.5">1.2K</span>
                  </div>

                  {/* Music Disc */}
                  <div className="w-6 h-6 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
                    <div className="w-2 h-2 rounded-full bg-rose-400" />
                  </div>
                </div>
              </div>
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
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {carousel.slides.map((slide, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <React.Fragment key={idx}>
                <button
                  onClick={() => onSelectSlide(idx)}
                  className={`group relative flex-shrink-0 rounded-xl p-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'ring-2 ring-offset-2 ring-offset-[#080d11] bg-white/[0.08]'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] opacity-75 hover:opacity-100'
                  }`}
                  style={{
                    outlineColor: isActive ? theme.accent : undefined,
                    boxShadow: isActive ? `0 0 12px ${theme.accent}40` : undefined,
                  }}
                  title={`Slide ${idx + 1}: ${slide.type.toUpperCase()} - ${slide.enTitle || ''}`}
                >
                  <div
                    className="w-16 h-26 rounded-lg flex flex-col justify-between p-1.5 text-[9px] font-mono border border-white/10 overflow-hidden relative shadow-inner"
                    style={{
                      backgroundColor: theme.baseBg,
                      borderColor: isActive ? theme.accent : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="flex justify-between items-center text-[8px] text-slate-400">
                      <span className="font-bold text-white">#{idx + 1}</span>
                      <span
                        className="text-[7px] font-bold px-1 rounded uppercase"
                        style={{
                          backgroundColor: `${theme.accent}20`,
                          color: theme.accent,
                        }}
                      >
                        {slide.type}
                      </span>
                    </div>

                    <div className="flex items-center justify-center my-auto">
                      <span
                        className="w-7 h-4 rounded flex items-center justify-center text-[8px] font-bold font-mono tracking-tighter"
                        style={{ backgroundColor: theme.accent, color: '#0c1219' }}
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

                    <div className="text-[8px] text-slate-300 truncate font-sans text-center leading-tight">
                      {slide.enTitle?.split('\n')[0]?.substring(0, 12) || `Slide ${idx + 1}`}
                    </div>
                  </div>
                </button>

                {/* Quick Add Slide Inserter Button between slides */}
                {onAddSlideAt && idx < carousel.slides.length - 1 && (
                  <button
                    onClick={() => onAddSlideAt(idx + 1)}
                    className="w-3.5 h-14 rounded-md border border-dashed border-white/15 hover:border-teal-400/50 bg-white/[0.02] hover:bg-teal-500/10 text-slate-500 hover:text-teal-300 flex items-center justify-center transition-all cursor-pointer shrink-0 -mx-1"
                    title={`Insert slide between #${idx + 1} and #${idx + 2}`}
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                )}
              </React.Fragment>
            );
          })}

          {/* Quick Add Slide at the End */}
          {onAddSlideAt && (
            <button
              onClick={() => onAddSlideAt(carousel.slides.length)}
              className="w-12 h-26 rounded-xl border border-dashed border-white/20 hover:border-teal-400/60 bg-white/[0.02] hover:bg-teal-500/10 text-slate-400 hover:text-teal-300 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shrink-0 p-1 text-[9px] font-semibold"
              title="Add slide at end of carousel"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          )}
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
