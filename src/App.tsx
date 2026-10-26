import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AutonomousStudio } from './components/AutonomousStudio';
import { ThemeCustomizer } from './components/ThemeCustomizer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ContactSheetModal } from './components/ContactSheetModal';
import { PlanInspectorModal } from './components/PlanInspectorModal';
import { CarouselData, DEFAULT_PALETTES, ThemePalette } from './types';
import { DEFAULT_STARTER_DECK } from './lib/presets';
import { sanitizeFullCarousel } from './lib/textSanitizer';
import { parseCarouselData } from './lib/validation/carousel';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Select or Custom Palette Update
  const handleSelectPalette = (palette: ThemePalette) => {
    setCurrentPalette(palette);
    setCarousel((prev) => ({
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
    setCarousel(DEFAULT_STARTER_DECK);
    setActiveSlideIndex(0);
    localStorage.removeItem('marrok_deck_draft_v1');
    showToast('Reset to Scion Architecture starter deck');
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
          onUpdateCarousel={setCarousel}
          onSelectTheme={handleSelectPalette}
          onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
          onOpenContactSheet={() => setIsContactSheetOpen(true)}
          onOpenPlanInspector={() => setIsPlanInspectorOpen(true)}
          onShowToast={showToast}
        />
      </main>

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
        <div className="fixed bottom-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentPalette.accent }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
