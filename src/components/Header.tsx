import React from 'react';
import { Download, Sparkles, RefreshCw, Palette, Key, ShieldCheck, Grid } from 'lucide-react';
import { ThemePalette } from '../types';
import type { QAReport } from '../lib/qaChecks';

interface HeaderProps {
  currentPalette: ThemePalette;
  onOpenGenerator: () => void;
  onOpenThemeCustomizer: () => void;
  onOpenApiKeyModal: () => void;
  onExportAll: () => void;
  onRunQA?: () => void;
  onOpenContactSheet?: () => void;
  isExporting: boolean;
  exportProgress?: { current: number; total: number } | null;
  lastQAReport?: QAReport | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentPalette,
  onOpenGenerator,
  onOpenThemeCustomizer,
  onOpenApiKeyModal,
  onExportAll,
  onRunQA,
  onOpenContactSheet,
  isExporting,
  exportProgress,
  lastQAReport,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#080d11]/85 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Wordmark with Accent Dot & Tag */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a href="#" className="flex items-center gap-2 group">
            <span className="text-xl font-extrabold tracking-tight text-white font-jakarta">
              MARROK
            </span>
            <span className="w-2.5 h-2.5 rounded-full inline-block transition-transform duration-200 group-hover:scale-125 bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
          </a>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium pl-2 border-l border-white/10 hidden md:inline">
            TikTok Studio & Synthesizer
          </span>
        </div>

        {/* Central Controls: Post Theme & API Key */}
        <div className="flex items-center gap-2">
          {/* Post Theme & Palette Studio */}
          <button
            onClick={onOpenThemeCustomizer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
            title="Configure Theme & Colors for this Post"
          >
            <div
              className="w-3 h-3 rounded-full border border-white/30 shrink-0"
              style={{ backgroundColor: currentPalette.accent }}
            />
            <span className="hidden sm:inline text-slate-400">Post Theme:</span>
            <span className="font-bold text-white max-w-[100px] truncate">{currentPalette.name.split(' ')[0]}</span>
            <Palette className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {/* Gemini API Key */}
          <button
            onClick={onOpenApiKeyModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all cursor-pointer"
            title="Configure Custom Gemini API Key"
          >
            <Key className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden md:inline">API</span>
          </button>
        </div>

        {/* Action Buttons: Ingest & Export */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenGenerator}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12] transition-all cursor-pointer whitespace-nowrap"
            title="Ingest screenshot, notes, code, or video transcript"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Ingest Material</span>
          </button>

          {/* QA Check Button */}
          {onRunQA && (
            <button
              onClick={onRunQA}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/15 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer whitespace-nowrap"
              title="Run pre-export QA checks (char limits, Arabic lint, placeholders)"
            >
              <ShieldCheck className="w-3.5 h-3.5" style={{
                color: lastQAReport
                  ? lastQAReport.failCount > 0 ? '#F43F5E'
                    : lastQAReport.warnCount > 0 ? '#FBBF24'
                    : '#34D399'
                  : '#94A3B8'
              }} />
              <span className="hidden md:inline">QA</span>
              {lastQAReport && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md ml-0.5" style={{
                  backgroundColor: lastQAReport.failCount > 0 ? 'rgba(244,63,94,0.15)'
                    : lastQAReport.warnCount > 0 ? 'rgba(251,191,36,0.15)'
                    : 'rgba(52,211,153,0.15)',
                  color: lastQAReport.failCount > 0 ? '#FDA4AF'
                    : lastQAReport.warnCount > 0 ? '#FDE68A'
                    : '#A7F3D0',
                }}>
                  {lastQAReport.failCount > 0
                    ? `${lastQAReport.failCount}F`
                    : lastQAReport.warnCount > 0
                    ? `${lastQAReport.warnCount}W`
                    : '✓'}
                </span>
              )}
            </button>
          )}

          {/* Contact Sheet Visual QA Button */}
          {onOpenContactSheet && (
            <button
              onClick={onOpenContactSheet}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/15 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer whitespace-nowrap"
              title="Open full-deck Contact Sheet for Visual QA (Spec §10)"
            >
              <Grid className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden lg:inline">Contact Sheet</span>
            </button>
          )}

          <button
            onClick={onExportAll}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50 whitespace-nowrap bg-teal-400 hover:bg-teal-300 text-slate-950"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {exportProgress
                    ? `${exportProgress.current}/${exportProgress.total}...`
                    : 'Exporting...'}
                </span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export JPG (ZIP)</span>
                <span className="sm:hidden">ZIP</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
