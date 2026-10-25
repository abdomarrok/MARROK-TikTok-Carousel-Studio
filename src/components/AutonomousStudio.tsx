import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  RefreshCw,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Palette,
  Eye,
  Layers,
  Wand2,
  FileCheck2,
  Cpu,
  Shield,
  Code2,
  Globe,
  Sliders,
  Upload,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Code,
  Gauge,
  Columns,
  Grid,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
} from 'lucide-react';
import { CarouselData, SlideData, SlideType, ThemePalette, HookVariant, DiagramVariant, DiagramNode, DEFAULT_PALETTES } from '../types';
import { DEFAULT_STARTER_DECK, PRESET_CAROUSELS } from '../lib/presets';
import { renderSlideToCanvas, downloadAllSlidesZip, downloadSingleSlidePng, copySlideToClipboard } from '../lib/canvasExporter';
import { runAutonomousPipeline } from '../lib/autonomousPipeline';
import { sanitizeSlide } from '../lib/textSanitizer';
import { runQAChecks } from '../lib/qaChecks';
import { MultimodalInputPanel } from './MultimodalInputPanel';
import { SlideImageStudio } from './SlideImageStudio';
import { MediaSearchModal } from './MediaSearchModal';
import { ICONS_REGISTRY } from '../lib/icons';

interface AutonomousStudioProps {
  carousel: CarouselData;
  theme: ThemePalette;
  onUpdateCarousel: (updated: CarouselData) => void;
  onSelectTheme: (palette: ThemePalette) => void;
  onOpenThemeCustomizer: () => void;
  onOpenContactSheet?: () => void;
  onOpenPlanInspector?: () => void;
  onShowToast: (msg: string) => void;
}

const STARTER_TOPICS = [
  {
    name: 'Scion Architecture',
    desc: 'Moving Beyond Git with server-authoritative VCS',
    prompt: "Anthropic's Scion: Moving Beyond Git with server-authoritative VCS for AI agents",
  },
  {
    name: 'Val Town MicroVMs',
    desc: 'Serverless TypeScript inside secure isolates',
    prompt: 'Val Town serverless execution inside secure V8 isolates and microVM boundaries',
  },
  {
    name: 'Zero-Trust Mesh',
    desc: 'mTLS egress perimeters & least-privilege tokens',
    prompt: 'Zero-Trust mesh architecture with mTLS egress perimeters and least-privilege tokens',
  },
  {
    name: 'Redis 8 Engine',
    desc: 'Multi-threaded core engine & active clustering',
    prompt: 'Redis 8 architectural leap: multi-threaded core engine and active-active clustering',
  },
];

const DIAGRAM_VARIANTS: { id: DiagramVariant; label: string }[] = [
  { id: 'topology', label: 'Topology Flow' },
  { id: 'stack', label: 'Layered Stack' },
  { id: 'isolation', label: 'Isolation Grid' },
  { id: 'takeaway', label: 'Key Takeaway' },
];

const ARCHETYPES: { id: SlideType; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { id: 'hub', label: 'Hub', icon: Cpu },
  { id: 'row', label: 'Mechanism', icon: Layers },
  { id: 'image', label: 'Diagram / AI', icon: ImageIcon },
  { id: 'code', label: 'Code Diff', icon: Code },
  { id: 'metric', label: 'Metric', icon: Gauge },
  { id: 'compare', label: 'Compare', icon: Columns },
  { id: 'cta', label: 'CTA', icon: ArrowRight },
];

export const AutonomousStudio: React.FC<AutonomousStudioProps> = ({
  carousel,
  theme,
  onUpdateCarousel,
  onSelectTheme,
  onOpenThemeCustomizer,
  onOpenContactSheet,
  onOpenPlanInspector,
  onShowToast,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [copiedType, setCopiedType] = useState<'caption' | 'slide' | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  // Deep Customization States
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isAdvancedCustomizerOpen, setIsAdvancedCustomizerOpen] = useState(false);
  const [showAiImageStudio, setShowAiImageStudio] = useState(false);
  const [mediaModalTarget, setMediaModalTarget] = useState<{
    field: 'imageUrl';
    title?: string;
    initialQuery?: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-render current slide on canvas whenever slide data, index, or theme changes
  useEffect(() => {
    let isMounted = true;
    async function updateCanvas() {
      if (canvasRef.current && carousel.slides[currentSlideIndex]) {
        try {
          await renderSlideToCanvas(carousel, currentSlideIndex, canvasRef.current, theme);
        } catch (err) {
          console.error('Canvas render error:', err);
        }
      }
    }
    updateCanvas();
    return () => {
      isMounted = false;
    };
  }, [carousel, currentSlideIndex, theme]);

  // Keyboard navigation (Left / Right arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentSlideIndex((prev) => Math.min(carousel.slides.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carousel.slides.length]);

  // Autonomous Generation Handler
  const handleRunAutonomousPipeline = async (inputPrompt?: string) => {
    const query = (inputPrompt || promptInput).trim();
    if (!query) {
      onShowToast('Please enter a topic, URL, or code notes');
      return;
    }

    setIsGenerating(true);
    setPipelineStatus('Synthesizing architecture story...');

    try {
      const generated = await runAutonomousPipeline(query, {
        theme,
        generateDiagram: true,
        onProgress: (status) => setPipelineStatus(status),
      });

      // Auto-Theme Routing: immediately switch active studio theme if palette matches domain
      if (generated.theme && DEFAULT_PALETTES[generated.theme]) {
        onSelectTheme(DEFAULT_PALETTES[generated.theme]);
      }

      onUpdateCarousel(generated);
      setCurrentSlideIndex(0);
      if (generated.sourceMeta?.isFallback) {
        onShowToast('⚠️ Offline draft generated (API unavailable). Review text before exporting.');
      } else {
        onShowToast('✨ Autonomously generated and perfected 8-slide carousel!');
      }
    } catch (err) {
      console.error('Autonomous pipeline error:', err);
      onShowToast('Pipeline error — loaded resilient backup template.');
    } finally {
      setIsGenerating(false);
      setPipelineStatus(null);
    }
  };

  // Dynamic starter topic generator: immediately runs the autonomous pipeline for chosen topic
  const handleTriggerStarterTopic = (topic: typeof STARTER_TOPICS[number]) => {
    setPromptInput(topic.prompt);
    handleRunAutonomousPipeline(topic.prompt);
  };

  // Instant starter preset loader fallback
  const handleLoadPreset = (key: string) => {
    const preset = PRESET_CAROUSELS[key as keyof typeof PRESET_CAROUSELS] || { name: 'Starter Deck', data: DEFAULT_STARTER_DECK };
    if (preset?.data) {
      onUpdateCarousel(preset.data);
      setCurrentSlideIndex(0);
      onShowToast(`Loaded "${preset.name}" deck`);
    }
  };

  // Inline Slide Data Updater (Slide editing keeps sourceMeta intact without bypassing draft status)
  const handleUpdateCurrentSlide = (field: keyof SlideData, value: any) => {
    const newSlides = [...carousel.slides];
    const updated = sanitizeSlide(
      {
        ...newSlides[currentSlideIndex],
        [field]: value,
      },
      currentSlideIndex,
      carousel.slides.length
    );
    newSlides[currentSlideIndex] = updated;
    onUpdateCarousel({
      ...carousel,
      slides: newSlides,
      sourceMeta: carousel.sourceMeta ? { ...carousel.sourceMeta } : undefined,
    });
  };

  // Explicit confirmation: Creator must confirm draft review to unlock export
  const handleToggleReviewDraft = () => {
    const isCurrentlyReviewed = Boolean(carousel.sourceMeta?.userReviewed);
    const newReviewed = !isCurrentlyReviewed;
    onUpdateCarousel({
      ...carousel,
      sourceMeta: {
        ...carousel.sourceMeta,
        userReviewed: newReviewed,
      },
    });
    if (newReviewed) {
      onShowToast('✓ Draft marked as reviewed. Pre-export QA validation active.');
    } else {
      onShowToast('Draft review unmarked. Export locked.');
    }
  };

  // Slide Management Handlers
  const handleAddSlide = () => {
    const newSlide: SlideData = {
      type: 'row',
      icons: [{ icon: 'cpu', label: 'Mechanism' }],
      enTitle: 'Core technical mechanism.',
      arTitle: 'آلية العمل التقنية.',
      enBody: 'Direct architectural explanation of how the system executes under the hood.',
      arBody: 'شرح معماري مباشر لكيفية عمل النظام في الخلفية.',
    };
    const newSlides = [...carousel.slides];
    newSlides.splice(currentSlideIndex + 1, 0, newSlide);
    onUpdateCarousel({ ...carousel, slides: newSlides });
    setCurrentSlideIndex(currentSlideIndex + 1);
    onShowToast(`Added slide #${currentSlideIndex + 2}`);
  };

  const handleDuplicateSlide = () => {
    const current = carousel.slides[currentSlideIndex];
    if (!current) return;
    const clone = JSON.parse(JSON.stringify(current));
    const newSlides = [...carousel.slides];
    newSlides.splice(currentSlideIndex + 1, 0, clone);
    onUpdateCarousel({ ...carousel, slides: newSlides });
    setCurrentSlideIndex(currentSlideIndex + 1);
    onShowToast(`Duplicated slide #${currentSlideIndex + 1}`);
  };

  const handleDeleteSlide = () => {
    if (carousel.slides.length <= 3) {
      onShowToast('Minimum 3 slides required in carousel');
      return;
    }
    const newSlides = carousel.slides.filter((_, idx) => idx !== currentSlideIndex);
    onUpdateCarousel({ ...carousel, slides: newSlides });
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
    onShowToast(`Deleted slide #${currentSlideIndex + 1}`);
  };

  const handleMoveSlide = (direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? currentSlideIndex - 1 : currentSlideIndex + 1;
    if (targetIndex < 0 || targetIndex >= carousel.slides.length) return;
    const newSlides = [...carousel.slides];
    const [removed] = newSlides.splice(currentSlideIndex, 1);
    newSlides.splice(targetIndex, 0, removed);
    onUpdateCarousel({ ...carousel, slides: newSlides });
    setCurrentSlideIndex(targetIndex);
    onShowToast(`Moved slide to position #${targetIndex + 1}`);
  };

  const handleApplyHookVariant = (variant: HookVariant) => {
    const newSlides = [...carousel.slides];
    newSlides[0] = {
      ...newSlides[0],
      enTitle: variant.enTitle,
      arTitle: variant.arTitle,
      enBody: variant.enBody,
      arBody: variant.arBody,
      centerIcon: variant.centerIcon || newSlides[0].centerIcon,
    };
    onUpdateCarousel({ ...carousel, slides: newSlides });
    onShowToast(`Applied "${variant.tag}" Hook to Slide 1`);
  };

  const isOfflineDraft = Boolean(carousel.sourceMeta?.isFallback);
  const isReviewed = Boolean(carousel.sourceMeta?.userReviewed);
  const qaReport = runQAChecks(carousel);
  const isExportBlocked = (isOfflineDraft && !isReviewed) || !qaReport.canExport;

  // 1-Click Export ZIP (Strictly verified per specification)
  const handleExportZip = async () => {
    if (isOfflineDraft && !isReviewed) {
      onShowToast('⚠️ Export locked: Click "✓ I reviewed this draft" in the banner above first.');
      return;
    }
    if (!qaReport.canExport) {
      onShowToast(`⚠️ Export blocked: ${qaReport.failCount} QA issue(s) detected (e.g. duplicate body copy or boilerplate).`);
      return;
    }
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

  // Copy Single Slide
  const handleCopySlide = async () => {
    if (isOfflineDraft && !isReviewed) {
      onShowToast('⚠️ Copy locked: Please confirm "I reviewed this draft" first.');
      return;
    }
    try {
      await copySlideToClipboard(carousel, currentSlideIndex, theme);
      setCopiedType('slide');
      onShowToast(`Copied Slide ${currentSlideIndex + 1} to clipboard!`);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      onShowToast('Failed to copy slide.');
    }
  };

  // Copy TikTok Caption (strips non-breaking spaces for platform compatibility)
  const handleCopyCaption = async () => {
    const rawCaption = carousel.caption || '';
    const text = `${rawCaption}\n\n#SoftwareArchitecture #TechTok #Programming #SystemDesign`.replace(/\u00A0/g, ' ');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType('caption');
      onShowToast('Copied TikTok caption and hashtags to clipboard!');
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      onShowToast('Failed to copy caption.');
    }
  };

  const currentSlide = carousel.slides[currentSlideIndex] || carousel.slides[0];

  // Satellite Labels Updater (Slide 1 Hub)
  const handleUpdateSatLabel = (index: number, value: string) => {
    const currentLabels = currentSlide.satLabels && currentSlide.satLabels.length >= 6
      ? [...currentSlide.satLabels]
      : ['Node 1', 'Node 2', 'Node 3', 'Node 4', 'Node 5', 'Node 6'];
    currentLabels[index] = value;
    handleUpdateCurrentSlide('satLabels', currentLabels);
  };

  // Diagram Node Updater (Slide 2-7 Mechanism Slides)
  const handleUpdateDiagramNode = (nodeIndex: number, field: keyof DiagramNode, value: string) => {
    const defaultNodes: DiagramNode[] = [
      { label: 'Client Ingress', sublabel: 'Port 443', status: 'ACTIVE' },
      { label: 'Control Plane', sublabel: 'Policy Engine', status: 'VERIFIED' },
      { label: 'Target Service', sublabel: 'Encrypted Pipe', status: 'SECURED' },
    ];
    const existing = currentSlide.diagramNodes && currentSlide.diagramNodes.length >= 3
      ? currentSlide.diagramNodes.map((n) => ({ ...n }))
      : defaultNodes;
    existing[nodeIndex] = {
      ...existing[nodeIndex],
      [field]: value,
    };
    handleUpdateCurrentSlide('diagramNodes', existing);
  };

  // Diagram Connector / Edge Updater
  const handleUpdateDiagramEdge = (edgeIndex: number, value: string) => {
    const currentEdges = currentSlide.diagramEdges && currentSlide.diagramEdges.length >= 2
      ? [...currentSlide.diagramEdges]
      : ['Mutual Auth', 'Encrypted Pipe'];
    currentEdges[edgeIndex] = value;
    handleUpdateCurrentSlide('diagramEdges', currentEdges);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-40 animate-fade-in">
      {/* 1. Autonomous Command Bar with Integrated Ingest Button */}
      <div className="bg-black/50 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }}
              />
              <span className="text-xs font-bold text-white font-jakarta uppercase tracking-wider">
                Autonomous Content Engine
              </span>
            </div>
            {pipelineStatus && (
              <div className="flex items-center gap-2 text-xs font-mono" style={{ color: theme.accent }}>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{pipelineStatus}</span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunAutonomousPipeline();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1 flex items-center gap-2">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="What are you explaining? (e.g. Distributed Consensus in Raft, SQLite in Wasm)..."
                disabled={isGenerating}
                className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
              />

              {/* Integrated Ingest Button */}
              <button
                type="button"
                onClick={() => setIsIngestModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-3 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Ingest screenshot images, code/PDF files, web links, or transcripts"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span className="hidden md:inline">Ingest Material</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 transition-all shadow-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
              style={{ backgroundColor: theme.accent }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Generate Carousel</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Starter Suggestions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-500 font-medium">Try topic:</span>
            {STARTER_TOPICS.map((topic) => (
              <button
                key={topic.name}
                type="button"
                onClick={() => handleTriggerStarterTopic(topic)}
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                title={topic.desc}
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{topic.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

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
              onClick={handleToggleReviewDraft}
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
              onClick={() => handleRunAutonomousPipeline()}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry with AI</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Studio Viewport: Canvas on Left + Direct Inline Edit on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 1080x1920 Slide Preview with Carousel Navigator & Slide Management Bar */}
        <div className="lg:col-span-5 flex flex-col items-center lg:sticky lg:top-20 self-start z-10 space-y-3.5">
          {/* Canvas Wrapper - Constrained height so it never collides with bottom floating bar */}
          <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl w-auto max-h-[min(540px,calc(100vh-250px))] aspect-[9/16] shrink-0">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />

            {/* TikTok Feed Safe Zone Simulator Overlay */}
            {showSafeZones && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between font-mono text-[9px] select-none">
                {/* Top 9.4% Safe Zone (Status & Search) */}
                <div className="h-[9.4%] bg-rose-500/20 border-b border-rose-500/40 flex items-center justify-between px-3 text-rose-300">
                  <span>TOP 180px MARGIN</span>
                  <span>[Search / For You]</span>
                </div>

                {/* Center Content Bounding Box (840x1420) */}
                <div className="flex-1 mx-3 border-2 border-dashed border-rose-400/40 rounded-lg flex items-center justify-between p-2">
                  <span className="text-rose-400/70 rotate-90 origin-left text-[8px] tracking-wider">SAFE BOUNDARY</span>
                  {/* Right-side TikTok Icons HUD Indicator */}
                  <div className="h-full flex flex-col justify-end items-center gap-2 text-rose-300/80 pr-1 pb-4 text-[10px]">
                    <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">♥</div>
                    <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">💬</div>
                    <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">★</div>
                    <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">↗</div>
                  </div>
                </div>

                {/* Bottom 16.7% Safe Zone (Caption & Audio) */}
                <div className="h-[16.7%] bg-rose-500/20 border-t border-rose-500/40 flex flex-col justify-center px-3 text-rose-300 space-y-0.5">
                  <div className="flex justify-between">
                    <span>BOTTOM 320px MARGIN</span>
                    <span>@username</span>
                  </div>
                  <span className="text-[8px] text-rose-400/80">TikTok Captions & Audio Track Area</span>
                </div>
              </div>
            )}

            {/* Slide Navigation Hover Arrows */}
            <button
              type="button"
              onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 cursor-pointer transition-all"
              title="Previous Slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlideIndex((prev) => Math.min(carousel.slides.length - 1, prev + 1))}
              disabled={currentSlideIndex === carousel.slides.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center disabled:opacity-20 cursor-pointer transition-all"
              title="Next Slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Slide Indicator & Thumbnail Strip */}
          <div className="w-full max-w-[360px] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
              <span>
                Slide <span className="text-white font-bold">{currentSlideIndex + 1}</span> of {carousel.slides.length}
              </span>
              <button
                type="button"
                onClick={() => setShowSafeZones(!showSafeZones)}
                className={`text-[10px] font-sans px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  showSafeZones ? 'bg-rose-500/20 text-rose-300' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Safe Zones
              </button>
            </div>

            {/* Thumbnail Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5">
              {carousel.slides.map((slide, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    idx === currentSlideIndex
                      ? 'bg-white/25 text-white border border-white/40 shadow-sm'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  <span>#{idx + 1}</span>
                  <span className="text-[9px] uppercase font-sans text-slate-500">
                    {slide.type}
                  </span>
                </button>
              ))}
            </div>

            {/* Sleek Slide Management Strip */}
            <div className="flex items-center justify-between p-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleAddSlide}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer"
                  title="Add new slide after this one"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>Add</span>
                </button>
                <button
                  type="button"
                  onClick={handleDuplicateSlide}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer"
                  title="Duplicate this slide"
                >
                  <Copy className="w-3 h-3 text-cyan-400" />
                  <span>Clone</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSlide}
                  disabled={carousel.slides.length <= 3}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[11px] font-semibold text-slate-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-30"
                  title="Delete slide (minimum 3 slides)"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Reorder Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveSlide('left')}
                  disabled={currentSlideIndex === 0}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                  title="Move slide earlier in deck"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveSlide('right')}
                  disabled={currentSlideIndex === carousel.slides.length - 1}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                  title="Move slide later in deck"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Slide 1 Hook Variants Selector */}
            {currentSlideIndex === 0 && carousel.hookVariants && carousel.hookVariants.length > 0 && (
              <div className="p-2 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Slide 1 Hook Variants
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {carousel.hookVariants.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyHookVariant(v)}
                      className="px-2 py-1 rounded-lg text-[10px] text-left bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-300 hover:text-white transition-all cursor-pointer truncate"
                      title={v.enTitle}
                    >
                      <span className="font-bold text-teal-400 mr-1">[{v.tag}]</span>
                      <span>{v.enTitle}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Docked Action & Delivery Bar (No floating overlap) */}
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/15 shadow-xl flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (isOfflineDraft && !isReviewed) {
                      onShowToast('⚠️ Download blocked: Please review draft and click "I reviewed this" first.');
                      return;
                    }
                    downloadSingleSlidePng(carousel, currentSlideIndex, `MARROK_Slide_${currentSlideIndex + 1}.jpg`, theme);
                    onShowToast(`Downloaded Slide ${currentSlideIndex + 1} JPG`);
                  }}
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
                  onClick={handleCopySlide}
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
              </div>

              {/* Primary Export All ZIP */}
              <button
                type="button"
                onClick={handleExportZip}
                disabled={isExportingZip || isExportBlocked}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs tracking-wider transition-all shadow-lg whitespace-nowrap ${
                  isExportBlocked
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed'
                    : 'bg-teal-400 hover:bg-teal-300 text-slate-950 cursor-pointer disabled:opacity-50'
                }`}
                title={
                  isOfflineDraft && !isReviewed
                    ? 'Export locked: Confirm "I reviewed this draft" in banner first.'
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
        </div>

        {/* Right: Direct Inline Text Editing & Expandable Advanced Customizer */}
        <div className="lg:col-span-7 space-y-5">
          {/* Inline Edit Card */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-white/10 text-white">
                  Slide {currentSlideIndex + 1} · {currentSlide.type.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">Click any text to edit:</span>
              </div>

              {/* Advanced Customizer Toggle */}
              <button
                type="button"
                onClick={() => setIsAdvancedCustomizerOpen(!isAdvancedCustomizerOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  isAdvancedCustomizerOpen
                    ? 'bg-white/20 border-white/40 text-white shadow-sm'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
                title="Toggle deep archetype controls, code diff, metrics, and diagrams"
              >
                <Sliders className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                <span>Advanced Customizer</span>
                {isAdvancedCustomizerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Direct English & Arabic Titles */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  English Headline (Spec §8: 2–5 words ending in a period)
                </label>
                <input
                  type="text"
                  value={currentSlide.enTitle || ''}
                  onChange={(e) => handleUpdateCurrentSlide('enTitle', e.target.value)}
                  placeholder="Crisp architecture headline."
                  className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1 text-right">
                  العنوان باللغة العربية (Cairo Font)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={currentSlide.arTitle || ''}
                  onChange={(e) => handleUpdateCurrentSlide('arTitle', e.target.value)}
                  placeholder="عنوان تقني دقيق ومختصر."
                  className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none font-cairo text-right"
                />
              </div>
            </div>

            {/* Direct English & Arabic Body Copy */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Technical Mechanism & Details (English)
                </label>
                <textarea
                  rows={2}
                  value={currentSlide.enBody || ''}
                  onChange={(e) => handleUpdateCurrentSlide('enBody', e.target.value)}
                  placeholder="1-2 sentences explaining how the mechanism works under the hood."
                  className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl p-3 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1 text-right">
                  شرح الآلية الهندسية (العربية)
                </label>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={currentSlide.arBody || ''}
                  onChange={(e) => handleUpdateCurrentSlide('arBody', e.target.value)}
                  placeholder="شرح تقني عميق في سطرين."
                  className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl p-3 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed font-cairo text-right"
                />
              </div>
            </div>

            {/* Live Diagram Controls in Slide Editor UI */}
            {/* Slide 1 (Hub): 6 Compact Satellite Labels */}
            {currentSlide.type === 'hub' && (
              <div className="pt-3 border-t border-white/[0.08] space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                    <span>Orbital Satellite Labels (6 Component Nodes)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Live on Canvas</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 font-bold">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={currentSlide.satLabels?.[idx] ?? ''}
                        onChange={(e) => handleUpdateSatLabel(idx, e.target.value)}
                        placeholder={`Node ${idx + 1}`}
                        className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white font-medium focus:outline-none transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Architecture Diagram Slides (Row / Mechanism slides) */}
            {currentSlide.type === 'row' && (
              <div className="pt-3 border-t border-white/[0.08] space-y-3.5 animate-fade-in">
                {/* 1. Diagram Layout Switcher */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                      <span>Diagram Layout Switcher</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">1-Click Schematic Flip</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
                    {DIAGRAM_VARIANTS.map((variant) => {
                      const isSelected = (currentSlide.diagramVariant || 'topology') === variant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => handleUpdateCurrentSlide('diagramVariant', variant.id)}
                          className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/20 text-white shadow-sm border border-white/30'
                              : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                          }`}
                          style={isSelected ? { color: theme.accent } : undefined}
                        >
                          <span>{variant.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Compact editable fields for the 3 diagramNodes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <span>Schematic Nodes (3 Components)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Label / Sublabel / Status</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, nIdx) => {
                      const defaultNodes = [
                        { label: 'Client Ingress', sublabel: 'Port 443', status: 'ACTIVE' },
                        { label: 'Control Plane', sublabel: 'Policy Engine', status: 'VERIFIED' },
                        { label: 'Target Service', sublabel: 'Encrypted Pipe', status: 'SECURED' },
                      ];
                      const node = currentSlide.diagramNodes?.[nIdx] || defaultNodes[nIdx];
                      return (
                        <div key={nIdx} className="bg-black/50 border border-white/10 rounded-xl p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold font-mono text-slate-400">
                              Node #{nIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={node.status || ''}
                              onChange={(e) => handleUpdateDiagramNode(nIdx, 'status', e.target.value)}
                              placeholder="STATUS"
                              className="w-20 text-right bg-transparent border-b border-white/15 focus:border-white/40 text-[9px] font-mono text-emerald-400 uppercase focus:outline-none"
                              title="Status Badge (e.g. ACTIVE, VERIFIED, ISOLATED)"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={node.label || ''}
                              onChange={(e) => handleUpdateDiagramNode(nIdx, 'label', e.target.value)}
                              placeholder="Primary Label"
                              className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2 py-1 text-xs text-white font-semibold focus:outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={node.sublabel || ''}
                              onChange={(e) => handleUpdateDiagramNode(nIdx, 'sublabel', e.target.value)}
                              placeholder="Sublabel / Spec"
                              className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. diagramEdges & diagramFooter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      Connector 1 → 2
                    </label>
                    <input
                      type="text"
                      value={currentSlide.diagramEdges?.[0] ?? ''}
                      onChange={(e) => handleUpdateDiagramEdge(0, e.target.value)}
                      placeholder="e.g. Mutual Auth"
                      className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      Connector 2 → 3
                    </label>
                    <input
                      type="text"
                      value={currentSlide.diagramEdges?.[1] ?? ''}
                      onChange={(e) => handleUpdateDiagramEdge(1, e.target.value)}
                      placeholder="e.g. Encrypted Pipe"
                      className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      Footer Telemetry Line
                    </label>
                    <input
                      type="text"
                      value={currentSlide.diagramFooter ?? ''}
                      onChange={(e) => handleUpdateCurrentSlide('diagramFooter', e.target.value)}
                      placeholder="e.g. Telemetry metric"
                      className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Expandable Advanced Customizer Drawer */}
            {isAdvancedCustomizerOpen && (
              <div className="pt-3 border-t border-white/[0.08] space-y-4 animate-fade-in">
                {/* 1. Archetype Switcher */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Slide Layout Archetype
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
                    {ARCHETYPES.map((arch) => {
                      const Icon = arch.icon;
                      const isSelected = currentSlide.type === arch.id;
                      return (
                        <button
                          key={arch.id}
                          type="button"
                          onClick={() => handleUpdateCurrentSlide('type', arch.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/20 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? theme.accent : undefined }} />
                          <span>{arch.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Archetype Specific Deep Editors */}
                {/* Code Diff Archetype */}
                {currentSlide.type === 'code' && (
                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Code Diff & Terminal Controls</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">File Name</label>
                        <input
                          type="text"
                          value={currentSlide.codeFileName || 'sys_exec.sh'}
                          onChange={(e) => handleUpdateCurrentSlide('codeFileName', e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Language</label>
                        <input
                          type="text"
                          value={currentSlide.codeLanguage || 'bash'}
                          onChange={(e) => handleUpdateCurrentSlide('codeLanguage', e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Code Snippet (+ / - diff)</label>
                      <textarea
                        rows={4}
                        value={currentSlide.codeSnippet || ''}
                        onChange={(e) => handleUpdateCurrentSlide('codeSnippet', e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Metric Card Archetype */}
                {currentSlide.type === 'metric' && (
                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" />
                      <span>Metric Benchmark Card</span>
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Metric Value</label>
                        <input
                          type="text"
                          value={currentSlide.metricValue || '0.4ms'}
                          onChange={(e) => handleUpdateCurrentSlide('metricValue', e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Label</label>
                        <input
                          type="text"
                          value={currentSlide.metricLabel || 'p99 Latency'}
                          onChange={(e) => handleUpdateCurrentSlide('metricLabel', e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Delta / Diff</label>
                        <input
                          type="text"
                          value={currentSlide.metricDiff || '▲ 94% faster'}
                          onChange={(e) => handleUpdateCurrentSlide('metricDiff', e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Compare Archetype */}
                {currentSlide.type === 'compare' && (
                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Columns className="w-3.5 h-3.5 text-purple-400" />
                      <span>Before vs After Architecture Comparison</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 block">Legacy (Left)</label>
                        <input
                          type="text"
                          value={currentSlide.compareLeftTitle || 'Legacy Stack'}
                          onChange={(e) => handleUpdateCurrentSlide('compareLeftTitle', e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white mb-1"
                        />
                        <textarea
                          rows={3}
                          value={currentSlide.compareLeftBody || ''}
                          onChange={(e) => handleUpdateCurrentSlide('compareLeftBody', e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-slate-300 resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 block">Modern (Right)</label>
                        <input
                          type="text"
                          value={currentSlide.compareRightTitle || 'Modern Engine'}
                          onChange={(e) => handleUpdateCurrentSlide('compareRightTitle', e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white mb-1"
                        />
                        <textarea
                          rows={3}
                          value={currentSlide.compareRightBody || ''}
                          onChange={(e) => handleUpdateCurrentSlide('compareRightBody', e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-slate-300 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Image & AI Diagram Studio */}
                {currentSlide.type === 'image' && (
                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Visual Diagram & AI Studio</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowAiImageStudio(!showAiImageStudio)}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/40 text-xs font-semibold cursor-pointer"
                        >
                          {showAiImageStudio ? 'Hide AI Studio' : 'AI Diagram Studio'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMediaModalTarget({
                              field: 'imageUrl',
                              title: 'Search Architecture Graphic',
                              initialQuery: currentSlide.enTitle?.slice(0, 30) || '',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 text-xs font-semibold cursor-pointer"
                        >
                          Search Web
                        </button>
                      </div>
                    </div>

                    {showAiImageStudio && (
                      <SlideImageStudio
                        slide={currentSlide}
                        theme={theme}
                        onApplyImage={(imageUrl, prompt, model) => {
                          handleUpdateCurrentSlide('imageUrl', imageUrl);
                          handleUpdateCurrentSlide('imagePrompt', prompt);
                          handleUpdateCurrentSlide('imageModel', model);
                          setShowAiImageStudio(false);
                          onShowToast('Applied AI diagram to slide');
                        }}
                        onClose={() => setShowAiImageStudio(false)}
                        onShowToast={onShowToast}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Image URL</label>
                        <input
                          type="text"
                          value={currentSlide.imageUrl || ''}
                          onChange={(e) => handleUpdateCurrentSlide('imageUrl', e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Display Fit</label>
                        <div className="grid grid-cols-2 gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10">
                          <button
                            type="button"
                            onClick={() => handleUpdateCurrentSlide('imageFit', 'contain')}
                            className={`py-0.5 text-xs rounded ${currentSlide.imageFit !== 'cover' ? 'bg-white/20 text-white font-bold' : 'text-slate-400'}`}
                          >
                            Fit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateCurrentSlide('imageFit', 'cover')}
                            className={`py-0.5 text-xs rounded ${currentSlide.imageFit === 'cover' ? 'bg-white/20 text-white font-bold' : 'text-slate-400'}`}
                          >
                            Cover
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TikTok Publishing Card (Formatted Captions & Screen Hooks) */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                TikTok Posting Copy
              </span>
              <button
                type="button"
                onClick={handleCopyCaption}
                className="flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer transition-colors"
              >
                {copiedType === 'caption' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === 'caption' ? 'Copied!' : 'Copy Caption'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
              {`${carousel.caption || ''}\n\n#SoftwareArchitecture #TechTok #Programming #DevLife #SystemDesign`}
            </div>
          </div>
        </div>
      </div>



      {/* Multimodal Ingestion Modal Overlay */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1016] border border-white/15 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-jakarta">
                  Ingest Material (Screenshots, PDF/Code, URLs, Notes)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsIngestModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <MultimodalInputPanel
              theme={theme}
              onApplyCarousel={(newCarousel) => {
                onUpdateCarousel(newCarousel);
                setCurrentSlideIndex(0);
                setIsIngestModalOpen(false);
                onShowToast('✨ Generated carousel from ingested materials!');
              }}
              onClose={() => setIsIngestModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Media Search Modal */}
      {mediaModalTarget && (
        <MediaSearchModal
          isOpen={Boolean(mediaModalTarget)}
          theme={theme}
          onClose={() => setMediaModalTarget(null)}
          title={mediaModalTarget.title || 'Search Web Media'}
          initialQuery={mediaModalTarget.initialQuery}
          onSelectUrl={(url: string) => {
            handleUpdateCurrentSlide('imageUrl', url);
            setMediaModalTarget(null);
            onShowToast('Applied web visual to slide');
          }}
        />
      )}
    </div>
  );
};
