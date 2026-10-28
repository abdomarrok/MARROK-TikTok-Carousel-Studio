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
  SFX_SAMPLE_RATE,
  MOTION_TEMPLATE_LIST,
} from '../lib/motion/index.ts';
import { synthesizeCarousel } from '../lib/synthesizer.ts';
import { DEFAULT_PALETTES } from '../types.ts';

describe('Motion Reel Integration (MARROK Slide Deck & Motion Templates)', () => {
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

  it('draws 1080x1920 frames with MARROK slide header, vector logo, CAD reticles, and bilingual copy across all scenes', () => {
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
        drawMotionReelFrame(mockCtx, id, cfg, scene.from + 0.5);
      }
    }

    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalled();
    // Verify MARROK CAD reticle stamp & wordmark were drawn
    const drawnTexts = (mockCtx.fillText as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[0]
    );
    expect(drawnTexts).toContain('MARROK');
    expect(
      drawnTexts.some((t: string) => String(t).includes('SYS_REF // 1080x1920.CAD_SAFE'))
    ).toBe(true);
  });

  it('synthesizes 48kHz procedural SFX cues (click, pop, thump, whoosh) and encodes 16-bit WAV', () => {
    const tpl = getMotionTemplate('marrok-slides');
    const cfg = tpl.defaultConfig();
    const cues = generateCues(cfg.scenes);
    expect(cues.length).toBeGreaterThanOrEqual(cfg.scenes.length);

    const { samples, sampleRate } = synthesizeSfxFloat32Buffer(
      [
        { t: 0.1, type: 'click', amp: 0.14 },
        { t: 0.5, type: 'pop', amp: 0.14 },
        { t: 1.0, type: 'thump', amp: 0.16 },
        { t: 1.5, type: 'whoosh', amp: 0.12 },
      ],
      3
    );

    expect(sampleRate).toBe(SFX_SAMPLE_RATE);
    expect(samples.length).toBeGreaterThanOrEqual(3 * SFX_SAMPLE_RATE);

    let nonZeroCount = 0;
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > 1e-5) nonZeroCount++;
    }
    expect(nonZeroCount).toBeGreaterThan(1000);

    const wavBlob = encodeWavBlob(samples, sampleRate);
    expect(wavBlob.type).toBe('audio/wav');
    expect(wavBlob.size).toBe(44 + samples.length * 2);
  });

  it('converts an 8-slide carousel into full MARROK Slide Deck Reel scenes as well as kinetic/showcase templates', () => {
    const deck = synthesizeCarousel({
      prompt: 'Zero-Trust Mesh Architecture with mTLS and eBPF',
      postFormat: 'carousel',
    });
    const theme = DEFAULT_PALETTES.cyber;

    // Default marrok-slides conversion maps all 8 slides with bilingual copy and archetypes
    const slideDeckReel = convertCarouselToMotionReel(deck, theme);
    expect(slideDeckReel.templateId).toBe('marrok-slides');
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
    expect(arReel.scenes[0].enTitle).toBeTruthy();
    expect(arReel.scenes[0].arTitle).toBeTruthy();

    const enShowcase = convertCarouselToMotionReel(deck, theme, 'product-showcase', 'en');
    expect(enShowcase.templateId).toBe('product-showcase');
    expect(enShowcase.brand.direction).toBe('ltr');
    expect(enShowcase.scenes.length).toBe(5);
  });
});
