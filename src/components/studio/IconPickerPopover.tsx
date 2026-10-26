import React, { useState, useEffect } from 'react';
import { Search, X, Check, Globe } from 'lucide-react';
import { ICONS_REGISTRY, TECH_ICONS_LIST, KNOWN_TECH_LOGOS } from '../../lib/icons.ts';
import { ThemePalette } from '../../types.ts';
import { IconThumbnail, getIconDisplayName } from './IconThumbnail.tsx';

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
    icons: [
      ...Object.keys(ICONS_REGISTRY),
      ...TECH_ICONS_LIST.map((t) => t.name),
    ],
  },
  {
    id: 'brands',
    label: 'Tech Brands',
    icons: TECH_ICONS_LIST.map((t) => t.name),
  },
  {
    id: 'compute',
    label: 'Compute & AI',
    icons: [
      'cpu', 'robot', 'brain', 'server', 'terminal', 'codeFile', 'binary',
      'python', 'go', 'rust', 'cplusplus', 'anthropic', 'openai',
    ],
  },
  {
    id: 'data',
    label: 'Data & Storage',
    icons: [
      'database', 'hardDrive', 'box', 'cloud', 'changesets', 'calculator',
      'postgresql', 'redis', 'mysql', 'mongodb', 'clickhouse', 'sqlite', 'supabase', 'apachekafka',
    ],
  },
  {
    id: 'security',
    label: 'Security & Auth',
    icons: ['lock', 'shieldAlert', 'key', 'eyeRisk', 'alerts'],
  },
  {
    id: 'network',
    label: 'DevOps & Network',
    icons: [
      'network', 'gitMerge', 'gitBranch', 'zap', 'gauge', 'activity', 'layers',
      'docker', 'kubernetes', 'nginx', 'cloudflare', 'graphql', 'terraform', 'ansible', 'git', 'github', 'gitlab',
    ],
  },
];

function isIconSelected(selected: string | undefined, iconKey: string): boolean {
  if (!selected) return false;
  const s = selected.toLowerCase().trim();
  const k = iconKey.toLowerCase().trim();
  if (s === k) return true;
  if (KNOWN_TECH_LOGOS[k] && s === KNOWN_TECH_LOGOS[k].toLowerCase()) return true;
  if (KNOWN_TECH_LOGOS[s] && k === KNOWN_TECH_LOGOS[s].toLowerCase()) return true;
  if (s.includes('/') && (s.endsWith(`/${k}.svg`) || s.includes(`/${k}.svg`))) return true;
  return false;
}

export const IconPickerPopover: React.FC<IconPickerPopoverProps> = ({
  isOpen,
  selectedIcon = 'gitMerge',
  onSelectIcon,
  onClose,
  theme,
  title = 'Select Icon',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCategoryIcons =
    CATEGORIES.find((c) => c.id === activeCategory)?.icons || CATEGORIES[0].icons;

  const filteredIcons = currentCategoryIcons.filter((iconKey) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const displayName = getIconDisplayName(iconKey).toLowerCase();
    const key = iconKey.toLowerCase();
    const tech = TECH_ICONS_LIST.find((t) => t.name === key || t.aliases?.includes(key));
    const aliases = tech?.aliases?.join(' ').toLowerCase() || '';
    return (
      key.includes(q) ||
      displayName.includes(q) ||
      aliases.includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/15 bg-slate-950 p-4 sm:p-5 shadow-2xl space-y-3 animate-scale-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle Bar */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-white/25 mx-auto -mt-1 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
            <p className="text-[10px] text-slate-400">Crisp SVG glyphs & tech brand logos rendered directly on canvas</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer touch-manipulation"
            title="Close (Esc)"
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
            placeholder="Search icons or brands (e.g. postgres, k8s, cpu, redis)..."
            className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
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
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
          {filteredIcons.map((iconKey) => {
            const isSelected = isIconSelected(selectedIcon, iconKey);
            const displayName = getIconDisplayName(iconKey);

            return (
              <button
                key={iconKey}
                type="button"
                onClick={() => {
                  onSelectIcon(iconKey);
                  onClose();
                }}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                  isSelected
                    ? 'border-white/50 bg-white/10 shadow-sm'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/20'
                }`}
                title={displayName}
              >
                <div className="w-8 h-8 flex items-center justify-center relative">
                  <IconThumbnail icon={iconKey} theme={theme} className="w-6 h-6" />
                  {isSelected && (
                    <div
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-slate-950 shadow-sm"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-300 font-medium truncate w-full">
                  {displayName}
                </span>
              </button>
            );
          })}
        </div>

        {filteredIcons.length === 0 && (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs text-slate-400">
              No icons found matching &quot;{searchQuery}&quot;
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="px-2.5 py-1 text-[11px] rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Custom Icon URL Input Bar */}
        <div className="pt-2 border-t border-white/10 flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Or enter custom icon / logo URL..."
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customUrl.trim()) {
                onSelectIcon(customUrl.trim());
                onClose();
              }
            }}
          />
          <button
            type="button"
            disabled={!customUrl.trim()}
            onClick={() => {
              if (customUrl.trim()) {
                onSelectIcon(customUrl.trim());
                onClose();
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-medium disabled:opacity-40 cursor-pointer transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
