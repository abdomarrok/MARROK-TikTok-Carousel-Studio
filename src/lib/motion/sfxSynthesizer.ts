import { MotionCueItem } from '../../types.ts';

export const SFX_SAMPLE_RATE = 48000;

type SfxVoiceType = 'click' | 'pop' | 'thump' | 'whoosh';

/**
 * Exact 48kHz procedural sound effect synthesizer ported 1:1 from abdomarrok/motion-reel/scripts/sfx.mjs
 * Voices:
 * - click:  0.05s 1800Hz sine decay
 * - pop:    0.15s 600->1500Hz sine pitch sweep
 * - thump:  0.50s 90->30Hz sub-bass drop
 * - whoosh: 0.35s LCG seeded noise envelope
 */
export function synthesizeSfxFloat32Buffer(
  cues: MotionCueItem[],
  durationSec = 20
): { samples: Float32Array; sampleRate: number } {
  const maxCueTime = cues.length > 0 ? Math.max(...cues.map((c) => c.t)) : 0;
  const totalSec = Math.max(durationSec, Math.ceil(maxCueTime + 2));
  const buf = new Float32Array(Math.ceil(totalSec * SFX_SAMPLE_RATE));

  let s = 42;
  const noise = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  };

  const VOICES: Record<SfxVoiceType, [number, (t: number) => number]> = {
    click: [0.05, (t) => Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 90) * 0.5],
    pop: [0.15, (t) => Math.sin(2 * Math.PI * (600 + 900 * t) * t) * Math.exp(-t * 30) * 0.4],
    thump: [0.5, (t) => Math.sin(2 * Math.PI * (90 - 60 * t) * t) * Math.exp(-t * 9) * 0.9],
    whoosh: [0.35, (t) => noise() * Math.sin(Math.PI * Math.min(1, t / 0.35)) * 0.25],
  };

  for (const c of cues) {
    const voice = VOICES[c.type] || VOICES.click;
    const [len, fn] = voice;
    const gain = c.amp !== undefined ? Math.min(2, Math.max(0.05, c.amp * 6)) : 1;
    const start = Math.max(0, Math.floor(c.t * SFX_SAMPLE_RATE));
    const maxSamples = Math.floor(len * SFX_SAMPLE_RATE);

    for (let i = 0; i < maxSamples && start + i < buf.length; i++) {
      buf[start + i] += fn(i / SFX_SAMPLE_RATE) * gain;
    }
  }

  return { samples: buf, sampleRate: SFX_SAMPLE_RATE };
}

/**
 * Encodes Float32Array samples into a 16-bit mono WAV Blob (matching scripts/sfx.mjs)
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
    const clamped = Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767);
    view.setInt16(44 + i * 2, clamped, true);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
 * Plays a single procedural SFX cue immediately via Web Audio API
 */
export function playProceduralSfxCue(type: SfxVoiceType, amp = 0.16): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const { samples, sampleRate } = synthesizeSfxFloat32Buffer([{ t: 0, type, amp }], 0.6);
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
