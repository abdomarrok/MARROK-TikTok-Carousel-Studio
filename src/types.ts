export type ThemeMode = 'security' | 'engineering' | 'cyber' | 'violet' | 'blueprint' | 'monochrome' | 'emerald' | 'custom';

// Dynamic category type accepting any detected or custom domain
export type CategoryType = string;

export type SlideType = 'hub' | 'row' | 'metric' | 'code' | 'compare' | 'image' | 'cta';

export interface IconLabelPair {
  icon: string;
  label: string;
}

export interface SlideData {
  type: SlideType;
  // Hub properties
  centerIcon?: string;
  satIcons?: string[];
  // Row properties
  icons?: IconLabelPair[];
  // Metric Card Archetype properties
  metricValue?: string;      // e.g. "200x", "0ms", "99.9%", "45GB"
  metricLabel?: string;      // e.g. "THROUGHPUT MULTIPLIER", "P99 LATENCY"
  metricDiff?: string;       // e.g. "▲ 12x vs legacy baseline", "▼ 85% memory overhead"
  metricIcon?: string;       // e.g. "zap", "gauge", "activity", "cpu"
  // Code / Terminal Window Archetype properties
  codeSnippet?: string;      // Multi-line code, bash, assembly or diff
  codeLanguage?: string;     // e.g. "bash", "rust", "python", "sql", "c"
  codeFileName?: string;     // e.g. "deploy.sh", "main.rs", "kernel.c"
  // Compare / Side-by-Side Archetype properties
  compareLeftTitle?: string;  // e.g. "Legacy Git"
  compareLeftBody?: string;   // e.g. "Full history clone\nBloated .git folder\nStalls at 100GB"
  compareRightTitle?: string; // e.g. "Scion / MARROK"
  compareRightBody?: string;  // e.g. "Lazy checkout\nVirtual file system\nInstant CI builds"
  // Image / Web Visual Archetype properties
  imageUrl?: string;          // Direct URL or data URL of external tech diagram, logo, or photo
  imageCaption?: string;      // Micro-badge label for the image
  imageFit?: 'contain' | 'cover'; // Fit mode on canvas (defaults to contain)
  imageFilter?: 'hud' | 'invert' | 'tint' | 'clean'; // Theme integration filter (hud = blueprint dark blend, invert = dark mode inversion, tint = accent wash, clean = original)
  // Titles & Body
  enTitle?: string;
  arTitle?: string;
  enBody?: string;
  arBody?: string;
  // CTA properties
  ctaText?: string;
  url?: string;
  enCredit?: string;
  arCredit?: string;
}

export interface HookVariant {
  tag: string; // e.g., "Curiosity", "Hard Metrics", "Problem / Contrast"
  enTitle: string;
  arTitle: string;
  enBody: string;
  arBody: string;
  centerIcon?: string;
}

export interface CaptionVariant {
  style: string; // e.g., "Bulletins & Metrics", "Narrative Breakdown"
  caption: string;
}

export interface CarouselData {
  theme: string;
  category: string;
  brand?: string;    // Brand wordmark / watermark (defaults to 'MARROK' or creator handle)
  brandUrl?: string; // Website URL or handle (defaults to 'marrok.org')
  caption: string;
  captionVariants?: CaptionVariant[];
  hookVariants?: HookVariant[];
  slides: SlideData[];
}

export interface ThemePalette {
  id: string;
  name: string;
  baseBg: string;         // Canvas background hex
  radialGlow: string;     // Radial ambient glow
  gridLine: string;       // Grid line stroke rgba
  surface: string;        // Elevated card surface hex
  surfaceBorder: string;  // Border stroke hex
  accent: string;         // Primary neon accent hex
  alert: string;          // Secondary / alert accent hex
  iconStroke: string;     // Dark stroke for icons inside colored badges
  textWhite: string;      // Bold headlines & titles
  textEnBody: string;     // English body text
  textArBody: string;     // Arabic body text
  microLabel: string;     // Micro card labels
  categoryTag: string;    // Category badge color
  textMuted: string;      // Footer and secondary metadata
}

export type ThemeConfig = ThemePalette;

export const DEFAULT_PALETTES: Record<string, ThemePalette> = {
  teal: {
    id: 'teal',
    name: 'Terminal Teal (MARROK Core)',
    baseBg: '#081216',
    radialGlow: 'rgba(55, 226, 192, 0.16)',
    gridLine: 'rgba(55, 226, 192, 0.045)',
    surface: '#0f1a1e',
    surfaceBorder: '#1c2e35',
    accent: '#37E2C0',
    alert: '#F43F5E',
    iconStroke: '#081216',
    textWhite: '#FFFFFF',
    textEnBody: '#CDD5D9',
    textArBody: '#9BA5AB',
    microLabel: '#DCE2E6',
    categoryTag: '#37E2C0',
    textMuted: '#8E989E',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Threat Crimson',
    baseBg: '#12080a',
    radialGlow: 'rgba(244, 63, 94, 0.18)',
    gridLine: 'rgba(244, 63, 94, 0.045)',
    surface: '#1c0f12',
    surfaceBorder: '#35191f',
    accent: '#F43F5E',
    alert: '#FB923C',
    iconStroke: '#12080a',
    textWhite: '#FFFFFF',
    textEnBody: '#E5D6D8',
    textArBody: '#B5A0A4',
    microLabel: '#FEE2E2',
    categoryTag: '#F43F5E',
    textMuted: '#9E888B',
  },
  violet: {
    id: 'violet',
    name: 'Electric AI Violet',
    baseBg: '#0d0917',
    radialGlow: 'rgba(168, 85, 247, 0.18)',
    gridLine: 'rgba(168, 85, 247, 0.045)',
    surface: '#171126',
    surfaceBorder: '#2e204d',
    accent: '#A855F7',
    alert: '#EC4899',
    iconStroke: '#0d0917',
    textWhite: '#FFFFFF',
    textEnBody: '#DDD6FE',
    textArBody: '#A78BFA',
    microLabel: '#EDE9FE',
    categoryTag: '#C084FC',
    textMuted: '#8B84A6',
  },
  blueprint: {
    id: 'blueprint',
    name: 'Enterprise Blueprint Blue',
    baseBg: '#080e18',
    radialGlow: 'rgba(56, 189, 248, 0.18)',
    gridLine: 'rgba(56, 189, 248, 0.045)',
    surface: '#0f1c2d',
    surfaceBorder: '#1e3857',
    accent: '#38BDF8',
    alert: '#F59E0B',
    iconStroke: '#080e18',
    textWhite: '#FFFFFF',
    textEnBody: '#BAE6FD',
    textArBody: '#7DD3FC',
    microLabel: '#E0F2FE',
    categoryTag: '#38BDF8',
    textMuted: '#7A91A6',
  },
  amber: {
    id: 'amber',
    name: 'Solarized Amber Engineering',
    baseBg: '#15100E',
    radialGlow: 'rgba(240, 154, 103, 0.16)',
    gridLine: 'rgba(240, 154, 103, 0.045)',
    surface: '#211814',
    surfaceBorder: '#3d2c25',
    accent: '#F09A67',
    alert: '#EF4444',
    iconStroke: '#15100E',
    textWhite: '#FFFFFF',
    textEnBody: '#E6DDD8',
    textArBody: '#AFA49E',
    microLabel: '#F5ECE6',
    categoryTag: '#F09A67',
    textMuted: '#8E989E',
  },
  monochrome: {
    id: 'monochrome',
    name: 'Obsidian Minimalist',
    baseBg: '#0a0a0c',
    radialGlow: 'rgba(255, 255, 255, 0.10)',
    gridLine: 'rgba(255, 255, 255, 0.035)',
    surface: '#141418',
    surfaceBorder: '#272730',
    accent: '#E4E4E7',
    alert: '#F43F5E',
    iconStroke: '#0a0a0c',
    textWhite: '#FFFFFF',
    textEnBody: '#D4D4D8',
    textArBody: '#A1A1AA',
    microLabel: '#F4F4F5',
    categoryTag: '#E4E4E7',
    textMuted: '#71717A',
  },
  emerald: {
    id: 'emerald',
    name: 'Matrix Low-Level Emerald',
    baseBg: '#06120b',
    radialGlow: 'rgba(160, 235, 180, 0.18)',
    gridLine: 'rgba(16, 185, 129, 0.045)',
    surface: '#0d2215',
    surfaceBorder: '#19442a',
    accent: '#10B981',
    alert: '#EAB308',
    iconStroke: '#06120b',
    textWhite: '#FFFFFF',
    textEnBody: '#A7F3D0',
    textArBody: '#6EE7B7',
    microLabel: '#D1FAE5',
    categoryTag: '#34D399',
    textMuted: '#688F77',
  },
};

// Also map legacy aliases directly in DEFAULT_PALETTES
DEFAULT_PALETTES['security'] = DEFAULT_PALETTES.teal;
DEFAULT_PALETTES['engineering'] = DEFAULT_PALETTES.amber;

// Backward-compatible alias for existing imports
export const THEME_CONFIGS: Record<string, ThemePalette> = DEFAULT_PALETTES;

