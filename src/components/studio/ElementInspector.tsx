import React from 'react';
import {
  SlidersHorizontal,
  Move,
  RotateCcw,
  Maximize2,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Type,
  Square,
  Sparkles,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { GraphicalElementId, ElementLayoutOverride, SlideData, ThemePalette } from '../../types.ts';
import { clampElementDrag } from '../../lib/canvas/layoutAwareness.ts';

interface ElementInspectorProps {
  slide: SlideData;
  theme: ThemePalette;
  isOpen: boolean;
  onToggleOpen: () => void;
  selectedElementId: GraphicalElementId | null;
  onSelectElement: (id: GraphicalElementId | null) => void;
  onUpdateOverride: (id: GraphicalElementId, override: ElementLayoutOverride | null) => void;
  onResetOverrides: () => void;
  onApplyToAllSlides?: (id: GraphicalElementId, override: ElementLayoutOverride | null) => void;
}

const ELEMENT_DEFINITIONS: {
  id: GraphicalElementId;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  desc: string;
}[] = [
  { id: 'graphicCard', label: 'Visual Archetype Card', icon: Square, desc: 'Central diagram, code block, or metric visualization' },
  { id: 'titleBlock', label: 'English Headline', icon: Type, desc: 'Primary Plus Jakarta Sans headline' },
  { id: 'arabicTitleBlock', label: 'Arabic Headline', icon: Type, desc: 'Cairo bold headline with accent color' },
  { id: 'bodyBlock', label: 'English Body Copy', icon: Type, desc: 'Detailed explanation text' },
  { id: 'arabicBodyBlock', label: 'Arabic Body Copy', icon: Type, desc: 'RTL Arabic explanatory copy' },
  { id: 'headerBadge', label: 'Top MARROK Badge', icon: Sparkles, desc: 'Header branding wordmark & category pill' },
  { id: 'ctaButton', label: 'CTA Pill Button', icon: Square, desc: 'Final action button (CTA slide only)' },
  { id: 'attributionCard', label: 'Attribution Card', icon: Square, desc: 'Brand attribution link (CTA slide only)' },
];

export const ElementInspector: React.FC<ElementInspectorProps> = ({
  slide,
  theme,
  isOpen,
  onToggleOpen,
  selectedElementId,
  onSelectElement,
  onUpdateOverride,
  onResetOverrides,
  onApplyToAllSlides,
}) => {
  const activeElements = ELEMENT_DEFINITIONS.filter((elem) => {
    if ((elem.id === 'ctaButton' || elem.id === 'attributionCard') && slide.type !== 'cta') return false;
    return true;
  });

  const activeElementId = selectedElementId || activeElements[0]?.id || 'graphicCard';
  const currentOverrides = slide.layoutOverrides || {};
  const currentOverride = currentOverrides[activeElementId] || { dx: 0, dy: 0, scale: 1 };

  const dx = currentOverride.dx ?? 0;
  const dy = currentOverride.dy ?? 0;
  const scale = currentOverride.scale ?? 1;

  const handleUpdate = (updates: Partial<ElementLayoutOverride>) => {
    const desiredDx = updates.dx !== undefined ? updates.dx : dx;
    const desiredDy = updates.dy !== undefined ? updates.dy : dy;

    // Apply Layout Awareness anti-collision clamping
    const clamped = clampElementDrag(activeElementId, desiredDx, desiredDy, slide);

    const nextOverride: ElementLayoutOverride = {
      dx: clamped.dx,
      dy: clamped.dy,
      scale: updates.scale !== undefined ? updates.scale : scale,
    };
    onUpdateOverride(activeElementId, nextOverride);
  };

  const handleResetCurrentElement = () => {
    onUpdateOverride(activeElementId, null);
  };

  const hasAnyOverrides = Object.keys(currentOverrides).length > 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-md shadow-xl overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none border-b border-white/5 hover:bg-white/[0.02]"
        onClick={onToggleOpen}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
            style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Direct Graphical Control</span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>Anti-Overlay</span>
              </span>
              {hasAnyOverrides && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
                  style={{ backgroundColor: `${theme.accent}30`, color: theme.accent }}
                >
                  {Object.keys(currentOverrides).length} Modified
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Precise 1080×1920 layout offsets & scaling
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasAnyOverrides && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onResetOverrides();
              }}
              className="px-2 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1"
              title="Reset all layout offsets to clean golden-ratio defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Slide</span>
            </button>
          )}
          <button
            type="button"
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Inspector Content */}
      {isOpen && (
        <div className="p-4 space-y-4 animate-fade-in text-xs">
          {/* Layer Selector */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-slate-500" />
              <span>Select Slide Graphical Block</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {activeElements.map((elem) => {
                const Icon = elem.icon;
                const isSelected = activeElementId === elem.id;
                const isModified = Boolean(currentOverrides[elem.id]);

                return (
                  <button
                    key={elem.id}
                    type="button"
                    onClick={() => onSelectElement(elem.id)}
                    className={`px-2.5 py-2 rounded-xl text-left border flex items-center justify-between gap-1.5 transition-all ${
                      isSelected
                        ? 'border-white/40 bg-white/10 text-white shadow-sm'
                        : 'border-white/5 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: isSelected ? theme.accent : undefined }}
                      />
                      <span className="truncate font-medium text-[11px]">{elem.label}</span>
                    </div>
                    {isModified && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: theme.accent }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Element Fine Controls */}
          <div className="p-3.5 rounded-xl border border-white/10 bg-black/40 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div>
                <span className="font-bold text-white text-[12px]">
                  {ELEMENT_DEFINITIONS.find((e) => e.id === activeElementId)?.label}
                </span>
                <p className="text-[10px] text-slate-400">
                  {ELEMENT_DEFINITIONS.find((e) => e.id === activeElementId)?.desc}
                </p>
              </div>
              {(dx !== 0 || dy !== 0 || scale !== 1) && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {onApplyToAllSlides && (
                    <button
                      type="button"
                      onClick={() => onApplyToAllSlides(activeElementId, currentOverride)}
                      className="text-[10px] text-cyan-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                      title="Apply this exact layout offset to all slides in the deck"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>Apply to All Slides</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetCurrentElement}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                    title="Reset element translation on this slide"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                </div>
              )}
            </div>

            {/* Horizontal Position (dX) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Move className="w-3 h-3 text-slate-500" />
                  <span>Horizontal Offset (dX)</span>
                </span>
                <span className="font-mono text-slate-200">{dx > 0 ? `+${dx}` : dx}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdate({ dx: dx - 10 })}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 font-mono text-[10px]"
                >
                  -10
                </button>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  step="2"
                  value={dx}
                  onChange={(e) => handleUpdate({ dx: Number(e.target.value) })}
                  className="flex-1 accent-indigo-500 h-1.5 rounded-lg bg-slate-800 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdate({ dx: dx + 10 })}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 font-mono text-[10px]"
                >
                  +10
                </button>
              </div>
            </div>

            {/* Vertical Position (dY) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Move className="w-3 h-3 text-slate-500 rotate-90" />
                  <span>Vertical Offset (dY)</span>
                </span>
                <span className="font-mono text-slate-200">{dy > 0 ? `+${dy}` : dy}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdate({ dy: dy - 10 })}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 font-mono text-[10px]"
                >
                  -10
                </button>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  step="2"
                  value={dy}
                  onChange={(e) => handleUpdate({ dy: Number(e.target.value) })}
                  className="flex-1 accent-indigo-500 h-1.5 rounded-lg bg-slate-800 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdate({ dy: dy + 10 })}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 font-mono text-[10px]"
                >
                  +10
                </button>
              </div>
            </div>

            {/* Scale multiplier */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-slate-500" />
                  <span>Element Scale</span>
                </span>
                <span className="font-mono text-slate-200">{scale.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdate({ scale: Math.max(0.5, Number((scale - 0.05).toFixed(2))) })}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 font-mono text-[10px]"
                >
                  -0.05
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.02"
                  value={scale}
                  onChange={(e) => handleUpdate({ scale: Number(e.target.value) })}
                  className="flex-1 accent-indigo-500 h-1.5 rounded-lg bg-slate-800 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdate({ scale: Math.min(1.5, Number((scale + 0.05).toFixed(2))) })}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 font-mono text-[10px]"
                >
                  +0.05
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>Interactive Viewport Hint: You can also click directly on slide elements in the viewport to select them.</span>
          </div>
        </div>
      )}
    </div>
  );
};
