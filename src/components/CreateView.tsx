import React from 'react';
import { Sparkles, ArrowRight, Wand2, BookOpen, Layers, Shield, Cpu, Code2, Globe } from 'lucide-react';
import { CarouselData, ThemePalette } from '../types';
import { PRESET_CAROUSELS } from '../lib/presets';
import { SmartPipelineBar } from './SmartPipelineBar';
import { MultimodalInputPanel } from './MultimodalInputPanel';

interface CreateViewProps {
  theme: ThemePalette;
  currentCarousel: CarouselData;
  onApplyCarousel: (carousel: CarouselData) => void;
  onSwitchToEdit: () => void;
  onShowToast: (msg: string) => void;
  onOpenPlanInspector: () => void;
}

export const CreateView: React.FC<CreateViewProps> = ({
  theme,
  currentCarousel,
  onApplyCarousel,
  onSwitchToEdit,
  onShowToast,
  onOpenPlanInspector,
}) => {
  const handleApplyPreset = (key: keyof typeof PRESET_CAROUSELS) => {
    const preset = PRESET_CAROUSELS[key];
    if (preset?.data) {
      onApplyCarousel(preset.data);
      onShowToast(`Loaded "${preset.name}" starter deck!`);
      onSwitchToEdit();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Hero Welcome & Workflow Intro */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300">
          <Sparkles className="w-3.5 h-3.5" style={{ color: theme.accent }} />
          <span>Stage 1 of 3: Multimodal Generation & Ingestion</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-jakarta tracking-tight">
          Create Engineering TikTok Carousels
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Generate bilingual English-Arabic 1080×1920 carousel slides from topics, URLs, architecture diagrams, or code repositories.
        </p>
      </div>

      {/* Primary Pipeline Command Bar */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" style={{ color: theme.accent }} />
            <h2 className="text-sm font-bold text-white">Smart Generation Command Center</h2>
          </div>
          <button
            type="button"
            onClick={onOpenPlanInspector}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>View Architecture Plan</span>
          </button>
        </div>

        <SmartPipelineBar
          theme={theme}
          onApplyCarousel={(newCarousel) => {
            onApplyCarousel(newCarousel);
            onSwitchToEdit();
          }}
          onOpenPlanInspector={onOpenPlanInspector}
          currentCarousel={currentCarousel}
          onShowToast={onShowToast}
        />
      </div>

      {/* Multimodal Ingestion Options (Tabs for File, URL, Document, Notes) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Multimodal Source Ingestion (Images, Notes, Web, Code)
          </h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden p-4 sm:p-5">
          <MultimodalInputPanel
            theme={theme}
            onApplyCarousel={(newCarousel) => {
              onApplyCarousel(newCarousel);
              onSwitchToEdit();
            }}
          />
        </div>
      </div>

      {/* High-Performing Architecture Presets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Curated Architecture Presets (Ready-to-Ship Starters)
            </h3>
            <p className="text-[11px] text-slate-500">
              Instant bilingual 8-slide carousels engineered to MARROK standard schemas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Preset 1: Scion */}
          <button
            type="button"
            onClick={() => handleApplyPreset('scion')}
            className="group p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-500/15 border border-teal-500/30 text-teal-300">
                <Cpu className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                Scion Architecture
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                Microkernel isolation, IPC boundaries, and zero-trust service dispatch.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>8 Slides · Teal Theme</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-teal-400" />
            </div>
          </button>

          {/* Preset 2: Val Town */}
          <button
            type="button"
            onClick={() => handleApplyPreset('valtown')}
            className="group p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <Code2 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Val Town MicroVMs
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                Serverless TypeScript execution in secure Deno v8 isolates.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>8 Slides · Amber Theme</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-amber-400" />
            </div>
          </button>

          {/* Preset 3: Zero-Trust */}
          <button
            type="button"
            onClick={() => handleApplyPreset('zerotrust')}
            className="group p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/15 border border-rose-500/30 text-rose-300">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                Zero-Trust Mesh
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                Mutual TLS, ephemeral cryptographic tokens, and least-privilege ingress.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>8 Slides · Crimson Theme</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-rose-400" />
            </div>
          </button>

          {/* Preset 4: SQLite Wasm */}
          <button
            type="button"
            onClick={() => handleApplyPreset('sqlite')}
            className="group p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                <Globe className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                Client SQLite & Wasm
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                Origin-private filesystem storage and OPFS browser caching.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>8 Slides · Cyan Theme</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-cyan-400" />
            </div>
          </button>
        </div>
      </div>

      {/* Jump Directly to Edit Studio CTA */}
      <div className="pt-4 flex justify-center">
        <button
          type="button"
          onClick={onSwitchToEdit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs transition-all cursor-pointer"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Continue Editing Current Deck ({currentCarousel.slides.length} Slides)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
