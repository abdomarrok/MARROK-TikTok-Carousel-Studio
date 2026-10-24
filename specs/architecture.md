# MARROK Architecture & Engineering Specification

## 1. Executive Summary

**MARROK TikTok Carousel Studio** is an agentic multimodal content generation engine that converts complex engineering materials (technical architecture screenshots, code snippets, GitHub repositories, YouTube transcripts, and engineering post-mortems) into high-impact, bilingual (English + Arabic) 1080×1920 TikTok carousels and algorithmic captions.

The system is engineered for zero-latency mobile workflows, high availability during upstream AI service spikes, and strict adherence to the proprietary **MARROK 7-Archetype Visual System**.

```
                           ┌──────────────────────────────────────────┐
                           │            Multimodal Input              │
                           │  - High-res Screenshots (Code/Arch)      │
                           │  - Transcripts / GitHub / Technical Text │
                           └────────────────────┬─────────────────────┘
                                                │
                                                ▼
                           ┌──────────────────────────────────────────┐
                           │      Client-Side Ingestion Pipeline      │
                           │  - Canvas Downscaler (1280px / ~120KB)   │
                           │  - MIME normalization & Base64 packing   │
                           │  - 10s Mobile Timeout Watchdog           │
                           └────────────────────┬─────────────────────┘
                                                │
                                                ▼
                           ┌──────────────────────────────────────────┐
                           │         Express Node.js Gateway          │
                           │  - POST /api/generate (Gemini / Synth)   │
                           │  - GET  /api/proxy-image (CORS & Color)  │
                           │  - GET  /api/search-media (Tech & Wiki)  │
                           └────────┬────────────────────────┬────────┘
                                    │                        │
                   (Cloud Path)     │                        │ (Offline/Fast-break)
                                    ▼                        ▼
    ┌────────────────────────────────────────┐   ┌────────────────────────────────┐
    │          Google GenAI Engine           │   │   MARROK Synthesizer Engine    │
    │  - gemini-3.1-flash-lite / flash-latest│   │  - Dynamic 5–9 slide density   │
    │  - Strict 6000ms Promise.race timeout  │   │  - Subject-aware icon curation │
    │  - 503 / UNAVAILABLE instant break     │   │  - 0ms zero-latency fallback   │
    └───────────────────┬────────────────────┘   └────────────────┬───────────────┘
                        │                                         │
                        └───────────────────┬─────────────────────┘
                                            │ (Valid CarouselData JSON)
                                            ▼
                           ┌──────────────────────────────────────────┐
                           │        React 19 Interactive Studio       │
                           │  - 1080×1920 9:16 Live Canvas Renderer   │
                           │  - 7 Archetypes (Hub, Row, Metric, Code, │
                           │    Compare, Image Visual, Final CTA)     │
                           │  - Web Media & Brand Logo Modal Picker   │
                           │  - Theme Harmonization & Tinting Engine  │
                           │  - One-tap Mobile Clipboard & ZIP Export │
                           └──────────────────────────────────────────┘
```

---

## 2. System Layers

### 2.1 Client Ingestion Layer (`src/components/MultimodalInputPanel.tsx`)
- **Phone Screenshot Compression:** Native phone camera photos or screenshots can exceed 15–20MB. An embedded HTML5 canvas downscales images to a maximum dimension of 1280px at 0.82 JPEG quality before transmission. This reduces network payload size to ~120KB, eliminating mobile LTE upload timeouts.
- **Input Modes:**
  - `screenshot`: Architecture diagrams, terminal logs, CVE reports, UI mockups.
  - `transcript`: YouTube video summaries, keynote transcripts, podcast notes.
  - `notes`: Raw engineering bullet points, RFCs, GitHub README snippets.
- **Fail-Safe Watchdog:** A 10-second `AbortController` guards client requests. If network degradation occurs, the client automatically executes local synthesis, guaranteeing the user never sees an unhandled `Failed to fetch`.

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

---

## 3. Scope Isolation: Site Chrome vs. Carousel Canvas
- **Studio Chrome:** Maintains a clean, stable dark workspace aesthetic (`#080d11`) with reduced visual noise, collapsible ingestion controls, and uncluttered toolbars.
- **Carousel Canvas:** Exclusively reacts to the active post theme (e.g., *Solarized Amber*, *Cyber Threat Crimson*, *Electric AI Violet*, *Terminal Teal*). Theme switching transforms the slide visuals without altering the application chrome.
