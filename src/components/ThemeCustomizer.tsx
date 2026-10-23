import React, { useState } from 'react';
import { Palette, RotateCcw, Check, Sparkles, Sliders, X, Eye } from 'lucide-react';
import { DEFAULT_PALETTES, ThemePalette } from '../types';

interface ThemeCustomizerProps {
  currentPalette: ThemePalette;
  onSelectPalette: (palette: ThemePalette) => void;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  currentPalette,
  onSelectPalette,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [customColors, setCustomColors] = useState<ThemePalette>(currentPalette);

  if (!isOpen) return null;

  const handlePresetSelect = (presetKey: string) => {
    const selected = DEFAULT_PALETTES[presetKey];
    if (selected) {
      setCustomColors(selected);
      onSelectPalette(selected);
      onShowToast(`Applied ${selected.name}`);
    }
  };

  const handleColorChange = (key: keyof ThemePalette, value: string) => {
    const updated: ThemePalette = {
      ...customColors,
      id: 'custom',
      name: 'Custom Palette',
      [key]: value,
    };

    // If accent changes, automatically compute matching radial glow
    if (key === 'accent') {
      try {
        const hex = value.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 55;
        const g = parseInt(hex.substring(2, 4), 16) || 226;
        const b = parseInt(hex.substring(4, 6), 16) || 192;
        updated.radialGlow = `rgba(${r}, ${g}, ${b}, 0.16)`;
        updated.gridLine = `rgba(${r}, ${g}, ${b}, 0.045)`;
        updated.categoryTag = value;
      } catch {
        // keep existing glow if invalid hex
      }
    }

    setCustomColors(updated);
    onSelectPalette(updated);
  };

  const handleReset = () => {
    const defaultTeal = DEFAULT_PALETTES.teal;
    setCustomColors(defaultTeal);
    onSelectPalette(defaultTeal);
    onShowToast('Reset to MARROK Terminal Teal');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-[#0b1015] border border-[#1E2833] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2833] bg-[#0e161c]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-inner"
              style={{
                backgroundColor: currentPalette.surface,
                borderColor: currentPalette.accent,
                color: currentPalette.accent,
              }}
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Theme & Color Palette Studio
              </h2>
              <p className="text-xs text-[#8E989E]">
                Customize canvas background, card surfaces, neon accents, and text colors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E989E] hover:text-white hover:bg-[#1a232c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#1E2833] bg-[#0c1318] px-6 pt-3">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 -mb-[2px] ${
              activeTab === 'presets'
                ? 'text-[#37E2C0] border-[#37E2C0] bg-[#121c22]'
                : 'text-[#8E989E] border-transparent hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Curated Presets ({Object.keys(DEFAULT_PALETTES).length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 -mb-[2px] ${
              activeTab === 'custom'
                ? 'text-[#37E2C0] border-[#37E2C0] bg-[#121c22]'
                : 'text-[#8E989E] border-transparent hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Full Custom Palette Picker
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'presets' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {Object.entries(DEFAULT_PALETTES).map(([key, pal]) => {
                const isSelected = currentPalette.id === pal.id;
                return (
                  <button
                    key={key}
                    onClick={() => handlePresetSelect(key)}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all text-xs group relative overflow-hidden ${
                      isSelected
                        ? 'border-[#37E2C0] bg-[#121e25] ring-1 ring-[#37E2C0]/50 shadow-lg'
                        : 'border-[#1E2833] bg-[#0e161c] hover:border-[#2e3e4f] hover:bg-[#131d24]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2.5">
                      <span className="font-semibold text-white group-hover:text-[#37E2C0] transition-colors">
                        {pal.name}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] text-[#37E2C0] bg-[#37E2C0]/15 px-2 py-0.5 rounded-full font-bold">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>

                    {/* Color Swatch Bar */}
                    <div className="flex items-center gap-1.5 w-full h-6 rounded-lg p-1 bg-black/40 border border-white/5">
                      <div
                        className="flex-1 h-full rounded"
                        style={{ backgroundColor: pal.baseBg }}
                        title={`Canvas: ${pal.baseBg}`}
                      />
                      <div
                        className="flex-1 h-full rounded"
                        style={{ backgroundColor: pal.surface }}
                        title={`Surface: ${pal.surface}`}
                      />
                      <div
                        className="w-6 h-full rounded shadow-sm"
                        style={{ backgroundColor: pal.accent }}
                        title={`Accent: ${pal.accent}`}
                      />
                      <div
                        className="w-4 h-full rounded"
                        style={{ backgroundColor: pal.alert }}
                        title={`Alert: ${pal.alert}`}
                      />
                      <div
                        className="w-4 h-full rounded"
                        style={{ backgroundColor: pal.textWhite }}
                        title={`Headline: ${pal.textWhite}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-[#121c22] border border-[#1e2d36] rounded-xl flex items-center justify-between text-xs text-[#8E989E]">
                <span>Fine-tune any exact hex value. Changes reflect live on the 1080×1920 canvas.</span>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[11px] text-[#37E2C0] hover:underline"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              {/* Color Pickers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Canvas Background */}
                <div className="p-3 bg-[#0e161c] border border-[#1E2833] rounded-xl flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-white block">Canvas Background</label>
                    <span className="text-[10px] text-[#8E989E]">1080×1920 base color</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColors.baseBg}
                      onChange={(e) => handleColorChange('baseBg', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={customColors.baseBg}
                      onChange={(e) => handleColorChange('baseBg', e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-mono bg-black/50 border border-[#1E2833] rounded text-white text-center uppercase"
                    />
                  </div>
                </div>

                {/* 2. Primary Accent */}
                <div className="p-3 bg-[#0e161c] border border-[#1E2833] rounded-xl flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-white block">Primary Accent & Glow</label>
                    <span className="text-[10px] text-[#8E989E]">Hub icon & badges</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColors.accent}
                      onChange={(e) => handleColorChange('accent', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={customColors.accent}
                      onChange={(e) => handleColorChange('accent', e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-mono bg-black/50 border border-[#1E2833] rounded text-white text-center uppercase"
                    />
                  </div>
                </div>

                {/* 3. Card Surface */}
                <div className="p-3 bg-[#0e161c] border border-[#1E2833] rounded-xl flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-white block">Card Surface</label>
                    <span className="text-[10px] text-[#8E989E]">Row cards & containers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColors.surface}
                      onChange={(e) => handleColorChange('surface', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={customColors.surface}
                      onChange={(e) => handleColorChange('surface', e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-mono bg-black/50 border border-[#1E2833] rounded text-white text-center uppercase"
                    />
                  </div>
                </div>

                {/* 4. Stroke & Border */}
                <div className="p-3 bg-[#0e161c] border border-[#1E2833] rounded-xl flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-white block">Card Borders</label>
                    <span className="text-[10px] text-[#8E989E]">Technical dividers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColors.surfaceBorder}
                      onChange={(e) => handleColorChange('surfaceBorder', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={customColors.surfaceBorder}
                      onChange={(e) => handleColorChange('surfaceBorder', e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-mono bg-black/50 border border-[#1E2833] rounded text-white text-center uppercase"
                    />
                  </div>
                </div>

                {/* 5. Alert & Risk */}
                <div className="p-3 bg-[#0e161c] border border-[#1E2833] rounded-xl flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-white block">Alert & Risk Accent</label>
                    <span className="text-[10px] text-[#8E989E]">Security flaws & warnings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColors.alert}
                      onChange={(e) => handleColorChange('alert', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={customColors.alert}
                      onChange={(e) => handleColorChange('alert', e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-mono bg-black/50 border border-[#1E2833] rounded text-white text-center uppercase"
                    />
                  </div>
                </div>

                {/* 6. English Headline Text */}
                <div className="p-3 bg-[#0e161c] border border-[#1E2833] rounded-xl flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-white block">Headline Color</label>
                    <span className="text-[10px] text-[#8E989E]">Bold title typography</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColors.textWhite}
                      onChange={(e) => handleColorChange('textWhite', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={customColors.textWhite}
                      onChange={(e) => handleColorChange('textWhite', e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-mono bg-black/50 border border-[#1E2833] rounded text-white text-center uppercase"
                    />
                  </div>
                </div>

                {/* 7. English Body Copy */}
                <div className="p-3 bg-[#0e161c] border border-[#1E2833] rounded-xl flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-white block">English Body Text</label>
                    <span className="text-[10px] text-[#8E989E]">Subtitle & descriptions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColors.textEnBody}
                      onChange={(e) => handleColorChange('textEnBody', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={customColors.textEnBody}
                      onChange={(e) => handleColorChange('textEnBody', e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-mono bg-black/50 border border-[#1E2833] rounded text-white text-center uppercase"
                    />
                  </div>
                </div>

                {/* 8. Arabic Copy */}
                <div className="p-3 bg-[#0e161c] border border-[#1E2833] rounded-xl flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-white block">Arabic Body Text</label>
                    <span className="text-[10px] text-[#8E989E]">Cairo RTL subtitles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColors.textArBody}
                      onChange={(e) => handleColorChange('textArBody', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={customColors.textArBody}
                      onChange={(e) => handleColorChange('textArBody', e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-mono bg-black/50 border border-[#1E2833] rounded text-white text-center uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E2833] bg-[#0c1318]">
          <div className="flex items-center gap-2 text-xs text-[#8E989E]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentPalette.accent }} />
            <span>Active: <strong className="text-white">{currentPalette.name}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-black rounded-xl shadow-md hover:brightness-110 transition-all"
            style={{ backgroundColor: currentPalette.accent }}
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
