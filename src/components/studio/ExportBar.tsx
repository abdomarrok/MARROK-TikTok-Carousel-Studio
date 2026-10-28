import React from 'react';
import {
  Download,
  Copy,
  Check,
  RefreshCw,
  CheckCircle,
  Grid,
  ShieldAlert,
  ShieldCheck,
  BookmarkCheck,
  Send,
} from 'lucide-react';
import { CarouselData, SavedPostStatus, ThemePalette } from '../../types.ts';
import { QAReport } from '../../lib/qaChecks.ts';
import { RiskReport } from '../../lib/riskChecks.ts';

interface ExportBarProps {
  carousel: CarouselData;
  currentSlideIndex: number;
  theme: ThemePalette;
  isOfflineDraft: boolean;
  isReviewed: boolean;
  qaReport: QAReport;
  riskReport?: RiskReport;
  overrideExportBlock?: boolean;
  onToggleOverrideBlock?: () => void;
  isExportingZip: boolean;
  exportProgress: { current: number; total: number } | null;
  copiedType: 'caption' | 'slide' | null;
  onUpdateCreator?: (creator: string) => void;
  onToggleReviewDraft: () => void;
  onRetryWithAi: () => void;
  onDownloadSingleSlide: () => void;
  onCopySlide: () => void;
  onExportZip: () => void;
  onOpenContactSheet?: () => void;
  onSavePost?: (status: SavedPostStatus) => void;
  isSavingPost?: boolean;
  onOpenSavedPostsDrawer?: () => void;
}

export const ExportBar: React.FC<ExportBarProps> = ({
  carousel,
  currentSlideIndex,
  isOfflineDraft,
  isReviewed,
  qaReport,
  riskReport,
  overrideExportBlock = false,
  onToggleOverrideBlock,
  isExportingZip,
  exportProgress,
  copiedType,
  onUpdateCreator,
  onToggleReviewDraft,
  onRetryWithAi,
  onDownloadSingleSlide,
  onCopySlide,
  onExportZip,
  onOpenContactSheet,
  onSavePost,
  isSavingPost = false,
  onOpenSavedPostsDrawer,
}) => {
  const ctaSlide = carousel.slides[carousel.slides.length - 1];
  const creatorCredit = (
    carousel.sourceMeta?.creator ||
    carousel.sourceMeta?.channel ||
    carousel.channel ||
    ctaSlide?.enCredit ||
    ''
  ).trim();
  const hasCreatorCredit = creatorCredit.length > 0;

  const engineType =
    carousel.sourceMeta?.engine === 'grounded' || carousel.sourceMeta?.status === 'verified_live'
      ? 'grounded'
      : carousel.sourceMeta?.isFallback ||
        carousel.sourceMeta?.engine === 'offline' ||
        carousel.sourceMeta?.engine === 'offline-synthesizer'
      ? 'offline'
      : 'ungrounded';

  const isBlocked =
    (!qaReport.canExport || riskReport?.status === 'BLOCK' || !hasCreatorCredit) && !overrideExportBlock;

  return (
    <div className="w-full space-y-3">
      {/* Engine Provenance & Grounding Status Header */}
      <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Synthesis Engine:
          </span>
          <span
            data-testid="engine-provenance-badge"
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
              engineType === 'grounded'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : engineType === 'ungrounded'
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}
          >
            {engineType === 'grounded'
              ? '🔍 Grounded (Google Search Verified)'
              : engineType === 'ungrounded'
              ? '⚡ Ungrounded AI Draft'
              : '🛠 Offline Synthesizer Draft'}
          </span>
        </div>

        <button
          id="confirm-review-draft-btn"
          type="button"
          onClick={onToggleReviewDraft}
          className={`px-3 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
            isReviewed
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950 shadow-sm'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{isReviewed ? '✓ Reviewed (Unmark)' : '✓ I reviewed this draft'}</span>
        </button>
      </div>

      {/* Offline / Unverified Draft Warning Banner */}
      {(isOfflineDraft || engineType !== 'grounded') && !isReviewed && (
        <div className="border rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/10 border-amber-500/30">
          <div className="text-xs text-amber-200">
            <span className="font-bold uppercase tracking-wider block text-amber-300">
              Unverified Draft — Human Review Required
            </span>
            <span>
              {isOfflineDraft
                ? 'Synthesized using offline templates. Review slide copy and click "I reviewed this draft" before exporting.'
                : 'Generated without live Google Search citations. Review claims and click "I reviewed this draft".'}
            </span>
          </div>
          <button
            type="button"
            onClick={onRetryWithAi}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry with AI</span>
          </button>
        </div>
      )}

      {/* Creator / Channel Attribution Card (Required on CTA Slide) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold font-jakarta uppercase tracking-wider text-slate-300">
            Creator / Channel Credit (Rendered on CTA Slide)
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
              hasCreatorCredit
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {hasCreatorCredit ? `✓ Credited: ${creatorCredit}` : 'Required before export'}
          </span>
        </div>
        <input
          id="creator-channel-credit-input"
          type="text"
          value={creatorCredit}
          onChange={(e) => onUpdateCreator?.(e.target.value)}
          placeholder="Creator or Channel Name (e.g. MARROK, Anthropic Engineering, Hussein Nasser)"
          className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
        />
      </div>

      {/* Platform Safety Risk Report (PASS / WARN / BLOCK) */}
      {riskReport && (
        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {riskReport.status === 'PASS' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                Platform Safety & Originality Gate
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                riskReport.status === 'PASS'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : riskReport.status === 'WARN'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {riskReport.status}
            </span>
          </div>

          <div className="space-y-1">
            {riskReport.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 text-[11px] py-1 border-t border-white/5 first:border-t-0"
              >
                <div className="text-slate-300">
                  <span className="font-semibold text-white">{item.label}: </span>
                  <span>{item.message}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                    item.status === 'PASS'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : item.status === 'WARN'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QA Failures & Override Control */}
      {(qaReport.failCount > 0 || riskReport?.status === 'BLOCK') && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
              Pre-Export QA & Safety Gate ({qaReport.failCount} QA fail, {riskReport?.blockCount ?? 0} risk block)
            </span>
            {onToggleOverrideBlock && (
              <label className="flex items-center gap-1.5 text-[11px] text-amber-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overrideExportBlock}
                  onChange={onToggleOverrideBlock}
                  className="rounded border-white/20 bg-black/60 text-amber-400 focus:ring-0"
                />
                <span>Override & allow export</span>
              </label>
            )}
          </div>
          {qaReport.results
            .filter((r) => r.severity === 'fail')
            .slice(0, 4)
            .map((r) => (
              <div key={r.id} className="text-[11px] text-rose-200/90 font-mono">
                • {r.message}
              </div>
            ))}
        </div>
      )}

      {/* Validated & Posted Vault Persistence Card */}
      {onSavePost && (
        <div className="bg-slate-900/70 border border-cyan-500/25 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white block">
                Backend Post Vault (Valid & Posted Only)
              </span>
              <span className="text-[10px] text-slate-400">
                Save verified posts to the backend & IndexedDB Vault instead of static starter data
              </span>
            </div>
            {onOpenSavedPostsDrawer && (
              <button
                type="button"
                onClick={onOpenSavedPostsDrawer}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-cyan-300 font-semibold cursor-pointer shrink-0"
              >
                Open Vault
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSavingPost}
              onClick={() => onSavePost('validated')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-cyan-300" />
              <span>{carousel.id ? 'Update Validated Post' : 'Save as Valid Post'}</span>
            </button>

            <button
              type="button"
              disabled={isSavingPost}
              onClick={() => onSavePost('posted')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-emerald-300" />
              <span>Save & Mark as Posted</span>
            </button>
          </div>
        </div>
      )}

      {/* Docked Action & Delivery Bar */}
      <div className="p-2.5 rounded-xl bg-black/60 border border-white/15 shadow-xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDownloadSingleSlide}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            title={`Download Slide ${currentSlideIndex + 1} JPG`}
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">JPG</span>
          </button>

          <button
            type="button"
            onClick={onCopySlide}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            title="Copy Slide to Clipboard"
          >
            {copiedType === 'slide' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="text-[11px]">Copy</span>
          </button>

          {onOpenContactSheet && (
            <button
              type="button"
              onClick={onOpenContactSheet}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              title="Visual QA Contact Sheet (Spec §10)"
            >
              <Grid className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px] hidden sm:inline">Contact Sheet</span>
            </button>
          )}
        </div>

        {/* Primary Export All ZIP */}
        <button
          type="button"
          onClick={onExportZip}
          disabled={isExportingZip}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs tracking-wider transition-all shadow-lg whitespace-nowrap cursor-pointer disabled:opacity-50 ${
            isBlocked
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              : 'bg-teal-400 hover:bg-teal-300 text-slate-950'
          }`}
          title={
            isBlocked
              ? 'Review QA/Risk gates or enable Override before exporting'
              : 'Export all 1080×1920 JPG slides as ZIP'
          }
        >
          {isExportingZip ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[11px]">
                {exportProgress ? `${exportProgress.current}/${exportProgress.total}` : 'Exporting...'}
              </span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span className="text-[11px]">Export ZIP</span>
              {!qaReport.canExport && (
                <span
                  className="text-[10px] bg-slate-950/20 px-1 rounded font-bold text-amber-900"
                  title={`${qaReport.failCount} QA issues`}
                >
                  ⚠️ {qaReport.failCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

