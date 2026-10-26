import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Move, RotateCcw } from 'lucide-react';
import { CarouselData, GraphicalElementId, ElementLayoutOverride, ThemePalette } from '../../types.ts';
import { renderSlideToCanvas } from '../../lib/canvasExporter.ts';

interface ViewportCanvasProps {
  carousel: CarouselData;
  currentSlideIndex: number;
  theme: ThemePalette;
  showSafeZones: boolean;
  onToggleSafeZones: () => void;
  onPreviousSlide: () => void;
  onNextSlide: () => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  selectedElementId?: GraphicalElementId | null;
  onSelectElement?: (id: GraphicalElementId) => void;
  onUpdateLayoutOverride?: (id: GraphicalElementId, override: ElementLayoutOverride | null) => void;
}

const ELEMENT_BOUNDS: Record<
  GraphicalElementId,
  { top: string; left: string; width: string; height: string; label: string }
> = {
  headerBadge: { top: '5.2%', left: '7.4%', width: '85.2%', height: '6.2%', label: 'Top MARROK Badge' },
  graphicCard: { top: '12.5%', left: '7.4%', width: '85.2%', height: '28.1%', label: 'Visual Archetype Card' },
  titleBlock: { top: '41.5%', left: '10.0%', width: '80.0%', height: '9.5%', label: 'English Headline' },
  arabicTitleBlock: { top: '51.5%', left: '10.0%', width: '80.0%', height: '9.5%', label: 'Arabic Headline' },
  bodyBlock: { top: '61.5%', left: '12.0%', width: '76.0%', height: '11.0%', label: 'English Body' },
  arabicBodyBlock: { top: '73.0%', left: '12.0%', width: '76.0%', height: '11.0%', label: 'Arabic Body' },
  ctaButton: { top: '48.0%', left: '15.0%', width: '70.0%', height: '6.5%', label: 'CTA Pill Button' },
  attributionCard: { top: '56.0%', left: '15.0%', width: '70.0%', height: '5.0%', label: 'Attribution Card' },
};

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({
  carousel,
  currentSlideIndex,
  theme,
  showSafeZones,
  onPreviousSlide,
  onNextSlide,
  canvasRef: externalCanvasRef,
  selectedElementId,
  onSelectElement,
  onUpdateLayoutOverride,
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCanvasRef = externalCanvasRef || internalCanvasRef;

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [mobileNudgeStep, setMobileNudgeStep] = useState<number>(5);

  const handleNudge = (deltaX: number, deltaY: number) => {
    if (!selectedElementId || !onUpdateLayoutOverride) return;
    const nextDx = Math.max(-450, Math.min(450, currentDx + deltaX));
    const nextDy = Math.max(-800, Math.min(800, currentDy + deltaY));
    onUpdateLayoutOverride(selectedElementId, {
      ...(currentOverride || {}),
      dx: nextDx,
      dy: nextDy,
    });
  };

  const prevIndexRef = useRef(currentSlideIndex);
  const prevArchetypeRef = useRef(carousel.slides[currentSlideIndex]?.type);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderSequenceRef = useRef(0);

  const currentSlide = carousel.slides[currentSlideIndex];
  const currentOverride = (selectedElementId && currentSlide?.layoutOverrides?.[selectedElementId]) || null;
  const currentDx = currentOverride?.dx ?? 0;
  const currentDy = currentOverride?.dy ?? 0;

  // Debounced canvas rendering:
  // Instant (0ms) on slide switch or archetype change,
  // 150ms debounced on text keystrokes to ensure smooth lag-free typing.
  useEffect(() => {
    let isMounted = true;
    const currentSlide = carousel.slides[currentSlideIndex];
    if (!currentSlide || !activeCanvasRef.current) return;

    const isIndexChange = prevIndexRef.current !== currentSlideIndex;
    const isArchetypeChange = prevArchetypeRef.current !== currentSlide.type;
    prevIndexRef.current = currentSlideIndex;
    prevArchetypeRef.current = currentSlide.type;

    const renderSequence = ++renderSequenceRef.current;

    const executeRender = async () => {
      if (!isMounted || !activeCanvasRef.current) return;
      const offscreen = document.createElement('canvas');
      try {
        await renderSlideToCanvas(carousel, currentSlideIndex, offscreen, theme);
        // Render race protection: If another render started or component unmounted, discard
        if (!isMounted || renderSequence !== renderSequenceRef.current) return;

        const visibleCanvas = activeCanvasRef.current;
        if (!visibleCanvas) return;
        if (visibleCanvas.width !== offscreen.width) visibleCanvas.width = offscreen.width;
        if (visibleCanvas.height !== offscreen.height) visibleCanvas.height = offscreen.height;
        const ctx = visibleCanvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, visibleCanvas.width, visibleCanvas.height);
        ctx.drawImage(offscreen, 0, 0);
      } catch (err) {
        if (isMounted && renderSequence === renderSequenceRef.current) {
          console.error('ViewportCanvas render error:', err);
        }
      }
    };

    if (isIndexChange || isArchetypeChange) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      executeRender();
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(executeRender, 150);
    }

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [carousel, currentSlideIndex, theme, activeCanvasRef]);

  // Click-to-select hit testing in 1080x1920 canvas coordinates
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectElement || !activeCanvasRef.current) return;
    const rect = activeCanvasRef.current.getBoundingClientRect();
    const clickYRatio = (e.clientY - rect.top) / rect.height;
    const currentSlide = carousel.slides[currentSlideIndex];

    if (currentSlide?.type === 'cta') {
      if (clickYRatio < 0.12) onSelectElement('headerBadge');
      else if (clickYRatio >= 0.12 && clickYRatio < 0.45) onSelectElement('titleBlock');
      else if (clickYRatio >= 0.45 && clickYRatio < 0.60) onSelectElement('ctaButton');
      else onSelectElement('bodyBlock');
      return;
    }

    if (clickYRatio < 0.12) {
      onSelectElement('headerBadge');
    } else if (clickYRatio >= 0.12 && clickYRatio < 0.42) {
      onSelectElement('graphicCard');
    } else if (clickYRatio >= 0.42 && clickYRatio < 0.53) {
      onSelectElement('titleBlock');
    } else if (clickYRatio >= 0.53 && clickYRatio < 0.64) {
      onSelectElement('arabicTitleBlock');
    } else if (clickYRatio >= 0.64 && clickYRatio < 0.77) {
      onSelectElement('bodyBlock');
    } else if (clickYRatio >= 0.77 && clickYRatio < 0.90) {
      onSelectElement('arabicBodyBlock');
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedElementId || !onUpdateLayoutOverride) return;
    e.stopPropagation();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { dx: currentDx, dy: currentDy };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !selectedElementId || !onUpdateLayoutOverride) return;
    e.stopPropagation();
    const rect = activeCanvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const scaleX = 1080 / rect.width;
    const scaleY = 1920 / rect.height;

    const deltaX = Math.round((e.clientX - dragStartRef.current.x) * scaleX);
    const deltaY = Math.round((e.clientY - dragStartRef.current.y) * scaleY);

    const newDx = Math.max(-450, Math.min(450, initialOffsetRef.current.dx + deltaX));
    const newDy = Math.max(-800, Math.min(800, initialOffsetRef.current.dy + deltaY));

    onUpdateLayoutOverride(selectedElementId, {
      ...(currentOverride || {}),
      dx: newDx,
      dy: newDy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    dragStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selectedElementId || !onUpdateLayoutOverride) return;
    const step = e.shiftKey ? 10 : 2;
    let nextDx = currentDx;
    let nextDy = currentDy;
    let handled = false;

    if (e.key === 'ArrowLeft') {
      nextDx = Math.max(-450, currentDx - step);
      handled = true;
    } else if (e.key === 'ArrowRight') {
      nextDx = Math.min(450, currentDx + step);
      handled = true;
    } else if (e.key === 'ArrowUp') {
      nextDy = Math.max(-800, currentDy - step);
      handled = true;
    } else if (e.key === 'ArrowDown') {
      nextDy = Math.min(800, currentDy + step);
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      onUpdateLayoutOverride(selectedElementId, {
        ...(currentOverride || {}),
        dx: nextDx,
        dy: nextDy,
      });
    }
  };

  const activeBounds = selectedElementId ? ELEMENT_BOUNDS[selectedElementId] : null;

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl w-auto max-h-[min(540px,calc(100vh-250px))] aspect-[9/16] shrink-0 outline-none focus:ring-1 focus:ring-cyan-500/40 select-none"
    >
      <canvas
        ref={activeCanvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full object-contain cursor-crosshair"
      />

      {/* Selected Element Bounding Box (Direct Graphical Selection & Drag Feedback) */}
      {activeBounds && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute transition-shadow ${
            isDragging
              ? 'cursor-grabbing border-2 border-solid shadow-2xl'
              : 'cursor-grab border-2 border-dashed'
          } rounded-lg`}
          style={{
            top: `calc(${activeBounds.top} + ${(currentDy / 1920) * 100}%)`,
            left: `calc(${activeBounds.left} + ${(currentDx / 1080) * 100}%)`,
            width: activeBounds.width,
            height: activeBounds.height,
            borderColor: theme.accent,
            backgroundColor: isDragging ? `${theme.accent}25` : `${theme.accent}12`,
            transform: currentOverride?.scale && currentOverride.scale !== 1 ? `scale(${currentOverride.scale})` : undefined,
            transformOrigin: 'center center',
            touchAction: 'none',
          }}
          title="Drag to reposition on canvas (or use keyboard arrow keys)"
        >
          {/* Draggable HUD Header Pill - positioned safely inside for top-edge elements */}
          <div
            className={`absolute flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider text-black font-bold shadow-md whitespace-nowrap z-20 ${
              selectedElementId === 'headerBadge'
                ? 'top-1.5 left-2'
                : '-top-6 left-1/2 -translate-x-1/2'
            }`}
            style={{ backgroundColor: theme.accent }}
          >
            <Move className="w-2.5 h-2.5 stroke-[3]" />
            <span>{activeBounds.label}</span>
            {(currentDx !== 0 || currentDy !== 0) && (
              <span className="bg-black/20 text-black px-1 rounded text-[8px] font-bold">
                {currentDx >= 0 ? `+${currentDx}` : currentDx}x, {currentDy >= 0 ? `+${currentDy}` : currentDy}y
              </span>
            )}
            {(currentDx !== 0 || currentDy !== 0) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateLayoutOverride?.(selectedElementId!, null);
                }}
                className="hover:opacity-75 p-0.5 cursor-pointer"
                title="Reset element translation"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Corner Resizing Pips */}
          <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full border border-black shadow" style={{ backgroundColor: theme.accent }} />
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-black shadow" style={{ backgroundColor: theme.accent }} />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full border border-black shadow" style={{ backgroundColor: theme.accent }} />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-black shadow" style={{ backgroundColor: theme.accent }} />
        </div>
      )}

      {/* Mobile Precision Nudge Bar (Visible when element selected on mobile screens) */}
      {selectedElementId && (
        <div className="sm:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/90 backdrop-blur-md border border-white/25 rounded-2xl p-1 shadow-2xl z-30 touch-manipulation">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNudge(-mobileNudgeStep, 0);
            }}
            className="w-7 h-7 rounded-xl bg-white/10 active:bg-white/30 text-white font-bold flex items-center justify-center text-xs cursor-pointer"
            title="Nudge Left"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNudge(0, -mobileNudgeStep);
            }}
            className="w-7 h-7 rounded-xl bg-white/10 active:bg-white/30 text-white font-bold flex items-center justify-center text-xs cursor-pointer"
            title="Nudge Up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNudge(0, mobileNudgeStep);
            }}
            className="w-7 h-7 rounded-xl bg-white/10 active:bg-white/30 text-white font-bold flex items-center justify-center text-xs cursor-pointer"
            title="Nudge Down"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNudge(mobileNudgeStep, 0);
            }}
            className="w-7 h-7 rounded-xl bg-white/10 active:bg-white/30 text-white font-bold flex items-center justify-center text-xs cursor-pointer"
            title="Nudge Right"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMobileNudgeStep((s) => (s === 2 ? 10 : s === 10 ? 25 : 2));
            }}
            className="px-1.5 h-7 rounded-xl bg-white/15 active:bg-white/30 text-[9px] font-mono text-cyan-300 font-bold flex items-center justify-center cursor-pointer"
            title="Toggle nudge step (2px / 10px / 25px)"
          >
            {mobileNudgeStep}px
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateLayoutOverride?.(selectedElementId!, null);
            }}
            className="w-7 h-7 rounded-xl bg-rose-500/20 active:bg-rose-500/40 text-rose-300 font-bold flex items-center justify-center text-xs cursor-pointer"
            title="Reset position"
          >
            ↺
          </button>
        </div>
      )}

      {/* Desktop Direct Dragging Selection Affordance Pill */}
      {selectedElementId && (
        <div className="hidden sm:flex absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-0.5 text-[8.5px] font-mono text-slate-300 shadow-xl items-center gap-1.5 pointer-events-none whitespace-nowrap z-20">
          <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: theme.accent }} />
          <span>Drag to move</span>
          <span className="text-slate-500">•</span>
          <span>Arrows nudge</span>
          <span className="text-slate-500">•</span>
          <span>Shift=10px</span>
        </div>
      )}

      {/* TikTok Feed Safe Zone Simulator Overlay */}
      {showSafeZones && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between font-mono text-[9px] select-none">
          {/* Top 9.4% Safe Zone (Status & Search) */}
          <div className="h-[9.4%] bg-rose-500/20 border-b border-rose-500/40 flex items-center justify-between px-3 text-rose-300">
            <span>TOP 180px MARGIN</span>
            <span>[Search / For You]</span>
          </div>

          {/* Center Content Bounding Box */}
          <div className="flex-1 mx-3 border-2 border-dashed border-rose-400/40 rounded-lg flex items-center justify-between p-2">
            <span className="text-rose-400/70 rotate-90 origin-left text-[8px] tracking-wider">SAFE BOUNDARY</span>
            {/* Right-side TikTok Icons HUD Indicator */}
            <div className="h-full flex flex-col justify-end items-center gap-2 text-rose-300/80 pr-1 pb-4 text-[10px]">
              <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">♥</div>
              <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">💬</div>
              <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">★</div>
              <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">↗</div>
            </div>
          </div>

          {/* Bottom 16.7% Safe Zone (Caption & Audio) */}
          <div className="h-[16.7%] bg-rose-500/20 border-t border-rose-500/40 flex flex-col justify-center px-3 text-rose-300 space-y-0.5">
            <div className="flex justify-between">
              <span>BOTTOM 320px MARGIN</span>
              <span>@username</span>
            </div>
            <span className="text-[8px] text-rose-400/80">TikTok Captions & Audio Track Area</span>
          </div>
        </div>
      )}

      {/* Slide Navigation Hover Arrows */}
      <button
        type="button"
        onClick={onPreviousSlide}
        disabled={currentSlideIndex === 0}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 cursor-pointer transition-all"
        title="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={onNextSlide}
        disabled={currentSlideIndex === carousel.slides.length - 1}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 cursor-pointer transition-all"
        title="Next Slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
