import React from 'react';
import { Plus, Copy, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { CarouselData, HookVariant } from '../../types.ts';

interface SlideNavigatorProps {
  carousel: CarouselData;
  currentSlideIndex: number;
  showSafeZones: boolean;
  onToggleSafeZones: () => void;
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
  onToggleSafeZones,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
  onApplyHookVariant,
}) => {
  return (
    <div className="w-full max-w-[360px] space-y-2">
      {/* Slide Count & Safe Zones Toggle */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
        <span>
          Slide <span className="text-white font-bold">{currentSlideIndex + 1}</span> of {carousel.slides.length}
        </span>
        <button
          type="button"
          onClick={onToggleSafeZones}
          className={`text-[10px] font-sans px-2 py-0.5 rounded cursor-pointer transition-colors ${
            showSafeZones ? 'bg-rose-500/20 text-rose-300' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Safe Zones
        </button>
      </div>

      {/* Thumbnail Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5">
        {carousel.slides.map((slide, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSlide(idx)}
            className={`h-7 px-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              idx === currentSlideIndex
                ? 'bg-white/25 text-white border border-white/40 shadow-sm'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <span>#{idx + 1}</span>
            <span className="text-[9px] uppercase font-sans text-slate-500">
              {slide.type}
            </span>
          </button>
        ))}
      </div>

      {/* Sleek Slide Management Strip */}
      <div className="flex items-center justify-between p-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onAddSlide}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer"
            title="Add new slide after this one"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>Add</span>
          </button>
          <button
            type="button"
            onClick={onDuplicateSlide}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer"
            title="Duplicate this slide"
          >
            <Copy className="w-3 h-3 text-cyan-400" />
            <span>Clone</span>
          </button>
          <button
            type="button"
            onClick={onDeleteSlide}
            disabled={carousel.slides.length <= 3}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[11px] font-semibold text-slate-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-30"
            title="Delete slide (minimum 3 slides)"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Reorder Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveSlide('left')}
            disabled={currentSlideIndex === 0}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
            title="Move slide earlier in deck"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onMoveSlide('right')}
            disabled={currentSlideIndex === carousel.slides.length - 1}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
            title="Move slide later in deck"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Slide 1 Hook Variants Selector */}
      {currentSlideIndex === 0 && carousel.hookVariants && carousel.hookVariants.length > 0 && onApplyHookVariant && (
        <div className="p-2 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            Slide 1 Hook Variants
          </span>
          <div className="grid grid-cols-2 gap-1">
            {carousel.hookVariants.map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onApplyHookVariant(v)}
                className="px-2 py-1 rounded-lg text-[10px] text-left bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-300 hover:text-white transition-all cursor-pointer truncate"
                title={v.enTitle}
              >
                <span className="font-bold text-teal-400 mr-1">[{v.tag}]</span>
                <span>{v.enTitle}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
