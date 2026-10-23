import React from 'react';
import { ThemeConfig } from '../types';
import { Palette, Layers, Type, Shield, Terminal, BookOpen } from 'lucide-react';

interface BrandSpecsGuideProps {
  theme: ThemeConfig;
  currentThemeName: string;
  onSelectTheme: (theme: string) => void;
  onOpenCustomizer?: () => void;
}

export const BrandSpecsGuide: React.FC<BrandSpecsGuideProps> = ({
  theme,
  currentThemeName,
  onSelectTheme,
  onOpenCustomizer,
}) => {
  return (
    <div
      id="specs"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-lg backdrop-blur-sm space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${theme.accent}20` }}
          >
            <BookOpen className="w-4 h-4" style={{ color: theme.accent }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-jakarta">
              MARROK Brand Identity & Design System
            </h3>
            <p className="text-[11px] text-slate-400">
              Strict visual guidelines, exact 1080×1920 layout math, and bilingual typography pairing
            </p>
          </div>
        </div>

        {/* Dynamic Theme Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Quick Palette:</span>
          <div className="flex flex-wrap items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
            {[
              { id: 'teal', label: 'Terminal Teal', color: '#37E2C0' },
              { id: 'cyber', label: 'Cyber Red', color: '#F43F5E' },
              { id: 'violet', label: 'AI Violet', color: '#A855F7' },
              { id: 'blueprint', label: 'Blueprint', color: '#38BDF8' },
              { id: 'amber', label: 'Amber', color: '#F09A67' },
              { id: 'emerald', label: 'Emerald', color: '#10B981' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectTheme(p.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentThemeName === p.id
                    ? 'bg-white/20 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.label}</span>
              </button>
            ))}

            {onOpenCustomizer && (
              <button
                onClick={onOpenCustomizer}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#37E2C0] bg-[#37E2C0]/10 hover:bg-[#37E2C0]/20 transition-all cursor-pointer"
              >
                <Palette className="w-3 h-3" />
                <span>Custom Picker...</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of 3 Spec Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Colors & Atmosphere */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <Palette className="w-4 h-4" style={{ color: theme.accent }} />
            <span>Theme Variables</span>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Base Background:</span>
              <span className="text-white font-bold">{theme.baseBg}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Primary Accent:</span>
              <span style={{ color: theme.accent }} className="font-bold">
                {theme.accent}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Icon Stroke:</span>
              <span>{theme.iconStroke}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Radial Center:</span>
              <span>(540, 690) r=720px</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Grid Spacing:</span>
              <span>108px (10×17.7 cells)</span>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <Type className="w-4 h-4" style={{ color: theme.accent }} />
            <span>Bilingual Typography</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-400">English Headline:</span>
              <p className="font-semibold text-white">Plus Jakarta Sans · 800 · 74px / 86px LH</p>
            </div>
            <div>
              <span className="text-slate-400">Arabic Headline:</span>
              <p className="font-semibold" style={{ color: theme.accent }}>
                Cairo · 800 · 70px / 88px LH (RTL)
              </p>
            </div>
            <div>
              <span className="text-slate-400">Body Paragraphs:</span>
              <p className="text-slate-300">38px / 54-56px LH · 1-2 crisp sentences</p>
            </div>
          </div>
        </div>

        {/* 5 Layout Archetypes */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <Layers className="w-4 h-4" style={{ color: theme.accent }} />
            <span>Strict Archetypes</span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-300">
            <div>
              <strong className="text-white">Slide 1 (hub):</strong> r=325 ring + 280px center box + 6 satellites.
            </div>
            <div>
              <strong className="text-white">Slides 2-7 (row):</strong> 1, 2, or 3 icons with micro-labels.
            </div>
            <div>
              <strong className="text-white">Final Slide (cta):</strong> 146px MARROK + pill + credit lines.
            </div>
            <div>
              <strong className="text-white">Pagination:</strong> N dots at y=1826px on every slide.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
