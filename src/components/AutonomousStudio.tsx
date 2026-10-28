import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  X,
  Check,
  Copy,
  FileText,
  Youtube,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Trash2,
  SlidersHorizontal,
  Zap,
  ChevronLeft,
  ChevronRight,
  Download,
  Sliders,
  Type,
  Layers,
  LayoutGrid,
  Smartphone,
  BookmarkCheck,
} from 'lucide-react';
import {
  CarouselData,
  SlideData,
  SlideType,
  ThemePalette,
  HookVariant,
  DiagramNode,
  DEFAULT_PALETTES,
  GraphicalElementId,
  ElementLayoutOverride,
  SavedPostStatus,
} from '../types.ts';
import { downloadSingleSlidePng, copySlideToClipboard, downloadAllSlidesZip } from '../lib/canvasExporter.ts';
import { runAutonomousPipeline, enrichAndPaceCarousel } from '../lib/autonomousPipeline.ts';
import { sanitizeSlide } from '../lib/textSanitizer.ts';
import { seedSlideArchetypeData, synthesizeCarousel } from '../lib/synthesizer.ts';
import { runQAChecks, CHAR_LIMITS } from '../lib/qaChecks.ts';
import { runPlatformRiskChecks } from '../lib/riskChecks.ts';
import { autoPolishHeadline, autoFitTextToLimits } from '../lib/text/headlines.ts';
import { fixArabicPunctuation } from '../lib/text/arabicBiDi.ts';
import { SlideImageStudio } from './SlideImageStudio.tsx';
import { MediaSearchModal } from './MediaSearchModal.tsx';
import {
  ViewportCanvas,
  SlideNavigator,
  InlineSlideEditor,
  ArchetypeControls,
  ExportBar,
  ElementInspector,
} from './studio/index.ts';

function deriveTopicHashtags(carousel: CarouselData): string[] {
  const captionMatches = (carousel.caption || '').match(/#[A-Za-z0-9_\u0600-\u06FF]+/g);
  if (captionMatches && captionMatches.length >= 3) {
    return Array.from(new Set(captionMatches)).slice(0, 6);
  }

  const tags = new Set<string>(['#MARROK', '#SystemDesign']);
  const catWords = (carousel.category || '')
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length >= 3);
  if (catWords.length > 0) {
    tags.add(`#${catWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')}`);
  }

  const firstTitleWords = (carousel.slides[0]?.enTitle || '')
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length >= 4 && !/^(with|from|into|beyond|when|what|your|that|this)$/i.test(w));
  for (const w of firstTitleWords.slice(0, 2)) {
    tags.add(`#${w.charAt(0).toUpperCase() + w.slice(1)}`);
  }

  tags.add('#SoftwareEngineering');
  tags.add('#TechInArabic');
  return Array.from(tags).slice(0, 6);
}

interface AutonomousStudioProps {
  carousel: CarouselData;
  theme: ThemePalette;
  activeSlideIndex?: number;
  onSlideChange?: (index: number) => void;
  onUpdateCarousel: React.Dispatch<React.SetStateAction<CarouselData>>;
  onSelectTheme: (palette: ThemePalette) => void;
  onOpenThemeCustomizer: () => void;
  onOpenContactSheet?: () => void;
  onOpenPlanInspector?: () => void;
  onOpenPreviewDrawer?: (tab?: 'simulator' | 'polish') => void;
  onOpenSavedPostsDrawer?: () => void;
  onSaveValidPost?: (status: SavedPostStatus, allowOverride?: boolean) => Promise<void>;
  isSavingPost?: boolean;
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
  activeSlideIndex,
  onSlideChange,
  onUpdateCarousel,
  onSelectTheme,
  onOpenContactSheet,
  onOpenPreviewDrawer,
  onOpenSavedPostsDrawer,
  onSaveValidPost,
  isSavingPost = false,
  onShowToast,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(activeSlideIndex ?? 0);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [copiedType, setCopiedType] = useState<'caption' | 'slide' | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  // Right-Hand Tabbed Inspector ('copy' | 'visual' | 'position' | 'caption')
  const [inspectorTab, setInspectorTab] = useState<'copy' | 'visual' | 'position' | 'caption'>('copy');

  // Direct Graphical Control & Hit-Testing States
  const [selectedElementId, setSelectedElementId] = useState<GraphicalElementId | null>(null);

  // Sync with external slide index changes (e.g. from ContactSheetModal thumbnail clicks)
  useEffect(() => {
    if (activeSlideIndex !== undefined && activeSlideIndex !== currentSlideIndex) {
      const clamped = Math.max(0, Math.min(carousel.slides.length - 1, activeSlideIndex));
      setCurrentSlideIndex(clamped);
    }
  }, [activeSlideIndex, carousel.slides.length]);

  const changeSlide = (indexOrUpdater: number | ((prev: number) => number)) => {
    setCurrentSlideIndex((prev) => {
      const next = typeof indexOrUpdater === 'function' ? indexOrUpdater(prev) : indexOrUpdater;
      const clamped = Math.max(0, Math.min(carousel.slides.length - 1, next));
      if (clamped !== prev) {
        onSlideChange?.(clamped);
      }
      return clamped;
    });
  };

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
  const [imageStudioTargetIndex, setImageStudioTargetIndex] = useState<number | null>(null);
  const [mediaModalTarget, setMediaModalTarget] = useState<{
    field: 'imageUrl';
    title?: string;
    initialQuery?: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mobile Studio Segmented Mode Switcher ('canvas' | 'editor')
  const [mobileStudioTab, setMobileStudioTab] = useState<'canvas' | 'editor'>('canvas');

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

  // Keep the image studio bound to a valid slide in range
  useEffect(() => {
    if (imageStudioTargetIndex !== null && imageStudioTargetIndex >= carousel.slides.length) {
      setImageStudioTargetIndex(null);
    }
  }, [carousel.slides.length, imageStudioTargetIndex]);

  const applyDeckUpdate = (updater: (prev: CarouselData) => CarouselData) => {
    deckRevisionRef.current += 1;
    onUpdateCarousel(updater);
  };

  // Direct Graphical Layout Override Handlers
  const handleUpdateElementLayoutOverride = (
    elementId: GraphicalElementId,
    override: ElementLayoutOverride | null
  ) => {
    applyDeckUpdate((prev) => {
      const targetIndex = Math.min(currentSlideIndex, prev.slides.length - 1);
      if (targetIndex < 0 || !prev.slides[targetIndex]) return prev;
      const current = prev.slides[targetIndex];
      const existingOverrides = { ...(current.layoutOverrides || {}) };
      if (
        !override ||
        ((override.dx === 0 || override.dx === undefined) &&
          (override.dy === 0 || override.dy === undefined) &&
          (override.scale === 1 || override.scale === undefined) &&
          override.opacity === undefined)
      ) {
        delete existingOverrides[elementId];
      } else {
        existingOverrides[elementId] = override;
      }
      const newSlides = [...prev.slides];
      newSlides[targetIndex] = {
        ...current,
        layoutOverrides: Object.keys(existingOverrides).length > 0 ? existingOverrides : undefined,
      };
      return { ...prev, slides: newSlides };
    });
  };

  const handleResetSlideLayoutOverrides = () => {
    applyDeckUpdate((prev) => {
      const targetIndex = Math.min(currentSlideIndex, prev.slides.length - 1);
      if (targetIndex < 0 || !prev.slides[targetIndex]) return prev;
      const newSlides = [...prev.slides];
      newSlides[targetIndex] = {
        ...newSlides[targetIndex],
        layoutOverrides: undefined,
      };
      return { ...prev, slides: newSlides };
    });
    onShowToast('Reset all layout overrides on this slide');
  };

  const handleApplyOverrideToAllSlides = (
    elementId: GraphicalElementId,
    override: ElementLayoutOverride | null
  ) => {
    applyDeckUpdate((prev) => {
      const newSlides = prev.slides.map((s) => {
        const existingOverrides = { ...(s.layoutOverrides || {}) };
        if (
          !override ||
          ((override.dx === 0 || override.dx === undefined) &&
            (override.dy === 0 || override.dy === undefined) &&
            (override.scale === 1 || override.scale === undefined) &&
            override.opacity === undefined)
        ) {
          delete existingOverrides[elementId];
        } else {
          existingOverrides[elementId] = { ...override };
        }
        return {
          ...s,
          layoutOverrides: Object.keys(existingOverrides).length > 0 ? existingOverrides : undefined,
        };
      });
      return { ...prev, slides: newSlides };
    });
    onShowToast(`Applied ${elementId} layout to all ${carousel.slides.length} slides`);
  };

  // Keyboard navigation (Left / Right arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        changeSlide((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        changeSlide((prev) => Math.min(carousel.slides.length - 1, prev + 1));
      } else if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carousel.slides.length, isExpanded]);

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

  // Global Clipboard Screenshot Ingestion (Ctrl+V anywhere in app)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleImageFile(file);
            onShowToast('📋 Screenshot attached directly from clipboard!');
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

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

    // Automatically collapse overlay drawer when starting generation
    setIsExpanded(false);

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
      changeSlide(0);
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
    setIsExpanded(false);
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
      changeSlide(0);
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

  // 1-Click Auto-Fit Slide Copy to Spec §8 Limits
  const handleAutoFitCurrentSlide = () => {
    applyDeckUpdate((prev) => {
      const targetIndex = Math.min(currentSlideIndex, prev.slides.length - 1);
      const slide = prev.slides[targetIndex];
      if (!slide) return prev;

      const newSlides = [...prev.slides];
      newSlides[targetIndex] = sanitizeSlide(
        {
          ...slide,
          enTitle: autoFitTextToLimits(autoPolishHeadline(slide.enTitle || ''), CHAR_LIMITS.enTitle),
          arTitle: autoFitTextToLimits(fixArabicPunctuation(slide.arTitle || ''), CHAR_LIMITS.arTitle),
          enBody: autoFitTextToLimits(slide.enBody || '', CHAR_LIMITS.enBody),
          arBody: autoFitTextToLimits(fixArabicPunctuation(slide.arBody || ''), CHAR_LIMITS.arBody),
        },
        targetIndex,
        prev.slides.length
      );

      return { ...prev, slides: newSlides };
    });
    onShowToast(`Auto-fitted Slide ${currentSlideIndex + 1} copy to character limits`);
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

  // Explicit confirmation: Creator confirms draft review (advisory status)
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
      onShowToast('Draft review unmarked. Advisory QA warnings active.');
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
    let targetIdx = 0;
    applyDeckUpdate((prev) => {
      const insertAt = Math.min(currentSlideIndex + 1, prev.slides.length);
      targetIdx = insertAt;
      const newSlides = [...prev.slides];
      newSlides.splice(insertAt, 0, newSlide);
      return { ...prev, slides: newSlides };
    });
    changeSlide(targetIdx);
    onShowToast(`Added slide #${targetIdx + 1}`);
  };

  const handleDuplicateSlide = () => {
    let targetIdx = 0;
    applyDeckUpdate((prev) => {
      const fromIdx = Math.min(currentSlideIndex, prev.slides.length - 1);
      const current = prev.slides[fromIdx];
      if (!current) return prev;
      const clone = JSON.parse(JSON.stringify(current));
      const insertAt = fromIdx + 1;
      targetIdx = insertAt;
      const newSlides = [...prev.slides];
      newSlides.splice(insertAt, 0, clone);
      return { ...prev, slides: newSlides };
    });
    changeSlide(targetIdx);
    onShowToast(`Duplicated slide #${targetIdx + 1}`);
  };

  const handleDeleteSlide = () => {
    let deleted = false;
    let newIdx = 0;
    applyDeckUpdate((prev) => {
      if (prev.slides.length <= 3) return prev;
      deleted = true;
      const deleteAt = Math.min(currentSlideIndex, prev.slides.length - 1);
      const newSlides = prev.slides.filter((_, idx) => idx !== deleteAt);
      newIdx = Math.max(0, Math.min(newSlides.length - 1, deleteAt - 1));
      return {
        ...prev,
        slides: newSlides,
      };
    });
    if (deleted) {
      changeSlide(newIdx);
      onShowToast(`Deleted slide #${currentSlideIndex + 1}`);
    } else {
      onShowToast('Minimum 3 slides required in carousel');
    }
  };

  const handleMoveSlide = (direction: 'left' | 'right') => {
    let movedTarget = -1;
    applyDeckUpdate((prev) => {
      const fromIndex = Math.min(currentSlideIndex, prev.slides.length - 1);
      const targetIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.slides.length) return prev;
      const newSlides = [...prev.slides];
      const [removed] = newSlides.splice(fromIndex, 1);
      newSlides.splice(targetIndex, 0, removed);
      movedTarget = targetIndex;
      return { ...prev, slides: newSlides };
    });
    if (movedTarget !== -1) {
      changeSlide(movedTarget);
      onShowToast(`Moved slide to position #${movedTarget + 1}`);
    }
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

  const [overrideExportBlock, setOverrideExportBlock] = useState(false);
  const isOfflineDraft = Boolean(
    carousel.sourceMeta?.isFallback ||
      carousel.sourceMeta?.engine === 'offline' ||
      carousel.sourceMeta?.engine === 'offline-synthesizer'
  );
  const isReviewed = Boolean(carousel.sourceMeta?.userReviewed);
  const qaReport = runQAChecks(carousel);
  const riskReport = runPlatformRiskChecks(carousel, promptInput);
  const dynamicHashtags = deriveTopicHashtags(carousel);

  const engineBadge =
    carousel.sourceMeta?.engine === 'grounded' || carousel.sourceMeta?.status === 'verified_live'
      ? { label: 'Grounded', cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' }
      : isOfflineDraft
      ? { label: 'Offline', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300' }
      : { label: 'Ungrounded AI', cls: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' };

  // 1-Click Export ZIP with QA & Platform Safety Gate
  const handleExportZip = async () => {
    const ctaSlide = carousel.slides[carousel.slides.length - 1];
    const hasCreatorCredit = Boolean(
      (
        carousel.sourceMeta?.creator ||
        carousel.sourceMeta?.channel ||
        carousel.channel ||
        ctaSlide?.enCredit ||
        ''
      ).trim()
    );

    if ((!qaReport.canExport || riskReport.status === 'BLOCK' || !hasCreatorCredit) && !overrideExportBlock) {
      setInspectorTab('caption');
      setMobileStudioTab('editor');
      onShowToast(
        !hasCreatorCredit
          ? '⚠️ Creator/Channel credit required before export (see Caption & QA tab).'
          : `⚠️ Export blocked by ${qaReport.failCount} QA / ${riskReport.blockCount} Risk check(s). Review or enable Override in Caption & QA.`
      );
      return;
    }

    if (isOfflineDraft && !isReviewed) {
      onShowToast('⚠️ Exporting unreviewed offline draft (Override active)...');
    } else if (!qaReport.canExport || riskReport.status === 'WARN') {
      onShowToast(`⚠️ Exporting with advisory warnings...`);
    }
    setIsExportingZip(true);
    setExportProgress({ current: 0, total: carousel.slides.length });
    try {
      await downloadAllSlidesZip(
        carousel,
        theme,
        (current, total) => {
          setExportProgress({ current, total });
        },
        carousel.visualOptions
      );
      if (onSaveValidPost) {
        try {
          await onSaveValidPost('posted', overrideExportBlock);
        } catch {
          // Non-fatal if background post save fails during ZIP download
        }
      }
      onShowToast('All 1080×1920 JPG slides & Metricool bundle exported into ZIP!');
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
    try {
      await copySlideToClipboard(carousel, currentSlideIndex, theme, carousel.visualOptions);
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
    const hashtagLine = dynamicHashtags.join(' ');
    const text = (rawCaption.includes('#') ? rawCaption : `${rawCaption}\n\n${hashtagLine}`).replace(
      /\u00A0/g,
      ' '
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType('caption');
      onShowToast('Copied TikTok caption and topic hashtags to clipboard!');
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      onShowToast('Failed to copy caption.');
    }
  };

  const currentSlide = carousel.slides[currentSlideIndex] || carousel.slides[0];

  const handleUpdateSatLabel = (index: number, value: string) => {
    const currentLabels = currentSlide.satLabels && currentSlide.satLabels.length > 0
      ? [...currentSlide.satLabels]
      : ['Service Pod', 'Storage', 'Telemetry', 'Identity', 'AI Agent', 'VCS Engine'];
    currentLabels[index] = value;
    handleUpdateCurrentSlide('satLabels', currentLabels);
  };

  const handleUpdateSatIcon = (index: number, iconName: string) => {
    const defaultIcons = ['server', 'database', 'gauge', 'users', 'robot', 'gitMerge'];
    const currentIcons = currentSlide.satIcons && currentSlide.satIcons.length > 0
      ? [...currentSlide.satIcons]
      : defaultIcons;
    currentIcons[index] = iconName;
    handleUpdateCurrentSlide('satIcons', currentIcons);
    onShowToast(`Updated node #${index + 1} icon to ${iconName}`);
  };

  const handleUpdateCenterIcon = (iconName: string) => {
    handleUpdateCurrentSlide('centerIcon', iconName);
    onShowToast(`Updated central hub icon to ${iconName}`);
  };

  const handleUpdateCenterTag = (tag: string) => {
    handleUpdateCurrentSlide('centerTag', tag);
  };

  const handleAddSatNode = () => {
    const currentLabels = currentSlide.satLabels && currentSlide.satLabels.length > 0
      ? [...currentSlide.satLabels]
      : ['Service Pod', 'Storage', 'Telemetry', 'Identity', 'AI Agent', 'VCS Engine'];
    if (currentLabels.length >= 6) {
      onShowToast('Maximum 6 orbital nodes reached');
      return;
    }
    const defaultAdditions = ['Gateway', 'Cache Layer', 'Event Stream', 'Policy Mesh', 'Telemetry', 'Core Engine'];
    const newLabel = defaultAdditions[currentLabels.length] || `Node ${currentLabels.length + 1}`;
    const newLabels = [...currentLabels, newLabel];

    const currentIcons = currentSlide.satIcons && currentSlide.satIcons.length > 0
      ? [...currentSlide.satIcons]
      : ['server', 'database', 'gauge', 'users', 'robot', 'gitMerge'];
    const iconPool = ['zap', 'hardDrive', 'lock', 'terminal', 'cloud', 'activity', 'cpu', 'box'];
    const newIcons = [...currentIcons, iconPool[currentLabels.length % iconPool.length]];

    applyDeckUpdate((prev) => {
      const targetIndex = Math.min(currentSlideIndex, prev.slides.length - 1);
      if (targetIndex < 0 || !prev.slides[targetIndex]) return prev;
      const newSlides = [...prev.slides];
      newSlides[targetIndex] = {
        ...newSlides[targetIndex],
        satLabels: newLabels,
        satIcons: newIcons,
      };
      return { ...prev, slides: newSlides };
    });
    onShowToast(`Added orbital node #${newLabels.length}`);
  };

  const handleDeleteSatNode = (indexToDelete: number) => {
    const currentLabels = currentSlide.satLabels && currentSlide.satLabels.length > 0
      ? [...currentSlide.satLabels]
      : ['Service Pod', 'Storage', 'Telemetry', 'Identity', 'AI Agent', 'VCS Engine'];
    if (currentLabels.length <= 2) {
      onShowToast('Hub diagram requires at least 2 orbital nodes');
      return;
    }
    const newLabels = currentLabels.filter((_, idx) => idx !== indexToDelete);
    const currentIcons = currentSlide.satIcons && currentSlide.satIcons.length > 0
      ? [...currentSlide.satIcons]
      : ['server', 'database', 'gauge', 'users', 'robot', 'gitMerge'];
    const newIcons = currentIcons.filter((_, idx) => idx !== indexToDelete);

    applyDeckUpdate((prev) => {
      const targetIndex = Math.min(currentSlideIndex, prev.slides.length - 1);
      if (targetIndex < 0 || !prev.slides[targetIndex]) return prev;
      const newSlides = [...prev.slides];
      newSlides[targetIndex] = {
        ...newSlides[targetIndex],
        satLabels: newLabels,
        satIcons: newIcons,
      };
      return { ...prev, slides: newSlides };
    });
    onShowToast(`Deleted orbital node #${indexToDelete + 1}`);
  };

  const handleUpdateDiagramNode = (nodeIndex: number, field: keyof DiagramNode, value: string) => {
    const defaultNodes: DiagramNode[] = [
      { label: 'Client Ingress', sublabel: 'Port 443', status: 'ACTIVE', icon: 'server' },
      { label: 'Control Plane', sublabel: 'Policy Engine', status: 'VERIFIED', icon: 'cpu' },
      { label: 'Target Service', sublabel: 'Encrypted Pipe', status: 'SECURED', icon: 'database' },
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

  const activeOverridesCount = Object.keys(currentSlide.layoutOverrides || {}).length;

  return (
    <div className="w-full lg:flex-1 lg:min-h-0 flex flex-col gap-3 animate-fade-in">
      {/* 1. Compact Command Bar with Overlay Ingestion Drawer */}
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
        className="relative z-30 shrink-0"
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

        {/* Slim Single-Row Command Bar */}
        <div
          className={`bg-[#0b1118]/95 border rounded-2xl px-3 py-2 shadow-xl backdrop-blur-xl transition-all duration-200 ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-950/20 ring-2 ring-cyan-400/40'
              : isExpanded
              ? 'border-white/25 ring-1 ring-white/15'
              : 'border-white/10'
          }`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunAutonomousPipeline();
            }}
            className="flex flex-wrap sm:flex-nowrap items-center gap-2"
          >
            {/* Topic / Notes Input */}
            <div className="relative flex-1 min-w-[200px] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 shrink-0 ml-2" style={{ color: theme.accent }} />
              <input
                type="text"
                value={promptInput}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="Enter topic, paste notes, or drop a screenshot (e.g. Zero-Trust Mesh, Redis 8)..."
                disabled={isGenerating}
                className="w-full bg-transparent px-2 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-sans"
              />

              {uploadedImage && (
                <div className="flex items-center gap-1.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] px-2 py-1 rounded-lg shrink-0">
                  <ImageIcon className="w-3 h-3" />
                  <span className="truncate max-w-[90px] font-mono text-[10px]">{uploadedImage.name}</span>
                  <button
                    type="button"
                    onClick={() => setUploadedImage(null)}
                    className="hover:text-white cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Starter Pills (Desktop XL) */}
            {!promptInput && !uploadedImage && !pipelineStatus && (
              <div className="hidden xl:flex items-center gap-1 shrink-0">
                {STARTER_TOPICS.slice(0, 2).map((topic) => (
                  <button
                    key={topic.name}
                    type="button"
                    onClick={() => handleTriggerStarterTopic(topic)}
                    disabled={isGenerating}
                    className="px-2 py-1 rounded-lg text-[11px] bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                    title={topic.desc}
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
            )}

            {/* Pipeline Status Indicator */}
            {pipelineStatus && (
              <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono px-2 shrink-0" style={{ color: theme.accent }}>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="truncate max-w-[180px]">{pipelineStatus}</span>
              </div>
            )}

            {/* Engine Provenance Badge */}
            <button
              type="button"
              onClick={() => setInspectorTab('caption')}
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-colors cursor-pointer shrink-0 ${engineBadge.cls}`}
              title="Active synthesis engine & verification status (click to inspect)"
            >
              <span>{engineBadge.label}</span>
            </button>

            {/* Expand Ingestion Studio Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isExpanded
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white'
              }`}
              title="Open Multimodal Ingestion Drawer (Notes, YouTube Transcript, Screenshot OCR)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Source / OCR</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Primary Generate Button */}
            <button
              type="submit"
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 px-4 py-1.5 min-h-[34px] rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 transition-all shadow-md cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              style={{ backgroundColor: theme.accent }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Floating Overlay Ingestion Drawer (Expands over workspace without pushing layout) */}
        {isExpanded && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setIsExpanded(false)}
            />
            <div className="absolute inset-x-0 top-full mt-2 z-40 bg-[#0b1118] border border-white/20 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-fade-in">
              {/* Header with Ingestion Tabs and Collapse Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-jakarta tracking-wide">
                    Multimodal Source Ingestion
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    · Paste long-form notes, YouTube transcripts, or architecture screenshots
                  </span>
                </div>

                {/* Ingestion Mode Tabs */}
                <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
                  {INGEST_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                    title="Close drawer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {/* Starter Topics Row inside Expanded Drawer */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-[11px] text-slate-400 font-medium shrink-0">Starter Topics:</span>
                {STARTER_TOPICS.map((topic) => (
                  <button
                    key={topic.name}
                    type="button"
                    onClick={() => handleTriggerStarterTopic(topic)}
                    disabled={isGenerating}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>{topic.name}</span>
                  </button>
                ))}
              </div>

              {/* Smart Multi-Line Textarea */}
              <div className="relative">
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  rows={5}
                  disabled={isGenerating}
                  placeholder={
                    activeTab === 'youtube'
                      ? 'Paste YouTube video transcript or summary... e.g.:\nIn this video by Low Level, we explore whether AI can reverse engineer software using Ghidra and automated agent loops...'
                      : activeTab === 'upload'
                      ? 'Additional context or guidance for analyzing the attached screenshot (e.g. highlight the microservice topology and CPU metrics)...'
                      : 'Paste engineering blog post, GitHub README, or system notes... e.g.:\nAnthropic announced Scion, an internal system designed to address Git scaling limitations when thousands of automated AI agents run around the clock...'
                  }
                  className="w-full bg-black/70 border border-white/15 focus:border-cyan-400/50 rounded-xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner resize-y leading-relaxed font-mono min-h-[110px]"
                />

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

              {/* Integrated Screenshot & Attachment Dropzone */}
              {(activeTab === 'upload' || uploadedImage) && (
                <div className="space-y-3">
                  {uploadedImage ? (
                    <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={uploadedImage.base64}
                          alt="Attached screenshot preview"
                          className="w-12 h-12 object-cover rounded-lg border border-white/20 shrink-0"
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
                      className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-cyan-400/50 hover:bg-white/[0.02] transition-all cursor-pointer bg-black/30"
                    >
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <ImageIcon className="w-5 h-5" style={{ color: theme.accent }} />
                        <div className="text-xs font-bold text-white">
                          Drop screenshot image or click to browse
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Supports PNG, JPG, WebP (or press Ctrl+V anywhere).
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

              {/* Domain Classification Pills & Actions */}
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInstantSynthesize}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs tracking-wide transition-all cursor-pointer disabled:opacity-50"
                    title="Generate immediately using local MARROK engine (0ms latency)"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Instant Synthesize</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunAutonomousPipeline()}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 transition-all shadow-md cursor-pointer disabled:opacity-75"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Generate Carousel & Caption</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. Mobile Segmented Switcher (Visible only on < lg) */}
      <div className="lg:hidden flex items-center p-1 bg-black/75 border border-white/15 rounded-xl gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setMobileStudioTab('canvas')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileStudioTab === 'canvas'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          style={mobileStudioTab === 'canvas' ? { color: theme.accent } : undefined}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>9:16 Canvas Stage</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileStudioTab('editor')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileStudioTab === 'editor'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          style={mobileStudioTab === 'editor' ? { color: theme.accent } : undefined}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Slide Inspector</span>
        </button>
      </div>

      {/* 3. Fixed Studio Shell: Left 9:16 Stage + Right Tabbed Inspector */}
      <div className="lg:flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: 9:16 Canvas + Compact Storyboard + Quick Export Bar */}
        <div
          className={`lg:col-span-5 flex-col items-center justify-between lg:h-full lg:min-h-0 gap-2 ${
            mobileStudioTab === 'canvas' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          <div className="flex-1 min-h-0 flex items-center justify-center w-full">
            <ViewportCanvas
              carousel={carousel}
              currentSlideIndex={currentSlideIndex}
              theme={theme}
              showSafeZones={showSafeZones}
              onToggleSafeZones={() => setShowSafeZones(!showSafeZones)}
              onPreviousSlide={() => changeSlide((prev) => Math.max(0, prev - 1))}
              onNextSlide={() => changeSlide((prev) => Math.min(carousel.slides.length - 1, prev + 1))}
              canvasRef={canvasRef}
              selectedElementId={selectedElementId}
              onSelectElement={(id) => {
                setSelectedElementId(id);
              }}
              onUpdateLayoutOverride={handleUpdateElementLayoutOverride}
            />
          </div>

          <div className="w-full flex flex-col items-center gap-2 shrink-0">
            <SlideNavigator
              carousel={carousel}
              currentSlideIndex={currentSlideIndex}
              showSafeZones={showSafeZones}
              onToggleSafeZones={() => setShowSafeZones(!showSafeZones)}
              onSelectSlide={(idx) => changeSlide(idx)}
              onAddSlide={handleAddSlide}
              onDuplicateSlide={handleDuplicateSlide}
              onDeleteSlide={handleDeleteSlide}
              onMoveSlide={handleMoveSlide}
            />

            {/* Sleek Single-Row Export & Preview Dock */}
            <div className="w-full max-w-[360px] flex items-center gap-1.5 bg-[#0b1118]/90 border border-white/10 rounded-xl p-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  if (isOfflineDraft && !isReviewed) {
                    onShowToast('⚠️ Downloading unreviewed offline draft...');
                  } else {
                    onShowToast(`Downloaded Slide ${currentSlideIndex + 1} JPG`);
                  }
                  downloadSingleSlidePng(
                    carousel,
                    currentSlideIndex,
                    `MARROK_Slide_${currentSlideIndex + 1}.jpg`,
                    theme,
                    carousel.visualOptions
                  );
                }}
                className="px-2.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                title="Download current slide as 1080×1920 JPG"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>JPG</span>
              </button>

              <button
                type="button"
                onClick={handleCopySlide}
                className="px-2.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                title="Copy current slide PNG to clipboard"
              >
                {copiedType === 'slide' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedType === 'slide' ? 'Copied' : 'Copy'}</span>
              </button>

              {onOpenContactSheet && (
                <button
                  type="button"
                  onClick={onOpenContactSheet}
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Open All-Slides Contact Sheet"
                >
                  <LayoutGrid className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                </button>
              )}

              {onOpenPreviewDrawer && (
                <button
                  type="button"
                  onClick={() => onOpenPreviewDrawer('simulator')}
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Open 9:16 TikTok Feed Simulator"
                >
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              )}

              {onSaveValidPost && (
                <button
                  type="button"
                  disabled={isSavingPost}
                  onClick={() => onSaveValidPost('validated', overrideExportBlock)}
                  className="px-2.5 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-[11px] font-bold text-cyan-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                  title="Validate and save this post to your Saved Posts Vault"
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{carousel.id ? 'Saved' : 'Save Valid'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportZip}
                disabled={isExportingZip}
                className="flex-1 py-2 px-3 rounded-lg font-bold text-[11px] uppercase tracking-wider text-slate-950 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: theme.accent }}
                title="Download all 1080×1920 slides + Metricool bundle ZIP"
              >
                {isExportingZip && exportProgress ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {exportProgress.current}/{exportProgress.total}
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Export ZIP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Tabbed Inspector (Copy | Visual Layout | Position | Caption & QA) */}
        <div
          className={`lg:col-span-7 flex-col lg:h-full lg:min-h-0 bg-[#0b1118]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${
            mobileStudioTab === 'canvas' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Inspector Top Tab Bar */}
          <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2 border-b border-white/10 bg-black/40 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setInspectorTab('copy')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  inspectorTab === 'copy'
                    ? 'bg-white/15 text-white shadow-sm border border-white/15'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Type className="w-3.5 h-3.5" style={inspectorTab === 'copy' ? { color: theme.accent } : undefined} />
                <span>Copy</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('visual')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  inspectorTab === 'visual'
                    ? 'bg-white/15 text-white shadow-sm border border-white/15'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Layers className="w-3.5 h-3.5" style={inspectorTab === 'visual' ? { color: theme.accent } : undefined} />
                <span>Visual Layout</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/50 text-slate-300">
                  {currentSlide.type}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('position')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  inspectorTab === 'position'
                    ? 'bg-white/15 text-white shadow-sm border border-white/15'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" style={inspectorTab === 'position' ? { color: theme.accent } : undefined} />
                <span>Position</span>
                {activeOverridesCount > 0 && (
                  <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                    {activeOverridesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('caption')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  inspectorTab === 'caption'
                    ? 'bg-white/15 text-white shadow-sm border border-white/15'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" style={inspectorTab === 'caption' ? { color: theme.accent } : undefined} />
                <span>Caption & QA</span>
                {(!qaReport.canExport || (isOfflineDraft && !isReviewed)) && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
            </div>

            {/* Selected Layer Quick Badge */}
            {selectedElementId && inspectorTab !== 'position' && (
              <button
                type="button"
                onClick={() => setInspectorTab('position')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer shrink-0"
                title="Adjust exact position and scale for selected element"
              >
                <span>Layer: {selectedElementId}</span>
              </button>
            )}
          </div>

          {/* Scrollable Tab Viewport */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* TAB 1: COPY (Bilingual Headlines, Body, Hook Variants & Auto-Fit) */}
            {inspectorTab === 'copy' && (
              <InlineSlideEditor
                currentSlide={currentSlide}
                currentSlideIndex={currentSlideIndex}
                theme={theme}
                isAdvancedCustomizerOpen={false}
                onToggleAdvancedCustomizer={() => setInspectorTab('visual')}
                onUpdateField={handleUpdateCurrentSlide}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                hookVariants={carousel.hookVariants}
                onApplyHookVariant={handleApplyHookVariant}
                onAutoFitSlide={handleAutoFitCurrentSlide}
                onOpenPolishDrawer={onOpenPreviewDrawer ? () => onOpenPreviewDrawer('polish') : undefined}
              />
            )}

            {/* TAB 2: VISUAL LAYOUT (7 Archetypes, Hub/Schematic Nodes, Code, Metrics & AI Image Studio) */}
            {inspectorTab === 'visual' && (
              <div className="space-y-4">
                <ArchetypeControls
                  currentSlide={currentSlide}
                  theme={theme}
                  isAdvancedCustomizerOpen={true}
                  onSetSlideType={handleSetSlideType}
                  onUpdateField={handleUpdateCurrentSlide}
                  onUpdateSatLabel={handleUpdateSatLabel}
                  onUpdateSatIcon={handleUpdateSatIcon}
                  onUpdateCenterIcon={handleUpdateCenterIcon}
                  onUpdateCenterTag={handleUpdateCenterTag}
                  onAddSatNode={handleAddSatNode}
                  onDeleteSatNode={handleDeleteSatNode}
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

                {imageStudioTargetIndex !== null && carousel.slides[imageStudioTargetIndex] && (
                  <SlideImageStudio
                    slideIndex={imageStudioTargetIndex}
                    slide={carousel.slides[imageStudioTargetIndex]}
                    theme={theme}
                    onApplyImage={(targetIndex, imageUrl, prompt, model) => {
                      applyDeckUpdate((prev) => {
                        if (targetIndex < 0 || targetIndex >= prev.slides.length) return prev;
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
                      onShowToast(`Applied AI diagram to Slide ${targetIndex + 1}`);
                    }}
                    onClose={() => setImageStudioTargetIndex(null)}
                    onShowToast={onShowToast}
                  />
                )}
              </div>
            )}

            {/* TAB 3: POSITION (Direct Graphical Layer Offsets, Scale & Anti-Collision Nudge) */}
            {inspectorTab === 'position' && (
              <ElementInspector
                slide={currentSlide}
                theme={theme}
                isOpen={true}
                onToggleOpen={() => {}}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                onUpdateOverride={handleUpdateElementLayoutOverride}
                onResetOverrides={handleResetSlideLayoutOverrides}
                onApplyToAllSlides={handleApplyOverrideToAllSlides}
              />
            )}

            {/* TAB 4: CAPTION & QA (TikTok Posting Copy, Creator Attribution & Pre-Export QA) */}
            {inspectorTab === 'caption' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">
                        Bilingual TikTok Posting Copy
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Included automatically in your Metricool ZIP bundle
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-200 hover:bg-cyan-500/25 font-semibold cursor-pointer transition-colors"
                    >
                      {copiedType === 'caption' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedType === 'caption' ? 'Copied!' : 'Copy Caption'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={carousel.caption || ''}
                    onChange={(e) =>
                      applyDeckUpdate((prev) => ({
                        ...prev,
                        caption: e.target.value,
                      }))
                    }
                    placeholder="Enter bilingual TikTok caption..."
                    className="w-full p-3 rounded-xl bg-black/70 border border-white/10 focus:border-white/30 text-xs text-slate-200 leading-relaxed focus:outline-none resize-y font-sans"
                  />

                  <div className="text-[11px] font-mono text-slate-400">
                    {dynamicHashtags.join(' ')}
                  </div>
                </div>

                {/* Attribution, Draft Review & Pre-Export QA Checklist */}
                <div className="flex justify-center">
                  <ExportBar
                    carousel={carousel}
                    currentSlideIndex={currentSlideIndex}
                    theme={theme}
                    isOfflineDraft={isOfflineDraft}
                    isReviewed={isReviewed}
                    qaReport={qaReport}
                    riskReport={riskReport}
                    overrideExportBlock={overrideExportBlock}
                    onToggleOverrideBlock={() => setOverrideExportBlock((prev) => !prev)}
                    isExportingZip={isExportingZip}
                    exportProgress={exportProgress}
                    copiedType={copiedType}
                    onUpdateCreator={(newCreator) => {
                      applyDeckUpdate((prev) => {
                        const trimmed = newCreator.trim();
                        const newSlides = [...prev.slides];
                        const lastIdx = newSlides.length - 1;
                        if (lastIdx >= 0 && newSlides[lastIdx].type === 'cta') {
                          newSlides[lastIdx] = {
                            ...newSlides[lastIdx],
                            enCredit: trimmed ? `Source: ${trimmed}` : '',
                            arCredit: trimmed ? `المصدر: ${trimmed}` : '',
                          };
                        }
                        return {
                          ...prev,
                          brand: trimmed || prev.brand,
                          channel: trimmed,
                          slides: newSlides,
                          sourceMeta: {
                            ...prev.sourceMeta,
                            creator: newCreator,
                            channel: newCreator,
                          },
                        };
                      });
                    }}
                    onToggleReviewDraft={handleToggleReviewDraft}
                    onRetryWithAi={() => handleRunAutonomousPipeline()}
                    onDownloadSingleSlide={() => {
                      downloadSingleSlidePng(
                        carousel,
                        currentSlideIndex,
                        `MARROK_Slide_${currentSlideIndex + 1}.jpg`,
                        theme,
                        carousel.visualOptions
                      );
                    }}
                    onCopySlide={handleCopySlide}
                    onExportZip={handleExportZip}
                    onOpenContactSheet={onOpenContactSheet}
                    onSavePost={
                      onSaveValidPost
                        ? (status) => {
                            onSaveValidPost(status, overrideExportBlock);
                          }
                        : undefined
                    }
                    isSavingPost={isSavingPost}
                    onOpenSavedPostsDrawer={onOpenSavedPostsDrawer}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Mobile Bottom Navigation Bar (Visible only on < lg) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#080d11]/95 border-t border-white/10 px-3 py-2 backdrop-blur-md flex items-center justify-between gap-2 shadow-2xl">
        <button
          type="button"
          onClick={() => changeSlide((prev) => Math.max(0, prev - 1))}
          disabled={currentSlideIndex === 0}
          className="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-white/[0.05] border border-white/10 text-white disabled:opacity-25 active:bg-white/15 cursor-pointer flex items-center justify-center shrink-0"
          title="Previous Slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenContactSheet}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 min-h-[38px] rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono font-bold text-slate-200 active:bg-white/10 cursor-pointer"
          title="Jump to Contact Sheet"
        >
          <span>Slide</span>
          <span style={{ color: theme.accent }}>{currentSlideIndex + 1}</span>
          <span className="text-slate-400">/ {carousel.slides.length}</span>
        </button>

        <button
          type="button"
          onClick={() => changeSlide((prev) => Math.min(carousel.slides.length - 1, prev + 1))}
          disabled={currentSlideIndex === carousel.slides.length - 1}
          className="p-2 min-h-[38px] min-w-[38px] rounded-xl bg-white/[0.05] border border-white/10 text-white disabled:opacity-25 active:bg-white/15 cursor-pointer flex items-center justify-center shrink-0"
          title="Next Slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleExportZip}
          disabled={isExportingZip}
          className="flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl font-bold text-xs text-slate-950 active:scale-95 transition-all shadow-md cursor-pointer shrink-0"
          style={{ backgroundColor: theme.accent }}
          title="Export Metricool ZIP"
        >
          {isExportingZip ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
          <span>Export</span>
        </button>
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
