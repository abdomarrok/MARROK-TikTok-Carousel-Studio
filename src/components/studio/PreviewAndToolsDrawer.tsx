import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Smartphone,
  Wand2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Music2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Sliders,
  Shuffle,
  Eye,
} from 'lucide-react';
import { CarouselData, SlideData, ThemePalette } from '../../types.ts';
import { renderSlideToCanvas } from '../../lib/canvasExporter.ts';
import { CHAR_LIMITS } from '../../lib/qaChecks.ts';
import { autoFitTextToLimits, autoPolishHeadline } from '../../lib/text/headlines.ts';
import { fixArabicPunctuation } from '../../lib/text/arabicBiDi.ts';

interface PreviewAndToolsDrawerProps {
  isOpen: boolean;
  initialTab?: 'simulator' | 'polish';
  onClose: () => void;
  carousel: CarouselData;
  currentSlideIndex: number;
  theme: ThemePalette;
  onSelectSlide: (index: number) => void;
  onUpdateSlide: (slideIndex: number, updater: (prevSlide: SlideData) => SlideData, actionLabel?: string) => void;
  onShowToast: (msg: string) => void;
}

const DIAGRAM_VARIANTS = [
  'topology',
  'stack',
  'isolation',
  'takeaway',
  'scatter',
  'graph',
  'clusters',
  'split',
  'features',
] as const;

export const PreviewAndToolsDrawer: React.FC<PreviewAndToolsDrawerProps> = ({
  isOpen,
  initialTab = 'simulator',
  onClose,
  carousel,
  currentSlideIndex,
  theme,
  onSelectSlide,
  onUpdateSlide,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'polish'>(initialTab);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showTikTokChrome, setShowTikTokChrome] = useState(true);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-play slideshow timer (3.0s per slide)
  useEffect(() => {
    if (!isOpen || activeTab !== 'simulator' || !isAutoPlaying) return;
    const timer = setInterval(() => {
      const nextIndex = (currentSlideIndex + 1) % carousel.slides.length;
      onSelectSlide(nextIndex);
    }, 3000);
    return () => clearInterval(timer);
  }, [isOpen, activeTab, isAutoPlaying, currentSlideIndex, carousel.slides.length, onSelectSlide]);

  // Render active slide onto the simulator canvas
  useEffect(() => {
    if (!isOpen || activeTab !== 'simulator') return;
    let isMounted = true;

    async function drawPreview() {
      if (!previewCanvasRef.current) return;
      try {
        const offscreen = await renderSlideToCanvas(
          carousel,
          currentSlideIndex,
          undefined,
          theme,
          carousel.visualOptions
        );
        if (!isMounted || !previewCanvasRef.current) return;
        const target = previewCanvasRef.current;
        if (target.width !== offscreen.width) target.width = offscreen.width;
        if (target.height !== offscreen.height) target.height = offscreen.height;
        const ctx = target.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, target.width, target.height);
          ctx.drawImage(offscreen, 0, 0);
        }
      } catch (err) {
        console.error('Simulator preview render error:', err);
      }
    }

    drawPreview();
    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, carousel, currentSlideIndex, theme]);

  if (!isOpen) return null;

  const currentSlide = carousel.slides[currentSlideIndex] || carousel.slides[0];
  const creatorHandle = (carousel.sourceMeta?.creator || carousel.brand || 'marrok')
    .toLowerCase()
    .replace(/\s+/g, '');

  const enTitleLen = (currentSlide?.enTitle || '').trim().length;
  const arTitleLen = (currentSlide?.arTitle || '').trim().length;
  const enBodyLen = (currentSlide?.enBody || '').trim().length;
  const arBodyLen = (currentSlide?.arBody || '').trim().length;

  const hasLengthWarning =
    enTitleLen > CHAR_LIMITS.enTitle ||
    arTitleLen > CHAR_LIMITS.arTitle ||
    enBodyLen > CHAR_LIMITS.enBody ||
    arBodyLen > CHAR_LIMITS.arBody;

  // Deterministic Local Fit & Polish
  const handleAutoFitSlide = () => {
    onUpdateSlide(
      currentSlideIndex,
      (slide) => {
        const polishedEnTitle = autoFitTextToLimits(
          autoPolishHeadline(slide.enTitle || ''),
          CHAR_LIMITS.enTitle
        );
        const polishedArTitle = autoFitTextToLimits(slide.arTitle || '', CHAR_LIMITS.arTitle);
        const fittedEnBody = autoFitTextToLimits(slide.enBody || '', CHAR_LIMITS.enBody);
        const fittedArBody = autoFitTextToLimits(
          fixArabicPunctuation(slide.arBody || ''),
          CHAR_LIMITS.arBody
        );
        return {
          ...slide,
          enTitle: polishedEnTitle,
          arTitle: polishedArTitle,
          enBody: fittedEnBody,
          arBody: fittedArBody,
        };
      },
      `Fitted Slide ${currentSlideIndex + 1} to mobile QA limits`
    );
  };

  // Cycle Schematic Diagram Variant
  const handleCycleDiagramVariant = () => {
    const currentVariant = currentSlide.diagramVariant || 'topology';
    const currentIdx = DIAGRAM_VARIANTS.indexOf(currentVariant as typeof DIAGRAM_VARIANTS[number]);
    const nextVariant = DIAGRAM_VARIANTS[(currentIdx + 1) % DIAGRAM_VARIANTS.length];

    onUpdateSlide(
      currentSlideIndex,
      (slide) => ({
        ...slide,
        diagramVariant: nextVariant,
      }),
      `Switched Slide ${currentSlideIndex + 1} schematic to ${nextVariant}`
    );
  };

  // Per-Slide AI Refine Handler with Local Fallback
  const handleAiRefineSlide = async (mode: 'punchy' | 'shorten' | 'arabic_sync' | 'analogy') => {
    if (!currentSlide || isRefining) return;
    setIsRefining(mode);

    try {
      const customKey =
        typeof window !== 'undefined' ? localStorage.getItem('marrok_custom_gemini_key') : null;
      const backupKey =
        typeof window !== 'undefined' ? localStorage.getItem('marrok_custom_gemini_backup_key') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customKey) headers['x-gemini-key'] = customKey;
      if (backupKey) headers['x-gemini-backup-key'] = backupKey;

      const res = await fetch('/api/refine-slide', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          slide: currentSlide,
          mode,
          category: carousel.category,
          brand: carousel.brand,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const isOffline =
          data.engine === 'offline-synthesizer' ||
          res.headers.get('x-marrok-engine') === 'offline-synthesizer';

        onUpdateSlide(
          currentSlideIndex,
          (slide) => {
            const rawEnTitle = typeof data.enTitle === 'string' && data.enTitle ? data.enTitle : slide.enTitle || '';
            const rawArTitle = typeof data.arTitle === 'string' && data.arTitle ? data.arTitle : slide.arTitle || '';
            const rawEnBody = typeof data.enBody === 'string' && data.enBody ? data.enBody : slide.enBody || '';
            const rawArBody = typeof data.arBody === 'string' && data.arBody ? data.arBody : slide.arBody || '';

            return {
              ...slide,
              enTitle: autoFitTextToLimits(autoPolishHeadline(rawEnTitle), CHAR_LIMITS.enTitle),
              arTitle: autoFitTextToLimits(rawArTitle, CHAR_LIMITS.arTitle),
              enBody: autoFitTextToLimits(rawEnBody, CHAR_LIMITS.enBody),
              arBody: autoFitTextToLimits(fixArabicPunctuation(rawArBody), CHAR_LIMITS.arBody),
            };
          },
          isOffline
            ? `Polished Slide ${currentSlideIndex + 1} copy (Local QA Engine)`
            : `Refined Slide ${currentSlideIndex + 1} with AI (${mode.replace('_', ' ')})`
        );
      } else {
        handleAutoFitSlide();
      }
    } catch (_err) {
      handleAutoFitSlide();
    } finally {
      setIsRefining(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Click outside backdrop to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-out Drawer Panel */}
      <aside
        aria-label="Preview and Tools Drawer"
        className="relative w-full max-w-md bg-[#0b1117] border-l border-white/10 shadow-2xl flex flex-col h-full overflow-hidden font-jakarta"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-black/40">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Studio Preview & Slide Tools
            </h2>
            <p className="text-[11px] text-slate-400">
              Slide {currentSlideIndex + 1} of {carousel.slides.length} · {currentSlide?.type.toUpperCase()}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Mode Switcher */}
        <div className="px-5 pt-3 pb-2 bg-black/20 border-b border-white/[0.06]">
          <div className="flex items-center gap-1 p-1 bg-slate-950/90 border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'simulator'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              style={activeTab === 'simulator' ? { color: theme.accent } : undefined}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>TikTok Simulator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('polish')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'polish'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              style={activeTab === 'polish' ? { color: theme.accent } : undefined}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Slide Polish & QA</span>
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'simulator' ? (
            <div className="space-y-4">
              {/* Simulator Controls Strip */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      isAutoPlaying
                        ? 'bg-white/15 border-white/30 text-white'
                        : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isAutoPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                        <span>Pause Auto-Play</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                        <span>Auto-Play (3s)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTikTokChrome(!showTikTokChrome)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      showTikTokChrome
                        ? 'bg-white/15 border-white/30 text-white'
                        : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                    }`}
                    title="Toggle TikTok Feed UI Overlay"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>TikTok UI</span>
                  </button>
                </div>

                <div className="text-xs font-mono tabular-nums text-slate-400">
                  {currentSlideIndex + 1} / {carousel.slides.length}
                </div>
              </div>

              {/* 9:16 Mobile Device Frame */}
              <div className="flex justify-center">
                <div
                  onTouchStart={(e) => {
                    touchStartXRef.current = e.touches[0]?.clientX ?? null;
                  }}
                  onTouchEnd={(e) => {
                    if (touchStartXRef.current === null) return;
                    const deltaX = (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current;
                    touchStartXRef.current = null;
                    if (deltaX < -40 && currentSlideIndex < carousel.slides.length - 1) {
                      onSelectSlide(currentSlideIndex + 1);
                    } else if (deltaX > 40 && currentSlideIndex > 0) {
                      onSelectSlide(currentSlideIndex - 1);
                    }
                  }}
                  className="relative w-[290px] aspect-[9/16] rounded-[28px] border-4 border-slate-800 bg-black shadow-2xl overflow-hidden select-none"
                >
                  {/* Live Rendered Slide Canvas */}
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full h-full object-contain"
                  />

                  {/* Simulated TikTok Mobile Chrome Overlay */}
                  {showTikTokChrome && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                      {/* Top Feed Navigation Bar */}
                      <div className="pt-3 px-4 flex items-center justify-between text-[11px] font-semibold text-white/90 bg-gradient-to-b from-black/70 via-black/25 to-transparent pb-4">
                        <span className="text-white/60">Following</span>
                        <span className="border-b-2 border-white pb-0.5 text-white">For You</span>
                        <span className="text-white/60 font-mono text-[10px] tabular-nums">
                          {currentSlideIndex + 1}/{carousel.slides.length}
                        </span>
                      </div>

                      {/* Middle Right Action Rail + Bottom Creator Caption Area */}
                      <div className="mt-auto relative">
                        {/* Right-side interaction rail */}
                        <div className="absolute right-2.5 bottom-20 flex flex-col items-center gap-3.5 text-white/90">
                          <div className="w-8 h-8 rounded-full border border-white/40 bg-slate-900 flex items-center justify-center text-[10px] font-bold">
                            M
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                            <span className="text-[9px] font-mono tabular-nums">4.8K</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <MessageCircle className="w-5 h-5 text-white" />
                            <span className="text-[9px] font-mono tabular-nums">312</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <Bookmark className="w-5 h-5 fill-amber-400 text-amber-400" />
                            <span className="text-[9px] font-mono tabular-nums">1.9K</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <Share2 className="w-5 h-5 text-white" />
                            <span className="text-[9px] font-mono tabular-nums">640</span>
                          </div>
                        </div>

                        {/* Carousel Pagination Dots */}
                        <div className="flex items-center justify-center gap-1 mb-2">
                          {carousel.slides.map((_, idx) => (
                            <span
                              key={idx}
                              className={`h-1.5 rounded-full transition-all ${
                                idx === currentSlideIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/40'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Bottom Caption & Audio Scrim */}
                        <div className="p-3 pr-12 bg-gradient-to-t from-black/90 via-black/65 to-transparent space-y-1 pointer-events-auto">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <span>@{creatorHandle}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[10px] font-normal text-slate-300">
                              {carousel.category}
                            </span>
                          </div>

                          <div
                            onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
                            className="text-[10px] text-slate-200 leading-snug cursor-pointer"
                            title="Click to expand/collapse caption preview"
                          >
                            {isCaptionExpanded
                              ? carousel.caption || currentSlide?.enBody
                              : `${(carousel.caption || currentSlide?.enBody || '').slice(0, 78)}... more`}
                          </div>

                          <div className="flex items-center gap-1.5 text-[9px] text-slate-300 pt-0.5">
                            <Music2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              Original Sound - {carousel.brand || 'MARROK'} Engineering
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prev / Next Quick Tap Buttons */}
                  <button
                    type="button"
                    onClick={() => onSelectSlide(Math.max(0, currentSlideIndex - 1))}
                    disabled={currentSlideIndex === 0}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 cursor-pointer"
                    title="Previous Slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onSelectSlide(Math.min(carousel.slides.length - 1, currentSlideIndex + 1))
                    }
                    disabled={currentSlideIndex === carousel.slides.length - 1}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 cursor-pointer"
                    title="Next Slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-center text-[11px] text-slate-400">
                Swipe or use arrows to verify that no text is clipped by TikTok’s right-rail icons or bottom caption bar.
              </p>
            </div>
          ) : (
            /* TAB 2: SLIDE POLISH & QA */
            <div className="space-y-5">
              {/* Section 1: Per-Slide AI Copy Refiner */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    AI Slide Copy Refiner (Slide {currentSlideIndex + 1})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Preserves other slides
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={Boolean(isRefining)}
                    onClick={() => handleAiRefineSlide('punchy')}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-left text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isRefining === 'punchy' ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" style={{ color: theme.accent }} />
                    ) : (
                      <Sparkles className="w-4 h-4 shrink-0" style={{ color: theme.accent }} />
                    )}
                    <div className="min-w-0">
                      <div className="truncate">Make Punchier</div>
                      <div className="text-[10px] font-normal text-slate-400 truncate">
                        Sharper hook & contrast
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(isRefining)}
                    onClick={() => handleAiRefineSlide('shorten')}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-left text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isRefining === 'shorten' ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" style={{ color: theme.accent }} />
                    ) : (
                      <Sliders className="w-4 h-4 shrink-0 text-cyan-400" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate">Shorten Copy</div>
                      <div className="text-[10px] font-normal text-slate-400 truncate">
                        Compress for fast scan
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(isRefining)}
                    onClick={() => handleAiRefineSlide('arabic_sync')}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-left text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isRefining === 'arabic_sync' ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" style={{ color: theme.accent }} />
                    ) : (
                      <Wand2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate">Sync Arabic</div>
                      <div className="text-[10px] font-normal text-slate-400 truncate">
                        Natural MSA & BiDi fix
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(isRefining)}
                    onClick={() => handleAiRefineSlide('analogy')}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-left text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isRefining === 'analogy' ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" style={{ color: theme.accent }} />
                    ) : (
                      <Shuffle className="w-4 h-4 shrink-0 text-amber-400" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate">System Analogy</div>
                      <div className="text-[10px] font-normal text-slate-400 truncate">
                        Concrete mental model
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 2: Instant Deterministic Actions */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <span className="text-xs font-bold text-white block">
                  Instant Layout & Copy Utilities (0ms)
                </span>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFitSlide}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <span>Auto-Fit Headlines & Character Limits (Spec §8)</span>
                    <span className="font-mono text-[10px] text-cyan-300">Apply</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCycleDiagramVariant}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <span>Cycle Schematic Diagram Variant</span>
                    <span className="font-mono text-[10px] text-slate-300 uppercase">
                      {currentSlide?.diagramVariant || 'topology'} →
                    </span>
                  </button>
                </div>
              </div>

              {/* Section 3: Live Slide QA Telemetry */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Slide {currentSlideIndex + 1} QA Telemetry
                  </span>
                  {hasLengthWarning ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Exceeds Spec Limit</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>All Thresholds Passed</span>
                    </span>
                  )}
                </div>

                <div className="divide-y divide-white/[0.06] border border-white/10 rounded-xl bg-black/40 text-xs">
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-slate-300">English Headline</span>
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        enTitleLen > CHAR_LIMITS.enTitle ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {enTitleLen} / {CHAR_LIMITS.enTitle} chars
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-slate-300">Arabic Headline</span>
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        arTitleLen > CHAR_LIMITS.arTitle ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {arTitleLen} / {CHAR_LIMITS.arTitle} chars
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-slate-300">English Body Copy</span>
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        enBodyLen > CHAR_LIMITS.enBody ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {enBodyLen} / {CHAR_LIMITS.enBody} chars
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-slate-300">Arabic Body Copy</span>
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        arBodyLen > CHAR_LIMITS.arBody ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {arBodyLen} / {CHAR_LIMITS.arBody} chars
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
