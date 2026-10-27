import React from 'react';
import { Sliders, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { SlideData, ThemePalette, GraphicalElementId } from '../../types.ts';

interface InlineSlideEditorProps {
  currentSlide: SlideData;
  currentSlideIndex: number;
  theme: ThemePalette;
  isAdvancedCustomizerOpen: boolean;
  onToggleAdvancedCustomizer: () => void;
  onUpdateField: (field: keyof SlideData, value: any) => void;
  selectedElementId?: GraphicalElementId | null;
  onSelectElement?: (id: GraphicalElementId) => void;
}

export const InlineSlideEditor: React.FC<InlineSlideEditorProps> = ({
  currentSlide,
  currentSlideIndex,
  theme,
  isAdvancedCustomizerOpen,
  onToggleAdvancedCustomizer,
  onUpdateField,
  selectedElementId,
  onSelectElement,
}) => {
  const isCtaSlide = currentSlide.type === 'cta';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-white/10 text-white">
            Slide {currentSlideIndex + 1} · {currentSlide.type.toUpperCase()}
          </span>
          <span className="text-xs text-slate-400">Click any text to edit or select on canvas:</span>
        </div>

        {/* Advanced Customizer Toggle */}
        <button
          type="button"
          onClick={onToggleAdvancedCustomizer}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            isAdvancedCustomizerOpen
              ? 'bg-white/20 border-white/40 text-white shadow-sm'
              : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
          }`}
          title="Toggle deep archetype controls, code diff, metrics, and diagrams"
        >
          <Sliders className="w-3.5 h-3.5" style={{ color: theme.accent }} />
          <span>Advanced Customizer</span>
          {isAdvancedCustomizerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Direct English & Arabic Titles */}
      <div className="space-y-3">
        <div
          className={`p-2 rounded-xl border transition-all duration-200 ${
            selectedElementId === 'titleBlock'
              ? 'border-cyan-400/80 bg-cyan-950/20 ring-1 ring-cyan-400/40'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span>{isCtaSlide ? 'Call-to-Action Question (English)' : 'English Headline (Spec §8: ending in . or ?)'}</span>
            </label>
            {selectedElementId === 'titleBlock' && (
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shadow-sm"
                style={{ backgroundColor: `${theme.accent}25`, color: theme.accent, borderColor: `${theme.accent}60` }}
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>ACTIVE ON SLIDE</span>
              </span>
            )}
          </div>
          <input
            type="text"
            value={currentSlide.enTitle || ''}
            onFocus={() => onSelectElement?.('titleBlock')}
            onClick={() => onSelectElement?.('titleBlock')}
            onChange={(e) => onUpdateField('enTitle', e.target.value)}
            placeholder={isCtaSlide ? 'Scaling Vector Databases?' : 'Crisp architecture headline.'}
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
          />
        </div>

        <div
          className={`p-2 rounded-xl border transition-all duration-200 ${
            selectedElementId === 'arabicTitleBlock'
              ? 'border-cyan-400/80 bg-cyan-950/20 ring-1 ring-cyan-400/40'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            {selectedElementId === 'arabicTitleBlock' ? (
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shadow-sm"
                style={{ backgroundColor: `${theme.accent}25`, color: theme.accent, borderColor: `${theme.accent}60` }}
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>ACTIVE ON SLIDE</span>
              </span>
            ) : <span />}
            <label className="text-[11px] font-bold text-slate-300 block text-right font-cairo">
              {isCtaSlide ? 'سؤال الدعوة للمشاركة (العربية)' : 'العنوان باللغة العربية (Cairo Font)'}
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
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none font-cairo text-right"
          />
        </div>
      </div>

      {/* CTA Button Text field if on CTA slide */}
      {isCtaSlide && (
        <div
          className={`p-2 rounded-xl border transition-all duration-200 ${
            selectedElementId === 'ctaButton'
              ? 'border-cyan-400/80 bg-cyan-950/20 ring-1 ring-cyan-400/40'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-300">
              CTA Pill Button Text
            </label>
            {selectedElementId === 'ctaButton' && (
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shadow-sm"
                style={{ backgroundColor: `${theme.accent}25`, color: theme.accent }}
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>ACTIVE ON SLIDE</span>
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
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
          />
        </div>
      )}

      {/* Direct English & Arabic Body Copy */}
      <div className="space-y-3 pt-1">
        <div
          className={`p-2 rounded-xl border transition-all duration-200 ${
            selectedElementId === 'bodyBlock'
              ? 'border-cyan-400/80 bg-cyan-950/20 ring-1 ring-cyan-400/40'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-300">
              Technical Mechanism & Details (English)
            </label>
            {selectedElementId === 'bodyBlock' && (
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shadow-sm"
                style={{ backgroundColor: `${theme.accent}25`, color: theme.accent }}
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>ACTIVE ON SLIDE</span>
              </span>
            )}
          </div>
          <textarea
            rows={2}
            value={currentSlide.enBody || ''}
            onFocus={() => onSelectElement?.('bodyBlock')}
            onClick={() => onSelectElement?.('bodyBlock')}
            onChange={(e) => onUpdateField('enBody', e.target.value)}
            placeholder="1-2 sentences explaining how the mechanism works under the hood."
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl p-3 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        <div
          className={`p-2 rounded-xl border transition-all duration-200 ${
            selectedElementId === 'arabicBodyBlock'
              ? 'border-cyan-400/80 bg-cyan-950/20 ring-1 ring-cyan-400/40'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            {selectedElementId === 'arabicBodyBlock' ? (
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shadow-sm"
                style={{ backgroundColor: `${theme.accent}25`, color: theme.accent }}
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>ACTIVE ON SLIDE</span>
              </span>
            ) : <span />}
            <label className="text-[11px] font-bold text-slate-300 block text-right font-cairo">
              شرح الآلية الهندسية (العربية)
            </label>
          </div>
          <textarea
            rows={2}
            dir="rtl"
            value={currentSlide.arBody || ''}
            onFocus={() => onSelectElement?.('arabicBodyBlock')}
            onClick={() => onSelectElement?.('arabicBodyBlock')}
            onChange={(e) => onUpdateField('arBody', e.target.value)}
            placeholder="شرح تقني عميق في سطرين."
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl p-3 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed font-cairo text-right"
          />
        </div>
      </div>
    </div>
  );
};
