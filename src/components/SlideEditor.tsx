import React, { useState } from 'react';
import {
  SlideData,
  ThemeConfig,
  SlideType,
} from '../types';
import { ICONS_REGISTRY, registerCustomIcon } from '../lib/icons';
import { Plus, Trash2, Copy, Layout, Upload, Image as ImageIcon } from 'lucide-react';

interface SlideEditorProps {
  slide: SlideData;
  slideIndex: number;
  totalSlides: number;
  theme: ThemeConfig;
  onUpdateSlide: (updatedSlide: SlideData) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onShowToast?: (msg: string) => void;
}

const ALL_ICONS = Object.keys(ICONS_REGISTRY);

export const SlideEditor: React.FC<SlideEditorProps> = ({
  slide,
  slideIndex,
  totalSlides,
  theme,
  onUpdateSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onShowToast,
}) => {
  const [customIconTarget, setCustomIconTarget] = useState<string | null>(null);

  const handleFieldChange = (field: keyof SlideData, value: any) => {
    onUpdateSlide({
      ...slide,
      [field]: value,
    });
  };

  const handleRowIconChange = (iconIdx: number, newIcon: string) => {
    const icons = [...(slide.icons || [{ icon: 'database', label: '' }])];
    if (icons[iconIdx]) {
      icons[iconIdx] = { ...icons[iconIdx], icon: newIcon };
      handleFieldChange('icons', icons);
    }
  };

  const handleRowLabelChange = (iconIdx: number, newLabel: string) => {
    const icons = [...(slide.icons || [{ icon: 'database', label: '' }])];
    if (icons[iconIdx]) {
      icons[iconIdx] = { ...icons[iconIdx], label: newLabel };
      handleFieldChange('icons', icons);
    }
  };

  const handleSetIconCount = (count: 1 | 2 | 3) => {
    const current = slide.icons || [];
    const newIcons = [];
    for (let i = 0; i < count; i++) {
      if (current[i]) {
        newIcons.push(current[i]);
      } else {
        newIcons.push({ icon: ALL_ICONS[i % ALL_ICONS.length], label: `Label ${i + 1}` });
      }
    }
    handleFieldChange('icons', newIcons);
  };

  // Custom Icon File Upload Handler
  const handleCustomIconUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    targetType: 'center' | number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const customId = `custom_${Date.now()}`;
      registerCustomIcon(customId, dataUrl);

      if (targetType === 'center') {
        handleFieldChange('centerIcon', customId);
      } else {
        handleRowIconChange(targetType, customId);
      }

      if (onShowToast) onShowToast('Custom icon uploaded and applied!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      id="editor"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg backdrop-blur-sm space-y-4"
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
            style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
          >
            #{slideIndex + 1}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-jakarta">
              Slide Editor
            </h3>
            <p className="text-[11px] text-slate-400">
              Customize copy, icon vectors, custom uploads, and archetype parameters
            </p>
          </div>
        </div>

        {/* Slide Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onDuplicateSlide(slideIndex)}
            className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Duplicate slide"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteSlide(slideIndex)}
            disabled={totalSlides <= 3}
            className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Delete slide"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onAddSlide}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors"
            title="Add new slide"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Slide</span>
          </button>
        </div>
      </div>

      {/* Archetype Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {(['hub', 'row', 'cta'] as SlideType[]).map((type) => {
          const isSelected = slide.type === type;
          return (
            <button
              key={type}
              onClick={() => handleFieldChange('type', type)}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'border-white/30 bg-white/[0.08] text-white'
                  : 'border-white/5 bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
              style={{
                borderColor: isSelected ? theme.accent : undefined,
              }}
            >
              <Layout className="w-3.5 h-3.5" style={{ color: isSelected ? theme.accent : undefined }} />
              <span className="uppercase tracking-wider">
                {type === 'hub' ? 'Hub (Hook)' : type === 'row' ? 'Row (Mechanism)' : 'CTA (Brand)'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Archetype 1: Hub Controls */}
      {slide.type === 'hub' && (
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-3">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Center Hub Icon</span>
            <label className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer">
              <Upload className="w-3 h-3" />
              <span>Upload Custom Icon</span>
              <input
                type="file"
                accept="image/*,.svg"
                onChange={(e) => handleCustomIconUpload(e, 'center')}
                className="hidden"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="col-span-2">
              <select
                value={slide.centerIcon || 'gitMerge'}
                onChange={(e) => handleFieldChange('centerIcon', e.target.value)}
                className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
              >
                {slide.centerIcon?.startsWith('custom_') && (
                  <option value={slide.centerIcon}>[Custom Uploaded Icon]</option>
                )}
                {ALL_ICONS.map((iconName) => (
                  <option key={iconName} value={iconName}>
                    {ICONS_REGISTRY[iconName]?.label || iconName}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-center justify-end text-[11px] text-slate-400">
              <span>6 satellites placed at 60° increments</span>
            </div>
          </div>
        </div>
      )}

      {/* Archetype 2/3/4: Row Icons Controls */}
      {slide.type === 'row' && (
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              Icons & Micro-Labels
            </span>
            <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => handleSetIconCount(1)}
                className={`px-2 py-0.5 rounded ${
                  (slide.icons?.length || 1) === 1 ? 'bg-white/20 text-white font-bold' : 'text-slate-400'
                }`}
              >
                1 Icon
              </button>
              <button
                onClick={() => handleSetIconCount(2)}
                className={`px-2 py-0.5 rounded ${
                  (slide.icons?.length || 1) === 2 ? 'bg-white/20 text-white font-bold' : 'text-slate-400'
                }`}
              >
                2 Icons
              </button>
              <button
                onClick={() => handleSetIconCount(3)}
                className={`px-2 py-0.5 rounded ${
                  (slide.icons?.length || 1) === 3 ? 'bg-white/20 text-white font-bold' : 'text-slate-400'
                }`}
              >
                3 Icons
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(slide.icons || [{ icon: 'database', label: '' }]).map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Box {idx + 1}</span>
                  <label className="hover:text-white cursor-pointer flex items-center gap-1">
                    <Upload className="w-2.5 h-2.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      onChange={(e) => handleCustomIconUpload(e, idx)}
                      className="hidden"
                    />
                  </label>
                </div>
                <select
                  value={item.icon}
                  onChange={(e) => handleRowIconChange(idx, e.target.value)}
                  className="w-full rounded bg-black/60 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none"
                >
                  {item.icon?.startsWith('custom_') && (
                    <option value={item.icon}>[Custom Upload]</option>
                  )}
                  {ALL_ICONS.map((iconName) => (
                    <option key={iconName} value={iconName}>
                      {ICONS_REGISTRY[iconName]?.label || iconName}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={item.label || ''}
                  onChange={(e) => handleRowLabelChange(idx, e.target.value)}
                  placeholder="Micro-label (e.g. ~100 GB)"
                  className="w-full rounded bg-black/60 border border-white/10 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-white/30"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Headlines & Body Copy for Hub and Row */}
      {slide.type !== 'cta' && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                English Headline (2 to 6 words)
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Plus Jakarta Sans · 800</span>
            </div>
            <textarea
              value={slide.enTitle || ''}
              onChange={(e) => handleFieldChange('enTitle', e.target.value)}
              rows={2}
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-white/30 resize-none font-jakarta"
              placeholder="e.g. Why did Anthropic move beyond Git?"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Arabic Headline (Idiomatic technical Arabic)
              </label>
              <span className="text-[10px] font-mono" style={{ color: theme.accent }}>
                Cairo · 800
              </span>
            </div>
            <textarea
              value={slide.arTitle || ''}
              onChange={(e) => handleFieldChange('arTitle', e.target.value)}
              dir="rtl"
              rows={2}
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-slate-100 focus:outline-none focus:border-white/30 resize-none font-cairo"
              placeholder="e.g. السبب وراء ابتعاد Anthropic عن Git"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                English Body Copy (1 to 2 crisp sentences, 12 to 24 words)
              </label>
              <span className="text-[10px] text-slate-500 font-mono">400 Weight</span>
            </div>
            <textarea
              value={slide.enBody || ''}
              onChange={(e) => handleFieldChange('enBody', e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-slate-300 focus:outline-none focus:border-white/30 resize-y font-jakarta"
              placeholder="e.g. Main-branch history near 100 GB, a compressed working copy over 25 GB, and about 25 million CI checkouts a day."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Arabic Body Copy
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Cairo · 400</span>
            </div>
            <textarea
              value={slide.arBody || ''}
              onChange={(e) => handleFieldChange('arBody', e.target.value)}
              dir="rtl"
              rows={3}
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-slate-400 focus:outline-none focus:border-white/30 resize-y font-cairo"
              placeholder="e.g. تاريخ الفرع الرئيسي يقارب 100 جيجابايت..."
            />
          </div>
        </div>
      )}

      {/* Archetype 5: CTA Controls */}
      {slide.type === 'cta' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Domain Question (English)
              </label>
              <textarea
                value={slide.enTitle || ''}
                onChange={(e) => handleFieldChange('enTitle', e.target.value)}
                rows={2}
                className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-white/30 resize-none font-jakarta"
                placeholder="Building with AI agents at scale?"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Domain Question (Arabic)
              </label>
              <textarea
                value={slide.arTitle || ''}
                onChange={(e) => handleFieldChange('arTitle', e.target.value)}
                dir="rtl"
                rows={2}
                className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-slate-100 focus:outline-none focus:border-white/30 resize-none font-cairo"
                placeholder="تبني بوكلاء الذكاء الاصطناعي على نطاق واسع؟"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                CTA Button Text
              </label>
              <input
                type="text"
                value={slide.ctaText || 'DM us  •  رسالة خاصة'}
                onChange={(e) => handleFieldChange('ctaText', e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Website URL
              </label>
              <input
                type="text"
                value={slide.url || 'marrok.org'}
                onChange={(e) => handleFieldChange('url', e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              English Source Attribution Credit
            </label>
            <input
              type="text"
              value={slide.enCredit || ''}
              onChange={(e) => handleFieldChange('enCredit', e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-white/30 font-jakarta"
              placeholder="Based on Anthropic's engineering post. The numbers are Anthropic's own."
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Arabic Source Attribution Credit
            </label>
            <input
              type="text"
              dir="rtl"
              value={slide.arCredit || ''}
              onChange={(e) => handleFieldChange('arCredit', e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-white/30 font-cairo"
              placeholder="مبني على مقال Anthropic الهندسي، والأرقام من Anthropic نفسها."
            />
          </div>
        </div>
      )}
    </div>
  );
};
