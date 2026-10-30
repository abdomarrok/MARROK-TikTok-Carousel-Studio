import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Move, RotateCcw, X, Heart, MessageCircle, Bookmark, Share2, Music2, Search, Send, MoreHorizontal } from 'lucide-react';
import { CarouselData, GraphicalElementId, ElementLayoutOverride, ThemePalette } from '../../types.ts';
import { renderSlideToCanvas, getCanvasDimensionSpec } from '../../lib/canvasExporter.ts';
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

  const spec = getCanvasDimensionSpec(carousel.dimensionPreset);
  const prevIndexRef = useRef(currentSlideIndex);
  const prevArchetypeRef = useRef(carousel.slides[currentSlideIndex]?.type);
  const prevPresetRef = useRef(spec.id);
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
    const isPresetChange = prevPresetRef.current !== spec.id;
    prevIndexRef.current = currentSlideIndex;
    prevArchetypeRef.current = currentSlide.type;
    prevPresetRef.current = spec.id;

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

    if (isIndexChange || isArchetypeChange || isPresetChange) {
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
  }, [carousel, currentSlideIndex, theme, activeCanvasRef, spec.id]);

  // Accurate hit-testing on Canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeCanvasRef.current || !onSelectElement) return;
    const rect = activeCanvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const canvasX = ((e.clientX - rect.left) / rect.width) * spec.width;
    const canvasY = ((e.clientY - rect.top) / rect.height) * spec.height;

    const hitId = findSlideElementAtPoint(canvasX, canvasY, boundsMap, currentSlide?.layoutOverrides);
    onSelectElement(hitId);
  };

  // Hover detection for interactive feedback
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging || !activeCanvasRef.current) return;
    const rect = activeCanvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const canvasX = ((e.clientX - rect.left) / rect.width) * spec.width;
    const canvasY = ((e.clientY - rect.top) / rect.height) * spec.height;

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

    const scaleX = spec.width / rect.width;
    const scaleY = spec.height / rect.height;

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
  const topSafePct = `${((spec.headerY / spec.height) * 100).toFixed(1)}%`;
  const bottomSafePct = `${(((spec.height - spec.safeFooterCeilingY) / spec.height) * 100).toFixed(1)}%`;

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid="viewport-stage-container"
      data-dimension-preset={spec.id}
      style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
      className="relative rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl w-auto max-w-[min(380px,92vw)] max-h-[min(450px,calc(100dvh-280px))] sm:max-h-[min(490px,calc(100vh-250px))] shrink-0 outline-none focus:ring-1 focus:ring-cyan-500/40 select-none group transition-all duration-200"
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

      {/* Top Floating Keyboard Shortcut Hint */}
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

      {/* Mobile Precision Nudge Bar */}
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

      {/* Platform Safe Zone Simulator Overlay */}
      {overlayMode === 'safe' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between font-mono text-[9px] select-none">
          {/* Top Safe Zone */}
          <div
            style={{ height: topSafePct, minHeight: '22px' }}
            className="bg-rose-500/20 border-b border-rose-500/40 flex items-center justify-between px-2.5 text-rose-200 whitespace-nowrap"
          >
            <span>TOP {spec.headerY}px SAFE</span>
            <span>{spec.shortLabel} ({spec.width}×{spec.height})</span>
          </div>

          {/* Center Content Bounding Box */}
          <div className="flex-1 mx-3 border-2 border-dashed border-rose-400/40 rounded-lg flex items-center justify-between p-2 relative">
            <span className="text-rose-400/70 rotate-90 origin-left text-[8px] tracking-wider">
              {spec.safeMarginLeft}px..{spec.safeMarginRight}px SAFE
            </span>

            {/* 3:4 Profile Grid Crop Indicator on IG 4:5 (anchored at bottom to avoid MARROK header overlap) */}
            {spec.id === 'ig-4:5' && (
              <div className="absolute inset-y-0 left-[3.5%] right-[3.5%] border-x border-dotted border-amber-400/40 flex items-end justify-center pb-1.5">
                <span className="text-[7px] text-amber-300/90 bg-black/75 border border-amber-400/30 px-1.5 py-0.5 rounded">
                  IG 3:4 Grid Crop Safe
                </span>
              </div>
            )}

            {/* Right-side Interaction Rail Indicator (for 9:16 TikTok / IG Reels) */}
            {spec.aspectRatioLabel === '9:16' && (
              <div className="h-full flex flex-col justify-end items-center gap-1.5 text-rose-300/80 pr-0.5 pb-1 text-[9px]">
                <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">♥</div>
                <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">💬</div>
                <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">★</div>
                <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">↗</div>
              </div>
            )}
          </div>

          {/* Bottom Safe Zone */}
          <div
            style={{ height: bottomSafePct }}
            className="bg-rose-500/20 border-t border-rose-500/40 flex flex-col justify-center px-2.5 text-rose-200 space-y-0.5"
          >
            <div className="flex justify-between">
              <span>CEILING y≤{spec.safeFooterCeilingY}px</span>
              <span>@{creatorHandle}</span>
            </div>
            <span className="text-[8px] text-rose-400/80 truncate">
              {spec.platform === 'tiktok'
                ? 'TikTok Photo Mode Dots, Caption & Sound Drawer'
                : spec.id === 'ig-9:16'
                ? 'Instagram Reels Caption & Audio Bar'
                : 'Instagram Carousel Pagination & Action Bar'}
            </span>
          </div>
        </div>
      )}

      {/* Realistic Social Platform UI Overlay (TikTok Photo Mode OR Instagram Feed / Reels) */}
      {overlayMode === 'tiktok' && spec.platform === 'tiktok' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between font-sans select-none overflow-hidden">
          {/* Top TikTok Navigation Bar + Photo Mode Counter Pill */}
          <div className="pt-2 px-3 space-y-1 z-10 bg-gradient-to-b from-black/55 to-transparent pb-1">
            <div className="flex items-center justify-between text-white/90 drop-shadow-md">
              <span className="text-[10px] font-semibold text-white/60">LIVE</span>
              <div className="flex items-center gap-2.5 text-[11px] font-bold">
                <span className="text-white/50">Community</span>
                <span className="text-white/60">Following</span>
                <span className="text-white border-b-2 border-white pb-0.5">For You</span>
              </div>
              <Search className="w-3.5 h-3.5 text-white" />
            </div>
            {carousel.slides.length > 1 && (
              <div className="flex justify-end">
                <span className="px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-xs text-[9px] font-mono font-bold text-white/90 border border-white/15">
                  {currentSlideIndex + 1} / {carousel.slides.length}
                </span>
              </div>
            )}
          </div>

          {/* Center Bounding Area: Lower-Right TikTok Engagement Column */}
          <div className="flex-1 mx-1.5 flex items-end justify-end p-1">
            <div className="flex flex-col items-center gap-1.5 text-white pr-0.5 pb-0.5 z-10">
              <div className="relative mb-0.5">
                <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-rose-500 overflow-hidden flex items-center justify-center shadow">
                  <span className="font-bold text-[9px] text-cyan-300">
                    {(carousel.brand || 'M')[0].toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                  +
                </div>
              </div>
              <div className="flex flex-col items-center">
                <Heart className="w-4 h-4 fill-white text-white drop-shadow" />
                <span className="text-[8px] font-bold text-white drop-shadow">38.4K</span>
              </div>
              <div className="flex flex-col items-center">
                <MessageCircle className="w-4 h-4 fill-white text-white drop-shadow" />
                <span className="text-[8px] font-bold text-white drop-shadow">482</span>
              </div>
              <div className="flex flex-col items-center">
                <Bookmark className="w-4 h-4 fill-white text-white drop-shadow" />
                <span className="text-[8px] font-bold text-white drop-shadow">1.9K</span>
              </div>
              <div className="flex flex-col items-center">
                <Share2 className="w-4 h-4 fill-white text-white drop-shadow" />
                <span className="text-[8px] font-bold text-white drop-shadow">924</span>
              </div>
            </div>
          </div>

          {/* Bottom TikTok Photo Mode Dots + Caption & Sound Drawer */}
          <div className="px-3 pb-2.5 pt-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent text-white space-y-1 z-10">
            {carousel.slides.length > 1 && (
              <div className="flex items-center justify-center gap-1 pb-0.5">
                {carousel.slides.map((_, dotIdx) => (
                  <span
                    key={dotIdx}
                    className={`w-1.5 h-1.5 rounded-full ${
                      dotIdx === currentSlideIndex ? 'bg-white' : 'bg-white/35'
                    }`}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[11px] tracking-tight">@{creatorHandle}</span>
              <span className="px-1.5 py-0.2 rounded bg-white/15 text-[8px] font-semibold text-white/90">Photo</span>
            </div>
            <p className="text-[9.5px] text-white/90 line-clamp-2 leading-snug font-sans pr-8">
              {carousel.slides[currentSlideIndex]?.enTitle || carousel.caption?.slice(0, 60) || 'MARROK engineering breakdown...'}
            </p>
            <div className="flex items-center justify-between text-[8.5px] text-white/75 font-mono pt-0.5">
              <div className="flex items-center gap-1 truncate">
                <Music2 className="w-2.5 h-2.5 text-white shrink-0" />
                <span className="truncate">original sound - @{creatorHandle}</span>
              </div>
              <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center shrink-0 animate-spin" style={{ animationDuration: '6s' }}>
                <Music2 className="w-2.5 h-2.5 text-cyan-300" />
              </div>
            </div>
          </div>
        </div>
      )}

      {overlayMode === 'tiktok' && spec.platform === 'instagram' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between font-sans select-none overflow-hidden">
          {/* Top Instagram Feed / Reels Header */}
          <div className="pt-2.5 px-3 flex items-center justify-between text-white drop-shadow-md z-10 bg-gradient-to-b from-black/70 to-transparent pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 p-0.5">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-[9px] font-bold text-white">
                  {(carousel.brand || 'M')[0].toUpperCase()}
                </div>
              </div>
              <div className="leading-tight">
                <div className="text-[10px] font-bold text-white">{creatorHandle}</div>
                <div className="text-[8px] text-white/70">{spec.shortLabel} · Original Audio</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {carousel.slides.length > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-black/70 border border-white/15 text-[9px] font-mono font-bold text-white">
                  {currentSlideIndex + 1}/{carousel.slides.length}
                </span>
              )}
              <MoreHorizontal className="w-4 h-4 text-white/80" />
            </div>
          </div>

          {/* Bottom Instagram Action Bar (Feed Post vs Reels) */}
          <div className="px-3 py-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white space-y-1 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-white" />
                <MessageCircle className="w-4 h-4 text-white" />
                <Send className="w-4 h-4 text-white" />
              </div>
              <Bookmark className="w-4 h-4 text-white" />
            </div>
            <div className="text-[9px] text-white/85 truncate">
              <span className="font-bold mr-1">{creatorHandle}</span>
              <span>{carousel.slides[currentSlideIndex]?.enTitle || carousel.category}</span>
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

