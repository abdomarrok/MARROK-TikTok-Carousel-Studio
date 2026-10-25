import React from 'react';
import { Palette, Key, Grid, FileCheck2 } from 'lucide-react';
import { ThemePalette } from '../types';

interface HeaderProps {
  currentPalette: ThemePalette;
  onOpenThemeCustomizer: () => void;
  onOpenApiKeyModal: () => void;
  onOpenContactSheet?: () => void;
  onOpenPlanInspector?: () => void;
  lastSavedTime?: string | null;
  onResetDraft?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPalette,
  onOpenThemeCustomizer,
  onOpenApiKeyModal,
  onOpenContactSheet,
  onOpenPlanInspector,
  lastSavedTime,
  onResetDraft,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#080d11]/85 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Wordmark with Authentic Marrok Logo Badge as 'M' + 'ARROK' */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a href="#" className="flex items-center gap-1.5 group">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/15 bg-[#0D0D0D] flex items-center justify-center shadow-sm group-hover:border-white/30 transition-all flex-shrink-0">
              <img src="/marrok-logo.svg" alt="M" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white font-jakarta tracking-wide">
              MARROK
            </span>
            <span
              className="w-2.5 h-2.5 rounded-full inline-block ml-0.5 transition-transform duration-200 group-hover:scale-125"
              style={{ backgroundColor: currentPalette.accent, boxShadow: `0 0 10px ${currentPalette.accent}` }}
            />
          </a>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium pl-2 border-l border-white/10 hidden sm:inline">
            Autonomous TikTok Studio
          </span>
        </div>

        {/* Right Controls: Plan, Contact Sheet, Theme, API Key, Auto-Save */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Plan Inspector */}
          {onOpenPlanInspector && (
            <button
              type="button"
              onClick={onOpenPlanInspector}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
              title="Inspect Plan & Facts"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">Plan</span>
            </button>
          )}

          {/* Contact Sheet */}
          {onOpenContactSheet && (
            <button
              type="button"
              onClick={onOpenContactSheet}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
              title="View all slides in Contact Sheet"
            >
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Contact Sheet</span>
            </button>
          )}

          {/* Post Theme */}
          <button
            type="button"
            onClick={onOpenThemeCustomizer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            title="Configure Theme & Colors for this Post"
          >
            <div
              className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
              style={{ backgroundColor: currentPalette.accent }}
            />
            <span className="hidden lg:inline text-slate-400">Theme:</span>
            <span className="font-bold text-white max-w-[80px] truncate">{currentPalette.name.split(' ')[0]}</span>
          </button>

          {/* Gemini API Key */}
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all cursor-pointer"
            title="Configure Custom Gemini API Key"
          >
            <Key className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">API</span>
          </button>

          {/* Auto-Save Draft Status Pill */}
          {lastSavedTime && (
            <div
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full border border-white/5 bg-white/[0.03] text-slate-400"
              title={`Auto-saved to local browser storage at ${lastSavedTime}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px]">Saved</span>
              {onResetDraft && (
                <button
                  type="button"
                  onClick={onResetDraft}
                  className="text-[10px] text-slate-500 hover:text-rose-400 ml-1 cursor-pointer transition-colors"
                  title="Reset to default template"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
