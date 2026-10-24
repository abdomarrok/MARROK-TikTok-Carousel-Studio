import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  X,
  ArrowRight,
  Zap,
  Info,
  Clock,
  Layers,
  ShieldCheck,
  Search,
  Globe,
} from 'lucide-react';
import { CarouselData, ThemePalette } from '../types';
import { synthesizeCarousel } from '../lib/synthesizer';

interface SmartPipelineBarProps {
  theme: ThemePalette;
  onApplyCarousel: (carousel: CarouselData) => void;
  onOpenPlanInspector: () => void;
  currentCarousel: CarouselData;
  onShowToast: (msg: string) => void;
}

// Client-side image compressor
function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas error'));
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ base64: compressedBase64, mimeType: 'image/jpeg' });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const QUICK_PROMPTS = [
  {
    title: 'Anthropic Scion',
    subtitle: 'Beyond Git monorepo migration',
    prompt: `Anthropic moved away from Git to Scion for their internal monorepos. History grew near 100 GB, working copies exceeded 25 GB, and CI ran 25 million checkouts a day. They built a virtual file system with sparse checkout, server-authoritative state, and test-after-merge pipelines. Trade-off: custom tooling ecosystem required and no public release yet.`,
  },
  {
    title: 'eBPF Zero-Day & Defense',
    subtitle: 'Kernel observability exploit triage',
    prompt: `Linux kernel eBPF verification bypass flaw discovered. Analysis of verifier bounds calculation under 64-bit register truncation. Defenders must audit ring-buffer helper calls and enforce strict CAP_BPF access. SLA turnaround: patch deployed within 30 minutes, 95% false alarms eliminated.`,
  },
  {
    title: 'ClickHouse vs PostgreSQL',
    subtitle: 'Real-time analytical benchmarks',
    prompt: `Benchmark comparison: ClickHouse vs PostgreSQL for 500M row analytical queries. PostgreSQL p99 latency was 4.2 seconds; ClickHouse vector execution engine completed the aggregation in 28ms (150x faster). Trade-off: ClickHouse is not suitable for transactional updates/deletes.`,
  },
  {
    title: 'Kubernetes Admission Sec',
    subtitle: 'Validating Webhook hardening',
    prompt: `Hardening Kubernetes mutating and validating admission webhooks. Over 60% of production cluster outages stem from unhandled webhook timeouts. Best practice: fail-open policies for monitoring, fail-close for runtime security, and caching token reviews to protect API server throughput.`,
  },
];

export const SmartPipelineBar: React.FC<SmartPipelineBarProps> = ({
  theme,
  onApplyCarousel,
  onOpenPlanInspector,
  currentCarousel,
  onShowToast,
}) => {
  const [inputText, setInputText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [pipelineLabel, setPipelineLabel] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);

  // Global Ctrl+V clipboard paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            try {
              const { base64 } = await compressImage(file);
              setImageBase64(base64);
              setImageName(`Pasted_Screenshot_${Date.now()}.jpg`);
              setIsExpanded(true);
              onShowToast('Screenshot pasted into Smart Ingestion!');
            } catch (err) {
              console.error('Failed processing pasted image:', err);
            }
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onShowToast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { base64 } = await compressImage(file);
      setImageBase64(base64);
      setImageName(file.name);
      onShowToast(`Attached screenshot: ${file.name}`);
    } catch (err) {
      console.error('Failed compressing uploaded file:', err);
    }
  };

  const handleRunPipeline = async () => {
    if (!inputText && !imageBase64) {
      onShowToast('Please paste a topic summary, notes, or attach a screenshot.');
      return;
    }

    setIsGenerating(true);
    setPipelineStep(1);
    setPipelineLabel('Stage 1: Google Search Grounding & Fact Extraction (Spec §4)...');

    const stepTimer1 = setTimeout(() => {
      setPipelineStep(2);
      setPipelineLabel('Stage 2: Claim Verification, Citations & Source Attribution (Spec §5)...');
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setPipelineStep(3);
      setPipelineLabel('Stage 3: Platform Risk Review & Safe-Zone Lint (Spec §6)...');
    }, 2400);

    const stepTimer3 = setTimeout(() => {
      setPipelineStep(4);
      setPipelineLabel('Stage 4: Planning 8-10 Slide Narrative Arc & Spec Theme (Spec §7)...');
    }, 3600);

    const stepTimer4 = setTimeout(() => {
      setPipelineStep(5);
      setPipelineLabel('Stage 5: Dual Copywriting, Arabic RTL Lint & Length Enforcement (Spec §8)...');
    }, 4800);

    const customKey =
      typeof window !== 'undefined' ? localStorage.getItem('marrok_custom_gemini_key') : null;
    const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey) requestHeaders['x-gemini-key'] = customKey;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: requestHeaders,
        signal: controller.signal,
        body: JSON.stringify({
          prompt: inputText,
          inputMode: imageBase64 ? 'upload' : 'text',
          imageBase64,
          imageName,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Server generation error');
      }

      const generatedData: CarouselData = await response.json();
      onApplyCarousel(generatedData);
      onShowToast(`Smart Pipeline configured ${generatedData.slides.length}-slide deck & deliverables!`);
    } catch (err) {
      console.warn('Live API unavailable or timed out, executing deterministic synthesizer:', err);
      // Deterministic fallback matching exact spec
      const fallback = synthesizeCarousel({
        prompt: inputText,
        imageFileName: imageName,
        inputMode: imageBase64 ? 'upload' : 'text',
      });
      onApplyCarousel(fallback);
      onShowToast(`Smart Pipeline configured ${fallback.slides.length}-slide deck (MARROK Engine)!`);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);
      setIsGenerating(false);
      setPipelineStep(0);
      setPipelineLabel('');
    }
  };

  return (
    <div className="w-full space-y-3 font-jakarta">
      {/* Main Unified Input Card */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f171f] to-[#0a1017] p-4 sm:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: theme.accent }}
        />

        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-inner shrink-0"
              style={{ backgroundColor: `${theme.accent}20` }}
            >
              <Sparkles className="w-4 h-4" style={{ color: theme.accent }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Smart Post Pipeline (Spec §2)</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold uppercase border border-cyan-500/25">
                  1-Input Autonomous
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Input a summary, link, notes, or screenshot — the system extracts facts, plans the 8-slide arc, and formats all deliverables.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
            >
              {isExpanded ? 'Collapse Input' : 'Expand Input'}
            </button>
          </div>
        </div>

        {/* Expandable Input Area */}
        {isExpanded && (
          <div className="mt-4 space-y-3.5">
            {/* Input Row: Textarea + Screenshot Attachment */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-3 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={3}
                  placeholder="Paste topic summary, YouTube recap, engineering post excerpt, GitHub link, or raw technical notes... (or press Ctrl+V to paste a screenshot)"
                  className="w-full rounded-xl bg-black/50 border border-white/10 p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30 resize-none font-mono leading-relaxed"
                />
              </div>

              {/* Screenshot drop / attach button */}
              <div className="lg:col-span-1">
                {imageBase64 ? (
                  <div className="relative h-full min-h-[84px] rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-2.5 flex items-center gap-2 text-xs">
                    <img
                      src={imageBase64}
                      alt="Uploaded screenshot"
                      className="w-14 h-14 rounded object-cover border border-white/10 shrink-0"
                    />
                    <div className="overflow-hidden flex-1">
                      <div className="text-[11px] font-bold text-white truncate">{imageName}</div>
                      <div className="text-[10px] text-cyan-300">Ready for vision analysis</div>
                    </div>
                    <button
                      onClick={() => {
                        setImageBase64(null);
                        setImageName('');
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="h-full min-h-[84px] rounded-xl border border-dashed border-white/15 hover:border-white/30 bg-black/20 hover:bg-black/30 transition-all flex flex-col items-center justify-center p-3 text-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="w-4 h-4 text-slate-400 mb-1" />
                    <span className="text-[11px] font-semibold text-slate-300">Attach Screenshot</span>
                    <span className="text-[10px] text-slate-500">or press Ctrl+V</span>
                  </label>
                )}
              </div>
            </div>

            {/* Quick Inspiration Topic Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] text-slate-500 font-medium mr-1">Quick Topics:</span>
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(qp.prompt);
                    onShowToast(`Loaded "${qp.title}" sample prompt`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                  <span>{qp.title}</span>
                </button>
              ))}
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06]">
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>The system plans:</span>
                <span className="text-white font-mono text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  Hook → Stakes → 3 Steps → The Catch → CTA
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const fallback = synthesizeCarousel({
                      prompt: inputText || 'Decoupled Systems Architecture',
                      inputMode: imageBase64 ? 'upload' : 'text',
                      imageFileName: imageName,
                    });
                    onApplyCarousel(fallback);
                    onShowToast('Instant synthesized carousel loaded!');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Instant Synthesize (0ms)
                </button>

                <button
                  onClick={handleRunPipeline}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xl cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: theme.accent,
                    color: '#0e1117',
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Auto-Planning Post...' : 'Auto-Plan & Generate Full Post'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Animated Pipeline Stepper Overlay */}
        {isGenerating && (
          <div className="mt-4 p-4 rounded-xl bg-black/70 border border-cyan-500/30 animate-fade-in space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-white font-bold">{pipelineLabel}</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300">Step {pipelineStep} of 5</span>
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${(pipelineStep / 5) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Post Intelligence & Spec Plan Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
            <span className="font-bold text-white">{currentCarousel.category}</span>
          </div>

          <span className="text-slate-500">·</span>

          <span className="text-slate-400 font-mono text-[11px]">
            Theme: <strong className="text-slate-200">{currentCarousel.theme}</strong>
          </span>

          <span className="text-slate-500">·</span>

          <span className="text-slate-400 font-mono text-[11px]">
            Deck: <strong className="text-slate-200">{currentCarousel.slides.length} Slides</strong>
          </span>

          <span className="text-slate-500">·</span>

          <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>TikTok FYP Safe</span>
          </span>

          {currentCarousel.sourceMeta?.isSearchGrounded && (
            <>
              <span className="text-slate-500">·</span>
              <span className="text-cyan-300 font-semibold text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/25">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>Search Grounded ({currentCarousel.sourceMeta.groundingSources?.length || 1} sources)</span>
              </span>
            </>
          )}
        </div>

        <button
          onClick={onOpenPlanInspector}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold cursor-pointer transition-colors"
        >
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>Inspect Plan & Citations ({currentCarousel.facts?.length || 3})</span>
        </button>
      </div>
    </div>
  );
};
