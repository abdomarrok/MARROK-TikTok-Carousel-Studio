import React from 'react';
import { Sliders, CheckCircle2, Sparkles, Wand2, Plus, Trash2, ListChecks } from 'lucide-react';
import { SlideData, ThemePalette, GraphicalElementId, HookVariant, SlideTakeawayItem } from '../../types.ts';
import { CHAR_LIMITS, SINGLE_SLIDE_CHAR_LIMITS } from '../../lib/qaChecks.ts';
import { seedSingleSlideTakeaways } from '../../lib/synthesis/singleSlideCondenser.ts';

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
  isSingleSlide?: boolean;
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
  isSingleSlide = false,
}) => {
  const isCtaSlide = currentSlide.type === 'cta';
  const isSingle = isSingleSlide || currentSlide.type === 'poster';
  const limits = isSingle ? SINGLE_SLIDE_CHAR_LIMITS : CHAR_LIMITS;
  const isHook = currentSlideIndex === 0 && currentSlide.type === 'hub';
  const enTitleLimit = isHook ? limits.hookTitle : limits.enTitle;

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
              title="Open AI Polish & Slide QA Tools"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: theme.accent }} />
              <span>AI Polish</span>
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
          <div className="flex items-center justify-between text-xs text-slate-400">
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
                <div className="text-xs font-mono font-bold uppercase truncate" style={{ color: theme.accent }}>
                  {v.tag}
                </div>
                <div className="text-xs text-slate-300 group-hover:text-white truncate">
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
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Selected on Canvas</span>
                </span>
              )}
            </label>
            <span
              className={`text-xs font-mono tabular-nums ${
                enTitleLen > enTitleLimit ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              {enTitleLen} / {enTitleLimit}
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
              className={`text-xs font-mono tabular-nums ${
                arTitleLen > limits.arTitle ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              {arTitleLen} / {limits.arTitle}
            </span>
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2 font-cairo">
              {selectedElementId === 'arabicTitleBlock' && (
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1 font-sans">
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
            lang="ar"
            aria-label="Arabic Headline"
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
              <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
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
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Selected on Canvas</span>
                </span>
              )}
            </label>
            <span
              className={`text-xs font-mono tabular-nums ${
                enBodyLen > limits.enBody ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              {enBodyLen} / {limits.enBody}
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
              className={`text-xs font-mono tabular-nums ${
                arBodyLen > limits.arBody ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              {arBodyLen} / {limits.arBody}
            </span>
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2 font-cairo">
              {selectedElementId === 'arabicBodyBlock' && (
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1 font-sans">
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
            lang="ar"
            aria-label="Arabic Body Text"
            value={currentSlide.arBody || ''}
            onFocus={() => onSelectElement?.('arabicBodyBlock')}
            onClick={() => onSelectElement?.('arabicBodyBlock')}
            onChange={(e) => onUpdateField('arBody', e.target.value)}
            placeholder="شرح تقني عميق في سطرين."
            className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl p-3.5 text-xs sm:text-sm text-slate-200 focus:outline-none resize-none leading-relaxed font-cairo text-right transition-colors"
          />
        </div>
      </div>

      {/* Key Takeaways Bento List (Single-Slide / Poster / Enriched Slides) */}
      {(isSingle || currentSlide.type === 'poster' || (currentSlide.takeaways && currentSlide.takeaways.length > 0)) && (
        <div
          className={`pt-3 border-t border-white/[0.08] space-y-3 rounded-xl transition-colors ${
            selectedElementId === 'takeawaysBlock' ? 'ring-1 ring-cyan-400/50 bg-cyan-950/10 p-2.5 -mx-2.5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <ListChecks className="w-4 h-4" style={{ color: theme.accent }} />
              <span>Key Engineering Takeaways (Max 3 Points)</span>
              {selectedElementId === 'takeawaysBlock' && (
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Selected</span>
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              {(!currentSlide.takeaways || currentSlide.takeaways.length === 0) && (
                <button
                  type="button"
                  onClick={() => onUpdateField('takeaways', seedSingleSlideTakeaways(currentSlide))}
                  className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Seed 3 Points
                </button>
              )}
              {currentSlide.takeaways && currentSlide.takeaways.length < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const current = currentSlide.takeaways || [];
                    onUpdateField('takeaways', [
                      ...current,
                      {
                        en: 'High-throughput architectural component.',
                        ar: 'ركيزة معمارية أساسية للنظام.',
                        icon: 'checkCircle',
                      },
                    ]);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono font-medium text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Point</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {(currentSlide.takeaways || []).map((t, tIdx) => {
              const enLen = (t.en || '').trim().length;
              const arLen = (t.ar || '').trim().length;
              const limitEn = SINGLE_SLIDE_CHAR_LIMITS.takeawayEn;
              const limitAr = SINGLE_SLIDE_CHAR_LIMITS.takeawayAr;

              return (
                <div
                  key={tIdx}
                  className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold" style={{ color: theme.accent }}>
                      TAKEAWAY #{tIdx + 1}
                    </span>
                    {(currentSlide.takeaways?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (currentSlide.takeaways || []).filter((_, i) => i !== tIdx);
                          onUpdateField('takeaways', updated);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                        title="Delete Takeaway"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* English Takeaway */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400 font-mono">English Point</span>
                      <span className={`text-xs font-mono ${enLen > limitEn ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                        {enLen} / {limitEn}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={t.en || ''}
                      onFocus={() => onSelectElement?.('takeawaysBlock')}
                      onChange={(e) => {
                        const updated = [...(currentSlide.takeaways || [])];
                        updated[tIdx] = { ...updated[tIdx], en: e.target.value };
                        onUpdateField('takeaways', updated);
                      }}
                      placeholder="Concise technical bullet point"
                      className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Arabic Takeaway */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-mono ${arLen > limitAr ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                        {arLen} / {limitAr}
                      </span>
                      <span className="text-xs text-slate-400 font-cairo">الخلاصة بالعربية</span>
                    </div>
                    <input
                      type="text"
                      dir="rtl"
                      lang="ar"
                      aria-label={`Arabic Takeaway #${tIdx + 1}`}
                      value={t.ar || ''}
                      onFocus={() => onSelectElement?.('takeawaysBlock')}
                      onChange={(e) => {
                        const updated = [...(currentSlide.takeaways || [])];
                        updated[tIdx] = { ...updated[tIdx], ar: e.target.value };
                        onUpdateField('takeaways', updated);
                      }}
                      placeholder="خلاصة تقنية مكثفة"
                      className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2.5 py-1.5 text-xs text-white font-cairo text-right focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Standalone Single-Slide Attribution Footer */}
      {isSingle && (
        <div className="pt-3 border-t border-white/[0.08] space-y-2">
          <label className="text-xs font-semibold text-slate-200 block">
            Standalone Footer Attribution (Source Credit)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-slate-400 font-mono block mb-1">Source / Author (English)</span>
              <input
                type="text"
                value={currentSlide.enCredit || ''}
                onChange={(e) => onUpdateField('enCredit', e.target.value)}
                placeholder="e.g. Arxiv / Dr. Martin Kleppmann"
                className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono block mb-1">Source / Author (Arabic)</span>
              <input
                type="text"
                dir="rtl"
                lang="ar"
                aria-label="Source Author in Arabic"
                value={currentSlide.arCredit || ''}
                onChange={(e) => onUpdateField('arCredit', e.target.value)}
                placeholder="المصدر أو المؤلف بالعربية"
                className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2.5 py-1.5 text-xs text-white font-cairo text-right focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

