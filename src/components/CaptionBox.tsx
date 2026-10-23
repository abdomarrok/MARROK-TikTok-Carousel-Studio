import React, { useState } from 'react';
import { Copy, Check, MessageSquare, Hash, Edit3, Sparkles } from 'lucide-react';
import { CaptionVariant, ThemeConfig } from '../types';

interface CaptionBoxProps {
  caption: string;
  captionVariants?: CaptionVariant[];
  theme: ThemeConfig;
  category: string;
  onUpdateCaption: (newCaption: string) => void;
  onShowToast?: (msg: string) => void;
}

export const CaptionBox: React.FC<CaptionBoxProps> = ({
  caption,
  captionVariants,
  theme,
  category,
  onUpdateCaption,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      if (onShowToast) onShowToast('TikTok caption copied to clipboard!');
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy caption:', err);
    }
  };

  const charCount = caption.length;
  const hashtags = caption.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g) || [];

  return (
    <div
      id="caption"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${theme.accent}20` }}
          >
            <MessageSquare className="w-4 h-4" style={{ color: theme.accent }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-jakarta">
              Bilingual TikTok Post Caption
            </h3>
            <p className="text-[11px] text-slate-400">
              High-impact hook · Structured bullet points · Source attribution · Niche hashtags
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            <span>{isEditing ? 'View Formatted' : 'Edit Caption'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
            style={{
              backgroundColor: theme.accent,
              color: '#0e1117',
            }}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Caption</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* A/B Caption Style Selector */}
      {captionVariants && captionVariants.length > 0 && (
        <div className="mb-3 p-2 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 shrink-0 text-[11px] font-medium">
            <Sparkles className="w-3 h-3" style={{ color: theme.accent }} />
            <span>Caption Style:</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {captionVariants.map((variant, vIdx) => {
              const isSelected = caption.trim() === variant.caption.trim();
              return (
                <button
                  key={vIdx}
                  onClick={() => onUpdateCaption(variant.caption)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                  style={{
                    color: isSelected ? theme.accent : undefined,
                  }}
                >
                  {variant.style}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Caption Content Area */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={caption}
            onChange={(e) => onUpdateCaption(e.target.value)}
            rows={10}
            className="w-full rounded-xl bg-black/40 border border-white/10 p-3.5 text-xs text-slate-200 focus:outline-none focus:border-white/30 font-mono leading-relaxed resize-y"
            placeholder="Edit the bilingual TikTok caption here..."
          />
        </div>
      ) : (
        <div className="rounded-xl bg-black/30 border border-white/[0.06] p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto selection:bg-white/20">
          {caption}
        </div>
      )}

      {/* Metadata Metrics Strip */}
      <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-mono tabular-nums">
            <strong className="text-white">{charCount}</strong> characters
          </span>
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3 text-slate-500" />
            <strong className="text-white font-mono tabular-nums">{hashtags.length}</strong> tags
          </span>
          <span className="text-slate-500">·</span>
          <span>Category: <strong className="text-slate-300">{category}</strong></span>
        </div>

        <div className="text-[10px] text-slate-500">
          Ready to paste directly into TikTok Post Creator
        </div>
      </div>
    </div>
  );
};
