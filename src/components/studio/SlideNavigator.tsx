import React from 'react';
import { Plus, Copy, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { CarouselData, HookVariant } from '../../types.ts';
import { StageOverlayMode } from './ViewportCanvas.tsx';

interface SlideNavigatorProps {
  carousel: CarouselData;
  currentSlideIndex: number;
  showSafeZones?: boolean;
  stageOverlayMode?: StageOverlayMode;
  onSetStageOverlayMode?: (mode: StageOverlayMode) => void;
  onToggleSafeZones?: () => void;
  onSelectSlide: (index: number) => void;
  onAddSlide: () => void;
  onDuplicateSlide: () => void;
  onDeleteSlide: () => void;
  onMoveSlide: (direction: 'left' | 'right') => void;
  onApplyHookVariant?: (variant: HookVariant) => void;
}

export const SlideNavigator: React.FC<SlideNavigatorProps> = ({
  carousel,
  currentSlideIndex,
  showSafeZones,
  stageOverlayMode,
  onSetStageOverlayMode,
  onToggleSafeZones,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
}) => {
  const isSinglePost = carousel.postFormat === 'single' || carousel.slides.length === 1;
  const activeSlide = carousel.slides[currentSlideIndex] || carousel.slides[0];
  const overlayMode: StageOverlayMode = stageOverlayMode || (showSafeZones ? 'safe' : 'clean');

  const handleSelectMode = (mode: StageOverlayMode) => {
    if (onSetStageOverlayMode) {
      onSetStageOverlayMode(mode);
    } else if (onToggleSafeZones) {
      onToggleSafeZones();
    }
  };

  const renderStageToggle = () => (
    <div className="flex items-center gap-0.5 bg-black/70 border border-white/10 rounded-lg p-0.5 text-[10px] font-sans">
      <button
        type="button"
        onClick={() => handleSelectMode('clean')}
        className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
          overlayMode === 'clean' ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-white'
        }`}
        title="Clean preview without overlay"
      >
        Clean
      </button>
      <button
        type="button"
        onClick={() => handleSelectMode('safe')}
        className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
          overlayMode === 'safe'
            ? 'bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Highlight TikTok safe zone margins"
      >
        Safe zones
      </button>
      <button
        type="button"
        onClick={() => handleSelectMode('tiktok')}
        className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
          overlayMode === 'tiktok'
            ? 'bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/40'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Simulate realistic TikTok feed icons and chrome"
      >
        TikTok UI
      </button>
    </div>
  );

  if (isSinglePost) {
    return (
      <div className="w-full max-w-[360px] flex items-center justify-between gap-2 px-1 py-1 text-xs text-slate-300">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-white font-bold">Single Slide</span>
          <span className="text-slate-500">·</span>
          <span className="uppercase text-emerald-300 font-sans font-semibold">
            {activeSlide?.type || 'poster'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">{renderStageToggle()}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[360px] space-y-1.5">
      {/* Top Bar: Slide Count, Management Actions & Stage Mode Switcher */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
        <div className="flex items-center gap-2 font-mono tabular-nums">
          <span className="text-[11px]">
            Slide <span className="text-white font-bold">{currentSlideIndex + 1}</span>/{carousel.slides.length}
          </span>
          <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={onAddSlide}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              title="Add new slide after this one"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={onDuplicateSlide}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              title="Duplicate this slide"
            >
              <Copy className="w-3 h-3 text-cyan-400" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={onDeleteSlide}
              disabled={carousel.slides.length <= 3}
              className="p-1 rounded text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-30"
              title="Delete slide (minimum 3 slides)"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <span className="w-px h-3 bg-white/10 mx-0.5" />
            <button
              type="button"
              onClick={() => onMoveSlide('left')}
              disabled={currentSlideIndex === 0}
              className="p-1 rounded text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20 cursor-pointer"
              title="Move slide earlier in deck"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onMoveSlide('right')}
              disabled={currentSlideIndex === carousel.slides.length - 1}
              className="p-1 rounded text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20 cursor-pointer"
              title="Move slide later in deck"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">{renderStageToggle()}</div>
      </div>

      {/* Storyboard Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5">
        {carousel.slides.map((slide, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSlide(idx)}
            className={`h-7 px-2.5 rounded-lg text-xs font-mono tabular-nums font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              idx === currentSlideIndex
                ? 'bg-emerald-500/20 text-white border border-emerald-400/50 shadow-sm'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/5 hover:border-white/15'
            }`}
            title={slide.enTitle || `Slide ${idx + 1}`}
          >
            <span>#{idx + 1}</span>
            <span className={`text-[9px] uppercase font-sans ${idx === currentSlideIndex ? 'text-emerald-300' : 'text-slate-500'}`}>
              {slide.type}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
