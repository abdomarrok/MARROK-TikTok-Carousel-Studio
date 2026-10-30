import { describe, it, expect, vi } from 'vitest';
import {
  spring,
  rng,
  generateCues,
  getMotionTemplate,
  drawMotionReelFrame,
  synthesizeSfxFloat32Buffer,
  encodeWavBlob,
  convertCarouselToMotionReel,
  resolveSmartTransition,
  computeSceneTransitionState,
  SFX_SAMPLE_RATE,
  MOTION_TEMPLATE_LIST,
} from '../lib/motion/index.ts';
import { synthesizeCarousel } from '../lib/synthesizer.ts';
import { DEFAULT_PALETTES } from '../types.ts';

describe('Motion Reel Integration (MARROK Slide Deck, Smart Transitions & Warm Foley)', () => {
  it('computes damped harmonic spring physics and deterministic PRNG accurately', () => {
    expect(spring(0)).toBe(0);
    expect(spring(-0.5)).toBe(0);
    const mid = spring(0.2, 220, 22);
    expect(mid).toBeGreaterThan(0.5);
    const settled = spring(2.5, 220, 22);
    expect(settled).toBeCloseTo(1, 2);

    const r1 = rng(42);
    const r2 = rng(42);
    expect(r1()).toBe(r2());
    expect(r1()).toBe(r2());
  });

  it('supports all 4 motion templates (marrok-slides, kinetic-text, brand-intro, product-showcase) with MARROK vector logo and slide chrome', () => {
    expect(MOTION_TEMPLATE_LIST.length).toBe(4);
    const templateIds = [
      'marrok-slides',
      'kinetic-text',
      'brand-intro',
      'product-showcase',
    ] as const;

    for (const id of templateIds) {
      const tpl = getMotionTemplate(id);
      expect(tpl.meta.id).toBe(id);

      const cfg = tpl.defaultConfig({ name: 'MARROK', accentColor: '#6EA0FF' });
      expect(cfg.scenes.length).toBeGreaterThanOrEqual(4);
      expect(cfg.duration).toBeGreaterThanOrEqual(12);

      const html = tpl.toHTML(cfg);
      expect(html).toContain('<canvas id="c" width="1080" height="1920"></canvas>');
      expect(html).toContain('drawMarrokVectorBadge');
      expect(html).toContain('drawMarrokChrome');
      expect(html).toContain('window.seek = (t) =>');
    }
  });

  it('routes archetype-aware smart transitions and computes overlapping scene layers smoothly', () => {
    const cfg = getMotionTemplate('marrok-slides').defaultConfig();
    const scenes = cfg.scenes;

    // 1. Verify smart archetype transition resolution
    // Scene 0 (hub) -> Scene 1 (row) => 'depth'
    expect(resolveSmartTransition(scenes[0], scenes[1], 'auto', 1)).toBe('depth');
    // Scene 1 (row) -> Scene 2 (code) => 'kinetic-wipe'
    expect(resolveSmartTransition(scenes[1], scenes[2], 'auto', 2)).toBe('kinetic-wipe');
    // Scene 2 (code) -> Scene 3 (metric) => 'morph'
    expect(resolveSmartTransition(scenes[2], scenes[3], 'auto', 3)).toBe('morph');
    // Scene 3 (metric) -> Scene 4 (cta) => 'depth'
    expect(resolveSmartTransition(scenes[3], scenes[4], 'auto', 4)).toBe('depth');

    // 2. Steady-state mid-scene has 1 active layer
    const steady = computeSceneTransitionState(scenes, 1.5, 'auto', 'rtl');
    expect(steady.inTransition).toBe(false);
    expect(steady.layers.length).toBe(1);
    expect(steady.layers[0].role).toBe('active');

    // 3. Sequential exit (t = 4.4s before 4.5s boundary) and entry (t = 4.6s after 4.5s boundary) never overlap
    const outgoingExit = computeSceneTransitionState(scenes, 4.4, 'auto', 'rtl');
    expect(outgoingExit.inTransition).toBe(true);
    expect(outgoingExit.transitionMode).toBe('depth');
    expect(outgoingExit.layers.length).toBe(1);
    expect(outgoingExit.layers[0].role).toBe('outgoing');

    const incomingEntry = computeSceneTransitionState(scenes, 4.6, 'auto', 'rtl');
    expect(incomingEntry.inTransition).toBe(true);
    expect(incomingEntry.transitionMode).toBe('depth');
    expect(incomingEntry.layers.length).toBe(1);
    expect(incomingEntry.layers[0].role).toBe('incoming');
  });

  it('draws 1080x1920 frames including transition boundaries with MARROK slide header, vector logo, and bilingual copy without internal CAD noise', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn((txt: string) => ({ width: (txt || '').length * 14 })),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      setLineDash: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      roundRect: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: '',
      strokeStyle: '',
      shadowColor: '',
      shadowBlur: 0,
      globalAlpha: 1,
      lineWidth: 1,
      font: '',
      textAlign: 'center',
      direction: 'rtl',
      textBaseline: 'alphabetic',
    } as unknown as CanvasRenderingContext2D;

    const templateIds = [
      'marrok-slides',
      'kinetic-text',
      'brand-intro',
      'product-showcase',
    ] as const;
    for (const id of templateIds) {
      const cfg = getMotionTemplate(id).defaultConfig();
      for (const scene of cfg.scenes) {
        // Test mid-scene and transition boundary
        drawMotionReelFrame(mockCtx, id, cfg, scene.from + 0.5);
        drawMotionReelFrame(mockCtx, id, cfg, scene.to - 0.05);
      }
    }

    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalled();
    const drawnTexts = (mockCtx.fillText as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[0]
    );
    expect(drawnTexts).toContain('MARROK');
    expect(drawnTexts).toContain('@MARROK');
    expect(
      drawnTexts.some((t: string) => String(t).includes('SYS_REF // 1080x1920.CAD_SAFE'))
    ).toBe(false);
    expect(
      drawnTexts.some((t: string) => String(t).includes('MARROK_ARCH //'))
    ).toBe(false);
  });

  it('synthesizes warm filtered 48kHz Foley cues (thump, whoosh, pop, click, chime) across acoustic profiles without clipping', () => {
    const tpl = getMotionTemplate('marrok-slides');
    const cfg = tpl.defaultConfig();

    const warmCues = generateCues(cfg.scenes, 'warm-foley', 'auto');
    expect(warmCues.length).toBeGreaterThan(cfg.scenes.length);
    // Verify archetype-specific 'chime' and 'whoosh' are present in warm-foley
    expect(warmCues.some((c) => c.type === 'chime')).toBe(true);
    expect(warmCues.some((c) => c.type === 'whoosh')).toBe(true);

    const minimalCues = generateCues(cfg.scenes, 'minimal-sub', 'auto');
    expect(minimalCues.length).toBeGreaterThanOrEqual(cfg.scenes.length);
    expect(minimalCues.some((c) => c.type === 'whoosh')).toBe(true);

    const silentCues = generateCues(cfg.scenes, 'silent', 'auto');
    expect(silentCues.length).toBe(0);

    const { samples, sampleRate } = synthesizeSfxFloat32Buffer(
      [
        { t: 0.1, type: 'thump', amp: 0.14 },
        { t: 0.5, type: 'whoosh', amp: 0.12 },
        { t: 1.0, type: 'pop', amp: 0.12 },
        { t: 1.5, type: 'click', amp: 0.08 },
        { t: 2.0, type: 'chime', amp: 0.12 },
      ],
      3
    );

    expect(sampleRate).toBe(SFX_SAMPLE_RATE);
    expect(samples.length).toBeGreaterThanOrEqual(3 * SFX_SAMPLE_RATE);

    let nonZeroCount = 0;
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > 1e-5) nonZeroCount++;
      if (abs > peak) peak = abs;
    }
    expect(nonZeroCount).toBeGreaterThan(1000);
    // Verify soft-saturation headroom limiter keeps true peak strictly under -1 dBTP (<= 0.85)
    expect(peak).toBeLessThanOrEqual(0.851);

    const wavBlob = encodeWavBlob(samples, sampleRate);
    expect(wavBlob.type).toBe('audio/wav');
    expect(wavBlob.size).toBe(44 + samples.length * 2);
  });

  it('converts an 8-slide carousel into full MARROK Slide Deck Reel scenes with warm-foley and auto smart transitions', () => {
    const deck = synthesizeCarousel({
      prompt: 'Zero-Trust Mesh Architecture with mTLS and eBPF',
      postFormat: 'carousel',
    });
    const theme = DEFAULT_PALETTES.cyber;

    const slideDeckReel = convertCarouselToMotionReel(deck, theme);
    expect(slideDeckReel.templateId).toBe('marrok-slides');
    expect(slideDeckReel.sfxProfile).toBe('warm-foley');
    expect(slideDeckReel.defaultTransition).toBe('auto');
    expect(slideDeckReel.scenes.length).toBe(deck.slides.length);
    expect(slideDeckReel.scenes[0].enTitle).toBeTruthy();
    expect(slideDeckReel.scenes[0].arTitle).toBeTruthy();
    expect(slideDeckReel.scenes[0].slideType).toBe(deck.slides[0].type);

    const arReel = convertCarouselToMotionReel(deck, theme, 'kinetic-text', 'ar');
    expect(arReel.templateId).toBe('kinetic-text');
    expect(arReel.brand.direction).toBe('rtl');
    expect(arReel.brand.accentColor).toBe(theme.accent);
    expect(arReel.scenes.length).toBe(6);
    expect(arReel.scenes[2].text).toContain('|');

    const enShowcase = convertCarouselToMotionReel(deck, theme, 'product-showcase', 'en');
    expect(enShowcase.templateId).toBe('product-showcase');
    expect(enShowcase.brand.direction).toBe('ltr');
    expect(enShowcase.scenes.length).toBe(5);
  });
});
