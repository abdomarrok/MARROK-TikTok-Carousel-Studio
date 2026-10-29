import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Download,
  Film,
  Volume2,
  Code,
  Check,
  RefreshCw,
} from 'lucide-react';
import { MotionReelData, ThemePalette } from '../../../types.ts';
import {
  exportMotionReelBundle,
  MotionVideoExportResult,
  triggerBlobDownload,
} from '../../../lib/motion/index.ts';

interface MotionExportModalProps {
  isOpen: boolean;
  reelConfig: MotionReelData;
  theme: ThemePalette;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const MotionExportModal: React.FC<MotionExportModalProps> = ({
  isOpen,
  reelConfig,
  theme,
  onClose,
  onShowToast,
}) => {
  const [status, setStatus] = useState<'running' | 'done' | 'cancelled' | 'error'>('running');
  const [stage, setStage] = useState('Initializing 1080×1920 render pipeline...');
  const [percent, setPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MotionVideoExportResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatus('running');
    setPercent(5);
    setStage('Compiling template & 48kHz procedural SFX...');
    setErrorMessage(null);
    setResult(null);

    exportMotionReelBundle(reelConfig.templateId, reelConfig, {
      fps: 30,
      includeSfx: reelConfig.sfxEnabled !== false,
      signal: controller.signal,
      onProgress: (pct, stg) => {
        setPercent(pct);
        setStage(stg);
      },
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        setResult(res);
        setStatus('done');
        setPercent(100);
        setStage('Render complete!');
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          setStatus('cancelled');
          setStage('Render cancelled');
          return;
        }
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Video export failed');
      });

    return () => {
      controller.abort();
    };
  }, [isOpen, reelConfig]);

  if (!isOpen) return null;

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    onClose();
  };

  const handleDownloadVideo = () => {
    if (!result?.videoBlob) return;
    const filename = `MARROK_MotionReel_1080x1920.${result.extension}`;
    triggerBlobDownload(result.videoBlob, filename);
    onShowToast(`Downloaded ${filename}`);
  };

  const handleDownloadWav = () => {
    if (!result?.wavBlob) return;
    triggerBlobDownload(result.wavBlob, 'MARROK_MotionReel_SFX.wav');
    onShowToast('Downloaded 48kHz Procedural SFX WAV');
  };

  const handleDownloadHtml = () => {
    if (!result?.htmlContent) return;
    const blob = new Blob([result.htmlContent], { type: 'text/html;charset=utf-8' });
    triggerBlobDownload(blob, 'MARROK_MotionReel_1080x1920.html');
    onShowToast('Downloaded standalone HTML5 animation player');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#0b1118] border border-white/20 p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4" style={{ color: theme.accent }} />
            <div>
              <h2 className="text-sm font-bold text-white">Export Motion Reel Video</h2>
              <span className="text-[10px] font-mono text-slate-400">
                {Math.max(2, Math.min(60, reelConfig.duration || 20)).toFixed(0)}s • 1080×1920 • 30fps • {(result?.extension || 'mp4').toUpperCase()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Running State */}
        {status === 'running' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>{stage}</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-white">{percent}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full transition-all duration-200 rounded-full"
                style={{ width: `${percent}%`, backgroundColor: theme.accent }}
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Rendering {Math.max(2, Math.min(60, reelConfig.duration || 20)).toFixed(0)}s • 1080×1920 frames at 30fps with damped harmonic spring physics, 48kHz procedural sound effects, and frame-accurate NLE duration headers.
            </p>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-2 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/10 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              Cancel Render
            </button>
          </div>
        )}

        {/* Done State */}
        {status === 'done' && result && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs text-emerald-300 font-semibold">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>1080×1920 Motion Reel Ready!</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-200">
                {(result.durationSec || reelConfig.duration || 20).toFixed(0)}s • .{result.extension.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2">
              {result.videoBlob && (
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    Download {(result.durationSec || reelConfig.duration || 20).toFixed(0)}s Video (.{result.extension})
                  </span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadWav}
                  className="py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SFX Audio (.wav)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 text-purple-400" />
                  <span>HTML5 Player</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {errorMessage || 'An error occurred while rendering the video.'}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/10 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
