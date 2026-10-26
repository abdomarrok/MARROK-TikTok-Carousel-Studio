import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselData, GraphicalElementId, ThemePalette } from '../../types.ts';
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
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCanvasRef = externalCanvasRef || internalCanvasRef;

  const prevIndexRef = useRef(currentSlideIndex);
  const prevArchetypeRef = useRef(carousel.slides[currentSlideIndex]?.type);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderSequenceRef = useRef(0);

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

  const activeBounds = selectedElementId ? ELEMENT_BOUNDS[selectedElementId] : null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl w-auto max-h-[min(540px,calc(100vh-250px))] aspect-[9/16] shrink-0">
      <canvas
        ref={activeCanvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full object-contain cursor-crosshair"
      />

      {/* Selected Element Bounding Box (Direct Graphical Selection Feedback) */}
      {activeBounds && (
        <div
          className="absolute pointer-events-none transition-all duration-150 border-2 border-dashed rounded-lg animate-pulse"
          style={{
            top: activeBounds.top,
            left: activeBounds.left,
            width: activeBounds.width,
            height: activeBounds.height,
            borderColor: theme.accent,
            backgroundColor: `${theme.accent}12`,
          }}
        >
          <div
            className="absolute -top-3 left-2 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider text-black font-bold shadow-sm"
            style={{ backgroundColor: theme.accent }}
          >
            {activeBounds.label}
          </div>
          {/* Corner Resizing Pips */}
          <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full border border-black" style={{ backgroundColor: theme.accent }} />
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-black" style={{ backgroundColor: theme.accent }} />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full border border-black" style={{ backgroundColor: theme.accent }} />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-black" style={{ backgroundColor: theme.accent }} />
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
