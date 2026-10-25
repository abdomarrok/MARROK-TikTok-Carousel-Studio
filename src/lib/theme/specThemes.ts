import { ThemePalette } from '../../types';

// Helper to convert RGB tuple to hex
export function rgbHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

export function rgbaStr(r: number, g: number, b: number, a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

// Derive a full ThemePalette from spec theme definition
export function specTheme(
  id: string,
  name: string,
  accent: [number, number, number],
  bgTop: [number, number, number],
  _bgBottom: [number, number, number],
  glow: [number, number, number],
  grid: [number, number, number, number],
  _tag: string
): ThemePalette {
  const [ar, ag, ab] = accent;
  const [tr, tg, tb] = bgTop;
  // Surface is slightly lighter than bg top
  const sr = Math.min(255, tr + 12);
  const sg = Math.min(255, tg + 12);
  const sb = Math.min(255, tb + 12);
  return {
    id,
    name,
    baseBg: rgbHex(tr, tg, tb),
    radialGlow: rgbaStr(glow[0], glow[1], glow[2], 46),
    gridLine: rgbaStr(grid[0], grid[1], grid[2], grid[3]),
    surface: rgbHex(sr, sg, sb),
    surfaceBorder: rgbHex(Math.min(255, sr + 18), Math.min(255, sg + 18), Math.min(255, sb + 18)),
    accent: rgbHex(ar, ag, ab),
    alert: '#F43F5E',
    iconStroke: rgbHex(tr, tg, tb),
    textWhite: '#FFFFFF',
    textEnBody: '#C3C8D4',
    textArBody: '#AAB0BE',
    microLabel: '#E6E6F0',
    categoryTag: rgbHex(ar, ag, ab),
    textMuted: '#A0A0AF',
  };
}

export const SPEC_PALETTES: Record<string, ThemePalette> = {
  scion: specTheme('scion', 'Scion — AI + Engineering', [240, 150, 105], [16, 13, 14], [34, 22, 20], [210, 100, 60], [255, 200, 170, 10], 'AI + ENGINEERING'),
  backend: specTheme('backend', 'Backend Infrastructure', [255, 110, 170], [18, 8, 24], [36, 12, 44], [210, 60, 140], [255, 190, 230, 10], 'BACKEND'),
  pqc: specTheme('pqc', 'Post-Quantum Cryptography', [90, 215, 255], [5, 8, 22], [8, 18, 46], [40, 110, 230], [130, 190, 255, 12], 'POST-QUANTUM'),
  security_spec: specTheme('security_spec', 'Security + Hacking Awareness', [70, 240, 160], [4, 12, 12], [6, 24, 22], [20, 180, 120], [120, 255, 200, 10], 'AI + SECURITY'),
  node: specTheme('node', 'Node.js + Dev Topics', [190, 235, 90], [10, 11, 14], [18, 22, 14], [120, 190, 40], [200, 255, 120, 10], 'NODE.JS'),
  ajax: specTheme('ajax', 'Ajax — AI News', [255, 196, 70], [8, 10, 24], [14, 20, 46], [60, 100, 230], [150, 180, 255, 10], 'AI NEWS'),
  concat: specTheme('concat', 'Concat — Video + Creative', [255, 100, 100], [18, 10, 12], [38, 14, 18], [220, 60, 70], [255, 190, 190, 10], 'VIDEO EDITING'),
  estonia: specTheme('estonia', 'Estonia — Education + Policy', [255, 150, 110], [8, 16, 24], [12, 32, 42], [40, 150, 165], [180, 230, 235, 12], 'AI + EDUCATION'),
  artcraft: specTheme('artcraft', 'Artcraft — Open Source Design', [176, 140, 255], [10, 8, 22], [20, 12, 44], [110, 70, 230], [190, 170, 255, 12], 'OPEN SOURCE'),
  arch: specTheme('arch', 'Architecture + Leadership', [255, 190, 90], [8, 14, 30], [12, 26, 56], [60, 100, 220], [150, 190, 255, 14], 'ARCHITECTURE'),
  zerobreach: specTheme('zerobreach', 'ZeroBreach — Digital Security', [70, 230, 190], [6, 14, 18], [8, 28, 32], [30, 170, 150], [140, 255, 230, 10], 'DIGITAL SECURITY'),
};
