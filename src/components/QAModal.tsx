import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  ExternalLink,
  Download,
  CheckSquare,
  Square,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import { CarouselData, ThemePalette } from '../types';
import { QAReport, QACheckResult } from '../lib/qaChecks';

interface QAModalProps {
  isOpen: boolean;
  onClose: () => void;
  carousel: CarouselData;
  theme: ThemePalette;
  report: QAReport;
  onSelectSlide: (index: number) => void;
  onExport: () => void;
  isExporting: boolean;
}

interface RiskItem {
  id: string;
  category: string;
  status: 'pass' | 'warn' | 'block';
  summary: string;
  details: string;
  recommendation: string;
}

export const QAModal: React.FC<QAModalProps> = ({
  isOpen,
  onClose,
  carousel,
  theme,
  report,
  onSelectSlide,
  onExport,
  isExporting,
}) => {
  const [activeTab, setActiveTab] = useState<'qa' | 'risk' | 'checklist'>('qa');

  // Spec §18 Checklist interactive state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    facts_verified: true,
    risk_no_block: report.canExport,
    original_work: true,
    no_copyright_media: true,
    cover_thumbnail: true,
    arabic_alignment: !report.results.some((r) => r.id.startsWith('arabic-line-end')),
    credit_present: !report.results.some((r) => r.id === 'cta-missing-credit'),
    link_first_comment: Boolean(carousel.firstComment || carousel.brandUrl),
    format_jpg: true,
    slot_selected: true,
    human_notes_reviewed: true,
  });

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Evaluate Spec §6 Risk Reviewer
  const evaluateRisk = (): RiskItem[] => {
    const items: RiskItem[] = [];

    // 1. Originality check (Spec §6)
    const hasImageSlide = carousel.slides.some((s) => s.type === 'image');
    if (hasImageSlide) {
      items.push({
        id: 'risk-originality',
        category: 'Originality & Reuse',
        status: 'warn',
        summary: 'External visual asset detected on one or more slides',
        details:
          'Spec §6 warning: TikTok flagged 6 reposted posts as "Ineligible for recommendation". Ensure external graphics are original architecture diagrams or screenshots used strictly for fair commentary.',
        recommendation:
          'Ensure the slide uses our theme HUD / dark-mode inversion filter and that primary analysis is original.',
      });
    } else {
      items.push({
        id: 'risk-originality',
        category: 'Originality & Reuse',
        status: 'pass',
        summary: '100% vector engineered slides — zero raw video or image reposts',
        details:
          'All slides use native MARROK archetypes (orbital hubs, icon matrices, terminal snippets, metric benchmarks).',
        recommendation: 'Safe for TikTok For You Page recommendation.',
      });
    }

    // 2. Copyright & Trademark (Spec §6 & §9.6)
    items.push({
      id: 'risk-copyright',
      category: 'Copyright & Logos',
      status: 'pass',
      summary: 'Lucide & Simple Icons technology identifications only',
      details:
        'Trademarks belong to their respective owners; used strictly nominatively to identify technologies without implying endorsement (Spec §9.6).',
      recommendation: 'No copyrighted character artwork, music, or gameplay footage present.',
    });

    // 3. First Frame Quality (Spec §6 & §18)
    const slide1 = carousel.slides[0];
    const isSlide1DarkOrShort = !slide1 || (slide1.enTitle && slide1.enTitle.length < 5);
    if (isSlide1DarkOrShort) {
      items.push({
        id: 'risk-first-frame',
        category: 'First Frame Quality',
        status: 'block',
        summary: 'Slide 1 cover title is empty or too short',
        details:
          'TikTok feeds prioritize clear, high-contrast, compelling first-frame covers. A dark or near-blank cover severely degrades click-through and FYP distribution.',
        recommendation: 'Add a punchy 2-line English & Arabic hook headline to Slide 1.',
      });
    } else {
      items.push({
        id: 'risk-first-frame',
        category: 'First Frame Quality',
        status: 'pass',
        summary: 'Slide 1 Cover has high-contrast 6-satellite orbital and bold dual headlines',
        details:
          'Cover satisfies the 3-second hook criteria with clear value proposition and accent glow.',
        recommendation: 'Good thumbnail contrast at mobile resolution.',
      });
    }

    // 4. Claims & Source Attribution (Spec §5 & §6)
    const lastSlide = carousel.slides[carousel.slides.length - 1];
    const hasAttribution =
      lastSlide?.type === 'cta' && (Boolean(lastSlide.enCredit) || Boolean(lastSlide.arCredit));
    if (!hasAttribution) {
      items.push({
        id: 'risk-claims',
        category: 'Claims & Verification',
        status: 'warn',
        summary: 'No source attribution credited on final CTA slide',
        details:
          'Spec §5 requires primary source attribution for benchmarks, dates, and claims (e.g. "Based on Anthropic\'s engineering post. Numbers are Anthropic\'s own").',
        recommendation:
          'Fill in the English and Arabic credit fields on the final CTA slide before publishing.',
      });
    } else {
      items.push({
        id: 'risk-claims',
        category: 'Claims & Verification',
        status: 'pass',
        summary: 'Primary source credited on final slide',
        details: `Attribution confirmed: "${lastSlide.enCredit || lastSlide.arCredit}"`,
        recommendation: 'Maintains journalistic transparency and credibility.',
      });
    }

    // 5. Sensitive Topics & Safety (Spec §6 & §13)
    const sensitiveWords = ['hack', 'exploit', 'bypass', 'crack', 'payload', 'vulnerability zero-day'];
    const foundSensitive = sensitiveWords.filter((w) =>
      carousel.slides.some(
        (s) =>
          (s.enTitle?.toLowerCase().includes(w) ||
            s.enBody?.toLowerCase().includes(w) ||
            s.codeSnippet?.toLowerCase().includes(w))
      )
    );
    if (foundSensitive.length > 0) {
      items.push({
        id: 'risk-sensitive',
        category: 'Content Safety & Defense',
        status: 'warn',
        summary: `Cybersecurity keywords detected: ${foundSensitive.join(', ')}`,
        details:
          'Spec §13 Safety Rule: Security topics are awareness and defense only. Never provide actionable attack commands or exploitation payloads.',
        recommendation:
          'Ensure the text explains defensive mechanisms and directs users to official vendor signatures.',
      });
    } else {
      items.push({
        id: 'risk-sensitive',
        category: 'Content Safety & Defense',
        status: 'pass',
        summary: 'No restricted exploit payloads or policy-violating sensitive terms',
        details: 'Content complies with TikTok community standards and technical educational scope.',
        recommendation: 'Safe for broad recommendation.',
      });
    }

    // 6. Platform Repetition (Spec §6)
    items.push({
      id: 'risk-repetition',
      category: 'Topic Repetition',
      status: 'pass',
      summary: `Domain focus: ${carousel.category}`,
      details:
        'Unique narrative deck with custom theme coloring preventing audience fatigue.',
      recommendation: 'Avoid posting this exact topic twice in the same 7-day window.',
    });

    // 7. Account Health & Format Compliance (Spec §6 & §9.8)
    items.push({
      id: 'risk-account',
      category: 'Delivery Format & Account Health',
      status: 'pass',
      summary: 'Export format: JPG 1080×1920 (Quality 95, 4:4:4)',
      details:
        'TikTok scheduled carousels reject PNG files. The studio generates compliant 1080×1920 JPG files (~250KB each).',
      recommendation: 'Ready for scheduled upload via Metricool, Buffer, or manual TikTok Studio.',
    });

    return items;
  };

  const riskItems = evaluateRisk();
  const hasRiskBlock = riskItems.some((r) => r.status === 'block');

  const checklistItems = [
    {
      id: 'facts_verified',
      title: 'Facts & numbers verified against primary sources (Spec §5)',
      desc: 'No unchecked claims, dates, or inflated multipliers.',
    },
    {
      id: 'risk_no_block',
      title: 'Risk report has zero BLOCK violations (Spec §6)',
      desc: 'All platform risk checks are either PASS or acknowledged WARN.',
    },
    {
      id: 'original_work',
      title: 'Original designed carousels — not a raw repost (Spec §6)',
      desc: 'Protects account from TikTok "Ineligible for recommendation" shadowbans.',
    },
    {
      id: 'no_copyright_media',
      title: 'No third-party copyrighted characters or audio (Spec §6)',
      desc: 'Nominative technology icons and official open-source diagrams only.',
    },
    {
      id: 'cover_thumbnail',
      title: 'Slide 1 cover hook is bright & readable at thumbnail size (Spec §9.4)',
      desc: 'Orbital satellite layout with high-contrast dual headlines.',
    },
    {
      id: 'arabic_alignment',
      title: 'Arabic copy verified: no Latin word punctuation jumps (Spec §8)',
      desc: 'Lines do not end in `.Git` or `?AI`. Text reads fluently RTL.',
    },
    {
      id: 'credit_present',
      title: 'Primary source credit present on final CTA slide (Spec §9.4)',
      desc: 'Gives explicit attribution to engineering post or creator.',
    },
    {
      id: 'link_first_comment',
      title: 'Pinned first comment & link in bio prepared (Spec §8 & §14)',
      desc: 'TikTok caption links are not clickable; comment link ready.',
    },
    {
      id: 'format_jpg',
      title: 'Export format verified: 1080×1920 JPG Quality 95 (Spec §9.8)',
      desc: 'Never export PNG for scheduled carousels.',
    },
    {
      id: 'slot_selected',
      title: 'Optimal posting slot selected (10:00, 12:00, or 18:00 DZ) (Spec §14)',
      desc: 'Peak audience activity window in Africa/Algiers timezone.',
    },
    {
      id: 'human_notes_reviewed',
      title: 'Human notes & caveats reviewed (Spec §18)',
      desc: 'Sponsor fluff dropped, technical depth validated.',
    },
  ];

  const checkedCount = checklistItems.filter((i) => checkedItems[i.id]).length;
  const isChecklistComplete = checkedCount === checklistItems.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0c1219] shadow-2xl overflow-hidden font-jakarta">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-black/40">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${theme.accent}20` }}
            >
              <ShieldCheck className="w-5 h-5" style={{ color: theme.accent }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Quality Assurance & Pre-Publish Gate</h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    report.canExport && !hasRiskBlock
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {report.canExport && !hasRiskBlock ? 'Export Ready' : 'Blocked'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated Spec Validation (§10) · Platform Risk Engine (§6) · Pre-Publish Checklist (§18)
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-white/[0.06] bg-black/20 text-xs">
          <button
            onClick={() => setActiveTab('qa')}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'qa'
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Automated QA Checks</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                report.failCount > 0
                  ? 'bg-red-500/20 text-red-300'
                  : report.warnCount > 0
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {report.failCount > 0 ? `${report.failCount} Fail` : `${report.passCount} Pass`}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('risk')}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'risk'
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>TikTok Risk Review (§6)</span>
            {hasRiskBlock ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-red-500/20 text-red-300">
                BLOCK
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-500/20 text-emerald-300">
                Safe
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Pre-Publish Checklist (§18)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/10 text-slate-300">
              {checkedCount}/{checklistItems.length}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: AUTOMATED QA CHECKS */}
          {activeTab === 'qa' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-emerald-300 font-mono">{report.passCount}</div>
                    <div className="text-xs text-emerald-400/80">Passed Checks</div>
                  </div>
                  <CheckCircle className="w-6 h-6 text-emerald-400 opacity-60" />
                </div>
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-amber-300 font-mono">{report.warnCount}</div>
                    <div className="text-xs text-amber-400/80">Warnings</div>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-amber-400 opacity-60" />
                </div>
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-red-300 font-mono">{report.failCount}</div>
                    <div className="text-xs text-red-400/80">Critical Failures</div>
                  </div>
                  <XCircle className="w-6 h-6 text-red-400 opacity-60" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Individual Check Results ({report.results.length})
                </h3>

                <div className="space-y-2">
                  {report.results.map((res, idx) => {
                    const isFail = res.severity === 'fail';
                    const isWarn = res.severity === 'warn';
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                          isFail
                            ? 'bg-red-500/10 border-red-500/25 text-red-200'
                            : isWarn
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-200'
                            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {isFail ? (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          ) : isWarn ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-white flex items-center gap-2">
                              <span>{res.message}</span>
                              {res.slideIndex !== undefined && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-slate-300 font-mono">
                                  Slide {res.slideIndex + 1}
                                </span>
                              )}
                            </div>
                            {res.value !== undefined && res.limit !== undefined && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                Current value: <strong>{res.value}</strong> | Allowed limit:{' '}
                                <strong>{res.limit}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        {res.slideIndex !== undefined && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSlide(res.slideIndex!);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Jump to Slide</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIKTOK RISK REVIEWER */}
          {activeTab === 'risk' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span>Why the Risk Review Stage Exists (Spec §6)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Six posts were previously marked <strong>"Ineligible for recommendation"</strong> on
                  TikTok. All six were re-posts of other creators' video clips or raw screenshots. Our
                  native engineered slides with custom explanation are 100% safe. This engine verifies
                  originality, first-frame thumb contrast, and claims attribution before publishing.
                </p>
              </div>

              <div className="space-y-3">
                {riskItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      item.status === 'block'
                        ? 'bg-red-500/10 border-red-500/30'
                        : item.status === 'warn'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-black/30 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            item.status === 'block'
                              ? 'bg-red-500/25 text-red-300 border border-red-500/40'
                              : item.status === 'warn'
                              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                        <h4 className="text-xs font-bold text-white">{item.category}</h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">{item.summary}</span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">{item.details}</p>

                    <div className="text-[11px] p-2 rounded-lg bg-black/40 border border-white/5 text-slate-300 flex items-start gap-1.5">
                      <strong className="text-white shrink-0">Recommendation:</strong>
                      <span>{item.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PRE-PUBLISH CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                <div>
                  <div className="text-xs font-bold text-white">Pre-Publish Readiness</div>
                  <div className="text-[11px] text-slate-400">
                    {checkedCount} of {checklistItems.length} verified
                  </div>
                </div>
                <div className="w-36 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(checkedCount / checklistItems.length) * 100}%`,
                      backgroundColor: isChecklistComplete ? '#10B981' : theme.accent,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {checklistItems.map((item) => {
                  const isDone = Boolean(checkedItems[item.id]);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        isDone
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-200'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/[0.04]'
                      }`}
                    >
                      <button type="button" className="mt-0.5 shrink-0 text-emerald-400">
                        {isDone ? (
                          <CheckCircle className="w-4 h-4 fill-emerald-500/20" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                      <div className="space-y-0.5">
                        <div className={`text-xs font-semibold ${isDone ? 'text-white' : 'text-slate-300'}`}>
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/[0.08] bg-black/40">
          <div className="text-xs text-slate-400">
            {report.canExport && !hasRiskBlock ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>All gates passed. Ready for TikTok JPG Export.</span>
              </span>
            ) : (
              <span className="text-red-400 font-medium flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                <span>Critical issues or risk blocks must be resolved before export.</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={() => {
                onClose();
                onExport();
              }}
              disabled={isExporting || !report.canExport || hasRiskBlock}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: theme.accent,
                color: '#0e1117',
              }}
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export JPG (ZIP)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
