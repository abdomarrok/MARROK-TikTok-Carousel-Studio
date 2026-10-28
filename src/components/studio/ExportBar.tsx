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
  ArrowRight,
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
  onJumpToSlide?: (slideIndex: number) => void;
  hideActionRow?: boolean;
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
  onJumpToSlide,
  hideActionRow = false,
}) => {
  const isSinglePost = carousel.postFormat === 'single' || carousel.slides.length === 1;
  const ctaSlide = carousel.slides[carousel.slides.length - 1];
  const creatorCredit = (
    carousel.sourceMeta?.creator ||
    carousel.sourceMeta?.channel ||
    carousel.channel ||
    ctaSlide?.enCredit?.replace(/^Source:\s*/i, '') ||
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

  const needsHumanReview = (isOfflineDraft || engineType !== 'grounded') && !isReviewed;
  const qaFailures = qaReport.results.filter(
    (r) => r.severity === 'fail' && r.id !== 'fallback-draft-blocker'
  );
  const riskBlocks = (riskReport?.items || []).filter((i) => i.status === 'BLOCK');
  const totalBlockers =
    (needsHumanReview ? 1 : 0) +
    (!hasCreatorCredit ? 1 : 0) +
    qaFailures.length +
    riskBlocks.length;

  const isBlocked =
    (!qaReport.canExport || riskReport?.status === 'BLOCK' || !hasCreatorCredit) &&
    !overrideExportBlock;

  return (
    <div className="w-full space-y-3">
      {/* Unified Ready-to-Publish Checklist */}
      <div className="bg-slate-900/75 border border-white/10 rounded-xl p-3.5 space-y-3">
        {/* Checklist Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            {!isBlocked ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Ready to Publish Checklist
            </span>
            <span className="text-[11px] text-slate-400">
              · {isSinglePost ? 'Single-Slide Post' : `${carousel.slides.length}-Slide Carousel`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="engine-provenance-badge"
              className={`text-[11px] font-mono font-semibold ${
                engineType === 'grounded'
                  ? 'text-emerald-300'
                  : engineType === 'ungrounded'
                  ? 'text-cyan-300'
                  : 'text-amber-300'
              }`}
            >
              {engineType === 'grounded'
                ? 'Grounded (Search Verified)'
                : engineType === 'ungrounded'
                ? 'Ungrounded AI Draft'
                : 'Offline Synthesizer Draft'}
            </span>
            <span className="text-slate-600">·</span>
            <span
              className={`text-[11px] font-mono font-bold ${
                !isBlocked
                  ? 'text-emerald-300'
                  : 'text-amber-300'
              }`}
            >
              {!isBlocked
                ? overrideExportBlock && totalBlockers > 0
                  ? 'Override Active'
                  : 'All Checks Passed'
                : `${totalBlockers} Action(s) Needed`}
            </span>
          </div>
        </div>

        {/* Item 1: Human Review Verification */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-1.5 border-b border-white/5">
          <div className="text-xs">
            <div className="flex items-center gap-1.5">
              <span className={isReviewed || engineType === 'grounded' ? 'text-emerald-400' : 'text-amber-400'}>
                {isReviewed || engineType === 'grounded' ? '✓' : '●'}
              </span>
              <span className="font-semibold text-white">
                1. Human Fact & Copy Review
              </span>
            </div>
            <p className="text-[11px] text-slate-400 pl-4">
              {isReviewed
                ? 'Draft copy and technical claims reviewed by creator.'
                : isOfflineDraft
                ? 'Synthesized offline — review slide copy and mark as reviewed.'
                : 'Generated without live search citations — confirm claims before publishing.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-4 sm:pl-0">
            {isOfflineDraft && !isReviewed && (
              <button
                type="button"
                onClick={onRetryWithAi}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[11px] font-semibold cursor-pointer transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry AI</span>
              </button>
            )}

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
        </div>

        {/* Item 2: Creator / Source Attribution */}
        <div className="space-y-1.5 py-1.5 border-b border-white/5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className={hasCreatorCredit ? 'text-emerald-400' : 'text-rose-400'}>
                {hasCreatorCredit ? '✓' : '●'}
              </span>
              <span className="font-semibold text-white">
                2. Creator / Channel Attribution
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                ({isSinglePost ? 'Rendered in Standalone Footer' : 'Rendered on CTA Slide'})
              </span>
            </div>
            <span
              className={`text-[11px] font-mono ${
                hasCreatorCredit ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {hasCreatorCredit ? `Credited: ${creatorCredit}` : 'Required before export'}
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

        {/* Item 3: Platform Safety & Layout QA */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={
                  qaFailures.length === 0 && riskBlocks.length === 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }
              >
                {qaFailures.length === 0 && riskBlocks.length === 0 ? '✓' : '●'}
              </span>
              <span className="font-semibold text-white">
                3. Layout QA & Platform Safety
              </span>
            </div>

            {(qaReport.failCount > 0 || riskReport?.status === 'BLOCK' || !hasCreatorCredit) &&
              onToggleOverrideBlock && (
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

          {qaFailures.length === 0 && riskBlocks.length === 0 ? (
            <div className="text-[11px] text-slate-400 pl-4">
              1080×1920 safe zones, bilingual RTL punctuation, and originality checks passed.
            </div>
          ) : (
            <div className="space-y-1.5 pl-4">
              {qaFailures.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 text-[11px] text-rose-200 font-mono bg-rose-950/30 border border-rose-500/20 rounded-lg px-2.5 py-1.5"
                >
                  <span>• {r.message}</span>
                  {r.slideIndex !== undefined && onJumpToSlide && (
                    <button
                      type="button"
                      onClick={() => onJumpToSlide(r.slideIndex!)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-sans font-semibold shrink-0 cursor-pointer"
                    >
                      <span>Slide {r.slideIndex + 1}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
              {riskBlocks.map((item) => (
                <div
                  key={item.id}
                  className="text-[11px] text-rose-200 bg-rose-950/30 border border-rose-500/20 rounded-lg px-2.5 py-1.5"
                >
                  <span className="font-semibold text-white">{item.label}: </span>
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Saved Posts Library Persistence Card */}
      {onSavePost && (
        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white block">
                Saved Posts Library
              </span>
              <span className="text-[10px] text-slate-400">
                Persist validated {isSinglePost ? 'single-slide posts' : 'carousels'} to your backend & browser library
              </span>
            </div>
            {onOpenSavedPostsDrawer && (
              <button
                type="button"
                onClick={onOpenSavedPostsDrawer}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-cyan-300 font-semibold cursor-pointer shrink-0"
              >
                Open Saved Posts
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
              <span>{carousel.id ? 'Update Saved Draft' : 'Save as Valid Post'}</span>
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

      {/* Optional Action Row (hidden when Unified Delivery Bar is rendered in the Studio shell) */}
      {!hideActionRow && (
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
              <span className="text-[11px]">Copy Slide</span>
            </button>

            {onOpenContactSheet && !isSinglePost && (
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

          <button
            type="button"
            onClick={isSinglePost ? onDownloadSingleSlide : onExportZip}
            disabled={isExportingZip}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs tracking-wider transition-all shadow-lg whitespace-nowrap cursor-pointer disabled:opacity-50 ${
              isBlocked
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-teal-400 hover:bg-teal-300 text-slate-950'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[11px]">
              {isSinglePost ? 'Download JPG (1080×1920)' : 'Export ZIP'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};


