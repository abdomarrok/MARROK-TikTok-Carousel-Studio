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
  Sparkles,
  Wand2,
  Zap,
  Check,
  Languages,
  Columns,
  Rows,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { MediaSearchModal } from './MediaSearchModal';
import { SlideImageStudio } from './SlideImageStudio';
import { CHAR_LIMITS, hasArabicPunctuationJump } from '../lib/qaChecks';
import { sanitizeSlide } from '../lib/textSanitizer';
import {
  detectBestArchetype,
  detectRelevantIcons,
  smartPopulateArchetype,
  autoPolishHeadline,
  autoFitTextToLimits,
  fixArabicPunctuation,
  suggestArabicTranslation,
  applyNarrativePreset,
  NarrativeRole,
} from '../lib/smartEditor';

const CharLimitBadge: React.FC<{ current: number; limit: number; label?: string }> = ({
  current,
  limit,
  label,
}) => {
  const isOver = current > limit;
  const isClose = current > limit * 0.85;
  const percent = Math.min(100, Math.round((current / limit) * 100));

  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">{label}</span>}
      <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden relative hidden xs:block">
        <div
          className={`h-full transition-all duration-200 rounded-full ${
            isOver
              ? 'bg-rose-500'
              : isClose
              ? 'bg-amber-400'
              : 'bg-emerald-400'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span
        className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
          isOver
            ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 animate-pulse'
            : isClose
            ? 'bg-amber-500/20 text-amber-300 font-medium'
            : 'bg-white/5 text-slate-400'
        }`}
      >
        {current}/{limit}
      </span>
    </div>
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
  const [layoutMode, setLayoutMode] = useState<'side-by-side' | 'stacked'>('side-by-side');
  const [showAiImageStudio, setShowAiImageStudio] = useState(false);
  const [isAdvancedToolsOpen, setIsAdvancedToolsOpen] = useState(false);

  const handleApplyGeneratedImage = (imageUrl: string, prompt?: string, model?: string) => {
    onUpdateSlide({
      ...slide,
      type: 'image',
      imageUrl,
      imagePrompt: prompt,
      imageModel: model,
    });
    setShowAiImageStudio(false);
    onShowToast?.('Applied AI generated visual to slide');
  };

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

  // Real-time archetype recommendation & semantic detection
  const recommendation = detectBestArchetype(slide, slideIndex, totalSlides);
  const detectedIcons = detectRelevantIcons(`${slide.enTitle || ''} ${slide.enBody || ''}`, 5);
  const hasArabicJump = hasArabicPunctuationJump(slide.arTitle) || hasArabicPunctuationJump(slide.arBody);

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

  const NARRATIVE_ROLES: { id: NarrativeRole; name: string; emoji: string; desc: string }[] = [
    { id: 'hook', name: 'Hook (Hub)', emoji: '🎯', desc: 'Slide 1: High-contrast cover with 6 satellites' },
    { id: 'stakes', name: 'The Stakes', emoji: '💥', desc: 'Slide 2: Production metric or problem bottleneck' },
    { id: 'compare', name: 'VS Split', emoji: '⚖️', desc: 'Side-by-side legacy vs modern comparison' },
    { id: 'code', name: 'Code Diff', emoji: '💻', desc: 'Terminal bash/diff execution snippet' },
    { id: 'step', name: 'Step', emoji: '🪜', desc: 'Step counter with 220px accent numeral' },
    { id: 'catch', name: 'The Catch', emoji: '⚠️', desc: 'Slide 6: Honest trade-offs and limits' },
    { id: 'rule', name: 'SRE Rule', emoji: '💡', desc: 'Core engineering principle takeaway' },
    { id: 'cta', name: 'Closing CTA', emoji: '🚀', desc: 'Final slide: Creator watermark and discussion' },
  ];

  const handleSelectArchetype = (type: SlideType) => {
    const updated = smartPopulateArchetype(slide, type, slideIndex);
    onUpdateSlide(updated);
    if (onShowToast) onShowToast(`Switched archetype to ${labels[type]}`);
  };

  const handleApplyRecommendation = () => {
    const updated = smartPopulateArchetype(slide, recommendation.recommendedType, slideIndex);
    const merged = { ...updated, ...recommendation.autoData };
    onUpdateSlide(merged);
    if (onShowToast) onShowToast(`Auto-Applied ${labels[recommendation.recommendedType]} (${recommendation.badge})`);
  };

  const handleApplyRolePreset = (role: NarrativeRole) => {
    const presetData = applyNarrativePreset(role, slideIndex);
    const updated: SlideData = {
      ...slide,
      ...presetData,
      type: presetData.type || slide.type,
    };
    onUpdateSlide(updated);
    if (onShowToast) onShowToast(`Applied ${role.toUpperCase()} Narrative Template`);
  };

  const handleAutoApplyAllIcons = () => {
    if (detectedIcons.length === 0) return;
    const count = slide.icons?.length || 2;
    const newIcons = [];
    for (let i = 0; i < count; i++) {
      const detected = detectedIcons[i % detectedIcons.length];
      newIcons.push({
        icon: detected.icon,
        label: detected.label,
      });
    }
    handleFieldChange('icons', newIcons);
    if (onShowToast) onShowToast(`Auto-selected ${count} topic-relevant icons!`);
  };

  const handleAutoPolishHeadline = () => {
    if (!slide.enTitle) return;
    const polished = autoPolishHeadline(slide.enTitle);
    handleFieldChange('enTitle', polished);
    if (onShowToast) onShowToast('Polished headline thought (Spec §8)');
  };

  const handleAutoFitLimits = () => {
    const enTitle = autoFitTextToLimits(slide.enTitle || '', slideIndex === 0 ? CHAR_LIMITS.hookTitle : CHAR_LIMITS.enTitle);
    const enBody = autoFitTextToLimits(slide.enBody || '', CHAR_LIMITS.enBody);
    const arTitle = autoFitTextToLimits(slide.arTitle || '', CHAR_LIMITS.arTitle);
    const arBody = autoFitTextToLimits(slide.arBody || '', CHAR_LIMITS.arBody);
    onUpdateSlide({
      ...slide,
      enTitle,
      enBody,
      arTitle,
      arBody,
    });
    if (onShowToast) onShowToast('Auto-trimmed text to satisfy Spec §8 character limits');
  };

  const handleBilingualTranslate = () => {
    const { arTitle, arBody } = suggestArabicTranslation(slide.enTitle || '', slide.enBody || '');
    onUpdateSlide({
      ...slide,
      arTitle: slide.arTitle ? slide.arTitle : arTitle,
      arBody: arBody,
    });
    if (onShowToast) onShowToast('Suggested high-credibility technical Arabic copy');
  };

  const handleFixArabicPunctuation = () => {
    const arTitle = fixArabicPunctuation(slide.arTitle || '');
    const arBody = fixArabicPunctuation(slide.arBody || '');
    onUpdateSlide({
      ...slide,
      arTitle,
      arBody,
    });
    if (onShowToast) onShowToast('Fixed Arabic punctuation jump bug');
  };

  const handleSanitizeSlideText = () => {
    const cleaned = sanitizeSlide(slide);
    onUpdateSlide(cleaned);
    if (onShowToast) onShowToast('Sanitized markdown, orphan dots & BiDi characters!');
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

      {/* Smart Archetype Auto-Selection Recommendation Banner */}
      {recommendation && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 px-3.5 rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-black/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${theme.accent}25`, color: theme.accent }}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white flex items-center gap-1">
                  <span>Smart Recommendation:</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                    style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                  >
                    {recommendation.badge} ({labels[recommendation.recommendedType]})
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                  {recommendation.confidence}% match
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {recommendation.reason}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {slide.type !== recommendation.recommendedType ? (
              <button
                type="button"
                onClick={handleApplyRecommendation}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-black transition-all cursor-pointer shadow-sm hover:opacity-90"
                style={{ backgroundColor: theme.accent }}
              >
                <Wand2 className="w-3 h-3" />
                <span>Auto-Apply ({labels[recommendation.recommendedType]})</span>
              </button>
            ) : (
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <Check className="w-3 h-3" />
                <span>Optimal Archetype Active</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Archetype Selector */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
          {(['hub', 'row', 'number', 'metric', 'code', 'compare', 'image', 'cta'] as SlideType[]).map((type) => {
            const isSelected = slide.type === type;
            return (
              <button
                key={type}
                onClick={() => handleSelectArchetype(type)}
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

        {/* Spec §7 Narrative Role Quick Presets */}
        <div className="p-2 px-3 rounded-xl bg-black/25 border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            <span>Spec §7 Narrative Arc Roles (Auto-Configure)</span>
            <span className="font-mono text-slate-500">Slide {slideIndex + 1} of {totalSlides}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1">
            {NARRATIVE_ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleApplyRolePreset(r.id)}
                className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/15 text-[10px] text-slate-300 hover:text-white transition-all cursor-pointer truncate"
                title={r.desc}
              >
                <span>{r.emoji}</span>
                <span className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
        </div>
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

          {/* Contextual Auto-Detected Icons for Hub Center */}
          {detectedIcons.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
              <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Auto-Suggested Center:</span>
              </span>
              {detectedIcons.map((di) => (
                <button
                  key={di.icon}
                  type="button"
                  onClick={() => handleFieldChange('centerIcon', di.icon)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer shrink-0 ${
                    slide.centerIcon === di.icon
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold'
                      : 'bg-white/5 text-slate-300 hover:text-white border-white/10'
                  }`}
                  title={`Set ${di.label} as Center Icon`}
                >
                  {di.label}
                </button>
              ))}
            </div>
          )}
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

          {/* Contextual Auto-Detected Icons Strip */}
          {detectedIcons.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 px-3 rounded-lg bg-black/40 border border-white/10 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <span className="text-[10px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Auto-Detected:</span>
                </span>
                {detectedIcons.map((di) => (
                  <button
                    key={di.icon}
                    type="button"
                    onClick={() => handleRowIconChange(0, di.icon)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
                    title={`Apply ${di.label} to Box 1`}
                  >
                    <span>{di.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAutoApplyAllIcons}
                className="text-[10px] font-bold px-2 py-1 rounded bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 border border-teal-500/30 shrink-0 cursor-pointer flex items-center gap-1"
                title="Auto-fill all icon boxes with highest ranking detected icons"
              >
                <Zap className="w-2.5 h-2.5" />
                <span>Auto-Fill All Boxes</span>
              </button>
            </div>
          )}

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAiImageStudio(!showAiImageStudio)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  showAiImageStudio
                    ? 'bg-purple-500/25 border-purple-500/50 text-purple-200'
                    : 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-purple-500/40 text-purple-200 hover:border-purple-500/60 shadow-sm'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{showAiImageStudio ? 'Hide AI Studio' : 'AI Diagram Studio'}</span>
              </button>
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
          </div>

          {/* Embedded AI Diagram Studio */}
          {(showAiImageStudio || !slide.imageUrl) && (
            <div className="pt-1">
              <SlideImageStudio
                slide={slide}
                theme={theme}
                onApplyImage={handleApplyGeneratedImage}
                onClose={() => setShowAiImageStudio(false)}
                onShowToast={onShowToast}
              />
            </div>
          )}

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

      {/* Smart Content Assistant Toolbar with Progressive Disclosure */}
      <div className="rounded-xl bg-black/30 border border-white/[0.08] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 px-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAdvancedToolsOpen(!isAdvancedToolsOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isAdvancedToolsOpen
                  ? 'bg-white/15 border-white/30 text-white shadow-sm'
                  : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
              }`}
              title="Toggle Advanced Text Assistant & Generative Tools"
            >
              <Wand2 className="w-3.5 h-3.5" style={{ color: theme.accent }} />
              <span>Advanced Tools</span>
              {isAdvancedToolsOpen ? (
                <ChevronUp className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {/* Quick Text Sanitize button */}
            <button
              type="button"
              onClick={handleSanitizeSlideText}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold transition-colors cursor-pointer"
              title="Clean markdown (#), orphan dots (.), and fix BiDi character order (.GB)"
            >
              <Check className="w-3 h-3" />
              <span>Clean Text</span>
            </button>

            {hasArabicJump && (
              <button
                type="button"
                onClick={handleFixArabicPunctuation}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-[11px] font-bold transition-colors cursor-pointer animate-pulse"
                title="Fix punctuation jump bug at end of Arabic line"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Fix Arabic Jump</span>
              </button>
            )}
          </div>

          {/* Bilingual Layout Mode Switcher (Side-by-Side Split vs Stacked) */}
          <div className="flex items-center bg-black/50 p-0.5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setLayoutMode('side-by-side')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                layoutMode === 'side-by-side'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Side-by-side bilingual view (English and Arabic columns)"
            >
              <Columns className="w-3 h-3" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('stacked')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                layoutMode === 'stacked'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Stacked vertical view"
            >
              <Rows className="w-3 h-3" />
              <span className="hidden sm:inline">Stack</span>
            </button>
          </div>
        </div>

        {/* Progressive Disclosure: Advanced Tools Drawer */}
        {isAdvancedToolsOpen && (
          <div className="p-3 border-t border-white/[0.08] bg-black/50 space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Group 1: Typography & Polish */}
              <div className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Copy & Headlines
                </span>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleAutoPolishHeadline}
                    className="w-full flex items-center justify-between p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Polish Headline</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">2-5 words</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoFitLimits}
                    className="w-full flex items-center justify-between p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>Fit Spec Limits</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">Trim</span>
                  </button>
                </div>
              </div>

              {/* Group 2: Arabic Localization */}
              <div className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Localization (Arabic)
                </span>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleBilingualTranslate}
                    className="w-full flex items-center justify-between p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Languages className="w-3 h-3 text-purple-400" />
                      <span>Suggest Arabic</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFixArabicPunctuation}
                    className="w-full flex items-center justify-between p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Fix RTL Punctuation</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">BiDi</span>
                  </button>
                </div>
              </div>

              {/* Group 3: Visuals & Diagrams */}
              <div className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Diagrams & Media
                </span>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (slide.type !== 'image') {
                        onUpdateSlide({
                          ...slide,
                          type: 'image',
                        });
                      }
                      setShowAiImageStudio(true);
                      setIsAdvancedToolsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-1.5 rounded-md bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs text-purple-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>AI Diagram Studio</span>
                    </span>
                    <span className="text-[9px] text-purple-300 font-mono">9:16</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaModalTarget({
                        field: 'imageUrl',
                        title: 'Search Diagram or Web Visual for Subject',
                        initialQuery: slide.enTitle?.slice(0, 30) || '',
                      });
                      setIsAdvancedToolsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-cyan-400" />
                      <span>Search Web Media</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">Web</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Headlines & Body Copy for non-CTA slides */}
      {slide.type !== 'cta' && (
        <div className="space-y-3">
          {/* Bilingual Headlines */}
          <div className={layoutMode === 'side-by-side' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3'}>
            {/* English Headline */}
            <div className="p-3 rounded-xl bg-black/25 border border-white/[0.06] space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>English Headline</span>
                </label>
                <CharLimitBadge
                  current={(slide.enTitle || '').length}
                  limit={slideIndex === 0 ? CHAR_LIMITS.hookTitle : CHAR_LIMITS.enTitle}
                  label="Jakarta 800"
                />
              </div>
              <textarea
                value={slide.enTitle || ''}
                onChange={(e) => handleFieldChange('enTitle', e.target.value)}
                rows={2}
                className="w-full rounded-lg bg-black/50 border border-white/10 p-2 text-xs text-white focus:outline-none focus:border-white/30 resize-none font-jakarta"
                placeholder="e.g. Why did Anthropic move beyond Git?"
              />
            </div>

            {/* Arabic Headline */}
            <div className="p-3 rounded-xl bg-black/25 border border-white/[0.06] space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                  <span>العنوان بالعربية</span>
                </label>
                <CharLimitBadge
                  current={(slide.arTitle || '').length}
                  limit={CHAR_LIMITS.arTitle}
                  label="Cairo 800"
                />
              </div>
              <textarea
                value={slide.arTitle || ''}
                onChange={(e) => handleFieldChange('arTitle', e.target.value)}
                dir="rtl"
                rows={2}
                className="w-full rounded-lg bg-black/50 border border-white/10 p-2 text-xs text-slate-100 focus:outline-none focus:border-white/30 resize-none font-cairo"
                placeholder="e.g. السبب وراء ابتعاد Anthropic عن Git"
              />
              {hasArabicPunctuationJump(slide.arTitle) && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/25">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Punctuation Jump: ends with Latin word + dot. End with Arabic word per Spec §8.</span>
                </div>
              )}
            </div>
          </div>

          {/* Bilingual Body Copy */}
          <div className={layoutMode === 'side-by-side' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3'}>
            {/* English Body */}
            <div className="p-3 rounded-xl bg-black/25 border border-white/[0.06] space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>English Body (1-2 crisp sentences)</span>
                </label>
                <CharLimitBadge
                  current={(slide.enBody || '').length}
                  limit={CHAR_LIMITS.enBody}
                  label="Jakarta 400"
                />
              </div>
              <textarea
                value={slide.enBody || ''}
                onChange={(e) => handleFieldChange('enBody', e.target.value)}
                rows={3}
                className="w-full rounded-lg bg-black/50 border border-white/10 p-2 text-xs text-slate-300 focus:outline-none focus:border-white/30 resize-y font-jakarta"
                placeholder="e.g. Main-branch history near 100 GB, a compressed working copy over 25 GB, and about 25 million CI checkouts a day."
              />
            </div>

            {/* Arabic Body */}
            <div className="p-3 rounded-xl bg-black/25 border border-white/[0.06] space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>الشرح بالعربية</span>
                </label>
                <CharLimitBadge
                  current={(slide.arBody || '').length}
                  limit={CHAR_LIMITS.arBody}
                  label="Cairo 400"
                />
              </div>
              <textarea
                value={slide.arBody || ''}
                onChange={(e) => handleFieldChange('arBody', e.target.value)}
                dir="rtl"
                rows={3}
                className="w-full rounded-lg bg-black/50 border border-white/10 p-2 text-xs text-slate-300 focus:outline-none focus:border-white/30 resize-y font-cairo"
                placeholder="e.g. تاريخ الفرع الرئيسي يقارب 100 جيجابايت..."
              />
              {hasArabicPunctuationJump(slide.arBody) && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/25">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Punctuation Jump: ends with Latin word + dot. End with Arabic word per Spec §8.</span>
                </div>
              )}
            </div>
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
