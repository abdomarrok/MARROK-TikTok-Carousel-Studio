import React, { useState } from 'react';
import { Header } from './components/Header';
import { SlideCanvasPreview } from './components/SlideCanvasPreview';
import { CaptionBox } from './components/CaptionBox';
import { SlideEditor } from './components/SlideEditor';
import { MultimodalInputPanel } from './components/MultimodalInputPanel';
import { ThemeCustomizer } from './components/ThemeCustomizer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { CarouselData, DEFAULT_PALETTES, HookVariant, SlideData, ThemePalette } from './types';
import { PRESET_CAROUSELS } from './lib/presets';
import { downloadAllSlidesZip } from './lib/canvasExporter';
import { Sparkles, Upload } from 'lucide-react';

export default function App() {
  const [carousel, setCarousel] = useState<CarouselData>(PRESET_CAROUSELS.scion.data);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Palette State
  const initialPaletteKey = carousel.theme || 'teal';
  const [currentPalette, setCurrentPalette] = useState<ThemePalette>(
    DEFAULT_PALETTES[initialPaletteKey] || DEFAULT_PALETTES.teal
  );

  // Modal / Ingestion States
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
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
    }));
  };

  // Update specific slide
  const handleUpdateSlide = (updatedSlide: SlideData) => {
    setCarousel((prev) => {
      const newSlides = [...prev.slides];
      newSlides[currentSlideIndex] = updatedSlide;
      return { ...prev, slides: newSlides };
    });
  };

  // Swap Slide 1 with selected Hook Variant
  const handleSelectHookVariant = (variant: HookVariant) => {
    setCarousel((prev) => {
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
    showToast(`Applied "${variant.tag}" Hook to Slide 1`);
  };

  // Update caption
  const handleUpdateCaption = (newCaption: string) => {
    setCarousel((prev) => ({ ...prev, caption: newCaption }));
  };

  // Add new slide
  const handleAddSlide = () => {
    const newSlide: SlideData = {
      type: 'row',
      icons: [{ icon: 'cpu', label: 'Feature' }],
      enTitle: 'New slide topic.',
      arTitle: 'عنوان الشريحة الجديدة.',
      enBody: '1-2 crisp sentences describing the technical mechanism.',
      arBody: 'شرح دقيق ومختصر من جملة إلى جملتين حول آلية العمل.',
    };

    setCarousel((prev) => {
      const newSlides = [...prev.slides];
      const insertAt = Math.max(newSlides.length - 1, 1);
      newSlides.splice(insertAt, 0, newSlide);
      return { ...prev, slides: newSlides };
    });
    setCurrentSlideIndex((prev) => Math.min(prev + 1, carousel.slides.length));
    showToast('New slide added');
  };

  // Duplicate current slide
  const handleDuplicateSlide = (index: number) => {
    setCarousel((prev) => {
      const newSlides = [...prev.slides];
      const copy = structuredClone(newSlides[index]);
      newSlides.splice(index + 1, 0, copy);
      return { ...prev, slides: newSlides };
    });
    setCurrentSlideIndex(index + 1);
    showToast('Slide duplicated');
  };

  // Delete current slide
  const handleDeleteSlide = (index: number) => {
    if (carousel.slides.length <= 3) {
      showToast('Minimum 3 slides required');
      return;
    }
    setCarousel((prev) => {
      const newSlides = prev.slides.filter((_, i) => i !== index);
      return { ...prev, slides: newSlides };
    });
    setCurrentSlideIndex((prev) => Math.max(0, Math.min(prev, carousel.slides.length - 2)));
    showToast('Slide deleted');
  };

  // Apply new generated carousel
  const handleApplyCarousel = (newCarousel: CarouselData) => {
    setCarousel(newCarousel);
    setCurrentSlideIndex(0);

    // If generated carousel suggests a theme matching a default palette, adopt it
    if (newCarousel.theme && DEFAULT_PALETTES[newCarousel.theme]) {
      setCurrentPalette(DEFAULT_PALETTES[newCarousel.theme]);
    }

    showToast(`Loaded "${newCarousel.category}" carousel (${newCarousel.slides.length} slides)`);
  };

  // Move / Reorder Slide
  const handleMoveSlide = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= carousel.slides.length) return;
    setCarousel((prev) => {
      const newSlides = [...prev.slides];
      const [moved] = newSlides.splice(fromIndex, 1);
      newSlides.splice(toIndex, 0, moved);
      return { ...prev, slides: newSlides };
    });
    setCurrentSlideIndex(toIndex);
    showToast(`Moved Slide ${fromIndex + 1} to position ${toIndex + 1}`);
  };

  // Update Brand Wordmark and URL
  const handleUpdateBrand = (newBrand: string, newBrandUrl?: string) => {
    setCarousel((prev) => ({
      ...prev,
      brand: newBrand,
      brandUrl: newBrandUrl !== undefined ? newBrandUrl : prev.brandUrl,
    }));
  };

  // 1-Click Download All Slides as ZIP
  const handleExportAll = async () => {
    setIsExporting(true);
    setExportProgress({ current: 0, total: carousel.slides.length });
    try {
      await downloadAllSlidesZip(carousel, currentPalette, (current, total) => {
        setExportProgress({ current, total });
      });
      showToast('All 1080x1920 slides exported into ZIP successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Failed to export slides.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <div className="min-h-screen text-[#CDD5D9] flex flex-col font-jakarta selection:bg-white/20 transition-colors duration-300 bg-[#080d11]">
      {/* Top Bar Header */}
      <Header
        currentPalette={currentPalette}
        onOpenGenerator={() => setIsGeneratorOpen((prev) => !prev)}
        onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onExportAll={handleExportAll}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Step 1: Multimodal Ingestion Hub */}
        {isGeneratorOpen ? (
          <div className="w-full">
            <MultimodalInputPanel
              theme={currentPalette}
              onApplyCarousel={(newCarousel) => {
                handleApplyCarousel(newCarousel);
                setIsGeneratorOpen(false);
              }}
              onClose={() => setIsGeneratorOpen(false)}
            />
          </div>
        ) : (
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 px-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-teal-500/15 text-teal-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Current Deck: {carousel.category}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-normal">
                    {carousel.slides.length} Slides
                  </span>
                  {carousel.brand && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20">
                      Brand: {carousel.brand}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Drop an architecture screenshot, paste terminal notes, or load a transcript to synthesize a new carousel.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>Ingest New Material</span>
            </button>
          </div>
        )}

        {/* 2-Column Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 1080x1920 Canvas Preview */}
          <div id="preview" className="lg:col-span-5 flex flex-col items-center">
            <SlideCanvasPreview
              carousel={carousel}
              currentSlideIndex={currentSlideIndex}
              customPalette={currentPalette}
              onSelectSlide={(idx) => setCurrentSlideIndex(idx)}
              onSelectHookVariant={handleSelectHookVariant}
              onShowToast={showToast}
            />
          </div>

          {/* Right Column: TikTok Caption Box & Live Slide Editor */}
          <div className="lg:col-span-7 space-y-6">
            {/* Bilingual TikTok Caption Card */}
            <CaptionBox
              caption={carousel.caption}
              captionVariants={carousel.captionVariants}
              theme={currentPalette}
              category={carousel.category}
              onUpdateCaption={handleUpdateCaption}
              onShowToast={showToast}
            />

            {/* Active Slide Editor */}
            <SlideEditor
              slide={carousel.slides[currentSlideIndex] || carousel.slides[0]}
              slideIndex={currentSlideIndex}
              totalSlides={carousel.slides.length}
              theme={currentPalette}
              brand={carousel.brand}
              brandUrl={carousel.brandUrl}
              onUpdateSlide={handleUpdateSlide}
              onAddSlide={handleAddSlide}
              onDuplicateSlide={handleDuplicateSlide}
              onDeleteSlide={handleDeleteSlide}
              onMoveSlide={handleMoveSlide}
              onUpdateBrand={handleUpdateBrand}
              onShowToast={showToast}
            />
          </div>
        </div>
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
          if (key) {
            showToast('Custom Gemini API key active');
          } else {
            showToast('Using default environment key');
          }
        }}
        onShowToast={showToast}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentPalette.accent }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto">
          MARROK · Multimodal TikTok Carousel Studio ·{' '}
          <a href="https://marrok.org" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
            marrok.org
          </a>
        </div>
      </footer>
    </div>
  );
}
