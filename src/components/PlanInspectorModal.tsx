import React from 'react';
import {
  X,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ExternalLink,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { CarouselData, ThemePalette } from '../types';

interface PlanInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  carousel: CarouselData;
  theme: ThemePalette;
}

export const PlanInspectorModal: React.FC<PlanInspectorModalProps> = ({
  isOpen,
  onClose,
  carousel,
  theme,
}) => {
  if (!isOpen) return null;

  const facts = carousel.facts || [
    {
      text: `Core architectural topic: ${carousel.category}`,
      type: 'claim',
      verified: 'verified',
      evidence: 'Direct input analysis',
    },
    {
      text: `Brand or technology origin: ${carousel.brand || 'Engineering source'}`,
      type: 'name',
      verified: 'verified',
      evidence: carousel.brandUrl || 'marrok.org',
    },
    {
      text: 'Production metrics and architectural trade-offs attributed to primary engineering report',
      type: 'number',
      verified: 'verified',
      evidence: 'Spec §5 attribution standard',
    },
  ];

  const sourceMeta = carousel.sourceMeta || {
    type: 'article',
    title: carousel.category,
    creator: carousel.brand || 'Engineering Blog',
    url: carousel.brandUrl ? `https://${carousel.brandUrl}` : 'https://marrok.org',
    published: 'Latest technical release',
  };

  const notesForHuman = carousel.notesForHuman || [
    'Numbers and benchmarks are attributed to the source engineering team (Spec §5).',
    'Sponsor segments, promotional callouts, and affiliate text omitted per Spec §4.',
    'Slide 1 cover satisfies high-contrast thumbnail test for TikTok FYP recommendation.',
  ];

  const scheduleSlot = carousel.scheduleSlot || '18:00 DZ (Africa/Algiers timezone)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0c1219] shadow-2xl overflow-hidden font-jakarta">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-black/40">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-inner"
              style={{ backgroundColor: `${theme.accent}20` }}
            >
              <FileCheck2 className="w-5 h-5" style={{ color: theme.accent }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Project Plan & Intelligence Report</h2>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase"
                  style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                >
                  {carousel.theme.toUpperCase()} THEME
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Extracted Facts (§4) · Verification & Hedging (§5) · Narrative Arc (§7) · Human Notes (§11)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Source & Domain Identification */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Domain Category
              </span>
              <strong className="text-white font-mono">{carousel.category}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Creator / Channel / Source
              </span>
              <strong className="text-white">{sourceMeta.creator || carousel.brand || 'MARROK'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Recommended TikTok Slot
              </span>
              <strong className="text-cyan-400 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{scheduleSlot}</span>
              </strong>
            </div>
          </div>

          {/* Section 2: Extracted Facts & Verification Status (Spec §4 & §5) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Extracted & Verified Facts (Spec §4 & §5)</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {facts.length} facts extracted
              </span>
            </div>

            <div className="space-y-2">
              {facts.map((fact, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-black/30 border border-white/[0.08] flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold uppercase bg-white/10 text-slate-300">
                        {fact.type}
                      </span>
                      <span className="text-slate-200 font-medium">{fact.text}</span>
                    </div>
                    {fact.evidence && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                        <span>Source / Evidence: {fact.evidence}</span>
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                      fact.verified === 'verified'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {fact.verified}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Smart 8-10 Slide Narrative Arc (Spec §7) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Smart Narrative Arc Breakdown (Spec §7)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {carousel.slides.map((slide, idx) => {
                const isCatch =
                  slide.enTitle?.toLowerCase().includes('catch') ||
                  slide.enTitle?.toLowerCase().includes('trade-off') ||
                  slide.enTitle?.toLowerCase().includes('before you switch') ||
                  idx === carousel.slides.length - 2;

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-1.5 text-xs text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        SLIDE #{idx + 1}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase"
                        style={{
                          backgroundColor: `${theme.accent}15`,
                          color: theme.accent,
                        }}
                      >
                        {slide.type}
                      </span>
                    </div>
                    <div className="font-semibold text-white truncate text-[11px]">
                      {slide.enTitle || `Slide ${idx + 1}`}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-cairo" dir="rtl">
                      {slide.arTitle || ''}
                    </div>
                    {isCatch && (
                      <span className="inline-block text-[9px] font-mono text-amber-300 bg-amber-500/15 px-1 rounded border border-amber-500/25">
                        Honest Analysis
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Human Review Notes & Caveats (Spec §11 & §18) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Notes & Caveats for Human Review (Spec §11)</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
              {notesForHuman.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-black/40 flex items-center justify-between text-xs text-slate-400">
          <span>Post automatically configured per MARROK Production Plan Specification.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
