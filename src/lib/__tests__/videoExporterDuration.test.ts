import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fixMp4DurationBytes,
  fixWebmDurationBytes,
  fixVideoBlobDuration,
  pickSupportedVideoMimeType,
  computeSceneTransitionState,
  generateCues,
  synthesizeSfxFloat32Buffer,
  MAX_TRUE_PEAK_LINEAR,
  convertCarouselToMotionReel,
} from '../motion/index.ts';
import { CarouselData, DEFAULT_PALETTES } from '../../types.ts';

function makeMp4Box(type: string, payload: Uint8Array): Uint8Array {
  const size = 8 + payload.length;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, size, false);
  for (let i = 0; i < 4; i++) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(payload, 8);
  return out;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

/**
 * Builds a minimal ISO BMFF / fMP4 byte buffer simulating a MediaRecorder output where
 * initial header duration was truncated to 3.5s instead of the full 24s timeline.
 */
function buildTruncatedMp4Sample(initialDurationSec = 3.5): Uint8Array {
  const ftyp = makeMp4Box('ftyp', new Uint8Array([0x69, 0x73, 0x6f, 0x6d, 0, 0, 2, 0]));

  // mvhd v0: version(1)+flags(3) + ctime(4) + mtime(4) + timescale(4) + duration(4) + rest(80)
  const mvhdPayload = new Uint8Array(100);
  const mvhdView = new DataView(mvhdPayload.buffer);
  mvhdPayload[0] = 0; // version 0
  mvhdView.setUint32(12, 1000, false); // movie timescale = 1000
  mvhdView.setUint32(16, Math.round(initialDurationSec * 1000), false); // truncated 3500ms
  const mvhd = makeMp4Box('mvhd', mvhdPayload);

  // tkhd v0: version(1)+flags(3) + ctime(4) + mtime(4) + trackId(4) + res(4) + duration(4) + rest(60)
  const tkhdPayload = new Uint8Array(84);
  const tkhdView = new DataView(tkhdPayload.buffer);
  tkhdPayload[0] = 0; // version 0
  tkhdView.setUint32(20, Math.round(initialDurationSec * 1000), false); // truncated 3500ms
  const tkhd = makeMp4Box('tkhd', tkhdPayload);

  // mdhd v0: version(1)+flags(3) + ctime(4) + mtime(4) + timescale(4) + duration(4) + rest(4)
  const mdhdPayload = new Uint8Array(24);
  const mdhdView = new DataView(mdhdPayload.buffer);
  mdhdPayload[0] = 0; // version 0
  mdhdView.setUint32(12, 30000, false); // track media timescale = 30000
  mdhdView.setUint32(16, Math.round(initialDurationSec * 30000), false); // truncated 105000
  const mdhd = makeMp4Box('mdhd', mdhdPayload);

  // mehd v0 inside mvex: version(1)+flags(3) + fragment_duration(4)
  const mehdPayload = new Uint8Array(8);
  const mehdView = new DataView(mehdPayload.buffer);
  mehdPayload[0] = 0;
  mehdView.setUint32(4, Math.round(initialDurationSec * 1000), false);
  const mehd = makeMp4Box('mehd', mehdPayload);
  const mvex = makeMp4Box('mvex', mehd);

  const mdia = makeMp4Box('mdia', mdhd);
  const trak = makeMp4Box('trak', concatBytes(tkhd, mdia));
  const moov = makeMp4Box('moov', concatBytes(mvhd, trak, mvex));

  return concatBytes(ftyp, moov);
}

/**
 * Builds a minimal WebM EBML header + Segment + Info WITHOUT a Duration (0x4489) element,
 * matching what browser MediaRecorder emits on live stream recording.
 */
function buildWebmWithoutDuration(): Uint8Array {
  // EBML Header (ID: 1A 45 DF A3, Size: 0x84 = 4 bytes, payload: 42 86 81 01)
  const ebmlHeader = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x84, 0x42, 0x86, 0x81, 0x01]);

  // Segment -> Info (ID: 15 49 A9 66) containing only TimecodeScale (2A D7 B1, size 0x83, value 1_000_000 = 0x0F4240)
  const infoPayload = new Uint8Array([0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40]);
  const infoElement = concatBytes(
    new Uint8Array([0x15, 0x49, 0xa9, 0x66, 0x80 | infoPayload.length]),
    infoPayload
  );

  // Dummy Cluster (ID: 1F 43 B6 75, size 0x84, 4 dummy bytes)
  const clusterElement = new Uint8Array([0x1f, 0x43, 0xb6, 0x75, 0x84, 0xe7, 0x81, 0x00, 0x00]);

  // Segment with unknown size (01 FF FF FF FF FF FF FF)
  const segmentHeader = new Uint8Array([
    0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  ]);

  return concatBytes(ebmlHeader, segmentHeader, infoElement, clusterElement);
}

describe('Motion Reel Video Export Duration & MP4 Priority', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('patches truncated MP4 mvhd, tkhd, mdhd, and mehd duration atoms to exact 24.0s duration', () => {
    const rawMp4 = buildTruncatedMp4Sample(3.5);
    const patched = fixMp4DurationBytes(rawMp4, 24);
    const view = new DataView(patched.buffer, patched.byteOffset, patched.byteLength);

    // Locate mvhd, tkhd, mdhd, mehd and verify their patched durations
    const findFourCC = (fourcc: string): number => {
      for (let i = 0; i <= patched.length - 4; i++) {
        if (
          patched[i] === fourcc.charCodeAt(0) &&
          patched[i + 1] === fourcc.charCodeAt(1) &&
          patched[i + 2] === fourcc.charCodeAt(2) &&
          patched[i + 3] === fourcc.charCodeAt(3)
        ) {
          return i - 4; // box start
        }
      }
      return -1;
    };

    const mvhdStart = findFourCC('mvhd');
    expect(mvhdStart).toBeGreaterThanOrEqual(0);
    // mvhd v0 duration is at boxStart + 8 (header) + 16 = boxStart + 24
    expect(view.getUint32(mvhdStart + 24, false)).toBe(24_000);

    const tkhdStart = findFourCC('tkhd');
    expect(tkhdStart).toBeGreaterThanOrEqual(0);
    // tkhd v0 duration is at boxStart + 8 (header) + 20 = boxStart + 28
    expect(view.getUint32(tkhdStart + 28, false)).toBe(24_000);

    const mdhdStart = findFourCC('mdhd');
    expect(mdhdStart).toBeGreaterThanOrEqual(0);
    // mdhd v0 duration is at boxStart + 8 (header) + 16 = boxStart + 24 (timescale 30000 * 24 = 720000)
    expect(view.getUint32(mdhdStart + 24, false)).toBe(720_000);

    const mehdStart = findFourCC('mehd');
    expect(mehdStart).toBeGreaterThanOrEqual(0);
    // mehd v0 fragment_duration is at boxStart + 8 (header) + 4 = boxStart + 12
    expect(view.getUint32(mehdStart + 12, false)).toBe(24_000);
  });

  it('injects and patches EBML Segment -> Info -> Duration (0x4489) in WebM streams for 24.0s (24000ms)', () => {
    const rawWebm = buildWebmWithoutDuration();
    const patched = fixWebmDurationBytes(rawWebm, 24);

    // Search for Duration element ID 0x44, 0x89, size 0x88
    let foundDurationMs = -1;
    for (let i = 0; i <= patched.length - 11; i++) {
      if (patched[i] === 0x44 && patched[i + 1] === 0x89 && patched[i + 2] === 0x88) {
        const dv = new DataView(patched.buffer, patched.byteOffset + i + 3, 8);
        foundDurationMs = dv.getFloat64(0, false);
        break;
      }
    }

    expect(foundDurationMs).toBe(24_000);

    // Re-patching an already patched WebM should update Duration in-place without growing file size
    const repatched = fixWebmDurationBytes(patched, 32);
    expect(repatched.length).toBe(patched.length);
    let updatedDurationMs = -1;
    for (let i = 0; i <= repatched.length - 11; i++) {
      if (repatched[i] === 0x44 && repatched[i + 1] === 0x89 && repatched[i + 2] === 0x88) {
        const dv = new DataView(repatched.buffer, repatched.byteOffset + i + 3, 8);
        updatedDurationMs = dv.getFloat64(0, false);
        break;
      }
    }
    expect(updatedDurationMs).toBe(32_000);
  });

  it('patches Blob duration end-to-end via fixVideoBlobDuration()', async () => {
    const mp4Bytes = buildTruncatedMp4Sample(3.2);
    const mp4Buffer = new ArrayBuffer(mp4Bytes.byteLength);
    new Uint8Array(mp4Buffer).set(mp4Bytes);
    const mp4Blob = new Blob([mp4Buffer], { type: 'video/mp4' });
    const fixedBlob = await fixVideoBlobDuration(mp4Blob, 24);
    expect(fixedBlob.type).toBe('video/mp4');
    expect(fixedBlob.size).toBe(mp4Bytes.byteLength);
  });

  it('prioritizes standard .mp4 MIME types over .webm in pickSupportedVideoMimeType()', () => {
    const originalMediaRecorder = globalThis.MediaRecorder;
    try {
      globalThis.MediaRecorder = {
        isTypeSupported: vi.fn((mime: string) => mime.startsWith('video/mp4') || mime.startsWith('video/webm')),
      } as unknown as typeof MediaRecorder;

      const picked = pickSupportedVideoMimeType();
      expect(picked.extension).toBe('mp4');
      expect(picked.mimeType).toContain('video/mp4');
    } finally {
      globalThis.MediaRecorder = originalMediaRecorder;
    }
  });

  it('enforces sequential non-overlapping scene transitions (0.2s exit, 0.3s entry, never 2 slides at once)', () => {
    const scenes = [
      { id: 's1', label: 'S1', text: 'Slide 1', from: 0, to: 4.5, springK: 200, springD: 18, transition: 'auto' as const },
      { id: 's2', label: 'S2', text: 'Slide 2', from: 4.5, to: 9.0, springK: 200, springD: 18, transition: 'depth' as const },
      { id: 's3', label: 'S3', text: 'Slide 3', from: 9.0, to: 13.5, springK: 200, springD: 18, transition: 'kinetic-wipe' as const },
    ];

    // Sample across the entire 13.5s timeline at 30fps
    for (let frame = 0; frame < 13.5 * 30; frame++) {
      const t = frame / 30;
      const state = computeSceneTransitionState(scenes, t);
      expect(state.layers).toHaveLength(1);
    }

    // Just before cut at 4.4s (within 0.2s exit window of s1): only s1 is visible, exiting
    const exitState = computeSceneTransitionState(scenes, 4.4);
    expect(exitState.layers).toHaveLength(1);
    expect(exitState.layers[0].index).toBe(0);
    expect(exitState.layers[0].alpha).toBeLessThan(1);

    // Just after cut at 4.6s (within 0.3s entry window of s2): only s2 is visible, entering
    const entryState = computeSceneTransitionState(scenes, 4.6);
    expect(entryState.layers).toHaveLength(1);
    expect(entryState.layers[0].index).toBe(1);
    expect(entryState.layers[0].alpha).toBeGreaterThan(0);
  });

  it('places a short whoosh cue on every scene transition and keeps audio peak strictly under -1 dBTP', () => {
    const scenes = [
      { id: 's1', label: 'S1', text: 'Slide 1', from: 0, to: 4.5, springK: 200, springD: 18, transition: 'auto' as const },
      { id: 's2', label: 'S2', text: 'Slide 2', from: 4.5, to: 9.0, springK: 200, springD: 18, transition: 'auto' as const },
      { id: 's3', label: 'S3', text: 'Slide 3', from: 9.0, to: 13.5, springK: 200, springD: 18, transition: 'auto' as const },
    ];
    const cues = generateCues(scenes);
    const whooshes = cues.filter((c) => c.type === 'whoosh');
    // Every scene boundary (s2 at 4.5s, s3 at 9.0s) has a transition whoosh
    expect(whooshes.length).toBeGreaterThanOrEqual(2);

    const { samples } = synthesizeSfxFloat32Buffer(cues, 13.5);
    let maxPeak = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > maxPeak) maxPeak = abs;
    }
    // -1.0 dBTP = 10^(-1/20) = 0.89125; MAX_TRUE_PEAK_LINEAR = 0.85 (-1.41 dBTP)
    expect(maxPeak).toBeLessThanOrEqual(MAX_TRUE_PEAK_LINEAR + 1e-5);
    expect(maxPeak).toBeLessThan(0.89125);
  });

  it('assigns 4.5s per slide and condenses long body text in convertCarouselToMotionReel()', () => {
    const sampleCarousel: CarouselData = {
      theme: 'cyber',
      category: 'AI Security & Governance',
      postFormat: 'carousel',
      caption: 'Caption',
      slides: [
        {
          type: 'hub',
          enTitle: 'IS YOUR APPROVED AI ACTUALLY SAFE?',
          arTitle: 'هل الذكاء الاصطناعي المعتمد آمن؟',
          enBody:
            'Enterprise teams often assume an approved AI vendor means complete data governance, but shadow integrations and over-permissioned tokens create massive blind spots.',
          arBody:
            'تفترض الفرق المؤسسية غالباً أن اعتماد مزود الذكاء الاصطناعي يعني حوكمة كاملة للبيانات، لكن التكاملات الخفية والصلاحيات الواسعة تخلق ثغرات خطيرة للغاية.',
        },
        {
          type: 'row',
          enTitle: 'THE CATCH: APPROVAL IS NOT CONTROL.',
          arTitle: 'المشكلة: الاعتماد ليس تحكماً.',
          enBody: 'Short body line.',
          arBody: 'نص قصير وواضح.',
        },
        {
          type: 'cta',
          enTitle: 'AUDIT YOUR AI STACK TODAY',
          arTitle: 'افحص بنيتك الذكية اليوم',
          enBody: 'Visit marrok.org for full governance guides.',
          arBody: 'زر marrok.org لدليل الحوكمة الشامل.',
        },
      ],
    };

    const reel = convertCarouselToMotionReel(sampleCarousel, DEFAULT_PALETTES.cyber, 'marrok-slides');
    expect(reel.scenes).toHaveLength(3);
    expect(reel.duration).toBe(13.5);
    expect(reel.scenes[0].to - reel.scenes[0].from).toBe(4.5);
    expect((reel.scenes[0].enBody || '').length).toBeLessThanOrEqual(110);
    expect((reel.scenes[0].arBody || '').length).toBeLessThanOrEqual(115);
  });
});

