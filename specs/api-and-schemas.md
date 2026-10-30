# MARROK API & Schema Specifications

## 1. REST API Endpoints

### 1.1 `GET /api/health`
Checks server readiness and verifies that the `GEMINI_API_KEY` environment secret is provisioned.

**Response (HTTP 200):**
```json
{
  "status": "ok",
  "timestamp": 1792790658552,
  "hasApiKey": true
}
```

---

### 1.2 `POST /api/generate`
Generates a complete 5-to-9 slide MARROK carousel, 3 hook variants, and 2 caption styles from raw multimodal input. Automatically adapts slide count and archetypes to match the depth and density of the subject.

**Request Headers:**
- `Content-Type: application/json`
- `x-gemini-key`: *(Optional)* Custom Gemini API key override

**Request Body Parameters:**
| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | Conditional | Raw text, transcript, blog post, or topic |
| `inputMode` | `string` | Optional | `'screenshot'` \| `'transcript'` \| `'notes'` |
| `imageBase64` | `string` | Conditional | Base64-encoded compressed image string |
| `imageMimeType` | `string` | Optional | e.g. `'image/jpeg'`, `'image/png'` |
| `imageName` | `string` | Optional | Original file name of uploaded asset |
| `categoryHint` | `string` | Optional | Suggested category (e.g. `'AI + ENGINEERING'`) |

*Note: At least one of `prompt` or `imageBase64` must be provided.*

**Response Headers:**
- `Content-Type: application/json`
- `X-Marrok-Engine`: `'gemini-3.1-flash-lite'` \| `'gemini-flash-latest'` \| `'intelligent-synthesizer'`

**Response Body (HTTP 200):** Matches `CarouselData` schema.

---

### 1.3 `GET /api/proxy-image`
CORS-safe server-side image proxy that fetches external web images, architecture diagrams, and tech brand SVGs with caching and optional SVG theme recoloring. Prevents HTML5 Canvas tainting, ensuring single-slide PNG downloads, ZIP archives, and direct 1-click clipboard copying succeed without security exceptions.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | Valid HTTP/HTTPS image URL (e.g., Simple Icons CDN, Wikimedia Commons) |
| `color` | `string` | Optional | Hex color code to dynamically tint SVG paths (e.g. `37E2C0`, `#F09A67`, `#A855F7`) |

**Features:**
- Strict URL validation & 8-second fetch timeout.
- Injects `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=86400`.
- Automatic SVG recoloring: replaces root fill, style colors, and path attributes to harmonize with the active theme accent.

---

### 1.4 `GET /api/search-media`
Subject-based media discovery querying curated tech brand logos and Wikimedia Commons technical architecture diagrams.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | `string` | Optional | Search query (e.g., `"kubernetes"`, `"redis"`, `"distributed systems"`, `"kernel"`) |

**Response (HTTP 200):**
```json
{
  "query": "kubernetes",
  "icons": [
    {
      "name": "kubernetes",
      "title": "Kubernetes",
      "url": "https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/kubernetes.svg",
      "category": "Cloud & K8s",
      "source": "Simple Icons CDN"
    }
  ],
  "images": [
    {
      "title": "Kubernetes Architecture Diagram",
      "url": "https://upload.wikimedia.org/wikipedia/commons/...",
      "thumbUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/...",
      "source": "Wikimedia Commons"
    }
  ]
}
```

### 1.5 `POST /api/generate-image`
Generates high-resolution technical diagrams, system blueprints, and architecture visuals using `gemini-nano-banana-2.1` with native 9:16 vertical aspect ratio. Also supports prompt-based natural language image editing/recoloring when `baseImageBase64` is provided.

**Request Body Parameters:**
| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | Yes | Technical description of the diagram or prompt edit instruction |
| `aspectRatio` | `string` | Optional | `'9:16'` (default) \| `'16:9'` \| `'1:1'` |
| `stylePreset` | `string` | Optional | `'blueprint'` \| `'terminal'` \| `'flowchart'` \| `'security'` \| `'raw'` |
| `baseImageBase64` | `string` | Optional | Base64-encoded image to edit via natural language instructions |
| `baseImageMimeType` | `string` | Optional | MIME type of base image (e.g. `'image/png'`) |
| `themeAccent` | `string` | Optional | Hex accent color (e.g. `'#38BDF8'`) to anchor the diagram's color palette |
| `themeBg` | `string` | Optional | Hex background color (e.g. `'#080E14'`) for dark mode harmonization |
| `themeSurface` | `string` | Optional | Hex surface color (e.g. `'#0D151C'`) for container alignment |

**Response Body (HTTP 200):**
```json
{
  "imageUrl": "data:image/png;base64,iVBORw0KGgo...",
  "prompt": "Isometric system blueprint...",
  "model": "gemini-nano-banana-2.1"
}
```

---

## 2. Core TypeScript Interfaces (`src/types.ts`)

```typescript
export type SlideType = 'hub' | 'row' | 'number' | 'metric' | 'code' | 'compare' | 'image' | 'cta';

export interface RowIconItem {
  icon: string;
  label: string;
}

export interface DiagramNodeItem {
  label: string;
  sublabel?: string;
  status?: string;
  icon?: string;
}

export interface SlideData {
  id?: string;
  type: SlideType;
  
  // Hub Archetype properties (Slide 1 Hook)
  centerIcon?: string;
  satIcons?: string[];
  satLabels?: string[];      // 6 crisp component labels for orbital satellites
  
  // Dynamic Architecture Diagram properties (Mechanism Archetype)
  diagramVariant?: 'topology' | 'stack' | 'isolation' | 'takeaway';
  diagramNodes?: DiagramNodeItem[]; // 3 connected component nodes / tiers / cells
  diagramEdges?: string[];   // Inter-node flow connectors e.g. ["mTLS 1.3", "REST"]
  diagramFooter?: string;    // Bottom telemetry line e.g. "LATENCY: P99 < 1.0ms"
  icons?: RowIconItem[];
  
  // Step Number Archetype properties
  stepNumber?: string;
  stepLabel?: string;
  
  // Metric Hero Card Archetype properties
  metricValue?: string;      // e.g. "200x", "0ms", "99.9%", "45GB"
  metricLabel?: string;      // e.g. "THROUGHPUT MULTIPLIER", "P99 LATENCY"
  metricDiff?: string;       // e.g. "▲ 12x vs legacy baseline"
  metricIcon?: string;       // e.g. "zap", "gauge", "activity", "cpu"
  
  // Code / Terminal Window Archetype properties
  codeSnippet?: string;      // Multi-line code, bash, assembly or diff ($ for commands, + for adds)
  codeLanguage?: string;     // e.g. "bash", "rust", "python", "sql", "c"
  codeFileName?: string;     // e.g. "bench_run.sh", "main.rs"
  
  // Compare / Side-by-Side Archetype properties
  compareLeftTitle?: string;  // e.g. "Legacy Git"
  compareLeftBody?: string;   // e.g. "Full history clone\nBloated .git folder\nStalls at 100GB"
  compareRightTitle?: string; // e.g. "Scion / MARROK"
  compareRightBody?: string;  // e.g. "Lazy checkout\nVirtual file system\nInstant CI builds"
  
  // Image / Web Visual Archetype properties
  imageUrl?: string;          // Direct URL or data URL of external tech diagram, logo, or photo
  imageCaption?: string;      // Micro-badge label for the image
  imageFit?: 'contain' | 'cover'; // Fit mode on canvas (defaults to contain)
  imageFilter?: 'hud' | 'invert' | 'tint' | 'clean'; // Theme integration filter
  imagePrompt?: string;       // Prompt used to generate or edit the visual via gemini-nano-banana-2.1
  imageModel?: string;        // Model used (e.g. "gemini-nano-banana-2.1")
  
  // Bilingual Titles & Body Copy
  enTitle?: string;
  arTitle?: string;
  enBody?: string;
  arBody?: string;
  
  // CTA Archetype properties (Final Slide)
  ctaText?: string;
  url?: string;
  enCredit?: string;
  arCredit?: string;
}

export interface HookVariant {
  tag: string; // e.g., "Curiosity & Surprise", "Hard Metrics & Benchmark", "The Problem / Shift"
  enTitle: string;
  arTitle: string;
  enBody: string;
  arBody: string;
  centerIcon?: string;
}

export interface CaptionVariant {
  style: string; // "Executive Bulletins & Hard Metrics" | "Narrative Breakdown & Story"
  caption: string;
}

export type PostFormat = 'carousel' | 'single' | 'reel';
export type CanvasDimensionId = 'tiktok-9:16' | 'ig-4:5' | 'ig-3:4' | 'ig-1:1' | 'ig-reels-9:16';

export interface CarouselData {
  postFormat?: PostFormat;
  dimension?: CanvasDimensionId;
  theme: string;
  category: string;
  caption: string;
  captionVariants?: CaptionVariant[];
  hookVariants?: HookVariant[];
  brand?: string;
  brandUrl?: string;
  slides: SlideData[];
}

export interface ThemePalette {
  id: string;
  name: string;
  baseBg: string;         // Primary 1080x1920 canvas background
  radialGlow: string;     // Ambient radial glow behind card
  gridLine: string;       // Subtle background grid line
  surface: string;        // Elevated card surface hex
  surfaceBorder: string;  // Card boundary stroke hex
  accent: string;         // Primary neon accent hex
  alert: string;          // Secondary alert color
  iconStroke: string;     // Stroke for icons inside colored badges
  textWhite: string;      // English display headline hex
  textEnBody: string;     // English body text hex
  textArBody: string;     // Arabic body text hex
  microLabel: string;     // Micro card labels
  categoryTag: string;    // Category pill color
  textMuted: string;      // Metadata and footer text
}
```
