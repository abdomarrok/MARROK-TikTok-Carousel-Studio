import React, { useState } from 'react';
import {
  SlideData,
  ThemePalette,
  SlideType,
} from '../types';
import { ICONS_REGISTRY, registerCustomIcon } from '../lib/icons';
import {
  Plus,
  Trash2,
  Copy,
  Layout,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Globe,
  AlertTriangle,
  Hash,
} from 'lucide-react';
import { MediaSearchModal } from './MediaSearchModal';
import { CHAR_LIMITS, hasArabicPunctuationJump } from '../lib/qaChecks';

const CharLimitBadge: React.FC<{ current: number; limit: number }> = ({ current, limit }) => {
  const isOver = current > limit;
  const isClose = current > limit * 0.85;
  return (
    <span
      className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
        isOver
          ? 'bg-red-500/20 text-red-400 font-bold border border-red-500/30'
          : isClose
          ? 'bg-amber-500/20 text-amber-300 font-medium'
          : 'bg-white/5 text-slate-400'
      }`}
    >
      {current}/{limit}
    </span>
  );
};

interface SlideEditorProps {
  slide: SlideData;
  slideIndex: number;
  totalSlides: number;
  theme: ThemePalette;
  brand?: string;
  brandUrl?: string;
  onUpdateSlide: (updatedSlide: SlideData) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onMoveSlide?: (fromIndex: number, toIndex: number) => void;
  onUpdateBrand?: (brand: string, brandUrl?: string) => void;
  onShowToast?: (msg: string) => void;
}

const ALL_ICONS = Object.keys(ICONS_REGISTRY);

export const SlideEditor: React.FC<SlideEditorProps> = ({
  slide,
  slideIndex,
  totalSlides,
  theme,
  brand,
  brandUrl,
  onUpdateSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
  onUpdateBrand,
  onShowToast,
}) => {
  const [customIconTarget, setCustomIconTarget] = useState<string | null>(null);
  const [mediaModalTarget, setMediaModalTarget] = useState<{
    field: 'centerIcon' | 'rowIcon' | 'metricIcon' | 'imageUrl';
    index?: number;
    title?: string;
    initialQuery?: string;
  } | null>(null);

  const handleFieldChange = <K extends keyof SlideData>(field: K, value: SlideData[K]) => {
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

  const handleSetIconCount = (count: 1 | 2 | 3 | 4 | 5) => {
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
              Customize copy, archetype parameters, reorder, and branding
            </p>
          </div>
        </div>

        {/* Slide Actions: Reorder, Duplicate, Delete, Add */}
        <div className="flex items-center gap-1.5">
          {onMoveSlide && (
            <>
              <button
                onClick={() => onMoveSlide(slideIndex, slideIndex - 1)}
                disabled={slideIndex === 0}
                className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                title="Move slide earlier (Left / Up)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onMoveSlide(slideIndex, slideIndex + 1)}
                disabled={slideIndex === totalSlides - 1}
                className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                title="Move slide later (Right / Down)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => onDuplicateSlide(slideIndex)}
            className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Duplicate slide"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteSlide(slideIndex)}
            disabled={totalSlides <= 3}
            className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Delete slide"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onAddSlide}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
            title="Add new slide"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Slide</span>
          </button>
        </div>
      </div>

      {/* Brand & Watermark Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 px-3 rounded-xl bg-black/30 border border-white/[0.08] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Watermark / Brand:</span>
          <input
            type="text"
            value={brand || 'MARROK'}
            onChange={(e) => onUpdateBrand && onUpdateBrand(e.target.value, brandUrl)}
            placeholder="e.g. MARROK, @handle, Anthropic"
            className="w-32 rounded-lg bg-black/50 border border-white/15 px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-white/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Site / Handle:</span>
          <input
            type="text"
            value={brandUrl || 'marrok.org'}
            onChange={(e) => onUpdateBrand && onUpdateBrand(brand || 'MARROK', e.target.value)}
            placeholder="marrok.org"
            className="w-32 rounded-lg bg-black/50 border border-white/15 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-white/40"
          />
        </div>
      </div>

      {/* Archetype Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
        {(['hub', 'row', 'number', 'metric', 'code', 'compare', 'image', 'cta'] as SlideType[]).map((type) => {
          const isSelected = slide.type === type;
          const labels: Record<SlideType, string> = {
            hub: 'Hub (Hook)',
            row: 'Row (Icons)',
            number: 'Number (Step)',
            metric: 'Metric (Stat)',
            code: 'Code (Diff)',
            compare: 'VS (Split)',
            image: 'Image (Visual)',
            cta: 'CTA (Brand)',
          };
          return (
            <button
              key={type}
              onClick={() => handleFieldChange('type', type)}
              className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'border-white/30 bg-white/[0.08] text-white'
                  : 'border-white/5 bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
              style={{
                borderColor: isSelected ? theme.accent : undefined,
              }}
            >
              <Layout className="w-3 h-3" style={{ color: isSelected ? theme.accent : undefined }} />
              <span className="truncate">{labels[type]}</span>
            </button>
          );
        })}
      </div>

      {/* Archetype: Number (Step Counter - Spec §7 & §9.4) */}
      {slide.type === 'number' && (
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-3">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" style={{ color: theme.accent }} />
              <span>Step Number Archetype (Spec §7 & §9.4)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Centered 220px Accent Numeral</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Step Numeral (e.g. 01, 02, 03)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={slide.stepNumber || String(slideIndex + 1).padStart(2, '0')}
                  onChange={(e) => handleFieldChange('stepNumber', e.target.value)}
                  className="w-24 rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-white/30"
                  placeholder="01"
                />
                <button
                  type="button"
                  onClick={() => handleFieldChange('stepNumber', String(slideIndex + 1).padStart(2, '0'))}
                  className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] text-slate-300 cursor-pointer"
                >
                  Auto ({String(slideIndex + 1).padStart(2, '0')})
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Step Badge Label (Optional Micro-Header)
              </label>
              <input
                type="text"
                value={slide.stepLabel !== undefined ? slide.stepLabel : `STEP ${slide.stepNumber || String(slideIndex + 1).padStart(2, '0')}`}
                onChange={(e) => handleFieldChange('stepLabel', e.target.value)}
                placeholder="e.g. STEP 01 or PHASE 02"
                className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
        </div>
      )}

      {/* Archetype 1: Hub Controls */}
      {slide.type === 'hub' && (
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-3">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Center Hub Icon</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setMediaModalTarget({
                    field: 'centerIcon',
                    title: 'Search Center Hub Icon / Brand Logo',
                    initialQuery: slide.enTitle?.split(' ')[0] || '',
                  })
                }
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                <Globe className="w-3 h-3" />
                <span>Web / CDN Logo</span>
              </button>
              <label className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer">
                <Upload className="w-3 h-3" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*,.svg"
                  onChange={(e) => handleCustomIconUpload(e, 'center')}
                  className="hidden"
                />
              </label>
            </div>
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
                {(slide.centerIcon?.startsWith('http://') || slide.centerIcon?.startsWith('https://')) && (
                  <option value={slide.centerIcon}>[Web CDN Logo / Icon]</option>
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
            <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-lg border border-white/10 text-xs flex-wrap">
              {[1, 2, 3, 4, 5].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => handleSetIconCount(cnt as 1 | 2 | 3 | 4 | 5)}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    (slide.icons?.length || 1) === cnt ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cnt} {cnt === 1 ? 'Icon' : 'Icons'}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(slide.icons?.length || 1, 5)} gap-2.5`}>
            {(slide.icons || [{ icon: 'database', label: '' }]).map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Box {idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setMediaModalTarget({
                          field: 'rowIcon',
                          index: idx,
                          title: `Search Box ${idx + 1} Icon / Logo`,
                          initialQuery: item.label || slide.enTitle?.split(' ')[0] || '',
                        })
                      }
                      className="hover:text-cyan-300 text-cyan-400 cursor-pointer flex items-center gap-1"
                    >
                      <Globe className="w-2.5 h-2.5" />
                      <span>Web</span>
                    </button>
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
                </div>
                <select
                  value={item.icon}
                  onChange={(e) => handleRowIconChange(idx, e.target.value)}
                  className="w-full rounded bg-black/60 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none"
                >
                  {item.icon?.startsWith('custom_') && (
                    <option value={item.icon}>[Custom Upload]</option>
                  )}
                  {(item.icon?.startsWith('http://') || item.icon?.startsWith('https://')) && (
                    <option value={item.icon}>[Web CDN Logo / Icon]</option>
                  )}
                  {ALL_ICONS.map((iconName) => (
                    <option key={iconName} value={iconName}>
                      {ICONS_REGISTRY[iconName]?.label || iconName}
                    </option>
                  ))}
                </select>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-400">Micro-label</span>
                    <CharLimitBadge current={(item.label || '').length} limit={CHAR_LIMITS.iconLabel} />
                  </div>
                  <input
                    type="text"
                    value={item.label || ''}
                    onChange={(e) => handleRowLabelChange(idx, e.target.value)}
                    placeholder="Micro-label (e.g. ~100 GB)"
                    className="w-full rounded bg-black/60 border border-white/10 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archetype: Metric Controls */}
      {slide.type === 'metric' && (
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-3">
          <div className="text-xs font-bold text-slate-300">Metric Hero Card Settings</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Hero Value (e.g. 200x, 0ms, 99.9%)</label>
              <input
                type="text"
                value={slide.metricValue || ''}
                onChange={(e) => handleFieldChange('metricValue', e.target.value)}
                placeholder="200x"
                className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Metric Label</label>
              <input
                type="text"
                value={slide.metricLabel || ''}
                onChange={(e) => handleFieldChange('metricLabel', e.target.value)}
                placeholder="THROUGHPUT MULTIPLIER"
                className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-semibold text-slate-400 block">Icon</label>
                <button
                  type="button"
                  onClick={() =>
                    setMediaModalTarget({
                      field: 'metricIcon',
                      title: 'Search Metric Icon / Brand Logo',
                      initialQuery: slide.metricLabel || '',
                    })
                  }
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Globe className="w-2.5 h-2.5" />
                  <span>Web</span>
                </button>
              </div>
              <select
                value={slide.metricIcon || 'zap'}
                onChange={(e) => handleFieldChange('metricIcon', e.target.value)}
                className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
              >
                {(slide.metricIcon?.startsWith('http://') || slide.metricIcon?.startsWith('https://')) && (
                  <option value={slide.metricIcon}>[Web CDN Logo / Icon]</option>
                )}
                {ALL_ICONS.map((iName) => (
                  <option key={iName} value={iName}>
                    {ICONS_REGISTRY[iName]?.label || iName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Delta / Improvement Pill</label>
            <input
              type="text"
              value={slide.metricDiff || ''}
              onChange={(e) => handleFieldChange('metricDiff', e.target.value)}
              placeholder="▲ 12x vs legacy baseline"
              className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
      )}

      {/* Archetype: Code Window Controls */}
      {slide.type === 'code' && (
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-3">
          <div className="text-xs font-bold text-slate-300">Terminal / Code Window Settings</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">File / Tab Name</label>
              <input
                type="text"
                value={slide.codeFileName || ''}
                onChange={(e) => handleFieldChange('codeFileName', e.target.value)}
                placeholder="bench_run.sh"
                className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Language</label>
              <input
                type="text"
                value={slide.codeLanguage || ''}
                onChange={(e) => handleFieldChange('codeLanguage', e.target.value)}
                placeholder="bash, rust, python, sql"
                className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Code Snippet ($ for commands, + for adds, - for dels, ✔ for success)</label>
            <textarea
              value={slide.codeSnippet || ''}
              onChange={(e) => handleFieldChange('codeSnippet', e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-black/60 border border-white/10 p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-white/30 resize-y"
              placeholder="$ ./benchmark --workload=concurrency&#10;> Warming up virtual worktree...&#10;+ Latency dropped from 240ms -> 12ms&#10;✔ Passed SLA"
            />
          </div>
        </div>
      )}

      {/* Archetype: Compare Controls */}
      {slide.type === 'compare' && (
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-3">
          <div className="text-xs font-bold text-slate-300">Side-by-Side Comparison (Legacy vs Modern)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/20 space-y-2">
              <label className="text-[11px] font-bold text-red-300 block">Left Card: Problem / Legacy</label>
              <input
                type="text"
                value={slide.compareLeftTitle || ''}
                onChange={(e) => handleFieldChange('compareLeftTitle', e.target.value)}
                placeholder="Legacy Method"
                className="w-full rounded-lg bg-black/60 border border-white/10 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-white/30"
              />
              <textarea
                value={slide.compareLeftBody || ''}
                onChange={(e) => handleFieldChange('compareLeftBody', e.target.value)}
                rows={3}
                placeholder="• Heavy clone&#10;• Bloats disk&#10;• CI lockups"
                className="w-full rounded-lg bg-black/60 border border-white/10 p-2 text-xs text-slate-300 focus:outline-none focus:border-white/30 resize-none font-sans"
              />
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-2">
              <label className="text-[11px] font-bold text-emerald-300 block">Right Card: Solution / Modern</label>
              <input
                type="text"
                value={slide.compareRightTitle || ''}
                onChange={(e) => handleFieldChange('compareRightTitle', e.target.value)}
                placeholder="Modern Architecture"
                className="w-full rounded-lg bg-black/60 border border-white/10 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-white/30"
              />
              <textarea
                value={slide.compareRightBody || ''}
                onChange={(e) => handleFieldChange('compareRightBody', e.target.value)}
                rows={3}
                placeholder="• Virtual file system&#10;• Lazy checkout&#10;• Zero wait time"
                className="w-full rounded-lg bg-black/60 border border-white/10 p-2 text-xs text-slate-300 focus:outline-none focus:border-white/30 resize-none font-sans"
              />
            </div>
          </div>
        </div>
      )}

      {/* Archetype: Image Visual / Diagram Controls */}
      {slide.type === 'image' && (
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Subject Visual / Architecture Diagram Settings</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setMediaModalTarget({
                  field: 'imageUrl',
                  title: 'Search Diagram or Web Visual for Subject',
                  initialQuery: slide.enTitle?.slice(0, 30) || '',
                })
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Globe className="w-3 h-3" />
              <span>Search Web Media</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Image URL (HTTPS link to diagram, architecture schema, or photo)
              </label>
              <input
                type="text"
                value={slide.imageUrl || ''}
                onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                placeholder="https://... or click 'Search Web Media' above"
                className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Display Fit
              </label>
              <div className="grid grid-cols-2 gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => handleFieldChange('imageFit', 'contain')}
                  className={`py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                    (slide.imageFit || 'contain') === 'contain'
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Fit (Contain)
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange('imageFit', 'cover')}
                  className={`py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                    slide.imageFit === 'cover'
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Fill (Cover)
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Theme Harmonization & Visual Tone
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => handleFieldChange('imageFilter', 'hud')}
                className={`py-1 px-1.5 text-[11px] rounded font-medium transition-colors cursor-pointer truncate ${
                  (slide.imageFilter || 'hud') === 'hud'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Terminal HUD: Blueprint grid + auto-colorizes SVGs and logos with active theme accent"
              >
                Theme HUD (Auto)
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('imageFilter', 'invert')}
                className={`py-1 px-1.5 text-[11px] rounded font-medium transition-colors cursor-pointer truncate ${
                  slide.imageFilter === 'invert'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Invert White BG: Inverts white background diagrams into dark terminal mode"
              >
                Invert White BG
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('imageFilter', 'tint')}
                className={`py-1 px-1.5 text-[11px] rounded font-medium transition-colors cursor-pointer truncate ${
                  slide.imageFilter === 'tint'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Accent Tint: Washes image with active theme neon accent"
              >
                Accent Tint
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('imageFilter', 'clean')}
                className={`py-1 px-1.5 text-[11px] rounded font-medium transition-colors cursor-pointer truncate ${
                  slide.imageFilter === 'clean'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Original: Keeps unaltered colors for photos or colorful screenshots"
              >
                Original Colors
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Image Caption / Subtitle Overlay
            </label>
            <input
              type="text"
              value={slide.imageCaption || ''}
              onChange={(e) => handleFieldChange('imageCaption', e.target.value)}
              placeholder="e.g. Distributed Multi-Region Consensus Architecture"
              className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
            />
          </div>

          {slide.imageUrl && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-white/10" style={{ backgroundColor: `${theme.surface}` }}>
              <img
                src={`/api/proxy-image?url=${encodeURIComponent(slide.imageUrl)}${slide.imageFilter !== 'clean' ? `&color=${encodeURIComponent(theme.accent)}` : ''}`}
                alt="Preview"
                className="w-16 h-12 rounded object-cover border border-white/10"
                style={{
                  backgroundColor: theme.baseBg,
                  filter: slide.imageFilter === 'invert' ? 'invert(0.92) hue-rotate(180deg)' : undefined
                }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="text-[11px] text-slate-400 overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold truncate">Theme-Harmonized Asset</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase" style={{ backgroundColor: `${theme.accent}25`, color: theme.accent }}>
                    {slide.imageFilter || 'HUD'}
                  </span>
                </div>
                <span className="text-[10px] font-mono truncate block" style={{ color: theme.accent }}>{slide.imageUrl}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Headlines & Body Copy for non-CTA slides */}
      {slide.type !== 'cta' && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                English Headline (2 to 6 words)
              </label>
              <div className="flex items-center gap-2">
                <CharLimitBadge
                  current={(slide.enTitle || '').length}
                  limit={slideIndex === 0 ? CHAR_LIMITS.hookTitle : CHAR_LIMITS.enTitle}
                />
                <span className="text-[10px] text-slate-500 font-mono">Jakarta · 800</span>
              </div>
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
              <div className="flex items-center gap-2">
                <CharLimitBadge current={(slide.arTitle || '').length} limit={CHAR_LIMITS.arTitle} />
                <span className="text-[10px] font-mono" style={{ color: theme.accent }}>
                  Cairo · 800
                </span>
              </div>
            </div>
            <textarea
              value={slide.arTitle || ''}
              onChange={(e) => handleFieldChange('arTitle', e.target.value)}
              dir="rtl"
              rows={2}
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-slate-100 focus:outline-none focus:border-white/30 resize-none font-cairo"
              placeholder="e.g. السبب وراء ابتعاد Anthropic عن Git"
            />
            {hasArabicPunctuationJump(slide.arTitle) && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25 mt-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Punctuation Jump Warning: Arabic headline ends with Latin word + punctuation (e.g. .Git). Rephrase so it ends with an Arabic word per Spec §8.</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                English Body Copy (1 to 2 crisp sentences, 12 to 24 words)
              </label>
              <div className="flex items-center gap-2">
                <CharLimitBadge current={(slide.enBody || '').length} limit={CHAR_LIMITS.enBody} />
                <span className="text-[10px] text-slate-500 font-mono">400 Weight</span>
              </div>
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
              <div className="flex items-center gap-2">
                <CharLimitBadge current={(slide.arBody || '').length} limit={CHAR_LIMITS.arBody} />
                <span className="text-[10px] text-slate-500 font-mono">Cairo · 400</span>
              </div>
            </div>
            <textarea
              value={slide.arBody || ''}
              onChange={(e) => handleFieldChange('arBody', e.target.value)}
              dir="rtl"
              rows={3}
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-slate-400 focus:outline-none focus:border-white/30 resize-y font-cairo"
              placeholder="e.g. تاريخ الفرع الرئيسي يقارب 100 جيجابايت..."
            />
            {hasArabicPunctuationJump(slide.arBody) && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25 mt-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Punctuation Jump Warning: Arabic body ends with Latin word + punctuation. Rephrase to end with Arabic word per Spec §8.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archetype 5: CTA Controls */}
      {slide.type === 'cta' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Domain Question (English)
                </label>
                <CharLimitBadge current={(slide.enTitle || '').length} limit={CHAR_LIMITS.enTitle} />
              </div>
              <textarea
                value={slide.enTitle || ''}
                onChange={(e) => handleFieldChange('enTitle', e.target.value)}
                rows={2}
                className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-white/30 resize-none font-jakarta"
                placeholder="Building with AI agents at scale?"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Domain Question (Arabic)
                </label>
                <CharLimitBadge current={(slide.arTitle || '').length} limit={CHAR_LIMITS.arTitle} />
              </div>
              <textarea
                value={slide.arTitle || ''}
                onChange={(e) => handleFieldChange('arTitle', e.target.value)}
                dir="rtl"
                rows={2}
                className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-slate-100 focus:outline-none focus:border-white/30 resize-none font-cairo"
                placeholder="تبني بوكلاء الذكاء الاصطناعي على نطاق واسع؟"
              />
              {hasArabicPunctuationJump(slide.arTitle) && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 mt-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Punctuation jump detected</span>
                </div>
              )}
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
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                English Source Attribution Credit
              </label>
              <CharLimitBadge current={(slide.enCredit || '').length} limit={CHAR_LIMITS.enBody} />
            </div>
            <input
              type="text"
              value={slide.enCredit || ''}
              onChange={(e) => handleFieldChange('enCredit', e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-white/30 font-jakarta"
              placeholder="Based on Anthropic's engineering post. The numbers are Anthropic's own."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Arabic Source Attribution Credit
              </label>
              <CharLimitBadge current={(slide.arCredit || '').length} limit={CHAR_LIMITS.arBody} />
            </div>
            <input
              type="text"
              dir="rtl"
              value={slide.arCredit || ''}
              onChange={(e) => handleFieldChange('arCredit', e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-white/30 font-cairo"
              placeholder="مبني على مقال Anthropic الهندسي، والأرقام من Anthropic نفسها."
            />
            {hasArabicPunctuationJump(slide.arCredit) && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 mt-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Punctuation jump detected</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Search Modal */}
      {mediaModalTarget && (
        <MediaSearchModal
          isOpen={true}
          theme={theme}
          onClose={() => setMediaModalTarget(null)}
          title={mediaModalTarget.title || 'Search Web Media & Logos'}
          initialQuery={mediaModalTarget.initialQuery}
          onSelectUrl={(url: string) => {
            if (mediaModalTarget.field === 'centerIcon') {
              handleFieldChange('centerIcon', url);
              if (onShowToast) onShowToast('Center Hub logo updated from web!');
            } else if (mediaModalTarget.field === 'rowIcon' && typeof mediaModalTarget.index === 'number') {
              handleRowIconChange(mediaModalTarget.index, url);
              if (onShowToast) onShowToast(`Box ${mediaModalTarget.index + 1} logo updated from web!`);
            } else if (mediaModalTarget.field === 'metricIcon') {
              handleFieldChange('metricIcon', url);
              if (onShowToast) onShowToast('Metric icon updated from web!');
            } else if (mediaModalTarget.field === 'imageUrl') {
              handleFieldChange('imageUrl', url);
              if (onShowToast) onShowToast('Slide image visual updated from web!');
            }
          }}
        />
      )}
    </div>
  );
};
