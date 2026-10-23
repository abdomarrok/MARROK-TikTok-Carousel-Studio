# MARROK Architecture & Engineering Specification

## 1. Executive Summary

**MARROK TikTok Carousel Studio** is a specialized multimodal content generation engine that converts complex engineering materials (technical architecture screenshots, code snippets, GitHub repositories, YouTube transcripts, and engineering post-mortems) into high-impact, bilingual (English + Arabic) 1080×1920 TikTok carousels and algorithmic captions.

The system is engineered for zero-latency mobile workflows, high availability during upstream AI service spikes, and strict adherence to the proprietary **MARROK 5-Archetype Visual System**.

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
                           │         Express Node.js Proxy            │
                           │      (server.ts / Vite Middleware)       │
                           └────────┬────────────────────────┬────────┘
                                    │                        │
                   (Cloud Path)     │                        │ (Offline/Fast-break)
                                    ▼                        ▼
    ┌────────────────────────────────────────┐   ┌────────────────────────────────┐
    │          Google GenAI Engine           │   │   MARROK Synthesizer Engine    │
    │  - gemini-3.1-flash-lite / flash-latest│   │  - Deterministic archetype     │
    │  - Strict 6000ms Promise.race timeout  │   │    pattern synthesis           │
    │  - 503 / UNAVAILABLE instant break     │   │  - 0ms zero-latency fallback   │
    └───────────────────┬────────────────────┘   └────────────────┬───────────────┘
                        │                                         │
                        └───────────────────┬─────────────────────┘
                                            │ (Valid CarouselData JSON)
                                            ▼
                           ┌──────────────────────────────────────────┐
                           │        React 19 Interactive Studio       │
                           │  - 1080×1920 9:16 Live Canvas Renderer   │
                           │  - 3 A/B Hook Switcher (Curiosity/Metrics│
                           │  - 2 Caption Variants (Bulletins/Narrative│
                           │  - Slide Archetype Visual Inspector      │
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
  - **Zero-500 Guarantee:** The endpoint `/api/generate` never returns an HTTP 500 error; it always outputs a complete, compliant 8-to-9 slide carousel with full bilingual copy.

### 2.3 MARROK Synthesizer Subsystem (`src/lib/synthesizer.ts`)
- A zero-dependency, deterministic content synthesis engine capable of generating valid MARROK carousels in under 5ms.
- Extracts keywords, technical metrics, system components, and architectural concepts from raw input text or filenames.
- Formulates 3 distinct hook variants (Curiosity, Hard Metrics, Problem/Shift) and 2 caption styles (Bulletins with metrics vs. Narrative breakdown) with niche hashtag clustering.

### 2.4 SVG / Canvas Rendering Subsystem (`src/lib/canvasExporter.ts`)
- **Aspect Ratio & Resolution:** 1080×1920 pixels (9:16 vertical video format).
- **Safe Zones:** Adheres to TikTok interface overlays (top 180px reserved for search/sound, bottom 320px for username/description/audio, right 120px for engagement icons).
- **Typography Engine:**
  - English: *Plus Jakarta Sans* (Weights: 600, 700, 800) for clean engineering hierarchy.
  - Arabic: *Cairo* (Weights: 600, 700, 800) rendered with natural RTL flow (`dir="rtl"`).
  - Code & Metrics: *JetBrains Mono* / tabular numbers.
- **Export Formats:**
  - High-res PNG rendering via off-screen HTML5 `<canvas>` with `devicePixelRatio` scaling.
  - Batch ZIP packaging via `JSZip` containing numbered PNG slides (`slide-01-hook.png` through `slide-08-cta.png`).
  - Native browser clipboard integration for instant pasting on mobile devices.

---

## 3. Core Data Contracts

The application state revolves around the `CarouselData` schema:

```typescript
export interface CarouselData {
  theme: 'engineering' | 'cybersecurity' | 'architecture';
  category: string; // e.g., "AI + ENGINEERING", "DEVSECOPS"
  caption: string;  // Primary bilingual caption
  captionVariants?: {
    style: string;  // "Executive Bulletins" | "Narrative Breakdown"
    caption: string;
  }[];
  hookVariants?: {
    tag: string;    // "Curiosity & Surprise" | "Hard Metrics" | "Problem"
    enTitle: string;
    arTitle: string;
    enBody: string;
    arBody: string;
    centerIcon?: string;
  }[];
  slides: Slide[];
}
```

---

## 4. Security & Environment

- **API Key Isolation:** `GEMINI_API_KEY` is kept strictly server-side in `server.ts` via `process.env`. No client bundles or public APIs expose credentials.
- **CORS Configuration:** Configured to allow cross-origin requests within AI Studio preview containers.
- **Payload Limits:** Express JSON body parser configured with `limit: '25mb'` to accommodate compressed base64 images without HTTP 413 errors.
