import {
  MotionBrandConfig,
  MotionSceneConfig,
  MotionTemplateConfig,
  MotionTemplateMeta,
  MotionCueItem,
} from '../../types.ts';
import { MARROK_CHROME_SCRIPT } from './marrokSlideChrome.ts';

export const MOTION_W = 1080;
export const MOTION_H = 1920;

export const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));

/**
 * Damped harmonic spring oscillator ported 1:1 from abdomarrok/motion-reel
 */
export function spring(t: number, k = 170, d = 26): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

/**
 * Deterministic Mulberry32 PRNG ported 1:1 from abdomarrok/motion-reel
 */
export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp(t), 3);
}

export function easeInOutCubic(t: number): number {
  const c = clamp(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export const CORE_UTILS = `
const W = 1080, H = 1920;
const g = document.getElementById('c').getContext('2d');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

function spring(t, k = 170, d = 26) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k), z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function easeOutCubic(t) { return 1 - Math.pow(1 - clamp(t), 3); }
function easeInOutCubic(t) { t = clamp(t); return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2; }
`;

export const DEFAULT_BRAND: MotionBrandConfig = {
  name: 'MARROK',
  accentColor: '#6EA0FF',
  bgColor: '#080A12',
  textColor: '#FFFFFF',
  font: 'Cairo',
  direction: 'rtl',
};

export const FONT_OPTIONS = [
  'Cairo',
  'Outfit',
  'Plus Jakarta Sans',
  'IBM Plex Sans Arabic',
  'Noto Sans Arabic',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Source Serif 4',
];

const STORAGE_KEY = 'motion-reel-brand';

export function loadBrand(): MotionBrandConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_BRAND };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_BRAND, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load brand from localStorage', e);
  }
  return { ...DEFAULT_BRAND };
}

export function saveBrand(brand: MotionBrandConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brand));
  } catch (e) {
    console.error('Failed to save brand to localStorage', e);
  }
}

export function wrapHTML(config: MotionTemplateConfig, scenesCode: string, extraSetup = ''): string {
  const font = config.brand?.font || 'Cairo';
  const bg = config.brand?.bgColor || '#080A12';
  const dir = config.brand?.direction || 'rtl';

  return `<!doctype html>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@500;700;800&family=Cairo:wght@600;700;800&family=JetBrains+Mono:wght@600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: ${bg};
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
<canvas id="c" width="1080" height="1920"></canvas>
<script>
${CORE_UTILS}
${MARROK_CHROME_SCRIPT}
const DUR = ${config.duration || 20};
g.direction = '${dir}';
g.textBaseline = 'alphabetic';
const CONFIG = ${JSON.stringify(config)};
${extraSetup}
${scenesCode}
function draw(t) {
  drawMarrokChrome(g, CONFIG, t);
  let activeIdx = 0;
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    if (t >= s.from && t < s.to) {
      activeIdx = i;
      s.draw(t - s.from);
    }
  }
  drawMarrokFooter(g, CONFIG, t, activeIdx, SCENES.length);
}
window.seek = (t) => { draw(t); return true; };
if (!navigator.webdriver) {
  const t0 = performance.now();
  (function loop() { draw(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); })();
}
</script>`;
}

export function generateCues(scenes: MotionSceneConfig[]): MotionCueItem[] {
  const cues: MotionCueItem[] = [];
  for (const scene of scenes) {
    cues.push({ t: scene.from + 0.1, type: 'click', amp: 0.14 });
    if (scene.to - scene.from >= 2.5) {
      cues.push({ t: scene.from + 0.5, type: 'whoosh', amp: 0.12 });
    }
  }
  return cues;
}

export interface MotionTemplateDefinition {
  meta: MotionTemplateMeta;
  defaultConfig: (brand?: Partial<MotionBrandConfig>) => MotionTemplateConfig;
  toHTML: (config: MotionTemplateConfig) => string;
  drawFrame: (ctx: CanvasRenderingContext2D, config: MotionTemplateConfig, t: number) => void;
}
