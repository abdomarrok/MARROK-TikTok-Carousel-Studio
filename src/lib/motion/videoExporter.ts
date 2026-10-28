import { MotionTemplateConfig, MotionTemplateId } from '../../types.ts';
import { MOTION_W, MOTION_H, generateCues } from './base.ts';
import { drawMotionReelFrame, getMotionTemplate } from './templates/index.ts';
import { synthesizeSfxFloat32Buffer, encodeWavBlob } from './sfxSynthesizer.ts';

export interface MotionVideoExportResult {
  videoBlob: Blob | null;
  mimeType: string;
  extension: 'mp4' | 'webm';
  wavBlob: Blob;
  htmlContent: string;
}

export interface MotionVideoExportOptions {
  fps?: number;
  includeSfx?: boolean;
  signal?: AbortSignal;
  onProgress?: (percent: number, stage: string) => void;
}

function pickSupportedVideoMimeType(): { mimeType: string; extension: 'mp4' | 'webm' } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', extension: 'webm' };
  }
  const candidates: Array<{ mimeType: string; extension: 'mp4' | 'webm' }> = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: 'video/webm', extension: 'webm' };
}

/**
 * Renders a 1080x1920 Motion Reel animation in the browser using Canvas + Web Audio procedural SFX
 * and exports video, standalone WAV audio, and standalone HTML5 player.
 */
export async function exportMotionReelBundle(
  templateId: MotionTemplateId,
  config: MotionTemplateConfig,
  options: MotionVideoExportOptions = {}
): Promise<MotionVideoExportResult> {
  const { fps = 30, includeSfx = true, signal, onProgress } = options;
  const duration = Math.max(2, Math.min(60, config.duration || 20));

  onProgress?.(5, 'Compiling template & procedural SFX cues...');

  const template = getMotionTemplate(templateId);
  const htmlContent = template.toHTML(config);
  const cues = generateCues(config.scenes || []);
  const { samples, sampleRate } = synthesizeSfxFloat32Buffer(cues, duration);
  const wavBlob = encodeWavBlob(samples, sampleRate);

  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
    onProgress?.(100, 'Compiled standalone HTML & WAV bundle');
    return {
      videoBlob: null,
      mimeType: 'video/webm',
      extension: 'webm',
      wavBlob,
      htmlContent,
    };
  }

  onProgress?.(12, 'Initializing 1080×1920 canvas & audio stream...');

  const canvas = document.createElement('canvas');
  canvas.width = MOTION_W;
  canvas.height = MOTION_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D rendering context');
  }

  const { mimeType, extension } = pickSupportedVideoMimeType();
  const canvasStream = canvas.captureStream(fps);

  let audioCtx: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;

  if (includeSfx) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx({ sampleRate });
        const dest = audioCtx.createMediaStreamDestination();
        const buffer = audioCtx.createBuffer(1, samples.length, sampleRate);
        buffer.getChannelData(0).set(samples);
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = buffer;
        audioSource.connect(dest);
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }
      }
    } catch {
      // Fallback to video-only stream if audio stream mixing is blocked
    }
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const stopPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = (err) => {
      reject(err);
    };
  });

  recorder.start(200);
  if (audioSource) {
    try {
      audioSource.start(0);
    } catch {
      // ignore
    }
  }

  const totalFrames = Math.round(duration * fps);
  const frameIntervalMs = 1000 / fps;
  const startWall = performance.now();

  try {
    for (let i = 0; i <= totalFrames; i++) {
      if (signal?.aborted) {
        recorder.stop();
        throw new Error('Export cancelled');
      }

      const simTime = Math.min(duration - 0.001, (i / totalFrames) * duration);
      drawMotionReelFrame(ctx, templateId, config, simTime);

      const pct = Math.min(96, Math.round(15 + (i / totalFrames) * 80));
      if (i % 5 === 0 || i === totalFrames) {
        onProgress?.(pct, `Rendering ${simTime.toFixed(1)}s / ${duration.toFixed(1)}s @ ${fps}fps...`);
      }

      const targetWall = startWall + (i + 1) * frameIntervalMs;
      const waitMs = Math.max(2, targetWall - performance.now());
      await new Promise((r) => setTimeout(r, waitMs));
    }

    onProgress?.(98, 'Finalizing video container & audio mix...');
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    const videoBlob = await stopPromise;
    onProgress?.(100, 'Complete!');

    return {
      videoBlob,
      mimeType,
      extension,
      wavBlob,
      htmlContent,
    };
  } finally {
    if (audioSource) {
      try {
        audioSource.stop();
      } catch {
        // ignore
      }
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
    }
  }
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
