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

interface QueueableEncoder {
  readonly encodeQueueSize: number;
  readonly state: string;
  addEventListener?: (type: string, listener: () => void, options?: { once?: boolean }) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

/**
 * Enforces strict hardware encoder backpressure so that `VideoFrame` / `AudioData` buffers
 * never accumulate unboundedly in GPU or renderer IPC memory on mobile devices.
 */
async function waitForEncoderCapacity(
  encoder: QueueableEncoder,
  maxQueueSize: number,
  signal?: AbortSignal,
  getError?: () => Error | null
): Promise<void> {
  while (encoder.state === 'configured' && encoder.encodeQueueSize > maxQueueSize) {
    if (signal?.aborted) {
      throw new Error('Export cancelled');
    }
    const err = getError?.();
    if (err) {
      throw err;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        encoder.removeEventListener?.('dequeue', done);
        resolve();
      };
      const timer = setTimeout(done, 10);
      if (typeof encoder.addEventListener === 'function') {
        encoder.addEventListener('dequeue', done, { once: true });
      }
    });
  }
}

/**
 * Frame-accurate deterministic MP4 encoder using WebCodecs (`VideoEncoder` + `AudioEncoder`)
 * and `mp4-muxer` with `fastStart: 'in-memory'`.
 *
 * Guarantees that every frame `0 .. totalFrames - 1` has an exact microsecond presentation
 * timestamp, enforces strict hardware queue backpressure (`maxQueueSize <= 2`) so mobile
 * renderers never OOM at high percentages, and writes exact `moov` duration headers in-place.
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

  const bitrateCandidates = [10_000_000, 8_000_000];
  let targetBitrate = 10_000_000;

  // 1. Probe supported H.264 / AVC profile for 1080x1920 @ fps (8 to 12 Mbps target)
  const avcCandidates = ['avc1.640028', 'avc1.4d002a', 'avc1.42001f', 'avc1.42E01E'];
  let selectedVideoCodec: string | null = null;
  for (const candidateBitrate of bitrateCandidates) {
    for (const codec of avcCandidates) {
      try {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width: MOTION_W,
          height: MOTION_H,
          bitrate: candidateBitrate,
          framerate: fps,
        });
        if (support.supported) {
          selectedVideoCodec = codec;
          targetBitrate = candidateBitrate;
          break;
        }
      } catch {
        // continue
      }
    }
    if (selectedVideoCodec) break;
  }

  if (!selectedVideoCodec) {
    return null;
  }

  // 2. Probe audio encoder if procedural SFX is enabled (192 kbps AAC preferred)
  let selectedAudioCodec: { webCodecsCodec: string; muxerCodec: 'aac' | 'opus'; bitrate: number } | null = null;
  if (includeSfx) {
    if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
      return null;
    }
    const audioCandidates: Array<{ webCodecsCodec: string; muxerCodec: 'aac' | 'opus'; bitrate: number }> = [
      { webCodecsCodec: 'mp4a.40.2', muxerCodec: 'aac', bitrate: 192_000 },
      { webCodecsCodec: 'mp4a.40.2', muxerCodec: 'aac', bitrate: 128_000 },
      { webCodecsCodec: 'opus', muxerCodec: 'opus', bitrate: 192_000 },
    ];
    for (const candidate of audioCandidates) {
      try {
        const support = await AudioEncoder.isConfigSupported({
          codec: candidate.webCodecsCodec,
          sampleRate,
          numberOfChannels: 1,
          bitrate: candidate.bitrate,
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

  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
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
  const getEncoderError = () => encoderError;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      try {
        muxer.addVideoChunk(chunk, meta);
      } catch (err) {
        encoderError = err instanceof Error ? err : new Error(String(err));
      }
    },
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });

  videoEncoder.configure({
    codec: selectedVideoCodec,
    width: MOTION_W,
    height: MOTION_H,
    bitrate: targetBitrate,
    framerate: fps,
  });

  let audioEncoder: AudioEncoder | null = null;
  if (selectedAudioCodec) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        try {
          muxer.addAudioChunk(chunk, meta);
        } catch (err) {
          encoderError = err instanceof Error ? err : new Error(String(err));
        }
      },
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });
    audioEncoder.configure({
      codec: selectedAudioCodec.webCodecsCodec,
      sampleRate,
      numberOfChannels: 1,
      bitrate: selectedAudioCodec.bitrate,
    });
  }

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDurationUs = Math.round(1_000_000 / fps);

  try {
    // 3. Encode exact frame sequence 0 .. totalFrames - 1 at fixed 30fps with strict hardware backpressure
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) {
        throw new Error('Export cancelled');
      }
      if (encoderError) {
        throw encoderError;
      }

      // Wait until hardware encoder queue has at most 2 frames in flight BEFORE allocating a new 1080x1920 VideoFrame
      await waitForEncoderCapacity(videoEncoder, 2, signal, getEncoderError);

      const simTime = Math.min(duration - 0.001, i / fps);
      drawMotionReelFrame(ctx, templateId, config, simTime);

      const timestampUs = Math.round((i / fps) * 1_000_000);
      const frame = new VideoFrame(canvas, {
        timestamp: timestampUs,
        duration: frameDurationUs,
      });

      const isKeyFrame = i % (fps * 2) === 0;
      try {
        videoEncoder.encode(frame, { keyFrame: isKeyFrame });
      } finally {
        frame.close();
      }

      if (i % 3 === 0 || i === totalFrames - 1) {
        const pct = Math.min(88, Math.round(12 + ((i + 1) / totalFrames) * 76));
        onProgress?.(
          pct,
          `Encoding MP4 frame ${i + 1}/${totalFrames} (${simTime.toFixed(1)}s / ${duration.toFixed(1)}s)...`
        );
        await new Promise((r) => setTimeout(r, 0));
      } else if (videoEncoder.encodeQueueSize > 1) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onProgress?.(90, 'Flushing hardware H.264 video encoder...');
    await videoEncoder.flush();
    if (encoderError) {
      throw encoderError;
    }

    // 4. Encode exact duration of procedural 48kHz audio samples with backpressure
    if (audioEncoder && selectedAudioCodec) {
      onProgress?.(92, 'Multiplexing 48kHz procedural Foley audio track...');
      const exactTotalSamples = Math.round(duration * sampleRate);
      const chunkFrames = 4096;
      const chunkBuffer = new Float32Array(chunkFrames);
      let chunkIndex = 0;
      const totalAudioChunks = Math.max(1, Math.ceil(exactTotalSamples / chunkFrames));

      for (let offset = 0; offset < exactTotalSamples; offset += chunkFrames) {
        if (signal?.aborted) {
          throw new Error('Export cancelled');
        }
        if (encoderError) {
          throw encoderError;
        }

        await waitForEncoderCapacity(audioEncoder, 4, signal, getEncoderError);

        const count = Math.min(chunkFrames, exactTotalSamples - offset);
        const viewSlice = count === chunkFrames ? chunkBuffer : new Float32Array(count);
        for (let j = 0; j < count; j++) {
          const sampleIdx = offset + j;
          viewSlice[j] = sampleIdx < samples.length ? samples[sampleIdx] : 0;
        }

        const timestampUs = Math.round((offset / sampleRate) * 1_000_000);
        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: count,
          numberOfChannels: 1,
          timestamp: timestampUs,
          data: viewSlice,
        });
        try {
          audioEncoder.encode(audioData);
        } finally {
          audioData.close();
        }

        chunkIndex++;
        if (chunkIndex % 16 === 0) {
          const audioPct = Math.min(95, 92 + Math.round((chunkIndex / totalAudioChunks) * 3));
          onProgress?.(audioPct, 'Multiplexing 48kHz procedural Foley audio track...');
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      await audioEncoder.flush();
      if (encoderError) {
        throw encoderError;
      }
    }

    onProgress?.(97, 'Finalizing fast-start MP4 container header...');
    await new Promise((r) => setTimeout(r, 0));

    muxer.finalize();
    // Patch duration atoms in-place directly on target.buffer with zero extra ArrayBuffer copies
    const rawMp4Bytes = new Uint8Array(target.buffer);
    fixMp4DurationBytes(rawMp4Bytes, duration, true);
    return new Blob([target.buffer], { type: 'video/mp4' });
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

  try {
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
      videoBitsPerSecond: 10_000_000,
      audioBitsPerSecond: 192_000,
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

    recorder.start(1000);
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
        const waitMs = Math.max(
          4,
          Math.min(frameIntervalMs, nextFrameTargetMs - (performance.now() - startWall))
        );
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
      chunks.length = 0;
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
      canvasStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
    }
  } finally {
    // Release the 1080x1920 offscreen GPU canvas backing store immediately
    canvas.width = 1;
    canvas.height = 1;
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
