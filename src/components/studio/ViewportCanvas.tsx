import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Move, RotateCcw, X, Heart, MessageCircle, Bookmark, Share2, Music2, Search } from 'lucide-react';
import { CarouselData, GraphicalElementId, ElementLayoutOverride, ThemePalette } from '../../types.ts';
import { renderSlideToCanvas } from '../../lib/canvasExporter.ts';
import { computeSlideElementBounds, findSlideElementAtPoint, ElementBounds } from '../../lib/canvas/layoutBounds.ts';
import { clampElementDrag } from '../../lib/canvas/layoutAwareness.ts';

export type StageOverlayMode = 'clean' | 'safe' | 'tiktok';

interface ViewportCanvasProps {
  stageOverlayMode?: StageOverlayMode;
  onSetStageOverlayMode?: (mode: StageOverlayMode) => void;
  carousel: CarouselData;
  currentSlideIndex: number;
  theme: ThemePalette;
  showSafeZones: boolean;
  onToggleSafeZones: () => void;
  onPreviousSlide: () => void;
  onNextSlide: () => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  selectedElementId?: GraphicalElementId | null;
  onSelectElement?: (id: GraphicalElementId | null) => void;
  onUpdateLayoutOverride?: (id: GraphicalElementId, override: ElementLayoutOverride | null) => void;
}

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({
  carousel,
  currentSlideIndex,
  theme,
  showSafeZones,
  stageOverlayMode,
  onSetStageOverlayMode,
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
  const [hoveredElementId, setHoveredElementId] = useState<GraphicalElementId | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [mobileNudgeStep, setMobileNudgeStep] = useState<number>(5);

  const prevIndexRef = useRef(currentSlideIndex);
  const prevArchetypeRef = useRef(carousel.slides[currentSlideIndex]?.type);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderSequenceRef = useRef(0);

  const currentSlide = carousel.slides[currentSlideIndex];
  const overlayMode: StageOverlayMode = stageOverlayMode || (showSafeZones ? 'safe' : 'clean');
  const creatorHandle = (carousel.sourceMeta?.creator || carousel.channel || carousel.brand || 'marrok').toLowerCase().replace(/\s+/g, '');
  const currentOverride = (selectedElementId && currentSlide?.layoutOverrides?.[selectedElementId]) || null;
  const currentDx = currentOverride?.dx ?? 0;
  const currentDy = currentOverride?.dy ?? 0;

  // Dynamically compute exact layout bounds for every element on current slide
  const boundsMap = useMemo(() => {
    if (!currentSlide) return {} as Record<GraphicalElementId, ElementBounds>;
    return computeSlideElementBounds(currentSlide, carousel);
  }, [currentSlide, carousel]);

  const activeBounds = selectedElementId ? boundsMap[selectedElementId] : null;
  const hoveredBounds = hoveredElementId && hoveredElementId !== selectedElementId ? boundsMap[hoveredElementId] : null;

  const handleNudge = (deltaX: number, deltaY: number) => {
    if (!selectedElementId || !onUpdateLayoutOverride || !currentSlide) return;
    const { dx: nextDx, dy: nextDy } = clampElementDrag(
      selectedElementId,
      currentDx + deltaX,
      currentDy + deltaY,
      currentSlide,
      carousel
    );
    onUpdateLayoutOverride(selectedElementId, {
      ...(currentOverride || {}),
      dx: nextDx,
      dy: nextDy,
    });
  };

  // Debounced canvas rendering
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
        await renderSlideToCanvas(
          carousel,
          currentSlideIndex,
          offscreen,
          theme,
          carousel.visualOptions
        );
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
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      executeRender();
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(executeRender, 150);
    }

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [carousel, currentSlideIndex, theme, activeCanvasRef]);

  // Accurate hit-testing on Canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeCanvasRef.current || !onSelectElement) return;
    const rect = activeCanvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const canvasX = ((e.clientX - rect.left) / rect.width) * 1080;
    const canvasY = ((e.clientY - rect.top) / rect.height) * 1920;

    const hitId = findSlideElementAtPoint(canvasX, canvasY, boundsMap, currentSlide?.layoutOverrides);
    onSelectElement(hitId);
  };

  // Hover detection for interactive feedback
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging || !activeCanvasRef.current) return;
    const rect = activeCanvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const canvasX = ((e.clientX - rect.left) / rect.width) * 1080;
    const canvasY = ((e.clientY - rect.top) / rect.height) * 1920;

    const hitId = findSlideElementAtPoint(canvasX, canvasY, boundsMap, currentSlide?.layoutOverrides);
    setHoveredElementId(hitId);
  };

  const handleCanvasMouseLeave = () => {
    if (!isDragging) setHoveredElementId(null);
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
    if (!isDragging || !dragStartRef.current || !selectedElementId || !onUpdateLayoutOverride || !currentSlide) return;
    e.stopPropagation();
    const rect = activeCanvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const scaleX = 1080 / rect.width;
    const scaleY = 1920 / rect.height;

    const deltaX = Math.round((e.clientX - dragStartRef.current.x) * scaleX);
    const deltaY = Math.round((e.clientY - dragStartRef.current.y) * scaleY);

    const { dx: newDx, dy: newDy } = clampElementDrag(
      selectedElementId,
      initialOffsetRef.current.dx + deltaX,
      initialOffsetRef.current.dy + deltaY,
      currentSlide,
      carousel
    );

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
    if (e.key === 'Escape') {
      onSelectElement?.(null);
      e.preventDefault();
      return;
    }

    if (!selectedElementId || !onUpdateLayoutOverride || !currentSlide) return;
    const step = e.shiftKey ? 10 : 2;
    let nextDx = currentDx;
    let nextDy = currentDy;
    let handled = false;

    if (e.key === 'ArrowLeft') {
      nextDx = currentDx - step;
      handled = true;
    } else if (e.key === 'ArrowRight') {
      nextDx = currentDx + step;
      handled = true;
    } else if (e.key === 'ArrowUp') {
      nextDy = currentDy - step;
      handled = true;
    } else if (e.key === 'ArrowDown') {
      nextDy = currentDy + step;
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      const clamped = clampElementDrag(selectedElementId, nextDx, nextDy, currentSlide, carousel);
      onUpdateLayoutOverride(selectedElementId, {
        ...(currentOverride || {}),
        dx: clamped.dx,
        dy: clamped.dy,
      });
    }
  };

  // Check if HUD pill should render inside box or above
  const isPillInside = activeBounds && (activeBounds.y < 140 || selectedElementId === 'headerBadge');

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl w-auto max-h-[min(480px,calc(100vh-255px))] aspect-[9/16] shrink-0 outline-none focus:ring-1 focus:ring-cyan-500/40 select-none group"
    >
      <canvas
        ref={activeCanvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        className={`w-full h-full object-contain ${hoveredElementId ? 'cursor-pointer' : 'cursor-crosshair'}`}
        title={hoveredElementId ? `Click to select ${boundsMap[hoveredElementId]?.label}` : 'Click any element to select & edit'}
      />

      {/* Subtle Hover Outline preview when hovering over selectable element */}
      {hoveredBounds && !isDragging && (
        <div
          className="absolute pointer-events-none rounded-lg border border-dashed border-white/40 bg-white/[0.03] transition-all duration-75"
          style={{
            top: hoveredBounds.topPct,
            left: hoveredBounds.leftPct,
            width: hoveredBounds.widthPct,
            height: hoveredBounds.heightPct,
          }}
        >
          <div className="absolute top-1 left-2 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider bg-black/75 text-white/80 border border-white/20 whitespace-nowrap">
            {hoveredBounds.label}
          </div>
        </div>
      )}

      {/* Selected Element Bounding Box (Direct Graphical Selection & Drag Feedback) */}
      {activeBounds && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute transition-shadow duration-150 ${
            isDragging
              ? 'cursor-grabbing border-2 border-solid shadow-[0_0_24px_rgba(0,0,0,0.8)]'
              : 'cursor-grab border-2 border-solid shadow-[0_0_16px_rgba(0,0,0,0.5)]'
          } rounded-lg`}
          style={{
            top: activeBounds.topPct,
            left: activeBounds.leftPct,
            width: activeBounds.widthPct,
            height: activeBounds.heightPct,
            borderColor: theme.accent,
            backgroundColor: isDragging ? `${theme.accent}28` : `${theme.accent}12`,
            transform: currentOverride?.scale && currentOverride.scale !== 1 ? `scale(${currentOverride.scale})` : undefined,
            transformOrigin: 'center center',
            touchAction: 'none',
          }}
          title="Drag to reposition on canvas (or use keyboard arrow keys, Esc to deselect)"
        >
          {/* Smart Floating Element HUD Badge */}
          <div
            className={`absolute flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider text-black font-bold shadow-xl whitespace-nowrap z-20 ${
              isPillInside ? 'top-1.5 left-2' : '-top-7 left-1/2 -translate-x-1/2'
            }`}
            style={{ backgroundColor: theme.accent }}
          >
            <Move className="w-2.5 h-2.5 stroke-[3]" />
            <span>{activeBounds.label}</span>
            {(currentDx !== 0 || currentDy !== 0) && (
              <span className="bg-black/25 text-black px-1 rounded text-[8px] font-bold">
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement?.(null);
              }}
              className="hover:opacity-70 p-0.5 cursor-pointer ml-0.5"
              title="Deselect element (Esc)"
            >
              <X className="w-2.5 h-2.5 stroke-[3]" />
            </button>
          </div>

          {/* Corner Precision Handles */}
          <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 rounded-sm border border-black shadow" style={{ backgroundColor: theme.accent }} />
          <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-sm border border-black shadow" style={{ backgroundColor: theme.accent }} />
          <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 rounded-sm border border-black shadow" style={{ backgroundColor: theme.accent }} />
          <div className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 rounded-sm border border-black shadow" style={{ backgroundColor: theme.accent }} />
        </div>
      )}

      {/* Top Floating Keyboard Shortcut Hint (Non-obtrusive, leaves slide body text 100% visible) */}
      {selectedElementId && (
        <div className="hidden sm:flex absolute top-2 right-2 bg-black/85 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-0.5 text-[8px] font-mono text-slate-300 shadow-xl items-center gap-1.5 pointer-events-none whitespace-nowrap z-20">
          <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: theme.accent }} />
          <span>Arrows: nudge</span>
          <span className="text-slate-500">•</span>
          <span>Shift=10px</span>
          <span className="text-slate-500">•</span>
          <span>Esc: deselect</span>
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

      {/* TikTok Feed Safe Zone Simulator Overlay */}
      {overlayMode === 'safe' && (
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

      {overlayMode === 'tiktok' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between font-sans select-none overflow-hidden">
          {/* Top TikTok Navigation Bar */}
          <div className="pt-3 px-3 flex items-center justify-between text-white/90 drop-shadow-md z-10">
            <span className="text-[11px] font-semibold text-white/50">LIVE</span>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-white/60">Following</span>
              <span className="text-white border-b-2 border-white pb-0.5">For You</span>
            </div>
            <Search className="w-4 h-4 text-white" />
          </div>

          {/* Center Bounding Area */}
          <div className="flex-1 mx-2 border border-dashed border-white/20 rounded-lg flex items-center justify-end p-1">
            {/* Right-Side TikTok Action Column */}
            <div className="flex flex-col items-center gap-2.5 text-white pr-1 pb-1 z-10">
              <div className="relative mb-1">
                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-white overflow-hidden flex items-center justify-center">
                  <span className="font-bold text-[10px] text-cyan-300">
                    {(carousel.brand || 'M')[0].toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  +
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xs">
                  <Heart className="w-4 h-4 fill-white text-white" />
                </div>
                <span className="text-[9px] font-bold text-white shadow-sm mt-0.5">38.4K</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xs">
                  <MessageCircle className="w-4 h-4 fill-white text-white" />
                </div>
                <span className="text-[9px] font-bold text-white shadow-sm mt-0.5">482</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xs">
                  <Bookmark className="w-4 h-4 fill-white text-white" />
                </div>
                <span className="text-[9px] font-bold text-white shadow-sm mt-0.5">1.9K</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xs">
                  <Share2 className="w-4 h-4 fill-white text-white" />
                </div>
                <span className="text-[9px] font-bold text-white shadow-sm mt-0.5">924</span>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center mt-0.5 animate-spin" style={{ animationDuration: '6s' }}>
                <Music2 className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>

          {/* Bottom TikTok Caption & Marquee Bar */}
          <div className="p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white space-y-1 z-10">
            <div className="font-bold text-xs tracking-tight">
              @{creatorHandle}
            </div>
            <p className="text-[11px] text-white/90 line-clamp-2 leading-snug font-sans">
              {carousel.slides[currentSlideIndex]?.enTitle || carousel.caption?.slice(0, 60) || 'MARROK engineering breakthrough...'}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-white/75 font-mono">
              <Music2 className="w-3 h-3 text-white" />
              <span>original sound - @{creatorHandle}</span>
            </div>
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
