import React, { useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import { ICONS_REGISTRY } from '../../lib/icons.ts';
import { ThemePalette } from '../../types.ts';

interface IconPickerPopoverProps {
  isOpen: boolean;
  selectedIcon?: string;
  onSelectIcon: (iconName: string) => void;
  onClose: () => void;
  theme: ThemePalette;
  title?: string;
}

const CATEGORIES: { id: string; label: string; icons: string[] }[] = [
  {
    id: 'all',
    label: 'All Icons',
    icons: Object.keys(ICONS_REGISTRY),
  },
  {
    id: 'compute',
    label: 'Compute & AI',
    icons: ['cpu', 'robot', 'brain', 'server', 'terminal', 'codeFile', 'binary'],
  },
  {
    id: 'data',
    label: 'Data & Storage',
    icons: ['database', 'hardDrive', 'box', 'cloud', 'changesets', 'calculator'],
  },
  {
    id: 'security',
    label: 'Security & Auth',
    icons: ['lock', 'shieldAlert', 'key', 'eyeRisk', 'alerts'],
  },
  {
    id: 'network',
    label: 'Network & Flow',
    icons: ['network', 'gitMerge', 'gitBranch', 'zap', 'gauge', 'activity', 'layers'],
  },
];

export const IconPickerPopover: React.FC<IconPickerPopoverProps> = ({
  isOpen,
  selectedIcon = 'gitMerge',
  onSelectIcon,
  onClose,
  theme,
  title = 'Select Vector Icon',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  if (!isOpen) return null;

  const currentCategoryIcons =
    CATEGORIES.find((c) => c.id === activeCategory)?.icons || Object.keys(ICONS_REGISTRY);

  const filteredIcons = currentCategoryIcons.filter((iconKey) => {
    const iconData = ICONS_REGISTRY[iconKey];
    if (!iconData) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      iconKey.toLowerCase().includes(q) ||
      iconData.label.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950 p-4 shadow-2xl space-y-3 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
            <p className="text-[10px] text-slate-400">Crisp SVG glyph rendered directly on canvas</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search icons (e.g., cpu, database, shield)..."
            className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
            autoFocus
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 rounded-lg whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-white/20 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Icon Grid */}
        <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
          {filteredIcons.map((iconKey) => {
            const iconData = ICONS_REGISTRY[iconKey];
            if (!iconData) return null;
            const isSelected = selectedIcon === iconKey;

            return (
              <button
                key={iconKey}
                type="button"
                onClick={() => {
                  onSelectIcon(iconKey);
                  onClose();
                }}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  isSelected
                    ? 'border-white/50 bg-white/10 shadow-sm'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20'
                }`}
                title={iconData.label}
              >
                <div className="w-8 h-8 flex items-center justify-center relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 64 64"
                    fill="none"
                    stroke={isSelected ? theme.accent : '#94A3B8'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                    dangerouslySetInnerHTML={{ __html: iconData.svgInner }}
                  />
                  {isSelected && (
                    <div
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-slate-950"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-300 font-medium truncate w-full">
                  {iconData.label}
                </span>
              </button>
            );
          })}
        </div>

        {filteredIcons.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-500">
            No icons found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
};
