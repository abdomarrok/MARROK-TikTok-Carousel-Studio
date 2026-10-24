import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
  Palette,
  ExternalLink,
  MessageSquare,
  FileCheck2,
} from 'lucide-react';
import { CarouselData, ThemePalette } from '../types';
import { renderSlideToCanvas, downloadAllSlidesZip, downloadSingleSlidePng, downloadContactSheetJpg, copySlideToClipboard } from '../lib/canvasExporter';
import { runQAChecks, qaReportSummary, QAReport } from '../lib/qaChecks';
import { sanitizeFullCarousel } from '../lib/textSanitizer';

interface ExportViewProps {
  carousel: CarouselData;
  theme: ThemePalette;
  onUpdateCarousel: (updated: CarouselData) => void;
  onSelectSlideToEdit: (index: number) => void;
  onOpenThemeCustomizer: () => void;
  onShowToast: (msg: string) => void;
}

export const ExportView: React.FC<ExportViewProps> = ({
  carousel,
  theme,
  onUpdateCarousel,
  onSelectSlideToEdit,
  onOpenThemeCustomizer,
  onShowToast,
}) => {
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isExportingSheet, setIsExportingSheet] = useState(false);
  const [copiedSection, setCopiedSection] = useState<'caption' | 'firstComment' | 'hook' | null>(null);
  const [qaReport, setQaReport] = useState<QAReport>(() => runQAChecks(carousel));
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Refresh QA whenever carousel changes
  useEffect(() => {
    setQaReport(runQAChecks(carousel));
  }, [carousel]);

  // Render miniature previews for contact sheet
  useEffect(() => {
    let isMounted = true;
    const total = carousel.slides.length;

    async function renderAllThumbnails() {
      for (let i = 0; i < total; i++) {
        const c = canvasRefs.current[i];
        if (c && isMounted) {
          try {
            await renderSlideToCanvas(carousel, i, c, theme);
          } catch (err) {
            console.error(`Failed rendering thumbnail ${i}:`, err);
          }
        }
      }
    }

    renderAllThumbnails();

    return () => {
      isMounted = false;
    };
  }, [carousel, theme]);

  const handleExportZip = async () => {
    setIsExportingZip(true);
    setExportProgress({ current: 0, total: carousel.slides.length });
    try {
      await downloadAllSlidesZip(carousel, theme, (current, total) => {
        setExportProgress({ current, total });
      });
      onShowToast('All 1080×1920 JPG slides exported into ZIP successfully!');
    } catch (err) {
      console.error('ZIP export failed:', err);
      onShowToast('Failed to export ZIP file.');
    } finally {
      setIsExportingZip(false);
      setExportProgress(null);
    }
  };

  const handleExportContactSheet = async () => {
    setIsExportingSheet(true);
    try {
      await downloadContactSheetJpg(carousel, theme);
      onShowToast('Exported full-deck Contact Sheet JPG (Spec §10)!');
    } catch (err) {
      console.error('Contact sheet export failed:', err);
      onShowToast('Failed to export contact sheet.');
    } finally {
      setIsExportingSheet(false);
    }
  };

  const handleCopyText = async (text: string, section: 'caption' | 'firstComment' | 'hook') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      onShowToast(`Copied ${section === 'caption' ? 'TikTok Caption' : section === 'firstComment' ? 'First Comment' : 'Screen Hook'} to clipboard!`);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      onShowToast('Failed to copy text.');
    }
  };

  const handleSanitizeCarousel = () => {
    const cleaned = sanitizeFullCarousel(carousel);
    onUpdateCarousel(cleaned);
    onShowToast('Cleaned markdown syntax, orphan dots, and RTL punctuation across all slides!');
  };

  const formattedCaption = `${carousel.caption || ''}\n\n#SoftwareArchitecture #TechTok #Programming #DevLife #SystemDesign`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Top Export Command Center */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }}
              />
              <h1 className="text-xl font-extrabold text-white font-jakarta">
                Export & Publishing Center
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-slate-300">
                {carousel.slides.length} SLIDES · {theme.name.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Audit quality compliance, copy TikTok posting assets, and export high-resolution 1080×1920 visuals.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenThemeCustomizer}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5" style={{ color: theme.accent }} />
              <span>Theme: {theme.name.split(' ')[0]}</span>
            </button>

            <button
              type="button"
              onClick={handleExportContactSheet}
              disabled={isExportingSheet}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isExportingSheet ? 'Rendering...' : 'Contact Sheet JPG'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              {isExportingZip ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {exportProgress ? `Exporting ${exportProgress.current}/${exportProgress.total}...` : 'Packaging ZIP...'}
                  </span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All 1080×1920 (ZIP)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Indicators Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <ShieldCheck
              className="w-5 h-5 shrink-0"
              style={{ color: qaReport.failCount === 0 ? '#34D399' : '#F43F5E' }}
            />
            <div>
              <div className="text-xs font-bold text-white">
                {qaReport.failCount === 0 ? 'Spec Compliance: PASSED' : `${qaReport.failCount} Compliance Errors`}
              </div>
              <div className="text-[10px] text-slate-400">
                {qaReport.warnCount} warnings · {carousel.slides.length} slides evaluated
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">Native 9:16 Canvas</div>
              <div className="text-[10px] text-slate-400">
                1080×1920 resolution · Safe zones verified
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Sparkles className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">Bilingual Engine</div>
              <div className="text-[10px] text-slate-400">
                English (Plus Jakarta Sans) & Arabic (Cairo)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Left Column (Full Contact Sheet) + Right Column (Publishing Kit & QA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Contact Sheet Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full Carousel Contact Sheet (Click Any Slide to Edit)</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">1080×1920 Preview</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {carousel.slides.map((slide, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl border border-white/10 bg-black/60 overflow-hidden hover:border-white/30 transition-all shadow-md flex flex-col"
              >
                {/* Canvas Thumbnail */}
                <div
                  className="aspect-[9/16] w-full overflow-hidden relative cursor-pointer"
                  onClick={() => onSelectSlideToEdit(idx)}
                >
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[idx] = el;
                    }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />

                  {/* Hover Overlay with Edit Button */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-bold backdrop-blur-sm shadow">
                      Edit Slide #{idx + 1}
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono text-center line-clamp-2 px-2">
                      {slide.enTitle || 'Untitled'}
                    </span>
                  </div>

                  {/* Slide Number Badge */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/70 text-white border border-white/20 backdrop-blur-sm">
                    #{idx + 1} · {slide.type.toUpperCase()}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-2 border-t border-white/10 flex items-center justify-between bg-black/40 text-[10px]">
                  <button
                    type="button"
                    onClick={() => onSelectSlideToEdit(idx)}
                    className="text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadSingleSlidePng(
                        carousel,
                        idx,
                        `MARROK_Slide_${idx + 1}.jpg`,
                        theme
                      );
                      onShowToast(`Downloaded Slide ${idx + 1} JPG`);
                    }}
                    className="text-slate-400 hover:text-teal-300 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Download single 1080×1920 JPG"
                  >
                    <Download className="w-2.5 h-2.5" />
                    <span>JPG</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: QA Checklist & TikTok Copy Kit (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quality Assurance Card */}
          <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Automated QA Report</span>
              </div>
              {qaReport.warnCount > 0 && (
                <button
                  type="button"
                  onClick={handleSanitizeCarousel}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 font-semibold cursor-pointer transition-colors"
                >
                  Auto-Fix Issues
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Total Slides:</span>
                <span className="font-mono text-white">{carousel.slides.length} (Target: 8-9)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Slide 1 Archetype:</span>
                <span className="font-mono text-emerald-400">
                  {carousel.slides[0]?.type === 'hub' ? '✓ Hub Architecture' : '⚠️ Non-hub'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Final Slide Archetype:</span>
                <span className="font-mono text-emerald-400">
                  {carousel.slides[carousel.slides.length - 1]?.type === 'cta' ? '✓ CTA Conclusion' : '⚠️ Non-CTA'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Character Overflow:</span>
                <span className="font-mono text-white">
                  {qaReport.warnCount === 0 ? '✓ None (All within limits)' : `${qaReport.warnCount} warnings`}
                </span>
              </div>
            </div>
          </div>

          {/* TikTok Publishing Copy Kit */}
          <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <span>TikTok Publishing Copy Kit</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">1-Click Copy</span>
            </div>

            {/* Screen Hook (Slide 1 Text) */}
            {carousel.screenHook && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Screen Hook (Slide 1 Text)</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(carousel.screenHook || '', 'hook')}
                    className="flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200 cursor-pointer font-semibold"
                  >
                    {copiedSection === 'hook' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'hook' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white font-mono">
                  {carousel.screenHook}
                </div>
              </div>
            )}

            {/* Main Caption & Hashtags */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">TikTok Post Caption</span>
                <button
                  type="button"
                  onClick={() => handleCopyText(formattedCaption, 'caption')}
                  className="flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200 cursor-pointer font-semibold"
                >
                  {copiedSection === 'caption' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSection === 'caption' ? 'Copied' : 'Copy Caption'}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                {formattedCaption}
              </div>
            </div>

            {/* Pinned First Comment */}
            {carousel.firstComment && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Pinned First Comment</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(carousel.firstComment || '', 'firstComment')}
                    className="flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200 cursor-pointer font-semibold"
                  >
                    {copiedSection === 'firstComment' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'firstComment' ? 'Copied' : 'Copy Comment'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 text-xs text-slate-300 font-sans">
                  {carousel.firstComment}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
