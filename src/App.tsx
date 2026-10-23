import React, { useState } from 'react';
import { Header } from './components/Header';
import { SlideCanvasPreview } from './components/SlideCanvasPreview';
import { CaptionBox } from './components/CaptionBox';
import { SlideEditor } from './components/SlideEditor';
import { MultimodalInputPanel } from './components/MultimodalInputPanel';
import { BrandSpecsGuide } from './components/BrandSpecsGuide';
import { ThemeCustomizer } from './components/ThemeCustomizer';
import { TopicInspirationDrawer } from './components/TopicInspirationDrawer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { CarouselData, DEFAULT_PALETTES, HookVariant, SlideData, ThemePalette } from './types';
import { PRESET_CAROUSELS } from './lib/presets';
import { downloadAllSlidesZip } from './lib/canvasExporter';
import { synthesizeCarousel } from './lib/synthesizer';
import { ArrowRight, Lightbulb, Palette } from 'lucide-react';

export default function App() {
  const [carousel, setCarousel] = useState<CarouselData>(PRESET_CAROUSELS.scion.data);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Palette State
  const initialPaletteKey = carousel.theme || 'teal';
  const [currentPalette, setCurrentPalette] = useState<ThemePalette>(
    DEFAULT_PALETTES[initialPaletteKey] || DEFAULT_PALETTES.teal
  );

  // Modal / Drawer States
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);
  const [isTopicDrawerOpen, setIsTopicDrawerOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Switch Theme Preset
  const handleSelectTheme = (themeKey: string) => {
    const selected = DEFAULT_PALETTES[themeKey];
    if (selected) {
      setCurrentPalette(selected);
      setCarousel((prev) => ({
        ...prev,
        theme: selected.id,
      }));
      showToast(`Applied ${selected.name}`);
    }
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
      const copy = JSON.parse(JSON.stringify(newSlides[index]));
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

  // Handle Selection from Topic Inspiration Drawer
  const handleSelectTopicFromInspiration = (topicTitle: string, rawNotes: string, category: string) => {
    // Generate an instant synthesized carousel from this topic
    const synthesized = synthesizeCarousel({
      prompt: `${topicTitle}\n${rawNotes}`,
      categoryHint: category,
    });
    handleApplyCarousel(synthesized);
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
    <div
      className="min-h-screen text-[#CDD5D9] flex flex-col font-jakarta selection:bg-white/20 transition-colors duration-300"
      style={{
        backgroundColor: currentPalette.baseBg,
      }}
    >
      {/* Top Bar Header */}
      <Header
        currentPalette={currentPalette}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
        onOpenTopicInspiration={() => setIsTopicDrawerOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onExportAll={handleExportAll}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Quick Presets & Topic Idea Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Quick Topics:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleApplyCarousel(PRESET_CAROUSELS.scion.data)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  carousel.category === 'AI + ENGINEERING' && carousel.theme === 'engineering'
                    ? 'bg-[#37E2C0] text-[#081216] font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                Anthropic's Scion (9 Slides)
              </button>
              <button
                onClick={() => handleApplyCarousel(PRESET_CAROUSELS.reverseEngineering.data)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  carousel.category.includes('REVERSE')
                    ? 'bg-[#37E2C0] text-[#081216] font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                Reverse Engineering (8 Slides)
              </button>
              <button
                onClick={() => handleApplyCarousel(PRESET_CAROUSELS.defectDojo.data)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  carousel.category.includes('DEVSECOPS')
                    ? 'bg-[#37E2C0] text-[#081216] font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                DefectDojo Triage (8 Slides)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTopicDrawerOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/20 transition-all"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Trending Hooks...</span>
            </button>

            <button
              onClick={() => setIsThemeCustomizerOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-white hover:underline cursor-pointer bg-white/5 px-3 py-1 rounded-lg border border-white/10 transition-all"
            >
              <Palette className="w-3.5 h-3.5" style={{ color: currentPalette.accent }} />
              <span>Colors...</span>
            </button>

            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold hover:underline cursor-pointer ml-1"
              style={{ color: currentPalette.accent }}
            >
              <span>Custom Post / Screenshot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

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
              onUpdateSlide={handleUpdateSlide}
              onAddSlide={handleAddSlide}
              onDuplicateSlide={handleDuplicateSlide}
              onDeleteSlide={handleDeleteSlide}
              onShowToast={showToast}
            />
          </div>
        </div>

        {/* Brand Specs & Archetype Blueprint Guide */}
        <BrandSpecsGuide
          theme={currentPalette}
          currentThemeName={currentPalette.id}
          onSelectTheme={handleSelectTheme}
          onOpenCustomizer={() => setIsThemeCustomizerOpen(true)}
        />
      </main>

      {/* Multimodal Generator Modal */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full my-8">
            <MultimodalInputPanel
              theme={currentPalette}
              themeMode={currentPalette.id as any}
              onApplyCarousel={handleApplyCarousel}
              onClose={() => setIsGeneratorOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Theme Customizer & Color Palette Studio Modal */}
      <ThemeCustomizer
        currentPalette={currentPalette}
        onSelectPalette={handleSelectPalette}
        isOpen={isThemeCustomizerOpen}
        onClose={() => setIsThemeCustomizerOpen(false)}
        onShowToast={showToast}
      />

      {/* Topic Inspiration & Trending Hooks Drawer */}
      <TopicInspirationDrawer
        isOpen={isTopicDrawerOpen}
        onClose={() => setIsTopicDrawerOpen(false)}
        onSelectTopic={handleSelectTopicFromInspiration}
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
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>MARROK · Multimodal TikTok Carousel Studio & Content Engine</div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>1080×1920 Native Canvas Engine</span>
            <span>·</span>
            <span>Direct Clipboard Image Copying</span>
            <span>·</span>
            <span>Full Custom Color Palette Picker</span>
            <span>·</span>
            <span>Bilingual EN + AR Typography</span>
            <span>·</span>
            <a href="https://marrok.org" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
              marrok.org
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
