import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Upload,
  X,
  Check,
  Copy,
} from 'lucide-react';
import {
  CarouselData,
  SlideData,
  SlideType,
  ThemePalette,
  HookVariant,
  DiagramNode,
  DEFAULT_PALETTES,
} from '../types.ts';
import { downloadSingleSlidePng, copySlideToClipboard, downloadAllSlidesZip } from '../lib/canvasExporter.ts';
import { runAutonomousPipeline } from '../lib/autonomousPipeline.ts';
import { sanitizeSlide } from '../lib/textSanitizer.ts';
import { seedSlideArchetypeData } from '../lib/synthesizer.ts';
import { runQAChecks } from '../lib/qaChecks.ts';
import { MultimodalInputPanel } from './MultimodalInputPanel.tsx';
import { SlideImageStudio } from './SlideImageStudio.tsx';
import { MediaSearchModal } from './MediaSearchModal.tsx';
import {
  ViewportCanvas,
  SlideNavigator,
  InlineSlideEditor,
  ArchetypeControls,
  ExportBar,
} from './studio/index.ts';

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

      // Auto-Theme Routing
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

  const handleTriggerStarterTopic = (topic: typeof STARTER_TOPICS[number]) => {
    setPromptInput(topic.prompt);
    handleRunAutonomousPipeline(topic.prompt);
  };

  // Inline Slide Data Updater
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

  // Immediate Archetype Switcher: Auto-seeds required fields on the fly
  const handleSetSlideType = (newType: SlideType) => {
    const current = carousel.slides[currentSlideIndex];
    if (!current) return;

    const seeded = seedSlideArchetypeData(current, newType);
    const updated = sanitizeSlide(seeded, currentSlideIndex, carousel.slides.length);

    const newSlides = [...carousel.slides];
    newSlides[currentSlideIndex] = updated;

    onUpdateCarousel({
      ...carousel,
      slides: newSlides,
      sourceMeta: carousel.sourceMeta ? { ...carousel.sourceMeta } : undefined,
    });
    onShowToast(`Switched layout to ${newType.toUpperCase()}`);
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

  // 1-Click Export ZIP
  const handleExportZip = async () => {
    if (isOfflineDraft && !isReviewed) {
      onShowToast('⚠️ Export locked: Click "✓ I reviewed this draft" in the banner above first.');
      return;
    }
    if (!qaReport.canExport) {
      onShowToast(`⚠️ Export blocked: ${qaReport.failCount} QA issue(s) detected.`);
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

  // Copy TikTok Caption
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

  const handleUpdateSatLabel = (index: number, value: string) => {
    const currentLabels = currentSlide.satLabels && currentSlide.satLabels.length >= 6
      ? [...currentSlide.satLabels]
      : ['Node 1', 'Node 2', 'Node 3', 'Node 4', 'Node 5', 'Node 6'];
    currentLabels[index] = value;
    handleUpdateCurrentSlide('satLabels', currentLabels);
  };

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

      {/* 2. Main Studio Viewport: Canvas on Left + Direct Inline Edit on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Viewport Canvas + Slide Navigator + Export Bar */}
        <div className="lg:col-span-5 flex flex-col items-center lg:sticky lg:top-20 self-start z-10 space-y-3.5">
          <ViewportCanvas
            carousel={carousel}
            currentSlideIndex={currentSlideIndex}
            theme={theme}
            showSafeZones={showSafeZones}
            onToggleSafeZones={() => setShowSafeZones(!showSafeZones)}
            onPreviousSlide={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
            onNextSlide={() => setCurrentSlideIndex((prev) => Math.min(carousel.slides.length - 1, prev + 1))}
            canvasRef={canvasRef}
          />

          <SlideNavigator
            carousel={carousel}
            currentSlideIndex={currentSlideIndex}
            showSafeZones={showSafeZones}
            onToggleSafeZones={() => setShowSafeZones(!showSafeZones)}
            onSelectSlide={(idx) => setCurrentSlideIndex(idx)}
            onAddSlide={handleAddSlide}
            onDuplicateSlide={handleDuplicateSlide}
            onDeleteSlide={handleDeleteSlide}
            onMoveSlide={handleMoveSlide}
            onApplyHookVariant={handleApplyHookVariant}
          />

          <ExportBar
            carousel={carousel}
            currentSlideIndex={currentSlideIndex}
            theme={theme}
            isOfflineDraft={isOfflineDraft}
            isReviewed={isReviewed}
            qaReport={qaReport}
            isExportingZip={isExportingZip}
            exportProgress={exportProgress}
            copiedType={copiedType}
            onToggleReviewDraft={handleToggleReviewDraft}
            onRetryWithAi={() => handleRunAutonomousPipeline()}
            onDownloadSingleSlide={() => {
              if (isOfflineDraft && !isReviewed) {
                onShowToast('⚠️ Download blocked: Please review draft and click "I reviewed this" first.');
                return;
              }
              downloadSingleSlidePng(carousel, currentSlideIndex, `MARROK_Slide_${currentSlideIndex + 1}.jpg`, theme);
              onShowToast(`Downloaded Slide ${currentSlideIndex + 1} JPG`);
            }}
            onCopySlide={handleCopySlide}
            onExportZip={handleExportZip}
            onOpenContactSheet={onOpenContactSheet}
          />
        </div>

        {/* Right Column: Direct Inline Text Editing & Expandable Advanced Customizer */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <InlineSlideEditor
              currentSlide={currentSlide}
              currentSlideIndex={currentSlideIndex}
              theme={theme}
              isAdvancedCustomizerOpen={isAdvancedCustomizerOpen}
              onToggleAdvancedCustomizer={() => setIsAdvancedCustomizerOpen(!isAdvancedCustomizerOpen)}
              onUpdateField={handleUpdateCurrentSlide}
            />

            <ArchetypeControls
              currentSlide={currentSlide}
              theme={theme}
              isAdvancedCustomizerOpen={isAdvancedCustomizerOpen}
              onSetSlideType={handleSetSlideType}
              onUpdateField={handleUpdateCurrentSlide}
              onUpdateSatLabel={handleUpdateSatLabel}
              onUpdateDiagramNode={handleUpdateDiagramNode}
              onUpdateDiagramEdge={handleUpdateDiagramEdge}
              onOpenAiImageStudio={() => setShowAiImageStudio(true)}
              onOpenMediaSearch={() =>
                setMediaModalTarget({
                  field: 'imageUrl',
                  title: 'Search Architecture Graphic',
                  initialQuery: currentSlide.enTitle?.slice(0, 30) || '',
                })
              }
            />

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
          </div>

          {/* TikTok Posting Copy */}
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
