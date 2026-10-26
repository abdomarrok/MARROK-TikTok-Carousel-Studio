import React, { useState, useEffect, useRef } from 'react';
import { Palette, Key, Grid, FileCheck2, MoreVertical, X, RotateCcw } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on outside click or escape
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#080d11]/85 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Wordmark with Authentic Marrok Logo Badge as 'M' + 'ARROK' */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <a href="#" className="flex items-center gap-1.5 group">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/15 bg-[#0D0D0D] flex items-center justify-center shadow-sm group-hover:border-white/30 transition-all flex-shrink-0">
              <img src="/marrok-logo.svg" alt="M" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white font-jakarta tracking-wide">
              MARROK
            </span>
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full inline-block ml-0.5 transition-transform duration-200 group-hover:scale-125"
              style={{ backgroundColor: currentPalette.accent, boxShadow: `0 0 10px ${currentPalette.accent}` }}
            />
          </a>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium pl-2 border-l border-white/10 hidden md:inline">
            Autonomous TikTok Studio
          </span>
        </div>

        {/* Right Controls: Plan, Contact Sheet, Theme, API Key, Auto-Save */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Post Theme Trigger (Always Visible) */}
          <button
            type="button"
            onClick={onOpenThemeCustomizer}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer touch-manipulation"
            title="Configure Theme & Colors for this Post"
          >
            <div
              className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
              style={{ backgroundColor: currentPalette.accent }}
            />
            <span className="hidden lg:inline text-slate-400">Theme:</span>
            <span className="font-bold text-white max-w-[70px] sm:max-w-[80px] truncate">
              {currentPalette.name.split(' ')[0]}
            </span>
          </button>

          {/* Contact Sheet Trigger (Always Visible) */}
          {onOpenContactSheet && (
            <button
              type="button"
              onClick={onOpenContactSheet}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer touch-manipulation"
              title="View all slides in Contact Sheet"
            >
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Contact Sheet</span>
            </button>
          )}

          {/* Plan Inspector (Desktop / Tablet) */}
          {onOpenPlanInspector && (
            <button
              type="button"
              onClick={onOpenPlanInspector}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer touch-manipulation"
              title="Inspect Plan & Facts"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">Plan</span>
            </button>
          )}

          {/* Gemini API Key (Desktop / Tablet) */}
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all cursor-pointer touch-manipulation"
            title="Configure Custom Gemini API Key"
          >
            <Key className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden md:inline">API</span>
          </button>

          {/* Auto-Save Draft Status Pill (Large Desktop) */}
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

          {/* Mobile Overflow Menu Button (Visible on < sm) */}
          <div className="relative sm:hidden" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer touch-manipulation"
              title="More Options"
              aria-label="More Options"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
            </button>

            {/* Mobile Dropdown Panel */}
            {isMobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-xl p-2 shadow-2xl space-y-1 z-50 animate-scale-up">
                {onOpenPlanInspector && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPlanInspector();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <FileCheck2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Inspect Plan & Facts</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onOpenApiKeyModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Key className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>Configure Gemini API Key</span>
                </button>

                {lastSavedTime && (
                  <div className="pt-1.5 mt-1 border-t border-white/10 px-3 py-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Saved ({lastSavedTime})</span>
                    </span>
                    {onResetDraft && (
                      <button
                        type="button"
                        onClick={() => {
                          onResetDraft();
                          setIsMobileMenuOpen(false);
                        }}
                        className="text-[10px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
