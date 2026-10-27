import React from 'react';
import { Download, Copy, Check, RefreshCw, CheckCircle, Grid } from 'lucide-react';
import { CarouselData, ThemePalette } from '../../types.ts';
import { QAReport } from '../../lib/qaChecks.ts';

interface ExportBarProps {
  carousel: CarouselData;
  currentSlideIndex: number;
  theme: ThemePalette;
  isOfflineDraft: boolean;
  isReviewed: boolean;
  qaReport: QAReport;
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
}

export const ExportBar: React.FC<ExportBarProps> = ({
  carousel,
  currentSlideIndex,
  theme,
  isOfflineDraft,
  isReviewed,
  qaReport,
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
}) => {
  const creatorCredit = (carousel.sourceMeta?.creator || carousel.sourceMeta?.channel || '').trim();
  const hasCreatorCredit = creatorCredit.length > 0 && creatorCredit.toLowerCase() !== 'marrok';
  const isExportBlocked = (isOfflineDraft && !isReviewed) || !qaReport.canExport || !hasCreatorCredit;

  return (
    <div className="space-y-4">
      {/* Offline Draft Warning Banner */}
      {isOfflineDraft && (
        <div
          className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md transition-colors ${
            isReviewed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                isReviewed
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}
            >
              <span className="font-bold text-sm">{isReviewed ? '✓' : '⚠️'}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold font-jakarta uppercase tracking-wider ${
                    isReviewed ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {isReviewed ? 'Draft Reviewed — QA Validation Active' : 'Unverified Offline Draft (AI Unavailable)'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isReviewed
                      ? qaReport.canExport
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {isReviewed
                    ? qaReport.canExport
                      ? 'QA Passed · Ready'
                      : `Blocked: ${qaReport.failCount} QA Issue(s)`
                    : 'Export Locked'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isReviewed
                  ? 'You explicitly confirmed review of this draft. QA rules enforce unique body copy across slides and strict headline guidelines.'
                  : 'Synthesized using offline fallback templates. Facts are unverified estimates. Review slide copy and click "I reviewed this draft" to proceed.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="confirm-review-draft-btn"
              type="button"
              onClick={onToggleReviewDraft}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                isReviewed
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950 shadow-md'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isReviewed ? '✓ Reviewed (Click to Unmark)' : '✓ I reviewed this draft'}</span>
            </button>
            <button
              type="button"
              onClick={onRetryWithAi}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry with AI</span>
            </button>
          </div>
        </div>
      )}

      {/* Creator / Channel Attribution Card (Required for Slide 8 citation & manifest) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold font-jakarta uppercase tracking-wider text-slate-300">
              Creator / Channel Attribution <span className="text-cyan-400 font-bold">*</span>
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                hasCreatorCredit
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
              }`}
            >
              {hasCreatorCredit ? '✓ Credited on Slide 8' : 'Required before export'}
            </span>
          </div>
          <input
            id="creator-channel-credit-input"
            type="text"
            value={carousel.sourceMeta?.creator || carousel.sourceMeta?.channel || ''}
            onChange={(e) => onUpdateCreator?.(e.target.value)}
            placeholder="Creator or Channel Name (e.g. ByteByteGo, Hussein Nasser, ArjanCodes, Stanford CS)"
            className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
          />
        </div>
      </div>

      {/* Docked Action & Delivery Bar */}
      <div className="p-2.5 rounded-xl bg-black/60 border border-white/15 shadow-xl flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDownloadSingleSlide}
            disabled={isOfflineDraft && !isReviewed}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isOfflineDraft && !isReviewed
                ? 'border-white/5 bg-white/[0.02] text-slate-500 cursor-not-allowed'
                : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 cursor-pointer'
            }`}
            title={isOfflineDraft && !isReviewed ? 'Download locked: Review draft first' : `Download Slide ${currentSlideIndex + 1} JPG`}
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">JPG</span>
          </button>

          <button
            type="button"
            onClick={onCopySlide}
            disabled={isOfflineDraft && !isReviewed}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isOfflineDraft && !isReviewed
                ? 'border-white/5 bg-white/[0.02] text-slate-500 cursor-not-allowed'
                : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 cursor-pointer'
            }`}
            title={isOfflineDraft && !isReviewed ? 'Copy locked: Review draft first' : 'Copy Slide to Clipboard'}
          >
            {copiedType === 'slide' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
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
          disabled={isExportingZip || isExportBlocked}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs tracking-wider transition-all shadow-lg whitespace-nowrap ${
            isExportBlocked
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed'
              : 'bg-teal-400 hover:bg-teal-300 text-slate-950 cursor-pointer disabled:opacity-50'
          }`}
          title={
            isOfflineDraft && !isReviewed
              ? 'Export locked: Confirm "I reviewed this draft" in banner first.'
              : !hasCreatorCredit
              ? 'Export locked: Enter creator or channel name above.'
              : !qaReport.canExport
              ? `Export blocked: ${qaReport.failCount} QA issue(s) detected.`
              : 'Export all 1080×1920 slides as ZIP'
          }
        >
          {isExportingZip ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[11px]">{exportProgress ? `${exportProgress.current}/${exportProgress.total}` : 'Exporting...'}</span>
            </>
          ) : isOfflineDraft && !isReviewed ? (
            <>
              <span className="text-xs">🔒</span>
              <span className="text-[11px]">Draft Locked</span>
            </>
          ) : !hasCreatorCredit ? (
            <>
              <span className="text-xs">⚠️</span>
              <span className="text-[11px]">Creator Required</span>
            </>
          ) : !qaReport.canExport ? (
            <>
              <span className="text-xs">⚠️</span>
              <span className="text-[11px]">QA Issues ({qaReport.failCount})</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span className="text-[11px]">Export ZIP</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
