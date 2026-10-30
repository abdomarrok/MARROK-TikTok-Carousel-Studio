import { MotionCueItem, MotionSfxType } from '../../types.ts';

export const SFX_SAMPLE_RATE = 48000;
/**
 * Strict -1 dBTP true-peak safety ceiling (10^(-1.4 / 20) ≈ 0.851, strictly below -1.0 dBTP = 0.89125)
 * to prevent inter-sample clipping after AAC/Opus encoding or D/A reconstruction.
 */
export const MAX_TRUE_PEAK_LINEAR = 0.85;

/**
 * Studio-grade 48kHz procedural acoustic Foley synthesizer with 2-pole State-Variable
 * Low-Pass / Band-Pass filtering and soft-saturation headroom limiting.
 *
 * Voices:
 * - thump:  0.26s warm sub-bass transition pulse (108->40Hz sine+triangle, 180Hz LPF)
 * - whoosh: 0.30s warm resonant band-pass air sweep (220->860->280Hz BPF, zero white-noise hiss)
 * - pop:    0.08s tactile matte UI card lock (440->165Hz damped impulse, 880Hz LPF)
 * - click:  0.025s micro mechanical relay tick (920Hz damped impulse, 1150Hz LPF)
 * - chime:  0.38s warm harmonic fifth glass accent (528Hz + 792Hz, 1400Hz LPF)
 */
export function synthesizeSfxFloat32Buffer(
  cues: MotionCueItem[],
  durationSec = 20
): { samples: Float32Array; sampleRate: number } {
  const maxCueTime = cues.length > 0 ? Math.max(...cues.map((c) => c.t)) : 0;
  const totalSec = Math.max(durationSec, Math.ceil(maxCueTime + 1.5));
  const buf = new Float32Array(Math.ceil(totalSec * SFX_SAMPLE_RATE));

  let s = 42;
  const noise = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  };

  const renderFilteredVoice = (type: MotionSfxType): Float32Array => {
    const durationMap: Record<MotionSfxType, number> = {
      click: 0.028,
      pop: 0.085,
      thump: 0.26,
      whoosh: 0.30,
      chime: 0.38,
    };
    const lenSec = durationMap[type] || 0.08;
    const count = Math.floor(lenSec * SFX_SAMPLE_RATE);
    const out = new Float32Array(count);

    // 2-pole State Variable Filter state
    let low = 0;
    let band = 0;

    for (let i = 0; i < count; i++) {
      const t = i / SFX_SAMPLE_RATE;
      const progress = i / Math.max(1, count - 1);
      let raw = 0;
      let cutoffHz = 900;
      let q = 0.75;
      let useBandpass = false;

      if (type === 'thump') {
        // Warm sub-bass drop with fast pitch envelope (108Hz -> 40Hz)
        const phase = 2 * Math.PI * (40 * t + (68 / 14) * (1 - Math.exp(-14 * t)));
        const env = Math.sin(Math.min(1, t / 0.008) * (Math.PI / 2)) * Math.exp(-t * 13.5);
        raw = (Math.sin(phase) * 0.8 + Math.sin(phase * 0.5) * 0.35) * env * 0.75;
        cutoffHz = 185;
        q = 0.85;
      } else if (type === 'whoosh') {
        // Warm band-pass air sweep (no harsh static)
        const env = Math.pow(Math.sin(Math.PI * progress), 1.6);
        raw = noise() * env * 0.55;
        cutoffHz = 220 + 640 * Math.sin(Math.PI * progress);
        q = 1.9;
        useBandpass = true;
      } else if (type === 'pop') {
        // Tactile matte UI card snap (440Hz -> 165Hz pitch drop)
        const phase = 2 * Math.PI * (165 * t + (275 / 38) * (1 - Math.exp(-38 * t)));
        const env = Math.sin(Math.min(1, t / 0.003) * (Math.PI / 2)) * Math.exp(-t * 46);
        raw = Math.sin(phase) * env * 0.55;
        cutoffHz = 880;
        q = 0.9;
      } else if (type === 'chime') {
        // Warm harmonic glass fifth (528Hz fundamental + 792Hz fifth)
        const attack = Math.min(1, t / 0.006);
        const env = attack * Math.exp(-t * 9.5);
        const f1 = Math.sin(2 * Math.PI * 528 * t);
        const f2 = Math.sin(2 * Math.PI * 792 * t) * Math.exp(-t * 14);
        raw = (f1 * 0.65 + f2 * 0.35) * env * 0.45;
        cutoffHz = 1400;
        q = 0.7;
      } else {
        // 'click': Micro mechanical relay tick (band-limited, soft impulse)
        const phase = 2 * Math.PI * (920 - 320 * progress) * t;
        const env = Math.exp(-t * 155);
        raw = (Math.sin(phase) * 0.7 + noise() * 0.18 * Math.exp(-t * 260)) * env * 0.42;
        cutoffHz = 1150;
        q = 0.8;
      }

      // Chamberlin 2-pole SVF step
      const f = Math.min(0.45, 2 * Math.sin((Math.PI * cutoffHz) / SFX_SAMPLE_RATE));
      const damp = 1 / Math.max(0.5, q);
      low = low + f * band;
      const high = raw - low - damp * band;
      band = f * high + band;

      out[i] = useBandpass ? band : low;
    }

    return out;
  };

  for (const c of cues) {
    const voiceSamples = renderFilteredVoice(c.type || 'pop');
    // Balanced studio headroom (prevents harsh clipping)
    const gain = c.amp !== undefined ? Math.min(0.85, Math.max(0.015, c.amp * 2.2)) : 0.25;
    const start = Math.max(0, Math.floor(c.t * SFX_SAMPLE_RATE));

    for (let i = 0; i < voiceSamples.length && start + i < buf.length; i++) {
      buf[start + i] += voiceSamples[i] * gain;
    }
  }

  // Soft-knee saturation limiter across master bus so overlapping cues stay warm and strictly < -1 dBTP
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) {
      const saturated = Math.tanh(buf[i] * 1.05) * MAX_TRUE_PEAK_LINEAR;
      buf[i] = Math.max(-MAX_TRUE_PEAK_LINEAR, Math.min(MAX_TRUE_PEAK_LINEAR, saturated));
    }
  }

  return { samples: buf, sampleRate: SFX_SAMPLE_RATE };
}

/**
 * Encodes Float32Array samples into a 16-bit mono WAV Blob
 */
export function encodeWavBlob(samples: Float32Array, sampleRate = SFX_SAMPLE_RATE): Blob {
  const n = samples.length;
  const arrayBuffer = new ArrayBuffer(44 + n * 2);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + n * 2, true);
  writeStr(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, n * 2, true);

  for (let i = 0; i < n; i++) {
    const safeSample = Math.max(-MAX_TRUE_PEAK_LINEAR, Math.min(MAX_TRUE_PEAK_LINEAR, samples[i]));
    const clamped = Math.round(safeSample * 32767);
    view.setInt16(44 + i * 2, clamped, true);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx({ sampleRate: SFX_SAMPLE_RATE });
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Plays a single warm filtered procedural SFX cue immediately via Web Audio API
 */
export function playProceduralSfxCue(type: MotionSfxType, amp = 0.14): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const { samples, sampleRate } = synthesizeSfxFloat32Buffer([{ t: 0, type, amp }], 0.5);
    const audioBuffer = ctx.createBuffer(1, samples.length, sampleRate);
    audioBuffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
  } catch {
    // Ignore browser autoplay restrictions when un-interacted
  }
}
