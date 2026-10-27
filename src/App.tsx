import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AutonomousStudio } from './components/AutonomousStudio';
import { ThemeCustomizer } from './components/ThemeCustomizer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ContactSheetModal } from './components/ContactSheetModal';
import { PlanInspectorModal } from './components/PlanInspectorModal';
import { PreviewAndToolsDrawer } from './components/studio/PreviewAndToolsDrawer';
import { CarouselData, DEFAULT_PALETTES, SlideData, ThemePalette } from './types';
import { DEFAULT_STARTER_DECK } from './lib/presets';
import { sanitizeFullCarousel, sanitizeSlide } from './lib/textSanitizer';
import { parseCarouselData } from './lib/validation/carousel';

const MAX_HISTORY_STEPS = 30;

export default function App() {
  // Local Draft Persistence (Hydrate from browser localStorage if available)
  const [carousel, setCarousel] = useState<CarouselData>(() => {
    try {
      const saved = localStorage.getItem('marrok_deck_draft_v1');
      if (saved) {
        const parsed = parseCarouselData(JSON.parse(saved), { minSlides: 3 });
        if (parsed) {
          return sanitizeFullCarousel(parsed);
        }
      }
    } catch (err) {
      console.warn('Failed to restore draft from localStorage:', err);
    }
    return DEFAULT_STARTER_DECK;
  });

  // 30-Step Undo / Redo History Ring Buffer
  const [pastHistory, setPastHistory] = useState<CarouselData[]>([]);
  const [futureHistory, setFutureHistory] = useState<CarouselData[]>([]);

  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Palette State
  const initialPaletteKey = carousel.theme || 'teal';
  const [currentPalette, setCurrentPalette] = useState<ThemePalette>(
    DEFAULT_PALETTES[initialPaletteKey] || DEFAULT_PALETTES.teal
  );

  // Auto-Save Draft to LocalStorage whenever carousel changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('marrok_deck_draft_v1', JSON.stringify(carousel));
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(timeStr);
      } catch (err) {
        console.warn('Failed to auto-save draft:', err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [carousel]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false);
  const [isPlanInspectorOpen, setIsPlanInspectorOpen] = useState(false);
  const [isPreviewDrawerOpen, setIsPreviewDrawerOpen] = useState(false);
  const [previewDrawerTab, setPreviewDrawerTab] = useState<'simulator' | 'polish'>('simulator');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }, []);

  // History-aware Carousel State Updater
  const handleUpdateCarousel: React.Dispatch<React.SetStateAction<CarouselData>> = useCallback(
    (updaterOrValue) => {
      setCarousel((prev) => {
        const next =
          typeof updaterOrValue === 'function'
            ? (updaterOrValue as (prevState: CarouselData) => CarouselData)(prev)
            : updaterOrValue;
        if (next === prev) return prev;
        setPastHistory((oldPast) => [...oldPast.slice(-(MAX_HISTORY_STEPS - 1)), prev]);
        setFutureHistory([]);
        return next;
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    setPastHistory((oldPast) => {
      if (oldPast.length === 0) return oldPast;
      const previousState = oldPast[oldPast.length - 1];
      const remainingPast = oldPast.slice(0, -1);
      setCarousel((current) => {
        setFutureHistory((oldFuture) => [current, ...oldFuture.slice(0, MAX_HISTORY_STEPS - 1)]);
        return previousState;
      });
      showToast('Undid last change');
      return remainingPast;
    });
  }, [showToast]);

  const handleRedo = useCallback(() => {
    setFutureHistory((oldFuture) => {
      if (oldFuture.length === 0) return oldFuture;
      const nextState = oldFuture[0];
      const remainingFuture = oldFuture.slice(1);
      setCarousel((current) => {
        setPastHistory((oldPast) => [...oldPast.slice(-(MAX_HISTORY_STEPS - 1)), current]);
        return nextState;
      });
      showToast('Redid change');
      return remainingFuture;
    });
  }, [showToast]);

  // Global Keyboard Shortcuts for Undo (Ctrl+Z / Cmd+Z) and Redo (Ctrl+Y / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Select or Custom Palette Update
  const handleSelectPalette = (palette: ThemePalette) => {
    setCurrentPalette(palette);
    handleUpdateCarousel((prev) => ({
      ...prev,
      theme: palette.id,
      visualOptions: {
        showCadReticles: palette.showCadReticles ?? prev.visualOptions?.showCadReticles ?? true,
        showSparklines: palette.showSparklines ?? prev.visualOptions?.showSparklines ?? true,
        terminalScanlines: palette.terminalScanlines ?? prev.visualOptions?.terminalScanlines ?? true,
      },
    }));
  };

  const handleResetDraft = () => {
    handleUpdateCarousel(DEFAULT_STARTER_DECK);
    setActiveSlideIndex(0);
    localStorage.removeItem('marrok_deck_draft_v1');
    showToast('Reset to Scion Architecture starter deck');
  };

  const handleOpenPreviewDrawer = (tab: 'simulator' | 'polish' = 'simulator') => {
    setPreviewDrawerTab(tab);
    setIsPreviewDrawerOpen(true);
  };

  const handleUpdateSingleSlideFromDrawer = (
    slideIndex: number,
    updater: (prevSlide: SlideData) => SlideData,
    actionLabel?: string
  ) => {
    handleUpdateCarousel((prev) => {
      if (slideIndex < 0 || slideIndex >= prev.slides.length) return prev;
      const newSlides = [...prev.slides];
      const updated = updater(newSlides[slideIndex]);
      newSlides[slideIndex] = sanitizeSlide(updated, slideIndex, prev.slides.length);
      return {
        ...prev,
        slides: newSlides,
      };
    });
    if (actionLabel) {
      showToast(actionLabel);
    }
  };

  return (
    <div className="min-h-screen text-[#CDD5D9] flex flex-col font-jakarta selection:bg-white/20 transition-colors duration-300 bg-[#080d11]">
      {/* Streamlined Minimalist Header */}
      <Header
        currentPalette={currentPalette}
        onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenContactSheet={() => setIsContactSheetOpen(true)}
        onOpenPlanInspector={() => setIsPlanInspectorOpen(true)}
        onOpenPreviewDrawer={handleOpenPreviewDrawer}
        canUndo={pastHistory.length > 0}
        canRedo={futureHistory.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        lastSavedTime={lastSavedTime}
        onResetDraft={handleResetDraft}
      />

      {/* Primary Autonomous Studio Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 lg:pb-6">
        <AutonomousStudio
          carousel={carousel}
          theme={currentPalette}
          activeSlideIndex={activeSlideIndex}
          onSlideChange={setActiveSlideIndex}
          onUpdateCarousel={handleUpdateCarousel}
          onSelectTheme={handleSelectPalette}
          onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
          onOpenContactSheet={() => setIsContactSheetOpen(true)}
          onOpenPlanInspector={() => setIsPlanInspectorOpen(true)}
          onOpenPreviewDrawer={handleOpenPreviewDrawer}
          onShowToast={showToast}
        />
      </main>

      {/* Slide-Out Preview & Tools Drawer (TikTok Simulator + Per-Slide Refiner) */}
      <PreviewAndToolsDrawer
        isOpen={isPreviewDrawerOpen}
        initialTab={previewDrawerTab}
        onClose={() => setIsPreviewDrawerOpen(false)}
        carousel={carousel}
        currentSlideIndex={activeSlideIndex}
        theme={currentPalette}
        onSelectSlide={setActiveSlideIndex}
        onUpdateSlide={handleUpdateSingleSlideFromDrawer}
        onShowToast={showToast}
      />

      {/* Theme Customizer & Color Palette Studio Modal */}
      <ThemeCustomizer
        currentPalette={currentPalette}
        onSelectPalette={handleSelectPalette}
        isOpen={isThemeCustomizerOpen}
        onClose={() => setIsThemeCustomizerOpen(false)}
        onShowToast={showToast}
      />

      {/* Gemini API Key Configuration Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyUpdated={(key) => {
          showToast(key ? 'Custom Gemini API key active' : 'Using default environment key');
        }}
        onShowToast={showToast}
      />

      {/* Full Deck Contact Sheet Modal */}
      <ContactSheetModal
        isOpen={isContactSheetOpen}
        onClose={() => setIsContactSheetOpen(false)}
        carousel={carousel}
        theme={currentPalette}
        onSelectSlide={(idx) => {
          setActiveSlideIndex(idx);
          setIsContactSheetOpen(false);
          showToast(`Jumped to Slide ${idx + 1}`);
        }}
        onShowToast={showToast}
      />

      {/* Plan & Fact Verification Inspector Modal */}
      <PlanInspectorModal
        isOpen={isPlanInspectorOpen}
        onClose={() => setIsPlanInspectorOpen(false)}
        carousel={carousel}
        theme={currentPalette}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-semibold shadow-2xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentPalette.accent }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

