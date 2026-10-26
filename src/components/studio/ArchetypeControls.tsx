import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Image as ImageIcon,
  Code,
  Gauge,
  Columns,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
  Tag,
} from 'lucide-react';
import { SlideData, SlideType, ThemePalette, DiagramVariant, DiagramNode } from '../../types.ts';
import { ICONS_REGISTRY } from '../../lib/icons.ts';
import { IconPickerPopover } from './IconPickerPopover.tsx';
import { IconThumbnail, getIconDisplayName } from './IconThumbnail.tsx';

interface ArchetypeControlsProps {
  currentSlide: SlideData;
  theme: ThemePalette;
  isAdvancedCustomizerOpen: boolean;
  onSetSlideType: (type: SlideType) => void;
  onUpdateField: (field: keyof SlideData, value: any) => void;
  onUpdateSatLabel: (index: number, value: string) => void;
  onUpdateSatIcon?: (index: number, iconName: string) => void;
  onUpdateCenterIcon?: (iconName: string) => void;
  onUpdateCenterTag?: (tag: string) => void;
  onAddSatNode?: () => void;
  onDeleteSatNode?: (index: number) => void;
  onUpdateDiagramNode: (nodeIndex: number, field: keyof DiagramNode, value: string) => void;
  onUpdateDiagramEdge: (edgeIndex: number, value: string) => void;
  onOpenAiImageStudio: () => void;
  onOpenMediaSearch: () => void;
}

const DIAGRAM_VARIANTS: { id: DiagramVariant; label: string }[] = [
  { id: 'topology', label: 'Topology Flow' },
  { id: 'stack', label: 'Layered Stack' },
  { id: 'isolation', label: 'Isolation Grid' },
  { id: 'takeaway', label: 'Key Takeaway' },
];

const ARCHETYPES: { id: SlideType; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { id: 'hub', label: 'Hub', icon: Cpu },
  { id: 'row', label: 'Mechanism', icon: Layers },
  { id: 'image', label: 'Diagram / AI', icon: ImageIcon },
  { id: 'code', label: 'Code Diff', icon: Code },
  { id: 'metric', label: 'Metric', icon: Gauge },
  { id: 'compare', label: 'Compare', icon: Columns },
  { id: 'cta', label: 'CTA', icon: ArrowRight },
];

export const ArchetypeControls: React.FC<ArchetypeControlsProps> = ({
  currentSlide,
  theme,
  isAdvancedCustomizerOpen,
  onSetSlideType,
  onUpdateField,
  onUpdateSatLabel,
  onUpdateSatIcon,
  onUpdateCenterIcon,
  onUpdateCenterTag,
  onAddSatNode,
  onDeleteSatNode,
  onUpdateDiagramNode,
  onUpdateDiagramEdge,
  onOpenAiImageStudio,
  onOpenMediaSearch,
}) => {
  const [iconPickerState, setIconPickerState] = useState<{
    isOpen: boolean;
    title: string;
    currentIcon: string;
    onSelect: (icon: string) => void;
  }>({
    isOpen: false,
    title: '',
    currentIcon: '',
    onSelect: () => {},
  });

  const defaultSatIcons = ['server', 'database', 'gauge', 'users', 'robot', 'gitMerge'];
  const satIcons = currentSlide.satIcons && currentSlide.satIcons.length > 0
    ? currentSlide.satIcons
    : defaultSatIcons;

  const centerIconName = currentSlide.centerIcon || 'gitMerge';
  const centerIconDisplayName = getIconDisplayName(centerIconName);

  return (
    <div className="space-y-4">
      {/* Slide 1 (Hub): Central Hero Box & Orbital Satellite Nodes Management */}
      {currentSlide.type === 'hub' && (
        <div className="pt-3 border-t border-white/[0.08] space-y-4 animate-fade-in">
          {/* Central Hub Hero Card Controls */}
          <div className="p-3 bg-black/60 border border-white/10 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                <span>Central Hub Hero Component</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">1080x1920 Anchor</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Center Icon Selector Button */}
              <div>
                <span className="text-[10px] text-slate-400 font-medium block mb-1">Center Hero Icon</span>
                <button
                  type="button"
                  onClick={() =>
                    setIconPickerState({
                      isOpen: true,
                      title: 'Select Center Hub Hero Icon',
                      currentIcon: centerIconName,
                      onSelect: (icon) => {
                        if (onUpdateCenterIcon) onUpdateCenterIcon(icon);
                        else onUpdateField('centerIcon', icon);
                      },
                    })
                  }
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/15 hover:border-white/30 hover:bg-white/[0.07] text-left transition-all cursor-pointer group"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center p-1 border shrink-0 transition-all group-hover:scale-105"
                    style={{
                      borderColor: `${theme.accent}40`,
                      backgroundColor: `${theme.accent}15`,
                    }}
                  >
                    <IconThumbnail icon={centerIconName} theme={theme} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">
                      {centerIconDisplayName}
                    </div>
                    <div className="text-[10px] text-slate-400">Click to change icon</div>
                  </div>
                </button>
              </div>

              {/* Center Tag / Pill Input */}
              <div>
                <span className="text-[10px] text-slate-400 font-medium block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>Center Tag Pill</span>
                  </span>
                  {!currentSlide.centerTag && (
                    <span className="text-[9px] font-mono text-slate-500">Default: SYSTEM CORE</span>
                  )}
                </span>
                <input
                  type="text"
                  value={currentSlide.centerTag || ''}
                  onChange={(e) => {
                    if (onUpdateCenterTag) onUpdateCenterTag(e.target.value);
                    else onUpdateField('centerTag', e.target.value);
                  }}
                  placeholder="SYSTEM CORE (or custom label)"
                  className="w-full bg-white/[0.03] border border-white/15 focus:border-white/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Orbital Satellite Nodes (2 to 6 nodes) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                  <span>
                    Orbital Satellite Nodes (
                    {currentSlide.satLabels ? currentSlide.satLabels.length : 6}/6)
                  </span>
                </label>
                <p className="text-[10px] text-slate-400">
                  Customizable vector icons & dynamic orbital spacing radiating from center
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onAddSatNode}
                  disabled={(currentSlide.satLabels ? currentSlide.satLabels.length : 6) >= 6}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all cursor-pointer"
                  title="Add Orbital Node (Max 6)"
                >
                  <Plus className="w-3 h-3" style={{ color: theme.accent }} />
                  <span>Add Node</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {(currentSlide.satLabels || ['SERVICE POD', 'STORAGE', 'TELEMETRY', 'IDENTITY', 'AI AGENT', 'VCS ENGINE']).map(
                (label, idx, arr) => {
                  const nodeIconKey = satIcons[idx % satIcons.length] || 'gitMerge';
                  const nodeIconLabel = getIconDisplayName(nodeIconKey);

                  return (
                    <div
                      key={idx}
                      className="group relative flex items-center bg-black/60 border border-white/15 focus-within:border-white/40 rounded-xl overflow-hidden pl-2 pr-1.5 py-1.5 transition-all gap-1.5"
                    >
                      {/* Clickable Satellite Icon Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setIconPickerState({
                            isOpen: true,
                            title: `Select Node #${idx + 1} Icon`,
                            currentIcon: nodeIconKey,
                            onSelect: (icon) => {
                              if (onUpdateSatIcon) {
                                onUpdateSatIcon(idx, icon);
                              } else {
                                const nextIcons = [...satIcons];
                                nextIcons[idx] = icon;
                                onUpdateField('satIcons', nextIcons);
                              }
                            },
                          })
                        }
                        className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 transition-transform hover:scale-110 cursor-pointer"
                        style={{
                          borderColor: `${theme.accent}30`,
                          backgroundColor: `${theme.accent}10`,
                        }}
                        title={`Change icon for Node #${idx + 1} (${nodeIconLabel})`}
                      >
                        <IconThumbnail icon={nodeIconKey} theme={theme} className="w-4 h-4" />
                      </button>

                      <span className="text-[10px] font-mono text-slate-500 font-bold shrink-0">
                        #{idx + 1}
                      </span>

                      <input
                        type="text"
                        value={label}
                        onChange={(e) => onUpdateSatLabel(idx, e.target.value)}
                        placeholder={`Node ${idx + 1}`}
                        className="w-full bg-transparent text-xs text-white font-medium focus:outline-none min-w-0"
                      />

                      {arr.length > 2 && onDeleteSatNode && (
                        <button
                          type="button"
                          onClick={() => onDeleteSatNode(idx)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100 shrink-0 cursor-pointer"
                          title={`Delete Node #${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                }
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Minimum 2 nodes • Maximum 6 nodes</span>
              <span>Orbital layout auto-balances angles on canvas</span>
            </div>
          </div>
        </div>
      )}

      {/* Mechanism Slides (Row Archetype) */}
      {currentSlide.type === 'row' && (
        <div className="pt-3 border-t border-white/[0.08] space-y-3.5 animate-fade-in">
          {/* Diagram Layout Switcher */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                <span>Diagram Layout Switcher</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">1-Click Schematic Flip</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
              {DIAGRAM_VARIANTS.map((variant) => {
                const isSelected = (currentSlide.diagramVariant || 'topology') === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onUpdateField('diagramVariant', variant.id)}
                    className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/20 text-white shadow-sm border border-white/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                    style={isSelected ? { color: theme.accent } : undefined}
                  >
                    <span>{variant.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Diagram Nodes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <span>Schematic Nodes (3 Components)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Label / Sublabel / Status</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, nIdx) => {
                const defaultNodes = [
                  { label: 'Client Ingress', sublabel: 'Port 443', status: 'ACTIVE', icon: 'server' },
                  { label: 'Control Plane', sublabel: 'Policy Engine', status: 'VERIFIED', icon: 'cpu' },
                  { label: 'Target Service', sublabel: 'Encrypted Pipe', status: 'SECURED', icon: 'database' },
                ];
                const node = currentSlide.diagramNodes?.[nIdx] || defaultNodes[nIdx];
                const nodeIconKey = node.icon || defaultNodes[nIdx].icon || 'server';
                const nodeIconLabel = getIconDisplayName(nodeIconKey);

                return (
                  <div key={nIdx} className="bg-black/50 border border-white/10 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setIconPickerState({
                              isOpen: true,
                              title: `Select Node #${nIdx + 1} Icon`,
                              currentIcon: nodeIconKey,
                              onSelect: (icon) => onUpdateDiagramNode(nIdx, 'icon', icon),
                            })
                          }
                          className="w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 transition-transform hover:scale-110 cursor-pointer"
                          style={{
                            borderColor: `${theme.accent}30`,
                            backgroundColor: `${theme.accent}10`,
                          }}
                          title={`Change icon for Node #${nIdx + 1} (${nodeIconLabel})`}
                        >
                          <IconThumbnail icon={nodeIconKey} theme={theme} className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-bold font-mono text-slate-400">
                          Node #{nIdx + 1}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={node.status || ''}
                        onChange={(e) => onUpdateDiagramNode(nIdx, 'status', e.target.value)}
                        placeholder="STATUS"
                        className="w-20 text-right bg-transparent border-b border-white/15 focus:border-white/40 text-[9px] font-mono text-emerald-400 uppercase focus:outline-none"
                        title="Status Badge (e.g. ACTIVE, VERIFIED, ISOLATED)"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={node.label || ''}
                        onChange={(e) => onUpdateDiagramNode(nIdx, 'label', e.target.value)}
                        placeholder="Primary Label"
                        className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2 py-1 text-xs text-white font-semibold focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={node.sublabel || ''}
                        onChange={(e) => onUpdateDiagramNode(nIdx, 'sublabel', e.target.value)}
                        placeholder="Sublabel / Spec"
                        className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* diagramEdges & diagramFooter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                Connector 1 → 2
              </label>
              <input
                type="text"
                value={currentSlide.diagramEdges?.[0] ?? ''}
                onChange={(e) => onUpdateDiagramEdge(0, e.target.value)}
                placeholder="e.g. Mutual Auth"
                className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                Connector 2 → 3
              </label>
              <input
                type="text"
                value={currentSlide.diagramEdges?.[1] ?? ''}
                onChange={(e) => onUpdateDiagramEdge(1, e.target.value)}
                placeholder="e.g. Encrypted Pipe"
                className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                Footer Telemetry Line
              </label>
              <input
                type="text"
                value={currentSlide.diagramFooter ?? ''}
                onChange={(e) => onUpdateField('diagramFooter', e.target.value)}
                placeholder="e.g. Telemetry metric"
                className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Expandable Advanced Customizer Drawer */}
      {isAdvancedCustomizerOpen && (
        <div className="pt-3 border-t border-white/[0.08] space-y-4 animate-fade-in">
          {/* 1. Archetype Switcher */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Slide Layout Archetype
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
              {ARCHETYPES.map((arch) => {
                const Icon = arch.icon;
                const isSelected = currentSlide.type === arch.id;
                return (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => onSetSlideType(arch.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? theme.accent : undefined }} />
                    <span>{arch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Archetype Specific Deep Editors */}
          {/* Code Diff Archetype */}
          {currentSlide.type === 'code' && (
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                <span>Code Diff & Terminal Controls</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">File Name</label>
                  <input
                    type="text"
                    value={currentSlide.codeFileName || 'sys_exec.sh'}
                    onChange={(e) => onUpdateField('codeFileName', e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Language</label>
                  <input
                    type="text"
                    value={currentSlide.codeLanguage || 'bash'}
                    onChange={(e) => onUpdateField('codeLanguage', e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Code Snippet (+ / - diff)</label>
                <textarea
                  rows={4}
                  value={currentSlide.codeSnippet || ''}
                  onChange={(e) => onUpdateField('codeSnippet', e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Metric Card Archetype */}
          {currentSlide.type === 'metric' && (
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Metric Benchmark Card</span>
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Metric Value</label>
                  <input
                    type="text"
                    value={currentSlide.metricValue || '0.4ms'}
                    onChange={(e) => onUpdateField('metricValue', e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Label</label>
                  <input
                    type="text"
                    value={currentSlide.metricLabel || 'p99 Latency'}
                    onChange={(e) => onUpdateField('metricLabel', e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Delta / Diff</label>
                  <input
                    type="text"
                    value={currentSlide.metricDiff || '▲ 94% faster'}
                    onChange={(e) => onUpdateField('metricDiff', e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Compare Archetype */}
          {currentSlide.type === 'compare' && (
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Columns className="w-3.5 h-3.5 text-purple-400" />
                <span>Before vs After Architecture Comparison</span>
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block">Legacy (Left)</label>
                  <input
                    type="text"
                    value={currentSlide.compareLeftTitle || 'Legacy Stack'}
                    onChange={(e) => onUpdateField('compareLeftTitle', e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white mb-1"
                  />
                  <textarea
                    rows={3}
                    value={currentSlide.compareLeftBody || ''}
                    onChange={(e) => onUpdateField('compareLeftBody', e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-slate-300 resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block">Modern (Right)</label>
                  <input
                    type="text"
                    value={currentSlide.compareRightTitle || 'Modern Engine'}
                    onChange={(e) => onUpdateField('compareRightTitle', e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white mb-1"
                  />
                  <textarea
                    rows={3}
                    value={currentSlide.compareRightBody || ''}
                    onChange={(e) => onUpdateField('compareRightBody', e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-slate-300 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Image & AI Diagram Studio */}
          {currentSlide.type === 'image' && (
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Visual Diagram & AI Studio</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onOpenAiImageStudio}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/40 text-xs font-semibold cursor-pointer"
                  >
                    AI Diagram Studio
                  </button>
                  <button
                    type="button"
                    onClick={onOpenMediaSearch}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 text-xs font-semibold cursor-pointer"
                  >
                    Search Web
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Image URL / Path</label>
                  <input
                    type="text"
                    value={currentSlide.imageUrl || ''}
                    onChange={(e) => onUpdateField('imageUrl', e.target.value)}
                    placeholder="https://... or /generated/..."
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Caption / Sub-title</label>
                  <input
                    type="text"
                    value={currentSlide.imageCaption || ''}
                    onChange={(e) => onUpdateField('imageCaption', e.target.value)}
                    placeholder="e.g. Distributed Consensus State Machine"
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vector Icon Picker Modal Popover */}
      <IconPickerPopover
        isOpen={iconPickerState.isOpen}
        title={iconPickerState.title}
        selectedIcon={iconPickerState.currentIcon}
        onSelectIcon={(icon) => {
          iconPickerState.onSelect(icon);
          setIconPickerState((prev) => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setIconPickerState((prev) => ({ ...prev, isOpen: false }))}
        theme={theme}
      />
    </div>
  );
};
