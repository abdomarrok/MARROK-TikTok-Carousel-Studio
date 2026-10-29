import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { MotionTemplateConfig, MotionTemplateId } from '../../types.ts';
import { MOTION_W, MOTION_H, generateCues } from './base.ts';
import { drawMotionReelFrame, getMotionTemplate } from './templates/index.ts';
import { synthesizeSfxFloat32Buffer, encodeWavBlob } from './sfxSynthesizer.ts';
import { fixMp4DurationBytes, fixVideoBlobDuration } from './containerDurationFix.ts';

export interface MotionVideoExportResult {
  videoBlob: Blob | null;
  mimeType: string;
  extension: 'mp4' | 'webm';
  durationSec: number;
  wavBlob: Blob;
  htmlContent: string;
}

export interface MotionVideoExportOptions {
  fps?: number;
  includeSfx?: boolean;
  signal?: AbortSignal;
  onProgress?: (percent: number, stage: string) => void;
}

/**
 * Selects the highest-priority supported video MIME type for MediaRecorder,
 * prioritizing standard H.264/AAC `.mp4` containers for CapCut and TikTok compatibility.
 */
export function pickSupportedVideoMimeType(): { mimeType: string; extension: 'mp4' | 'webm' } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/mp4', extension: 'mp4' };
  }
  const candidates: Array<{ mimeType: string; extension: 'mp4' | 'webm' }> = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=h264,aac', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];
  for (const c of candidates) {
    if (
      typeof MediaRecorder.isTypeSupported === 'function' &&
      MediaRecorder.isTypeSupported(c.mimeType)
    ) {
      return c;
    }
  }
  return { mimeType: 'video/webm', extension: 'webm' };
}

/**
 * Frame-accurate deterministic MP4 encoder using WebCodecs (`VideoEncoder` + `AudioEncoder`)
 * and `mp4-muxer` with `fastStart: 'in-memory'`.
 *
 * Guarantees that every frame `0 .. totalFrames - 1` has an exact microsecond presentation
 * timestamp and that the resulting `.mp4` `moov` header (`mvhd`, `tkhd`, `mdhd`) reports
 * the exact full timeline duration (e.g. 24.0s) in CapCut, TikTok, and NLEs.
 */
async function tryExportWithWebCodecsMp4(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  templateId: MotionTemplateId,
  config: MotionTemplateConfig,
  duration: number,
  fps: number,
  includeSfx: boolean,
  samples: Float32Array,
  sampleRate: number,
  signal?: AbortSignal,
  onProgress?: (percent: number, stage: string) => void
): Promise<Blob | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return null;
  }

  // 1. Probe supported H.264 / AVC profile for 1080x1920 @ fps
  const avcCandidates = ['avc1.640028', 'avc1.4d002a', 'avc1.42001f', 'avc1.42E01E'];
  let selectedVideoCodec: string | null = null;
  for (const codec of avcCandidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width: MOTION_W,
        height: MOTION_H,
        bitrate: 8_000_000,
        framerate: fps,
      });
      if (support.supported) {
        selectedVideoCodec = codec;
        break;
      }
    } catch {
      // continue
    }
  }

  if (!selectedVideoCodec) {
    return null;
  }

  // 2. Probe audio encoder if procedural SFX is enabled
  let selectedAudioCodec: { webCodecsCodec: string; muxerCodec: 'aac' | 'opus' } | null = null;
  if (includeSfx) {
    if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
      return null;
    }
    const audioCandidates: Array<{ webCodecsCodec: string; muxerCodec: 'aac' | 'opus' }> = [
      { webCodecsCodec: 'mp4a.40.2', muxerCodec: 'aac' },
      { webCodecsCodec: 'opus', muxerCodec: 'opus' },
    ];
    for (const candidate of audioCandidates) {
      try {
        const support = await AudioEncoder.isConfigSupported({
          codec: candidate.webCodecsCodec,
          sampleRate,
          numberOfChannels: 1,
          bitrate: 128_000,
        });
        if (support.supported) {
          selectedAudioCodec = candidate;
          break;
        }
      } catch {
        // continue
      }
    }
    if (!selectedAudioCodec) {
      return null;
    }
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width: MOTION_W,
      height: MOTION_H,
      frameRate: fps,
    },
    audio: selectedAudioCodec
      ? {
          codec: selectedAudioCodec.muxerCodec,
          numberOfChannels: 1,
          sampleRate,
        }
      : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });

  videoEncoder.configure({
    codec: selectedVideoCodec,
    width: MOTION_W,
    height: MOTION_H,
    bitrate: 8_000_000,
    framerate: fps,
  });

  let audioEncoder: AudioEncoder | null = null;
  if (selectedAudioCodec) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });
    audioEncoder.configure({
      codec: selectedAudioCodec.webCodecsCodec,
      sampleRate,
      numberOfChannels: 1,
      bitrate: 128_000,
    });
  }

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDurationUs = Math.round(1_000_000 / fps);

  try {
    // 3. Encode exact frame sequence 0 .. totalFrames - 1
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) {
        throw new Error('Export cancelled');
      }
      if (encoderError) {
        throw encoderError;
      }

      const simTime = Math.min(duration - 0.001, (i / totalFrames) * duration);
      drawMotionReelFrame(ctx, templateId, config, simTime);

      const timestampUs = Math.round((i / fps) * 1_000_000);
      const frame = new VideoFrame(canvas, {
        timestamp: timestampUs,
        duration: frameDurationUs,
      });

      const isKeyFrame = i % (fps * 2) === 0;
      videoEncoder.encode(frame, { keyFrame: isKeyFrame });
      frame.close();

      if (i % 4 === 0 || i === totalFrames - 1) {
        const pct = Math.min(90, Math.round(15 + ((i + 1) / totalFrames) * 75));
        onProgress?.(
          pct,
          `Encoding MP4 frame ${i + 1}/${totalFrames} (${simTime.toFixed(1)}s / ${duration.toFixed(1)}s)...`
        );
        await new Promise((r) => setTimeout(r, 0));
      }

      if (videoEncoder.encodeQueueSize > 8) {
        await new Promise((r) => setTimeout(r, 6));
      }
    }

    // 4. Encode exact duration of procedural 48kHz audio samples if enabled
    if (audioEncoder && selectedAudioCodec) {
      onProgress?.(92, 'Multiplexing 48kHz procedural Foley audio track...');
      const exactTotalSamples = Math.round(duration * sampleRate);
      const chunkFrames = 1024;
      for (let offset = 0; offset < exactTotalSamples; offset += chunkFrames) {
        if (signal?.aborted) {
          throw new Error('Export cancelled');
        }
        const count = Math.min(chunkFrames, exactTotalSamples - offset);
        const chunkBuffer = new Float32Array(count);
        for (let j = 0; j < count; j++) {
          const sampleIdx = offset + j;
          chunkBuffer[j] = sampleIdx < samples.length ? samples[sampleIdx] : 0;
        }
        const timestampUs = Math.round((offset / sampleRate) * 1_000_000);
        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: count,
          numberOfChannels: 1,
          timestamp: timestampUs,
          data: chunkBuffer,
        });
        audioEncoder.encode(audioData);
        audioData.close();
      }
      await audioEncoder.flush();
    }

    onProgress?.(96, 'Finalizing fast-start MP4 container header...');
    await videoEncoder.flush();
    if (encoderError) {
      throw encoderError;
    }

    muxer.finalize();
    const rawMp4Bytes = new Uint8Array(target.buffer);
    const patchedMp4Bytes = fixMp4DurationBytes(rawMp4Bytes, duration);
    const finalAb = new ArrayBuffer(patchedMp4Bytes.byteLength);
    new Uint8Array(finalAb).set(patchedMp4Bytes);
    return new Blob([finalAb], { type: 'video/mp4' });
  } finally {
    try {
      if (videoEncoder.state !== 'closed') videoEncoder.close();
    } catch {
      // ignore
    }
    try {
      if (audioEncoder && audioEncoder.state !== 'closed') audioEncoder.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Renders a 1080x1920 Motion Reel animation in the browser and exports an NLE-ready
 * video file (CapCut / TikTok `.mp4` prioritized), standalone WAV audio, and standalone HTML5 player.
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
  const effectiveProfile = includeSfx === false ? 'silent' : config.sfxProfile || 'warm-foley';
  const cues = generateCues(
    config.scenes || [],
    effectiveProfile,
    config.defaultTransition || 'auto'
  );
  const { samples, sampleRate } = synthesizeSfxFloat32Buffer(cues, duration);
  const wavBlob = encodeWavBlob(samples, sampleRate);

  if (typeof document === 'undefined') {
    onProgress?.(100, 'Compiled standalone HTML & WAV bundle');
    return {
      videoBlob: null,
      mimeType: 'video/mp4',
      extension: 'mp4',
      durationSec: duration,
      wavBlob,
      htmlContent,
    };
  }

  onProgress?.(10, 'Initializing 1080×1920 render surface...');

  const canvas = document.createElement('canvas');
  canvas.width = MOTION_W;
  canvas.height = MOTION_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D rendering context');
  }

  // Primary Path: Deterministic frame-by-frame WebCodecs + mp4-muxer (fastStart MP4)
  try {
    const webCodecsBlob = await tryExportWithWebCodecsMp4(
      ctx,
      canvas,
      templateId,
      config,
      duration,
      fps,
      includeSfx && effectiveProfile !== 'silent',
      samples,
      sampleRate,
      signal,
      onProgress
    );
    if (webCodecsBlob && webCodecsBlob.size > 0) {
      onProgress?.(100, 'Complete!');
      return {
        videoBlob: webCodecsBlob,
        mimeType: 'video/mp4',
        extension: 'mp4',
        durationSec: duration,
        wavBlob,
        htmlContent,
      };
    }
  } catch (err) {
    if (signal?.aborted) {
      throw err;
    }
    // Fall through to synchronized MediaRecorder + binary header patcher
  }

  if (typeof MediaRecorder === 'undefined') {
    onProgress?.(100, 'Compiled standalone HTML & WAV bundle');
    return {
      videoBlob: null,
      mimeType: 'video/mp4',
      extension: 'mp4',
      durationSec: duration,
      wavBlob,
      htmlContent,
    };
  }

  onProgress?.(14, 'Initializing 1080×1920 stream & audio muxer...');

  const { mimeType, extension } = pickSupportedVideoMimeType();
  const canvasStream = canvas.captureStream(fps);
  const videoTrack = canvasStream.getVideoTracks()[0] as
    | (MediaStreamTrack & { requestFrame?: () => void })
    | undefined;

  let audioCtx: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;

  if (includeSfx && effectiveProfile !== 'silent') {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx({ sampleRate });
        const dest = audioCtx.createMediaStreamDestination();
        const exactSamplesCount = Math.max(samples.length, Math.round(duration * sampleRate));
        const buffer = audioCtx.createBuffer(1, exactSamplesCount, sampleRate);
        buffer.getChannelData(0).set(samples.subarray(0, exactSamplesCount));
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

  // Draw initial frame t = 0 before starting MediaRecorder so stream has valid dimensions immediately
  drawMotionReelFrame(ctx, templateId, config, 0);
  videoTrack?.requestFrame?.();

  recorder.start(250);
  if (audioSource) {
    try {
      audioSource.start(0);
    } catch {
      // ignore
    }
  }

  const frameIntervalMs = 1000 / fps;
  const durationMs = duration * 1000;
  const startWall = performance.now();
  let renderedCount = 0;

  try {
    // Synchronize the canvas render loop strictly to real-time wall clock so MediaRecorder
    // records the full `duration` timeline without truncating or drifting.
    while (true) {
      if (signal?.aborted) {
        if (recorder.state !== 'inactive') recorder.stop();
        throw new Error('Export cancelled');
      }

      const elapsedMs = performance.now() - startWall;
      if (elapsedMs >= durationMs) {
        break;
      }

      const simTime = Math.min(duration - 0.001, elapsedMs / 1000);
      drawMotionReelFrame(ctx, templateId, config, simTime);
      videoTrack?.requestFrame?.();
      renderedCount++;

      const pct = Math.min(95, Math.round(15 + (elapsedMs / durationMs) * 80));
      if (renderedCount % 4 === 0) {
        onProgress?.(
          pct,
          `Recording ${simTime.toFixed(1)}s / ${duration.toFixed(1)}s @ ${fps}fps...`
        );
      }

      const nextFrameTargetMs = (renderedCount + 1) * frameIntervalMs;
      const waitMs = Math.max(4, Math.min(frameIntervalMs, nextFrameTargetMs - (performance.now() - startWall)));
      await new Promise((r) => setTimeout(r, waitMs));
    }

    // Hold final frame briefly so the last frame timestamp reaches `duration`
    drawMotionReelFrame(ctx, templateId, config, Math.max(0, duration - 0.001));
    videoTrack?.requestFrame?.();
    await new Promise((r) => setTimeout(r, Math.ceil(frameIntervalMs)));

    onProgress?.(97, 'Patching container duration header for CapCut & TikTok...');
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    const rawVideoBlob = await stopPromise;
    const patchedVideoBlob = await fixVideoBlobDuration(rawVideoBlob, duration);
    onProgress?.(100, 'Complete!');

    return {
      videoBlob: patchedVideoBlob,
      mimeType,
      extension,
      durationSec: duration,
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
