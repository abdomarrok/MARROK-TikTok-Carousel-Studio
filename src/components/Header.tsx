import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  FileCheck2,
  MoreVertical,
  X,
  RotateCcw,
  Undo2,
  Redo2,
  Smartphone,
  BookmarkCheck,
} from 'lucide-react';
import { ThemePalette } from '../types';

interface HeaderProps {
  currentPalette: ThemePalette;
  onOpenThemeCustomizer: () => void;
  onOpenApiKeyModal?: () => void;
  onOpenContactSheet?: () => void;
  onOpenPlanInspector?: () => void;
  onOpenPreviewDrawer?: (tab?: 'simulator' | 'polish') => void;
  onOpenSavedPostsDrawer?: () => void;
  savedPostsCount?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  lastSavedTime?: string | null;
  onResetDraft?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPalette,
  onOpenThemeCustomizer,
  onOpenContactSheet,
  onOpenPlanInspector,
  onOpenPreviewDrawer,
  onOpenSavedPostsDrawer,
  savedPostsCount = 0,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
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
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#080d11]/90 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <a href="#" className="flex items-center gap-2 group whitespace-nowrap shrink-0">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/15 bg-[#0D0D0D] flex items-center justify-center shadow-sm group-hover:border-white/30 transition-all shrink-0">
              <img src="/marrok-logo.svg" alt="M" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white font-jakarta whitespace-nowrap">
              MARROK
            </span>
          </a>
        </div>

        {/* Zone 2: Clean Workspace Navigation & History Controls */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-400">
          {(onUndo || onRedo) && (
            <div className="flex items-center gap-1 pr-3 border-r border-white/10">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Undo last edit (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Redo edit (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {onOpenContactSheet && (
            <button
              type="button"
              onClick={onOpenContactSheet}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
              title="View all slides in Contact Sheet"
            >
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
              <span>Contact Sheet</span>
            </button>
          )}

          {onOpenPlanInspector && (
            <button
              type="button"
              onClick={onOpenPlanInspector}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
              title="Inspect Plan & Verified Facts"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Verified Claims</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenThemeCustomizer}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            title="Configure Theme & Visual Options"
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
              style={{ backgroundColor: currentPalette.accent }}
            />
            <span>Theme: {currentPalette.name.split(' ')[0]}</span>
          </button>

          {lastSavedTime && (
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono tabular-nums whitespace-nowrap shrink-0">
              <span>Draft {lastSavedTime}</span>
              {onResetDraft && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={onResetDraft}
                    className="text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                    title="Reset workspace"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Zone 3: Primary Studio Actions (Saved Posts Vault + Preview & Tools Drawer) + Mobile Overflow */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenSavedPostsDrawer && (
            <button
              type="button"
              onClick={onOpenSavedPostsDrawer}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-cyan-400/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Open Saved & Posted Carousels Vault"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-cyan-300" />
              <span>Saved Posts</span>
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-cyan-400/20 text-cyan-100">
                {savedPostsCount}
              </span>
            </button>
          )}

          {onOpenPreviewDrawer && (
            <button
              type="button"
              onClick={() => onOpenPreviewDrawer('simulator')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              style={{ borderColor: `${currentPalette.accent}50` }}
              title="Open Slide-Out TikTok Feed Simulator & Per-Slide Polish Tools"
            >
              <Smartphone className="w-3.5 h-3.5" style={{ color: currentPalette.accent }} />
              <span className="hidden sm:inline">Preview & Tools</span>
            </button>
          )}

          {/* Mobile Overflow Menu Button (Visible on < md) */}
          <div className="relative md:hidden" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer touch-manipulation"
              title="More Options"
              aria-label="More Options"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
            </button>

            {isMobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-xl p-2 shadow-2xl space-y-1 z-50 animate-scale-up">
                {(onUndo || onRedo) && (
                  <div className="flex items-center gap-1 px-2 py-1 border-b border-white/10 mb-1">
                    <button
                      type="button"
                      onClick={() => {
                        onUndo?.();
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={!canUndo}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRedo?.();
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={!canRedo}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                      <span>Redo</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onOpenThemeCustomizer();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                    style={{ backgroundColor: currentPalette.accent }}
                  />
                  <span>Theme: {currentPalette.name}</span>
                </button>

                {onOpenContactSheet && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenContactSheet();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Grid className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Contact Sheet</span>
                  </button>
                )}

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

                {lastSavedTime && (
                  <div className="pt-1.5 mt-1 border-t border-white/10 px-3 py-1 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                    <span>Saved {lastSavedTime}</span>
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

