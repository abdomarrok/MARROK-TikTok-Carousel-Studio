import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Upload,
  X,
  Check,
  Copy,
  Paperclip,
  FileText,
  Youtube,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Trash2,
  SlidersHorizontal,
  Zap,
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
import { runAutonomousPipeline, enrichAndPaceCarousel } from '../lib/autonomousPipeline.ts';
import { sanitizeSlide } from '../lib/textSanitizer.ts';
import { seedSlideArchetypeData, synthesizeCarousel } from '../lib/synthesizer.ts';
import { runQAChecks } from '../lib/qaChecks.ts';
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
  onUpdateCarousel: React.Dispatch<React.SetStateAction<CarouselData>>;
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

const INGEST_TABS = [
  { id: 'text' as const, label: 'Notes / Blog / Code', icon: FileText },
  { id: 'youtube' as const, label: 'YouTube Summary', icon: Youtube },
  { id: 'upload' as const, label: 'Screenshot / Image OCR', icon: ImageIcon },
];

const DOMAIN_CATEGORIES = [
  { id: 'auto', label: 'Auto-detect' },
  { id: 'REVERSE ENGINEERING', label: 'Reversing & CVEs' },
  { id: 'AI AGENTS & MODELS', label: 'AI & Inference' },
  { id: 'LINUX KERNEL', label: 'Kernel & eBPF' },
  { id: 'KUBERNETES & CLOUD', label: 'Cloud & K8s' },
  { id: 'DISTRIBUTED SYSTEMS', label: 'Distributed Systems' },
];

/**
 * Client-side image compressor:
 * Downscales large screenshots to max 1280px JPEG (~150KB) for fast transmission
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

  // Unified Smart Dock States
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'youtube' | 'upload'>('text');
  const [uploadedImage, setUploadedImage] = useState<{
    base64: string;
    mimeType: string;
    name: string;
    sizeKb: number;
  } | null>(null);
  const [categoryHint, setCategoryHint] = useState<string>('auto');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Deep Customization States
  const [isAdvancedCustomizerOpen, setIsAdvancedCustomizerOpen] = useState(false);
  const [imageStudioTargetIndex, setImageStudioTargetIndex] = useState<number | null>(null);
  const [mediaModalTarget, setMediaModalTarget] = useState<{
    field: 'imageUrl';
    title?: string;
    initialQuery?: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Async lifecycle guards: only the latest generation/image request may commit.
  const generationAbortRef = useRef<AbortController | null>(null);
  const generationRunIdRef = useRef(0);
  const deckRevisionRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      generationAbortRef.current?.abort();
      generationAbortRef.current = null;
    };
  }, []);

  // Keep the image studio bound to the slide it was opened from.
  useEffect(() => {
    if (imageStudioTargetIndex !== null && imageStudioTargetIndex >= carousel.slides.length) {
      setImageStudioTargetIndex(null);
    }
  }, [carousel.slides.length, imageStudioTargetIndex]);

  useEffect(() => {
    setImageStudioTargetIndex((target) => (target !== null && target !== currentSlideIndex ? null : target));
  }, [currentSlideIndex]);

  const applyDeckUpdate = (updater: (prev: CarouselData) => CarouselData) => {
    deckRevisionRef.current += 1;
    onUpdateCarousel(updater);
  };

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

  // Smart Dock Text input with auto-expansion when pasting or typing long material (> 200 chars)
  const handlePromptChange = (val: string) => {
    setPromptInput(val);
    if (val.length > 200 && !isExpanded) {
      setIsExpanded(true);
    }
  };

  // Image Upload with client-side downscaling
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onShowToast('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    try {
      const { base64, mimeType, sizeKb } = await compressImageClientSide(file);
      setUploadedImage({
        base64,
        mimeType,
        name: file.name,
        sizeKb,
      });
      setIsExpanded(true);
      setActiveTab('upload');
      onShowToast(`Attached screenshot (${sizeKb} KB)`);
    } catch (err) {
      console.warn('Image downscaling failed, using raw fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage({
          base64: reader.result as string,
          mimeType: file.type || 'image/jpeg',
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
        });
        setIsExpanded(true);
        setActiveTab('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectDemoImage = async (imagePath: string, title: string) => {
    try {
      const res = await fetch(imagePath);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage({
          base64: reader.result as string,
          mimeType: blob.type || 'image/jpeg',
          name: title,
          sizeKb: Math.round(blob.size / 1024),
        });
        setIsExpanded(true);
        setActiveTab('upload');
        onShowToast(`Attached sample slide: ${title}`);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn('Could not load demo image:', err);
    }
  };

  const handleClearDock = () => {
    setPromptInput('');
    setUploadedImage(null);
    setCategoryHint('auto');
    onShowToast('Cleared input dock');
  };

  // Unified Autonomous Generation Handler
  const handleRunAutonomousPipeline = async (overridePrompt?: string) => {
    const query = (overridePrompt !== undefined ? overridePrompt : promptInput).trim();
    if (!query && !uploadedImage) {
      onShowToast('Please enter a topic, paste notes, or attach a screenshot');
      return;
    }

    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;

    const runId = ++generationRunIdRef.current;
    const startRevision = deckRevisionRef.current;
    const isCurrentRun = () =>
      isMountedRef.current && runId === generationRunIdRef.current && !controller.signal.aborted;

    setIsGenerating(true);
    setPipelineStatus(
      uploadedImage
        ? 'Processing image & synthesizing AI carousel...'
        : 'Synthesizing AI Carousel...'
    );

    try {
      const generated = await runAutonomousPipeline(query, {
        theme,
        generateDiagram: !uploadedImage,
        inputMode: activeTab,
        imageBase64: uploadedImage?.base64,
        imageMimeType: uploadedImage?.mimeType,
        imageName: uploadedImage?.name,
        categoryHint: categoryHint !== 'auto' ? categoryHint : undefined,
        signal: controller.signal,
        onProgress: (status) => {
          if (isCurrentRun()) setPipelineStatus(status);
        },
      });

      if (!isCurrentRun()) return;

      if (deckRevisionRef.current !== startRevision) {
        onShowToast('Generation finished, but your newer edits were kept. Re-run to replace the deck.');
        return;
      }

      // Auto-Theme Routing
      if (generated.theme && DEFAULT_PALETTES[generated.theme]) {
        onSelectTheme(DEFAULT_PALETTES[generated.theme]);
      }

      onUpdateCarousel(generated);
      setCurrentSlideIndex(0);
      if (generated.sourceMeta?.isFallback || generated.sourceMeta?.engine === 'offline-synthesizer') {
        onShowToast('Offline NLP Engine Activated: Synthesized custom slides from your notes.');
      } else {
        onShowToast('✨ Autonomously generated and perfected 8-slide carousel!');
      }
    } catch (err) {
      if (controller.signal.aborted || !isCurrentRun()) return;
      console.error('Autonomous pipeline error:', err);
      onShowToast('Pipeline error — loaded resilient backup template.');
    } finally {
      if (runId === generationRunIdRef.current) {
        setIsGenerating(false);
        setPipelineStatus(null);
      }
    }
  };

  // Instant local synthesis fallback (0ms latency, zero network dependence)
  const handleInstantSynthesize = () => {
    generationRunIdRef.current += 1;
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    setIsGenerating(false);
    setPipelineStatus(null);

    try {
      const generated = synthesizeCarousel({
        prompt: promptInput,
        categoryHint,
        inputMode: activeTab,
        imageFileName: uploadedImage?.name,
      });
      const processed = enrichAndPaceCarousel(generated, promptInput);
      if (processed.theme && DEFAULT_PALETTES[processed.theme]) {
        onSelectTheme(DEFAULT_PALETTES[processed.theme]);
      }
      onUpdateCarousel(processed);
      setCurrentSlideIndex(0);
      onShowToast(`⚡ Synthesized ${processed.slides.length}-slide carousel (Instant Offline Mode)`);
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'Instant synthesis failed.');
    }
  };

  const handleTriggerStarterTopic = (topic: typeof STARTER_TOPICS[number]) => {
    setPromptInput(topic.prompt);
    handleRunAutonomousPipeline(topic.prompt);
  };

  // Inline Slide Data Updater
  const handleUpdateCurrentSlide = (field: keyof SlideData, value: any) => {
    applyDeckUpdate((prev) => {
      const targetIndex = Math.min(currentSlideIndex, prev.slides.length - 1);
      if (targetIndex < 0) return prev;

      const newSlides = [...prev.slides];
      newSlides[targetIndex] = sanitizeSlide(
        {
          ...newSlides[targetIndex],
          [field]: value,
        },
        targetIndex,
        prev.slides.length
      );

      return {
        ...prev,
        slides: newSlides,
        sourceMeta: prev.sourceMeta ? { ...prev.sourceMeta } : undefined,
      };
    });
  };

  // Immediate Archetype Switcher: Auto-seeds required fields on the fly
  const handleSetSlideType = (newType: SlideType) => {
    applyDeckUpdate((prev) => {
      const targetIndex = Math.min(currentSlideIndex, prev.slides.length - 1);
      const current = prev.slides[targetIndex];
      if (!current) return prev;

      const seeded = seedSlideArchetypeData(current, newType);
      const newSlides = [...prev.slides];
      newSlides[targetIndex] = sanitizeSlide(seeded, targetIndex, prev.slides.length);

      return {
        ...prev,
        slides: newSlides,
        sourceMeta: prev.sourceMeta ? { ...prev.sourceMeta } : undefined,
      };
    });
    onShowToast(`Switched layout to ${newType.toUpperCase()}`);
  };

  // Explicit confirmation: Creator must confirm draft review to unlock export
  const handleToggleReviewDraft = () => {
    const newReviewed = !Boolean(carousel.sourceMeta?.userReviewed);
    applyDeckUpdate((prev) => ({
      ...prev,
      sourceMeta: {
        ...prev.sourceMeta,
        userReviewed: newReviewed,
      },
    }));
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
    applyDeckUpdate((prev) => {
      const insertAt = Math.min(currentSlideIndex + 1, prev.slides.length);
      const newSlides = [...prev.slides];
      newSlides.splice(insertAt, 0, newSlide);
      return { ...prev, slides: newSlides };
    });
    setCurrentSlideIndex(currentSlideIndex + 1);
    onShowToast(`Added slide #${currentSlideIndex + 2}`);
  };

  const handleDuplicateSlide = () => {
    const current = carousel.slides[currentSlideIndex];
    if (!current) return;
    const clone = JSON.parse(JSON.stringify(current));
    applyDeckUpdate((prev) => {
      const insertAt = Math.min(currentSlideIndex + 1, prev.slides.length);
      const newSlides = [...prev.slides];
      newSlides.splice(insertAt, 0, clone);
      return { ...prev, slides: newSlides };
    });
    setCurrentSlideIndex(currentSlideIndex + 1);
    onShowToast(`Duplicated slide #${currentSlideIndex + 1}`);
  };

  const handleDeleteSlide = () => {
    if (carousel.slides.length <= 3) {
      onShowToast('Minimum 3 slides required in carousel');
      return;
    }
    applyDeckUpdate((prev) => {
      if (prev.slides.length <= 3) return prev;
      const deleteAt = Math.min(currentSlideIndex, prev.slides.length - 1);
      return {
        ...prev,
        slides: prev.slides.filter((_, idx) => idx !== deleteAt),
      };
    });
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
    onShowToast(`Deleted slide #${currentSlideIndex + 1}`);
  };

  const handleMoveSlide = (direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? currentSlideIndex - 1 : currentSlideIndex + 1;
    if (targetIndex < 0 || targetIndex >= carousel.slides.length) return;
    applyDeckUpdate((prev) => {
      const fromIndex = Math.min(currentSlideIndex, prev.slides.length - 1);
      if (targetIndex < 0 || targetIndex >= prev.slides.length) return prev;
      const newSlides = [...prev.slides];
      const [removed] = newSlides.splice(fromIndex, 1);
      newSlides.splice(targetIndex, 0, removed);
      return { ...prev, slides: newSlides };
    });
    setCurrentSlideIndex(targetIndex);
    onShowToast(`Moved slide to position #${targetIndex + 1}`);
  };

  const handleApplyHookVariant = (variant: HookVariant) => {
    applyDeckUpdate((prev) => {
      if (!prev.slides[0]) return prev;
      const newSlides = [...prev.slides];
      newSlides[0] = {
        ...newSlides[0],
        enTitle: variant.enTitle,
        arTitle: variant.arTitle,
        enBody: variant.enBody,
        arBody: variant.arBody,
        centerIcon: variant.centerIcon || newSlides[0].centerIcon,
      };
      return { ...prev, slides: newSlides };
    });
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
      {/* 1. Unified Inline Smart Dock (Expandable Auto-Resizing Ingestion Hub) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
          }
        }}
        className={`bg-black/60 border rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all duration-300 ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/20 ring-2 ring-cyan-400/40'
            : isExpanded
            ? 'border-white/20 p-5 ring-1 ring-white/10'
            : 'border-white/10 p-4 sm:p-5'
        }`}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageFile(file);
          }}
        />

        {/* COMPACT MODE */}
        {!isExpanded ? (
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
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                  SMART DOCK
                </span>
              </div>
              {pipelineStatus ? (
                <div className="flex items-center gap-2 text-xs font-mono" style={{ color: theme.accent }}>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{pipelineStatus}</span>
                </div>
              ) : uploadedImage ? (
                <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs px-2.5 py-1 rounded-lg">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[140px] font-mono text-[11px]">{uploadedImage.name}</span>
                  <button
                    type="button"
                    onClick={() => setUploadedImage(null)}
                    className="hover:text-white p-0.5"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunAutonomousPipeline();
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <div className="relative flex-1 flex items-center gap-2">
                <textarea
                  rows={1}
                  value={promptInput}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleRunAutonomousPipeline();
                    }
                  }}
                  placeholder="Paste YouTube summary, blog notes, or enter topic (e.g. Zero-Trust Mesh, Rust vs Go)..."
                  disabled={isGenerating}
                  className="w-full bg-black/70 border border-white/15 focus:border-white/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner resize-none min-h-[46px] max-h-28 leading-relaxed font-sans"
                />

                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-1.5 px-3.5 py-3 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer whitespace-nowrap shrink-0"
                  title="Expand to Ingestion Mode (Attach Screenshots, YouTube notes, Blog)"
                >
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <span className="hidden md:inline">Expand / Attach</span>
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
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
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

              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Expand Ingestion Studio</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* EXPANDED / INGESTION MODE */
          <div className="space-y-4 animate-fade-in">
            {/* Header with Ingestion Tabs and Collapse Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }}
                />
                <span className="text-xs font-bold text-white font-jakarta uppercase tracking-wider">
                  Unified AI Ingestion Dock
                </span>
              </div>

              {/* Ingestion Mode Tabs */}
              <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
                {INGEST_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      style={{ color: isActive ? theme.accent : undefined }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Actions: Clear & Collapse */}
              <div className="flex items-center gap-2">
                {(promptInput || uploadedImage) && (
                  <button
                    type="button"
                    onClick={handleClearDock}
                    className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-xs flex items-center gap-1"
                    title="Clear input"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 px-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs flex items-center gap-1"
                  title="Collapse to compact mode"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Compact</span>
                </button>
              </div>
            </div>

            {/* Smart Multi-Line Textarea */}
            <div className="relative">
              <textarea
                value={promptInput}
                onChange={(e) => handlePromptChange(e.target.value)}
                rows={6}
                disabled={isGenerating}
                placeholder={
                  activeTab === 'youtube'
                    ? 'Paste YouTube video transcript or summary... e.g.:\nIn this video by Low Level, we explore whether AI can reverse engineer software using Ghidra and automated agent loops...'
                    : activeTab === 'upload'
                    ? 'Additional context or guidance for analyzing the attached screenshot (e.g. highlight the microservice topology and CPU metrics)...'
                    : 'Paste engineering blog post, GitHub README, or system notes... e.g.:\nAnthropic announced Scion, an internal system designed to address Git scaling limitations when thousands of automated AI agents run around the clock...'
                }
                className="w-full bg-black/70 border border-white/15 focus:border-cyan-400/50 rounded-xl p-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner resize-y leading-relaxed font-mono min-h-[140px]"
              />

              {/* Sub-telemetry strip inside editor */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-black/80 border-x border-b border-white/10 rounded-b-xl text-[11px] text-slate-400 font-mono -mt-1.5">
                <span>{promptInput.length.toLocaleString()} characters</span>
                {promptInput.length > 200 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    Direct AI Schema Mode (Search Grounding Bypassed)
                  </span>
                ) : promptInput.length > 0 ? (
                  <span className="text-cyan-400">🔍 Real-Time Grounding Mode</span>
                ) : (
                  <span>Ready for topic or notes</span>
                )}
              </div>
            </div>

            {/* Integrated Screenshot & Attachment Dropzone (Shown on 'upload' tab or if image attached) */}
            {(activeTab === 'upload' || uploadedImage) && (
              <div className="space-y-3">
                {uploadedImage ? (
                  <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={uploadedImage.base64}
                        alt="Attached screenshot preview"
                        className="w-14 h-14 object-cover rounded-lg border border-white/20 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{uploadedImage.name}</div>
                        <div className="text-[10px] font-mono text-cyan-300">
                          {uploadedImage.sizeKb} KB • Mobile-optimized JPEG for fast OCR
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:text-white hover:bg-red-500/20 text-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 rounded-xl p-5 text-center hover:border-cyan-400/50 hover:bg-white/[0.02] transition-all cursor-pointer bg-black/30"
                  >
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${theme.accent}15` }}
                      >
                        <ImageIcon className="w-5 h-5" style={{ color: theme.accent }} />
                      </div>
                      <div className="text-xs font-bold text-white">
                        Drop screenshot image or click to browse
                      </div>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        Supports PNG, JPG, WebP. Automatically compressed to 1280px for instant OCR analysis.
                      </p>
                    </div>
                  </div>
                )}

                {/* Sample Slides Selector */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono block mb-1.5">
                    Or test with attached architecture samples:
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
                      className="p-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-left text-xs text-slate-300 transition-colors cursor-pointer"
                    >
                      <div className="font-semibold text-white truncate text-[11px]">Slide 1: Scion Hub</div>
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
                      className="p-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-left text-xs text-slate-300 transition-colors cursor-pointer"
                    >
                      <div className="font-semibold text-white truncate text-[11px]">Slide 6: 3-Metrics</div>
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
                      className="p-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-left text-xs text-slate-300 transition-colors cursor-pointer"
                    >
                      <div className="font-semibold text-white truncate text-[11px]">Slide 9: MARROK CTA</div>
                      <div className="text-[10px] text-slate-400">AI agents at scale</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Domain Classification Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Domain:</span>
                <div className="flex flex-wrap items-center bg-black/60 p-1 rounded-xl border border-white/10 gap-1">
                  {DOMAIN_CATEGORIES.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCategoryHint(opt.id)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
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

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstantSynthesize}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs tracking-wide transition-all cursor-pointer disabled:opacity-50"
                  title="Generate immediately using local MARROK engine (0ms latency)"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Instant Synthesize</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAutonomousPipeline()}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 transition-all shadow-md cursor-pointer disabled:opacity-75"
                  style={{ backgroundColor: theme.accent }}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{pipelineStatus || 'Synthesizing AI Carousel...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>Generate Carousel & Caption</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
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
              onOpenAiImageStudio={() => setImageStudioTargetIndex(currentSlideIndex)}
              onOpenMediaSearch={() =>
                setMediaModalTarget({
                  field: 'imageUrl',
                  title: 'Search Architecture Graphic',
                  initialQuery: currentSlide.enTitle?.slice(0, 30) || '',
                })
              }
            />

            {imageStudioTargetIndex !== null &&
              imageStudioTargetIndex === currentSlideIndex &&
              carousel.slides[imageStudioTargetIndex] && (
              <SlideImageStudio
                slide={carousel.slides[imageStudioTargetIndex]}
                theme={theme}
                onApplyImage={(imageUrl, prompt, model) => {
                  const targetIndex = imageStudioTargetIndex;
                  if (targetIndex === null) return;
                  applyDeckUpdate((prev) => {
                    if (targetIndex >= prev.slides.length) return prev;
                    const newSlides = [...prev.slides];
                    newSlides[targetIndex] = sanitizeSlide(
                      {
                        ...newSlides[targetIndex],
                        imageUrl,
                        imagePrompt: prompt,
                        imageModel: model,
                      },
                      targetIndex,
                      prev.slides.length
                    );
                    return { ...prev, slides: newSlides };
                  });
                  setImageStudioTargetIndex(null);
                  onShowToast('Applied AI diagram to slide');
                }}
                onClose={() => setImageStudioTargetIndex(null)}
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
