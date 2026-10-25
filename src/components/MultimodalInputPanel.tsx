import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  FileText,
  Youtube,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCw,
} from 'lucide-react';
import { CarouselData, ThemePalette } from '../types';
import { synthesizeCarousel } from '../lib/synthesizer';
import { runAutonomousPipeline, enrichAndPaceCarousel } from '../lib/autonomousPipeline';

interface MultimodalInputPanelProps {
  theme: ThemePalette;
  onApplyCarousel: (carousel: CarouselData) => void;
  onClose?: () => void;
}

type InputTab = 'upload' | 'text' | 'youtube';

const INPUT_TABS: { id: InputTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upload', label: 'Screenshot / Image', icon: Upload },
  { id: 'text', label: 'Blog / GitHub / Notes', icon: FileText },
  { id: 'youtube', label: 'YouTube Summary', icon: Youtube },
];

/**
 * Client-side image compressor:
 * Downscales large mobile screenshots (often 5-20MB) to max 1280px JPEG (~150KB),
 * preventing mobile network timeouts and "Failed to fetch" errors.
 */
function compressImageClientSide(file: File): Promise<{ base64: string; mimeType: string; sizeKb: number }> {
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
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        const sizeKb = Math.round((compressedBase64.length * 3) / 4 / 1024);
        resolve({
          base64: compressedBase64,
          mimeType: 'image/jpeg',
          sizeKb,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const MultimodalInputPanel: React.FC<MultimodalInputPanelProps> = ({
  theme,
  onApplyCarousel,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<InputTab>('upload');
  const [promptText, setPromptText] = useState('');
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [uploadedImageMime, setUploadedImageMime] = useState<string>('image/jpeg');
  const [uploadedImageName, setUploadedImageName] = useState<string>('');
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null);
  const [categoryHint, setCategoryHint] = useState<string>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle local file upload with instant client-side downscaling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setUploadedImageName(file.name);
    setErrorMsg(null);

    try {
      const { base64, mimeType, sizeKb } = await compressImageClientSide(file);
      setUploadedImageBase64(base64);
      setUploadedImageMime(mimeType);
      setImageSizeKb(sizeKb);
    } catch (err) {
      console.warn('Image downscaling failed, using raw file fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImageBase64(reader.result as string);
        setUploadedImageMime(file.type || 'image/jpeg');
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick load one of the demo images
  const handleSelectDemoImage = async (imagePath: string, title: string) => {
    try {
      const res = await fetch(imagePath);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImageBase64(reader.result as string);
        setUploadedImageMime(blob.type || 'image/jpeg');
        setUploadedImageName(title);
        setImageSizeKb(Math.round(blob.size / 1024));
        setErrorMsg(null);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn('Could not load demo image:', err);
    }
  };

  // Instant local synthesis fallback (0ms latency, zero network dependence)
  const handleInstantSynthesize = () => {
    try {
      const generated = synthesizeCarousel({
        prompt: promptText,
        categoryHint,
        inputMode: activeTab,
        imageFileName: uploadedImageName,
      });
      const processed = enrichAndPaceCarousel(generated, promptText);
      onApplyCarousel(processed);
      setSuccessMsg(`Generated ${processed.slides.length}-slide carousel & bilingual caption (Instant Mode)!`);
      if (onClose) {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Instant synthesis failed.');
    }
  };

  // Submit to unified autonomous pipeline with progressive status and resilient fallback
  const handleGenerate = async () => {
    if (!promptText && !uploadedImageBase64) {
      setErrorMsg('Please provide some raw text, transcript, or upload a screenshot to analyze.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPipelinePhase(uploadedImageBase64 ? 'Processing image & synthesizing carousel...' : 'Synthesizing carousel & bilingual copy...');

    try {
      const generatedData = await runAutonomousPipeline(promptText, {
        onProgress: (status) => setPipelinePhase(status),
        inputMode: activeTab,
        imageBase64: uploadedImageBase64,
        imageMimeType: uploadedImageMime,
        imageName: uploadedImageName,
        categoryHint,
        generateDiagram: !uploadedImageBase64,
      });

      onApplyCarousel(generatedData);
      setSuccessMsg(`Generated ${generatedData.slides.length}-slide carousel & bilingual caption!`);
      if (onClose) {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Autonomous pipeline generation encountered an error, falling back locally:', errMsg);

      try {
        const fallbackData = synthesizeCarousel({
          prompt: promptText,
          categoryHint,
          inputMode: activeTab,
          imageFileName: uploadedImageName,
        });
        const processed = enrichAndPaceCarousel(fallbackData, promptText);
        onApplyCarousel(processed);
        setSuccessMsg(`Generated ${processed.slides.length}-slide carousel & caption via MARROK Resilient Engine!`);
        if (onClose) {
          setTimeout(() => onClose(), 1400);
        }
      } catch (fallbackErr: unknown) {
        const fbMessage = fallbackErr instanceof Error ? fallbackErr.message : errMsg;
        setErrorMsg(fbMessage || 'Generation failed. Tap Instant Synthesize to generate immediately.');
      }
    } finally {
      setIsLoading(false);
      setPipelinePhase('');
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1318]/95 p-6 shadow-2xl backdrop-blur-xl space-y-5">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-inner"
            style={{ backgroundColor: `${theme.accent}20` }}
          >
            <Sparkles className="w-5 h-5" style={{ color: theme.accent }} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white font-jakarta">
              Multimodal Content Engine
            </h2>
            <p className="text-xs text-slate-400">
              Transform social screenshots, YouTube transcripts, blog notes, or code into MARROK carousels
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 text-xs overflow-x-auto">
        {INPUT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              style={{
                color: isActive ? theme.accent : undefined,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Image Upload */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-white/15 rounded-2xl p-6 text-center hover:border-white/30 transition-all bg-black/20">
            <input
              type="file"
              id="screenshot-upload"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="screenshot-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${theme.accent}15` }}
              >
                <ImageIcon className="w-6 h-6" style={{ color: theme.accent }} />
              </div>
              <div className="text-sm font-bold text-white">
                {uploadedImageName ? `Selected: ${uploadedImageName}` : 'Drop social screenshot or click to browse'}
              </div>
              {imageSizeKb && (
                <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-400">
                  Optimized ({imageSizeKb} KB) for fast mobile transmission
                </div>
              )}
              <p className="text-xs text-slate-400 max-w-sm">
                Upload screenshots from Twitter/X, LinkedIn posts, code snippets, or slide decks for OCR & extraction.
              </p>
            </label>
          </div>

          {/* Quick Demo Image Selector */}
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono block mb-2">
              Or analyze user attached slide samples:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSelectDemoImage(
                    '/assets/aistudio/slide1-2_637edc85.jpg',
                    'Anthropic Scion Hub Slide'
                  )
                }
                className="p-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-left text-xs text-slate-300 transition-colors"
              >
                <div className="font-semibold text-white truncate">Slide 1: Scion Hub</div>
                <div className="text-[10px] text-slate-400">Anthropic move beyond Git</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSelectDemoImage(
                    '/assets/aistudio/slide6-1_44b08b41.jpg',
                    'Anthropic Results Slide'
                  )
                }
                className="p-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-left text-xs text-slate-300 transition-colors"
              >
                <div className="font-semibold text-white truncate">Slide 6: 3-Metrics</div>
                <div className="text-[10px] text-slate-400">200x smaller, 25% CPU</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSelectDemoImage(
                    '/assets/aistudio/slide9_a2264cfb.jpg',
                    'Anthropic CTA Slide'
                  )
                }
                className="p-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-left text-xs text-slate-300 transition-colors"
              >
                <div className="font-semibold text-white truncate">Slide 9: MARROK CTA</div>
                <div className="text-[10px] text-slate-400">AI agents at scale</div>
              </button>
            </div>
          </div>

          {/* Optional context text */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Additional Context or Guidance (Optional)
            </label>
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. Highlight the server-side API architecture and CI performance gains..."
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Text / Blog / GitHub */}
      {activeTab === 'text' && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            Paste Engineering Blog, GitHub README, or Topic Notes:
          </label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={7}
            className="w-full rounded-xl bg-black/40 border border-white/10 p-3.5 text-xs text-white focus:outline-none focus:border-white/30 resize-y leading-relaxed font-mono"
            placeholder="Paste text here... e.g.:
Anthropic announced Scion, an internal system designed to address Git scaling limitations when thousands of automated AI agents run around the clock. The repository was ~100 GB in history, with 25 million checkouts a day. Scion runs commits and merges server-side, uses file-level changesets, and lean on post-merge automated testing, cutting CPU/memory by 200x and freeing 25% of CI CPU."
          />
        </div>
      )}

      {/* Tab 3: YouTube Transcript */}
      {activeTab === 'youtube' && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            Paste YouTube Video Summary or Transcript:
          </label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={7}
            className="w-full rounded-xl bg-black/40 border border-white/10 p-3.5 text-xs text-white focus:outline-none focus:border-white/30 resize-y leading-relaxed font-mono"
            placeholder="Paste YouTube video transcript... e.g.:
In this video by Low Level, we explore whether AI can reverse engineer software. Reverse engineering is taking a compiled binary and determining what the original code did. Decompilers like Ghidra and IDA produce complex pseudo-code. A new open source agent called Reverse Engineer Anything runs an AI loop over Ghidra, querying code iteratively. In under 30 minutes, it recreated the GNOME Calculator as a clean Python app."
          />
        </div>
      )}

      {/* Domain Category Selector & Actions */}
      <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Domain Classification:</span>
          <div className="flex flex-wrap items-center bg-black/50 p-1 rounded-xl border border-white/10 gap-1">
            {[
              { id: 'auto', label: 'Auto-detect' },
              { id: 'REVERSE ENGINEERING', label: 'Reversing & CVEs' },
              { id: 'AI AGENTS & MODELS', label: 'AI & Inference' },
              { id: 'LINUX KERNEL', label: 'Kernel & eBPF' },
              { id: 'KUBERNETES & CLOUD', label: 'Cloud & K8s' },
              { id: 'DISTRIBUTED SYSTEMS', label: 'Distributed Systems' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCategoryHint(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                  categoryHint === opt.id
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstantSynthesize}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs tracking-wide transition-all cursor-pointer disabled:opacity-50"
            title="Generate immediately using local MARROK engine (0ms latency)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Synthesize</span>
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer disabled:opacity-75"
            style={{
              backgroundColor: theme.accent,
              color: '#0e1117',
            }}
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>
              {isLoading
                ? (pipelinePhase || 'Processing Pipeline...')
                : 'Generate Carousel & Caption'}
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Progress indicator during loading */}
      {isLoading && pipelinePhase && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 text-xs text-slate-300 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div
              className="w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: theme.accent }}
            />
            <span className="font-medium text-white">{pipelinePhase}</span>
          </div>
          <span className="text-[11px] text-slate-400">Mobile Resilient Engine Active</span>
        </div>
      )}

      {/* Status Messages & Retry */}
      {errorMsg && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstantSynthesize}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold transition-colors shrink-0"
            >
              ⚡ Instant Synthesize
            </button>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-bold transition-colors shrink-0"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}
    </div>
  );
};
