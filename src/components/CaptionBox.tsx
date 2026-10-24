import React, { useState } from 'react';
import {
  Copy,
  Check,
  MessageSquare,
  Hash,
  Edit3,
  Sparkles,
  Link2,
  Zap,
  Layers,
} from 'lucide-react';
import { CaptionVariant, ThemeConfig } from '../types';

interface CaptionBoxProps {
  caption: string;
  captionVariants?: CaptionVariant[];
  theme: ThemeConfig;
  category: string;
  firstComment?: string;
  shortCaption?: string;
  screenHook?: string;
  brandUrl?: string;
  slide1?: { enTitle?: string; arTitle?: string };
  onUpdateCaption: (newCaption: string) => void;
  onUpdateFirstComment?: (comment: string) => void;
  onUpdateShortCaption?: (shortCap: string) => void;
  onUpdateScreenHook?: (hook: string) => void;
  onShowToast?: (msg: string) => void;
}

export const CaptionBox: React.FC<CaptionBoxProps> = ({
  caption,
  captionVariants,
  theme,
  category,
  firstComment,
  shortCaption,
  screenHook,
  brandUrl,
  slide1,
  onUpdateCaption,
  onUpdateFirstComment,
  onUpdateShortCaption,
  onUpdateScreenHook,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'full' | 'comment' | 'short' | 'hook'>('full');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Synthesize defaults if not explicitly provided (Spec §8 & §12.4)
  const defaultComment =
    firstComment ||
    `🔗 Link in bio to the official primary documentation & reference post: https://${
      brandUrl || 'marrok.org'
    }\n\nWhat are your thoughts on this architecture? Share your take below 👇`;

  const defaultShortCaption =
    shortCaption ||
    `${slide1?.arTitle || 'نظرة هندسية سريعة'} ⚡\n${
      slide1?.enTitle || 'Technical breakdown'
    } — Swipe through all slides 👉`;

  const defaultScreenHook =
    screenHook ||
    (slide1?.enTitle ? `${slide1.enTitle.replace(/[.?!]$/, '')} in 60s` : 'Why this changes everything');

  const copyToClipboard = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      if (onShowToast) onShowToast(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2200);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const charCount = caption.length;
  const hashtags = caption.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g) || [];

  return (
    <div
      id="caption"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg backdrop-blur-sm space-y-3.5"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${theme.accent}20` }}
          >
            <MessageSquare className="w-4 h-4" style={{ color: theme.accent }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-jakarta">
              Bilingual TikTok Post Copy & Captions (Spec §8)
            </h3>
            <p className="text-[11px] text-slate-400">
              Formatted post caption · Pinned first comment · Short 2-line variant · 3s on-screen hook
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'full' && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditing ? 'View Formatted' : 'Edit'}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (activeTab === 'full') copyToClipboard(caption, 'full', 'Full Caption');
              else if (activeTab === 'comment')
                copyToClipboard(defaultComment, 'comment', 'Pinned First Comment');
              else if (activeTab === 'short')
                copyToClipboard(defaultShortCaption, 'short', 'Short Caption');
              else if (activeTab === 'hook')
                copyToClipboard(defaultScreenHook, 'hook', '3-Second Screen Hook');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
            style={{
              backgroundColor: theme.accent,
              color: '#0e1117',
            }}
          >
            {copiedKey ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>
                  Copy {activeTab === 'full' ? 'Caption' : activeTab === 'comment' ? 'Comment' : 'Hook'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Full Caption / First Comment / Short Caption / 3s Hook */}
      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('full')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'full' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Full Post Caption</span>
        </button>

        <button
          onClick={() => setActiveTab('comment')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'comment' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
          title="TikTok captions cannot contain clickable links; use pinned first comment per Spec §8"
        >
          <Link2 className="w-3 h-3 text-cyan-400" />
          <span>Pinned First Comment (Links)</span>
        </button>

        <button
          onClick={() => setActiveTab('short')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'short' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>2-Line Short Variant</span>
        </button>

        <button
          onClick={() => setActiveTab('hook')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'hook' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>3s On-Screen Hook</span>
        </button>
      </div>

      {/* TAB 1: FULL CAPTION */}
      {activeTab === 'full' && (
        <div className="space-y-3">
          {captionVariants && captionVariants.length > 0 && (
            <div className="p-2 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between gap-2 text-xs">
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

          {isEditing ? (
            <textarea
              value={caption}
              onChange={(e) => onUpdateCaption(e.target.value)}
              rows={10}
              className="w-full rounded-xl bg-black/40 border border-white/10 p-3.5 text-xs text-slate-200 focus:outline-none focus:border-white/30 font-mono leading-relaxed resize-y"
              placeholder="Edit the bilingual TikTok caption here..."
            />
          ) : (
            <div className="rounded-xl bg-black/30 border border-white/[0.06] p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto selection:bg-white/20">
              {caption}
            </div>
          )}

          <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <span className="font-mono tabular-nums">
                <strong className="text-white">{charCount}</strong> characters
              </span>
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-500" />
                <strong className="text-white font-mono tabular-nums">{hashtags.length}</strong> tags
              </span>
              <span className="text-slate-500">·</span>
              <span>
                Category: <strong className="text-slate-300">{category}</strong>
              </span>
            </div>
            <div className="text-[10px] text-slate-500">Ready to paste into TikTok Studio</div>
          </div>
        </div>
      )}

      {/* TAB 2: PINNED FIRST COMMENT (SPEC §8 & §14) */}
      {activeTab === 'comment' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200">
            <strong>Spec §8 Rule:</strong> Links in TikTok post captions are not clickable. Put the link
            in your bio and post this text as the pinned first comment.
          </div>
          <textarea
            value={defaultComment}
            onChange={(e) => onUpdateFirstComment && onUpdateFirstComment(e.target.value)}
            rows={4}
            className="w-full rounded-xl bg-black/40 border border-white/10 p-3.5 text-xs text-slate-200 focus:outline-none focus:border-white/30 font-mono leading-relaxed resize-none"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Length: <strong className="text-white font-mono">{defaultComment.length}</strong> chars
            </span>
            <button
              onClick={() => copyToClipboard(defaultComment, 'comment', 'Pinned First Comment')}
              className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold cursor-pointer"
            >
              Copy First Comment
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: 2-LINE SHORT CAPTION (SPEC §8) */}
      {activeTab === 'short' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200">
            <strong>Spec §8 Short Variant:</strong> A punchy 2-line version for TikTok quick-scroll and
            instant retention.
          </div>
          <textarea
            value={defaultShortCaption}
            onChange={(e) => onUpdateShortCaption && onUpdateShortCaption(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-black/40 border border-white/10 p-3.5 text-xs text-slate-200 focus:outline-none focus:border-white/30 font-mono leading-relaxed resize-none"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Length: <strong className="text-white font-mono">{defaultShortCaption.length}</strong> chars
            </span>
            <button
              onClick={() => copyToClipboard(defaultShortCaption, 'short', 'Short Caption')}
              className="text-amber-400 hover:text-amber-300 text-xs font-semibold cursor-pointer"
            >
              Copy Short Variant
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: 3-SECOND ON-SCREEN HOOK (SPEC §8) */}
      {activeTab === 'hook' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200">
            <strong>Spec §8 On-Screen Hook:</strong> High-impact overlay text for Slide 1 cover thumbnail
            to hook the viewer within the first 3 seconds of FYP display.
          </div>
          <input
            type="text"
            value={defaultScreenHook}
            onChange={(e) => onUpdateScreenHook && onUpdateScreenHook(e.target.value)}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30 font-jakarta font-bold text-base"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Length: <strong className="text-white font-mono">{defaultScreenHook.length}</strong> chars
            </span>
            <button
              onClick={() => copyToClipboard(defaultScreenHook, 'hook', '3-Second Screen Hook')}
              className="text-purple-400 hover:text-purple-300 text-xs font-semibold cursor-pointer"
            >
              Copy Screen Hook
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
