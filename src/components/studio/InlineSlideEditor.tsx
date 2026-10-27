import React from 'react';
import { Sliders, CheckCircle2, Sparkles, Wand2 } from 'lucide-react';
import { SlideData, ThemePalette, GraphicalElementId, HookVariant } from '../../types.ts';
import { CHAR_LIMITS } from '../../lib/qaChecks.ts';

interface InlineSlideEditorProps {
  currentSlide: SlideData;
  currentSlideIndex: number;
  theme: ThemePalette;
  isAdvancedCustomizerOpen: boolean;
  onToggleAdvancedCustomizer: () => void;
  onUpdateField: (field: keyof SlideData, value: any) => void;
  selectedElementId?: GraphicalElementId | null;
  onSelectElement?: (id: GraphicalElementId) => void;
  hookVariants?: HookVariant[];
  onApplyHookVariant?: (variant: HookVariant) => void;
  onAutoFitSlide?: () => void;
  onOpenPolishDrawer?: () => void;
}

export const InlineSlideEditor: React.FC<InlineSlideEditorProps> = ({
  currentSlide,
  currentSlideIndex,
  theme,
  onToggleAdvancedCustomizer,
  onUpdateField,
  selectedElementId,
  onSelectElement,
  hookVariants,
  onApplyHookVariant,
  onAutoFitSlide,
  onOpenPolishDrawer,
}) => {
  const isCtaSlide = currentSlide.type === 'cta';

  const enTitleLen = (currentSlide.enTitle || '').trim().length;
  const arTitleLen = (currentSlide.arTitle || '').trim().length;
  const enBodyLen = (currentSlide.enBody || '').trim().length;
  const arBodyLen = (currentSlide.arBody || '').trim().length;

  return (
    <div className="space-y-4">
      {/* Top Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono font-bold text-white">
            Slide {currentSlideIndex + 1}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="uppercase font-mono text-slate-400">
            {currentSlide.type}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onAutoFitSlide && (
            <button
              type="button"
              onClick={onAutoFitSlide}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              title="Automatically trim copy and fix punctuation to fit Spec §8 limits"
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Auto-Fit Limits</span>
            </button>
          )}

          {onOpenPolishDrawer && (
            <button
              type="button"
              onClick={onOpenPolishDrawer}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              title="Open AI Rewrite & Slide QA Tools"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: theme.accent }} />
              <span>AI Rewrite</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleAdvancedCustomizer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
            title="Switch to Visual Layout & Archetype Controls"
          >
            <Sliders className="w-3.5 h-3.5" style={{ color: theme.accent }} />
            <span>Customize Layout →</span>
          </button>
        </div>
      </div>

      {/* Slide 1 Hook Variants Bar */}
      {currentSlideIndex === 0 && hookVariants && hookVariants.length > 0 && onApplyHookVariant && (
        <div className="pb-3 border-b border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Slide 1 Viral Hook Presets</span>
            <span>Click to apply</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {hookVariants.map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onApplyHookVariant(v)}
                className="px-2.5 py-1.5 rounded-lg text-left bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer group"
                title={v.enTitle}
              >
                <div className="text-[10px] font-mono font-bold uppercase truncate" style={{ color: theme.accent }}>
                  {v.tag}
                </div>
                <div className="text-[11px] text-slate-300 group-hover:text-white truncate">
                  {v.enTitle}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* English & Arabic Titles */}
      <div className="grid grid-cols-1 gap-3.5">
        <div
          className={`space-y-1.5 rounded-xl transition-colors ${
            selectedElementId === 'titleBlock' ? 'ring-1 ring-cyan-400/50 bg-cyan-950/10 p-2.5 -mx-2.5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span>{isCtaSlide ? 'Call-to-Action Question (English)' : 'English Headline'}</span>
              {selectedElementId === 'titleBlock' && (
                <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Selected on Canvas</span>
                </span>
              )}
            </label>
            <span
              className={`text-[11px] font-mono tabular-nums ${
                enTitleLen > CHAR_LIMITS.enTitle ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              {enTitleLen} / {CHAR_LIMITS.enTitle}
            </span>
          </div>
          <input
            type="text"
            value={currentSlide.enTitle || ''}
            onFocus={() => onSelectElement?.('titleBlock')}
            onClick={() => onSelectElement?.('titleBlock')}
            onChange={(e) => onUpdateField('enTitle', e.target.value)}
            placeholder={isCtaSlide ? 'Scaling Vector Databases?' : 'Crisp architecture headline ending in . or ?'}
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none transition-colors"
          />
        </div>

        <div
          className={`space-y-1.5 rounded-xl transition-colors ${
            selectedElementId === 'arabicTitleBlock' ? 'ring-1 ring-cyan-400/50 bg-cyan-950/10 p-2.5 -mx-2.5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-mono tabular-nums ${
                arTitleLen > CHAR_LIMITS.arTitle ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              {arTitleLen} / {CHAR_LIMITS.arTitle}
            </span>
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2 font-cairo">
              {selectedElementId === 'arabicTitleBlock' && (
                <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Selected</span>
                </span>
              )}
              <span>{isCtaSlide ? 'سؤال الدعوة للمشاركة (العربية)' : 'العنوان باللغة العربية'}</span>
            </label>
          </div>
          <input
            type="text"
            dir="rtl"
            value={currentSlide.arTitle || ''}
            onFocus={() => onSelectElement?.('arabicTitleBlock')}
            onClick={() => onSelectElement?.('arabicTitleBlock')}
            onChange={(e) => onUpdateField('arTitle', e.target.value)}
            placeholder="عنوان تقني دقيق ومختصر."
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none font-cairo text-right transition-colors"
          />
        </div>
      </div>

      {/* CTA Button Text field if on CTA slide */}
      {isCtaSlide && (
        <div
          className={`space-y-1.5 rounded-xl transition-colors ${
            selectedElementId === 'ctaButton' ? 'ring-1 ring-cyan-400/50 bg-cyan-950/10 p-2.5 -mx-2.5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200">
              CTA Pill Button Text
            </label>
            {selectedElementId === 'ctaButton' && (
              <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Selected</span>
              </span>
            )}
          </div>
          <input
            type="text"
            value={currentSlide.ctaText || ''}
            onFocus={() => onSelectElement?.('ctaButton')}
            onClick={() => onSelectElement?.('ctaButton')}
            onChange={(e) => onUpdateField('ctaText', e.target.value)}
            placeholder="Join discussion  •  شارك برأيك"
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3.5 py-2 text-sm text-white font-medium focus:outline-none transition-colors"
          />
        </div>
      )}

      {/* English & Arabic Body Copy */}
      <div className="grid grid-cols-1 gap-3.5 pt-2 border-t border-white/[0.06]">
        <div
          className={`space-y-1.5 rounded-xl transition-colors ${
            selectedElementId === 'bodyBlock' ? 'ring-1 ring-cyan-400/50 bg-cyan-950/10 p-2.5 -mx-2.5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span>Technical Mechanism & Details (English)</span>
              {selectedElementId === 'bodyBlock' && (
                <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Selected on Canvas</span>
                </span>
              )}
            </label>
            <span
              className={`text-[11px] font-mono tabular-nums ${
                enBodyLen > CHAR_LIMITS.enBody ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              {enBodyLen} / {CHAR_LIMITS.enBody}
            </span>
          </div>
          <textarea
            rows={3}
            value={currentSlide.enBody || ''}
            onFocus={() => onSelectElement?.('bodyBlock')}
            onClick={() => onSelectElement?.('bodyBlock')}
            onChange={(e) => onUpdateField('enBody', e.target.value)}
            placeholder="1-2 sentences explaining how the mechanism works under the hood."
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl p-3.5 text-xs sm:text-sm text-slate-200 focus:outline-none resize-none leading-relaxed transition-colors"
          />
        </div>

        <div
          className={`space-y-1.5 rounded-xl transition-colors ${
            selectedElementId === 'arabicBodyBlock' ? 'ring-1 ring-cyan-400/50 bg-cyan-950/10 p-2.5 -mx-2.5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-mono tabular-nums ${
                arBodyLen > CHAR_LIMITS.arBody ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              {arBodyLen} / {CHAR_LIMITS.arBody}
            </span>
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2 font-cairo">
              {selectedElementId === 'arabicBodyBlock' && (
                <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Selected</span>
                </span>
              )}
              <span>شرح الآلية الهندسية (العربية)</span>
            </label>
          </div>
          <textarea
            rows={3}
            dir="rtl"
            value={currentSlide.arBody || ''}
            onFocus={() => onSelectElement?.('arabicBodyBlock')}
            onClick={() => onSelectElement?.('arabicBodyBlock')}
            onChange={(e) => onUpdateField('arBody', e.target.value)}
            placeholder="شرح تقني عميق في سطرين."
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl p-3.5 text-xs sm:text-sm text-slate-200 focus:outline-none resize-none leading-relaxed font-cairo text-right transition-colors"
          />
        </div>
      </div>
    </div>
  );
};

