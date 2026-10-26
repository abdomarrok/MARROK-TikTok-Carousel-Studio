export type ThemeMode = 'security' | 'engineering' | 'cyber' | 'violet' | 'blueprint' | 'monochrome' | 'emerald' | 'custom';

// Dynamic category type accepting any detected or custom domain
export type CategoryType = string;

export type SlideType = 'hub' | 'row' | 'number' | 'metric' | 'code' | 'compare' | 'image' | 'cta';

export interface IconLabelPair {
  icon: string;
  label: string;
}

export interface DiagramNode {
  label: string;
  sublabel?: string;
  status?: string;
  icon?: string;
}

export type DiagramVariant = 'topology' | 'stack' | 'isolation' | 'takeaway';

export interface SlideData {
  type: SlideType;
  // Hub properties
  centerIcon?: string;
  satIcons?: string[];
  satLabels?: string[]; // Technical labels for the 6 satellite nodes around the hub
  // Dynamic Labeled Technical Diagram properties (replaces static icon boxes)
  diagramVariant?: DiagramVariant;
  diagramNodes?: DiagramNode[]; // The 3 nodes, layers, or cells illustrating this specific slide
  diagramEdges?: string[];     // Protocol/action/dataflow labels on the connectors between nodes
  diagramFooter?: string;      // Bottom telemetry or summary spec line inside the diagram
  // Row properties
  icons?: IconLabelPair[];
  // Number Archetype properties (Spec §7 & §9.4: Big accent number step counter e.g. "01", "02")
  stepNumber?: string;       // e.g. "01", "02", "03"
  stepLabel?: string;        // e.g. "STEP 01", "PHASE 02", "KEY POINT"
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
  imagePrompt?: string;       // Prompt used to generate or edit with gemini-nano-banana-2.1
  imageModel?: string;        // Model used (e.g. gemini-nano-banana-2.1)
  // Titles & Body
  enTitle?: string;
  arTitle?: string;
  enBody?: string;
  arBody?: string;
  ctaText?: string;
  url?: string;
  enCredit?: string;
  arCredit?: string;
  // Direct Graphical Control Overrides (Spec §21)
  layoutOverrides?: Partial<Record<GraphicalElementId, ElementLayoutOverride>>;
}

export type GraphicalElementId =
  | 'headerBadge'
  | 'graphicCard'
  | 'titleBlock'
  | 'arabicTitleBlock'
  | 'bodyBlock'
  | 'arabicBodyBlock'
  | 'ctaButton'
  | 'attributionCard';

export interface ElementLayoutOverride {
  dx?: number;      // Horizontal offset in canvas pixels (-150 to +150)
  dy?: number;      // Vertical offset in canvas pixels (-250 to +250)
  scale?: number;   // Scale factor multiplier (0.7 to 1.3)
  opacity?: number; // Opacity multiplier (0.1 to 1.0)
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

export interface ExtractedFact {
  text: string;
  type: 'number' | 'date' | 'name' | 'quote' | 'claim';
  verified: 'verified' | 'partially_verified' | 'unconfirmed' | 'unverified';
  evidence?: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface PostSourceMeta {
  type?: 'article' | 'screenshot' | 'youtube' | 'notes';
  title?: string;
  creator?: string;
  url?: string;
  published?: string;
  groundingQueries?: string[];
  groundingSources?: GroundingSource[];
  isSearchGrounded?: boolean;
  isFallback?: boolean;
  engine?: 'gemini-ai' | 'offline-synthesizer';
  model?: string;
  status?: 'verified_live' | 'unverified_draft';
  userReviewed?: boolean;
}

export interface CarouselData {
  id?: string;
  theme: string;
  category: string;
  brand?: string;    // Brand wordmark / watermark (defaults to 'MARROK' or creator handle)
  brandUrl?: string; // Website URL or handle (defaults to 'marrok.org')
  caption: string;
  firstComment?: string; // Spec §8 & §18: Pinned first comment with reference links
  shortCaption?: string; // Spec §8: 2-line short caption variant
  screenHook?: string;   // Spec §8: 3-second on-screen hook
  sourceMeta?: PostSourceMeta; // Spec §4 & §11: Source metadata
  facts?: ExtractedFact[];     // Spec §4 & §11: Extracted and verified facts
  notesForHuman?: string[];    // Spec §11 & §18: Human review notes and caveats
  scheduleSlot?: string;       // Spec §14 & §17: Recommended posting slot (e.g. "18:00 DZ")
  captionVariants?: CaptionVariant[];
  hookVariants?: HookVariant[];
  slides: SlideData[];
  visualOptions?: VisualSystemOptions; // Phase 1-3 visual graphics system toggles
}

export interface VisualSystemOptions {
  showCadReticles?: boolean;   // Corner CAD crosshairs (+) and boundary ticks (default true)
  showSparklines?: boolean;    // Acceleration sparkline curve & gauge meter on metric slides (default true)
  terminalScanlines?: boolean; // Subtle 3.5% CRT scanline grid on code terminal slides (default true)
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
  // Visual graphics system toggles
  showCadReticles?: boolean;
  showSparklines?: boolean;
  terminalScanlines?: boolean;
}

export type ThemeConfig = ThemePalette;

// Re-export immutable palette repositories for backwards compatibility
export { DEFAULT_PALETTES, SPEC_PALETTES, THEME_CONFIGS } from './lib/theme/palettes';
