import React from 'react';
import { Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { SlideData, ThemePalette } from '../../types.ts';

interface InlineSlideEditorProps {
  currentSlide: SlideData;
  currentSlideIndex: number;
  theme: ThemePalette;
  isAdvancedCustomizerOpen: boolean;
  onToggleAdvancedCustomizer: () => void;
  onUpdateField: (field: keyof SlideData, value: any) => void;
}

export const InlineSlideEditor: React.FC<InlineSlideEditorProps> = ({
  currentSlide,
  currentSlideIndex,
  theme,
  isAdvancedCustomizerOpen,
  onToggleAdvancedCustomizer,
  onUpdateField,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-white/10 text-white">
            Slide {currentSlideIndex + 1} · {currentSlide.type.toUpperCase()}
          </span>
          <span className="text-xs text-slate-400">Click any text to edit:</span>
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
        <div>
          <label className="text-[11px] font-bold text-slate-300 block mb-1">
            English Headline (Spec §8: 2–8 words, max 45 chars, ending in . or ?)
          </label>
          <input
            type="text"
            value={currentSlide.enTitle || ''}
            onChange={(e) => onUpdateField('enTitle', e.target.value)}
            placeholder="Crisp architecture headline."
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-300 block mb-1 text-right">
            العنوان باللغة العربية (Cairo Font)
          </label>
          <input
            type="text"
            dir="rtl"
            value={currentSlide.arTitle || ''}
            onChange={(e) => onUpdateField('arTitle', e.target.value)}
            placeholder="عنوان تقني دقيق ومختصر."
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none font-cairo text-right"
          />
        </div>
      </div>

      {/* Direct English & Arabic Body Copy */}
      <div className="space-y-3 pt-1">
        <div>
          <label className="text-[11px] font-bold text-slate-300 block mb-1">
            Technical Mechanism & Details (English)
          </label>
          <textarea
            rows={2}
            value={currentSlide.enBody || ''}
            onChange={(e) => onUpdateField('enBody', e.target.value)}
            placeholder="1-2 sentences explaining how the mechanism works under the hood."
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl p-3 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-300 block mb-1 text-right">
            شرح الآلية الهندسية (العربية)
          </label>
          <textarea
            rows={2}
            dir="rtl"
            value={currentSlide.arBody || ''}
            onChange={(e) => onUpdateField('arBody', e.target.value)}
            placeholder="شرح تقني عميق في سطرين."
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl p-3 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed font-cairo text-right"
          />
        </div>
      </div>
    </div>
  );
};
