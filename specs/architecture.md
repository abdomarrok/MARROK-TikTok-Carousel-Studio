# MARROK Content Studio — Architecture & Engineering Specification

## 1. Executive Summary

**MARROK Content Studio** is an agentic multimodal content generation engine that converts complex engineering materials (technical architecture screenshots, code snippets, GitHub repositories, YouTube transcripts, and engineering post-mortems) into high-impact, bilingual (English + Arabic) TikTok & Instagram carousels (`1080×1920`, `1080×1350`, `1080×1440`, `1080×1080`), 1-Slide Infographic Posters, 9:16 Motion Reels, and algorithmic captions.

The system is engineered for zero-latency mobile workflows, high availability during upstream AI service spikes, autonomous 1-input generation with silent QA auto-fixing, server-side 9:16 AI architecture diagram generation (`gemini-nano-banana-2.1`), and strict adherence to the proprietary **MARROK 8-Archetype Visual System**.

```
                           ┌──────────────────────────────────────────┐
                           │            Multimodal Input              │
                           │  - Single Prompt / Plain Text Summary    │
                           │  - Screenshots (Code / Arch Diagrams)    │
                           │  - Transcripts / GitHub / RFC Text       │
                           └────────────────────┬─────────────────────┘
                                                │
                                                ▼
                           ┌──────────────────────────────────────────┐
                           │      Client Ingestion & Auto-Pipeline    │
                           │  - Canvas Downscaler (1280px / ~120KB)   │
                           │  - autonomousPipeline.ts Orchestrator    │
                           │  - Markdown strip + BiDi fix + §8 fit    │
                           └────────────────────┬─────────────────────┘
                                                │
                                                ▼
                           ┌──────────────────────────────────────────┐
                           │         Express Node.js Gateway          │
                           │  - POST /api/generate (Gemini / Synth)   │
                           │  - POST /api/generate-image (Nano Banana)│
                           │  - GET  /api/proxy-image (CORS & Color)  │
                           │  - GET  /api/search-media (Tech & Wiki)  │
                           └────────┬────────────────────────┬────────┘
                                    │                        │
                   (Cloud Path)     │                        │ (Offline/Fast-break)
                   ┌────────────────┴───────┐                │
                   ▼                        ▼                ▼
    ┌─────────────────────────────┐ ┌───────────────────┐ ┌───────────────────────────┐
    │     Google GenAI Text       │ │ Google GenAI Img  │ │ MARROK Synthesizer Engine │
    │ - gemini-3.1-flash-lite     │ │ - gemini-nano-    │ │ - Dynamic 5–9 slide density│
    │ - gemini-flash-latest       │ │   banana-2.1      │ │ - Subject-aware icons     │
    │ - 6000ms race timeout       │ │ - 9:16 1K diagrams│ │ - 0ms zero-latency break  │
    └──────────────┬──────────────┘ └─────────┬─────────┘ └─────────────┬─────────────┘
                   │                          │                         │
                   └──────────────────────────┼─────────────────────────┘
                                              │
                                              ▼
                           ┌──────────────────────────────────────────┐
                           │       Autonomous Studio (React 19)       │
                           │  - 1-Command Bar with Live Progress      │
                           │  - 1080×1920 Canvas with Inline Editing  │
                           │  - Slide Bar (Add, Dup, Delete, Reorder) │
                           │  - Progressive Disclosure Drawer:        │
                           │    * Code Diffs & Terminal Styling       │
                           │    * Metric Hero Cards & Comparisons     │
                           │    * AI Diagram Studio & Web Logos       │
                           │  - 1-Click Deliverables (ZIP, PNG, Copy) │
                           └──────────────────────────────────────────┘
```

---

## 2. System Layers

### 2.1 Unified Client Ingestion Layer (`src/components/AutonomousStudio.tsx`)
- **Unified Inline Smart Dock:** Replaces detached modal dialogs with a responsive, expandable Smart Dock embedded directly in the studio. Supports instant single-line topics, multi-line blog/code notes, YouTube transcripts, and drag-and-drop screenshot attachments with zero modal popup friction.
- **Client Screenshot Compression:** Downscales large screenshots to a maximum dimension of 1280px at 0.82 JPEG quality using an HTML5 canvas before transmission (`compressImageClientSide`). This keeps payloads under ~150KB for fast, timeout-free OCR analysis.
- **Input Modes:**
  - `upload`: Architecture diagrams, terminal logs, CVE reports, UI mockups.
  - `youtube`: YouTube video summaries, keynote transcripts, podcast notes.
  - `text`: Raw engineering bullet points, RFCs, GitHub README snippets.
- **Fail-Safe Watchdog & Instant Mode:** Direct execution via `runAutonomousPipeline()` with inline `Instant Synthesize` fallback (0ms latency, zero network dependence).

### 2.2 Backend Gateway & AI Pipeline (`server.ts`)
- **Runtime:** Node.js Express server mounting Vite middleware in development and serving static production builds in deployment.
- **Model Orchestration:** Uses the official `@google/genai` TypeScript SDK targeting `gemini-3.1-flash-lite` (with fallback to `gemini-flash-latest`).
- **Resilience Guardrails:**
  - **6000ms Timeout Race:** Every model call is bounded by `Promise.race`. If the upstream AI does not return within 6 seconds, the request is aborted.
  - **503 High-Demand Fast-Break:** If the upstream cluster reports `503 Service Unavailable`, `UNAVAILABLE`, or `high demand`, the server immediately stops iterating and invokes the local synthesizer.
  - **Zero-500 Guarantee:** The endpoint `/api/generate` never returns an HTTP 500 error; it always outputs a complete, compliant 5-to-9 slide carousel with full bilingual copy.

### 2.3 CORS-Safe Image Proxy & SVG Recoloring Subsystem (`/api/proxy-image`)
- **Canvas Tainting Mitigation:** Standard browser security marks an HTML5 canvas as "tainted" if an external cross-origin image without CORS headers is drawn, which blocks `toDataURL`, `toBlob`, and clipboard copy APIs. The proxy fetches upstream media and attaches `Access-Control-Allow-Origin: *`.
- **Dynamic SVG Theme Colorizing:** Upstream Simple Icons or CDN SVGs frequently have black paths (`#000000`). When a `color` parameter is supplied (e.g. `?color=F09A67`), the proxy dynamically modifies the root `<svg>` fill and path properties to match the active post theme's neon accent.

### 2.4 Media Discovery & Search Subsystem (`/api/search-media`)
- **Tech Brand Logos:** Instant real-time matching across 40+ curated developer technology brands (Redis, Docker, Kubernetes, Linux, PostgreSQL, MySQL, FastAPI, Go, Rust, AWS, etc.) hosted on Simple Icons CDN.
- **Wikimedia Commons Integration:** Live query interface fetching architectural schematics, network diagrams, and hardware visuals directly into the studio.

### 2.5 MARROK Synthesizer Subsystem (`src/lib/synthesizer.ts`)
- A zero-dependency, deterministic content synthesis engine capable of generating valid MARROK carousels in under 5ms.
- **Adaptive Length (5–9 Slides):** Analyzes input density to emit lean, focused decks for short announcements (5–6 slides) or deep architectural breakdowns (8–9 slides).
- **Domain-Specific Icon Selection:** Curates from a 32-icon technical registry and tech brand CDN catalogue based on subject keywords (e.g., security exploits select `shieldAlert` and `lock`, containerization selects `docker` and `server`).
- **Archetype Distribution:** Automatically distributes `hub`, `metric`, `code`, `compare`, `row`, and `cta` slides based on detected benchmarks, code snippets, or comparisons.

### 2.6 Canvas Rendering & Theme Harmonization Engine (`src/lib/canvasExporter.ts`)
- **Aspect Ratio & Resolution:** 1080×1920 pixels (9:16 vertical video format).
- **Safe Zones:** Adheres to TikTok interface overlays (top 180px reserved for search/sound, bottom 320px for username/description/audio, right 120px for engagement icons).
- **Theme Harmonization & Tinting (`drawTintedImage`):**
  - Uses `globalCompositeOperation = 'source-in'` on an offscreen canvas to recolor non-transparent pixels into `theme.accent` or `theme.iconStroke`.
  - Image cards strictly inherit `theme.surface` and `theme.surfaceBorder` with technical blueprint grid lines and ambient radial glow.
  - Supports 4 visual harmonization filters: `Theme HUD (Auto)`, `Invert White BG`, `Accent Tint`, and `Original Colors`.
- **Export Formats:**
  - High-res PNG rendering via off-screen HTML5 `<canvas>`.
  - Batch ZIP packaging via `JSZip` containing numbered PNG slides.
  - Direct 1-click clipboard copy (`navigator.clipboard.write`) for instant mobile posting.

### 2.7 Autonomous Content Pipeline (`src/lib/autonomousPipeline.ts`)
- **Single-Click Orchestration:** Executes a multi-stage autonomous pipeline transforming raw prompt text or uploaded multimodal files into a finished, publication-ready carousel deck without requiring manual user intervention:
  1. **Content Synthesis:** Coordinates calls to `/api/generate` with zero-latency deterministic fallback via `src/lib/synthesizer.ts`.
  2. **Automated Markdown Sanitization:** Strips markdown bolding (`**`), headers (`#`), stray brackets, and trailing ellipsis dots that cause visual clutter in high-density TikTok slides.
  3. **Arabic BiDi Punctuation Linting:** Automatically detects Latin technical tokens inside right-to-left Arabic phrases and corrects sentence-ending punctuation positions to prevent punctuation-jump artifacts.
  4. **Spec §8 Limit Enforcement:** Guarantees title copy remains $\le 45$ characters and body copy $\le 110$ characters with natural linguistic truncation.
  5. **Autonomous Diagram Generation:** Identifies the primary architectural mechanism slide (e.g. `compare`, `image`, or deep technical `row`) and invokes the server-side image generation engine to produce a tailored 9:16 architecture schematic.
  6. **Silent QA Verification:** Runs pre-publish quality gates (`src/lib/qaChecks.ts`) and auto-corrects soft violations.

### 2.8 AI Diagram Generation & Editing Subsystem (`POST /api/generate-image`)
- **Model Orchestration:** Integrates `gemini-nano-banana-2.1` via `@google/genai` TypeScript SDK (with automatic fallback to `gemini-3.1-flash-lite-image`).
- **Aspect Ratio & Geometry:** Enforces `imageConfig: { aspectRatio: '9:16', imageSize: '1K' }` to generate high-resolution vertical visuals that align seamlessly with TikTok viewport dimensions.
- **Multimodal Edit Support:** Supports multi-part prompts accepting a previous base image alongside natural language edit directives (e.g. "Highlight the distributed cache in amber", "Invert background to dark blueprint").
- **Engineering Visual Presets:** Supplies domain-tuned prompt wrappers:
  - *System Blueprint*: Minimalist blueprint schematic with dark terminal background and neon cyan signal pathways.
  - *Terminal Core*: Deep CLI monospace display with live telemetry and data stream traces.
  - *Services Flow*: Microservice boundary chart with API gateways and event queues.
  - *Security Boundary*: Zero-trust threat vector map with isolated firewall zones.

### 2.9 Autonomous Studio & Progressive Disclosure UI (`src/components/AutonomousStudio.tsx`)
- **Philosophy:** Clean, distraction-free simplicity by default; deep granular control when requested.
- **Top Command Bar:** Single input field with real-time autonomous progress feedback and integrated "Ingest Material" modal button for uploading screenshots, code files, or web URLs.
- **Direct Inline Editing:** Allows creators to click directly on English headlines, Arabic translations, and body mechanism copy in the live preview to edit text instantly without navigating complex forms.
- **Slide Management Bar:** Integrated strip offering quick actions: Add Slide (`+`), Duplicate Slide, Delete Slide (guarded to maintain minimum 3 slides), Reorder (Move Left / Right), and Slide 1 Hook Variant selector (Curiosity, Metric, Contrast).
- **Expandable Advanced Drawer:** A collapsible power drawer providing deep configuration for slide archetypes:
  - *Code & Diff Styling*: Language selector, terminal dot styling, line numbers, and diff token formatting.
  - *Metric Hero Cards*: Value, category label, delta pill, and status badges.
  - *Comparison Split*: Left vs Right entity titles, bullet points, and advantage pills.
  - *Visual Diagram Studio*: AI prompt generation, style presets, 1-click diagram creation, and Web Media logo search.
- **Floating 1-Click Deliverables Dock:** Bottom action bar for immediate batch ZIP download, single-slide PNG export, TikTok caption copying, and Theme switching.

### 2.10 Zero-Touch Autonomous Layout & Pacing Engine
- **Autonomous Visual Pacing Balancer (`balanceCarouselVisualPacing`):**
  - Analyzes the deck's slide sequence and tracks the previous mechanism layout (`lastMechanismVariant`).
  - Guarantees **zero adjacent duplicate diagram layouts** across `row` slides by rotating through `['topology', 'stack', 'isolation', 'takeaway']` and selecting the least-used variant.
  - Automatically validates and self-heals missing `diagramNodes`, `diagramEdges`, `diagramFooter`, `codeFileName`, `codeLanguage`, `codeSnippet`, and `metricDiff` pill data.
- **Self-Healing Typography Engine (`fitTextInBox`):**
  - Dynamically measures text bounds in real-time during canvas rasterization.
  - Automatically steps down font sizes or smart-wraps to 2 lines for `satLabels` pills, `diagramNodes` cards, `diagramEdges` badges, status pills, and comparison columns.
  - **Topology Flow & Isolation Grid 2-Line Auto-Wrapping:** Node titles in horizontal topology cards auto-scale font size from `16px` down to `12px` across 2 lines (`nodeY + 98` and `nodeY + 98 + lineHeight`), ensuring 100% readable component titles without single-line ellipsis truncation. Diagram node labels in `synthesizer.ts` are kept concise (2–3 words, $\le 18$ characters) with longer descriptions in `sublabel`.
- **Instant Archetype Switching & Live Auto-Seeding (`seedSlideArchetypeData`):**
  - Allows creators to switch any slide in the deck to any archetype (`hub`, `row`, `image`, `code`, `metric`, `compare`, `cta`) at any time.
  - Automatically synthesizes missing fields from slide content on switch.
  - Strict dispatching on `slide.type` FIRST ensures `slide.diagramVariant` never overrides the active archetype.
- **Dynamic Vertical Optical Centering:**
  - Calculates the exact bottom boundary of the top graphic (`yGraphicEnd`) and pre-measures all English and Arabic title and body lines.
  - Distributes vertical breathing room using a 38% top cushion / 62% bottom ratio between `yGraphicEnd` and `y = 1710` (clearing footer dots at `y = 1826`).
  - Implements generous Arabic line-heights (1.45x–1.55x) with strict right-margin safe zones (`x <= 945`).
- **Zero-Config Theme-Aware AI Schematics:**
  - Automatically derives technical diagram prompts from the slide's `enTitle`, `diagramNodes`, and the deck's exact hex colors (`theme.accent`, `theme.baseBg`, `theme.surface`).
  - Provides a 1-click execution pathway producing dark OLED schematics that match the active deck palette without manual user prompts.

---

## 3. Scope Isolation: Site Chrome vs. Carousel Canvas
- **Studio Chrome:** Maintains a clean, stable dark workspace aesthetic (`#080d11`) with reduced visual noise, collapsible ingestion controls, and uncluttered toolbars.
- **Carousel Canvas:** Exclusively reacts to the active post theme (e.g., *Solarized Amber*, *Cyber Threat Crimson*, *Electric AI Violet*, *Terminal Teal*). Theme switching transforms the slide visuals without altering the application chrome.

