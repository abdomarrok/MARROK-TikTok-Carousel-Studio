# MARROK Project Chronological Log & Engineering Steps

This document records the chronological development history, engineering decisions, issue resolutions, and user feedback cycles for the **MARROK TikTok Carousel Studio**.

---

## Step 1: Initial Discovery & Product Scoping
- **Context:** The goal was established to build the MARROK TikTok Carousel & Bilingual Caption Engine, translating complex engineering topics into visual TikTok carousels and captions.
- **Requirements Identified:**
  1. Strict adherence to the 5 MARROK slide archetypes (Hub Hook, Row with 1 icon, Row with 2 icons, Row with 3 icons, CTA slide).
  2. Native bilingual layout: Bold English headline on top, natural technical Arabic subtitle directly underneath.
  3. Latin technical noun preservation: Keep proper nouns (e.g. *Git, Anthropic, Docker, DefectDojo, Ghidra*) in Latin characters inside Arabic text to avoid phonetic distortion.
  4. TikTok 1080×1920 9:16 export with safe zones.
  5. One-tap mobile clipboard copy for rapid publishing on iOS/Android TikTok apps.

---

## Step 2: Implementation of the Design System & Rendering Engine
- **Visual Palette Established:**
  - Dark engineering background: `#080d11`
  - Elevated card surfaces: `#121A21` and `#1E2833`
  - Accent neon teal: `#37E2C0`
  - Danger / alert coral: `#F43F5E`
  - Typography: Google Fonts *Plus Jakarta Sans* and *Cairo* (RTL support).
- **Component Architecture:**
  - `src/components/SlideCanvasPreview.tsx`: Real-time SVG renderer maintaining strict 9:16 geometry.
  - `src/components/SlideEditor.tsx`: Slide-by-slide text, icon, and archetype inspector.
  - `src/components/CaptionBox.tsx`: Dual-variant caption switcher with one-tap copy and character counters.
  - `src/lib/icons.ts`: Curated SVG icon registry mapped to cyber/software archetypes (CPU, Database, GitMerge, ShieldAlert, Binary, Changesets, etc.).

---

## Step 3: Server AI Integration with Structured Output
- **Model Selection:** Integrated `@google/genai` TypeScript SDK with server-side proxy in `server.ts`.
- **Structured Schema Enforced:**
  - Configured `responseMimeType: 'application/json'` with `responseSchema` to guarantee strict JSON output matching `CarouselData`.
  - Added multi-variant generation: 3 Slide 1 Hook variants (Curiosity, Hard Metrics, Problem/Contrast) and 2 Caption variants (Executive Bulletins vs. Narrative Breakdown).

---

## Step 4: Investigating & Resolving the Mobile "Failed to Fetch" Issue
- **User Incident Report:** User experienced indefinite loading screens followed by a client network error `Failed to fetch` when uploading mobile phone screenshots.
- **Root Cause Analysis:**
  1. **Uncompressed Mobile Uploads:** Uploading uncompressed 15MB–20MB camera photos over cellular LTE caused request timeouts and high memory spikes.
  2. **Upstream 503 Spikes:** Google GenAI models (`gemini-3.8-flash` / `gemini-3.1-flash-lite`) intermittently returned HTTP 503 `UNAVAILABLE` due to temporary cluster demand.
  3. **Indefinite Hangs in Model Iteration:** When an upstream endpoint lagged, sequential model retries took over 25 seconds, causing mobile browser fetch requests to timeout.
- **Engineering Solutions Implemented:**
  1. **Client-Side Canvas Downscaler (`src/components/MultimodalInputPanel.tsx`):**
     - Built an HTML5 canvas compression stage that downsizes images to max 1280px at 0.82 JPEG quality before transmission.
     - Reduced payload size from ~15MB down to ~120KB (~99% reduction).
  2. **Promise.race Timeout Race (`server.ts`):**
     - Enforced a 6000ms maximum timeout per model call.
     - On timeout or 503, the server immediately halts model iterations and fast-breaks to the synthesizer.
  3. **Zero-Fail Resilient Synthesizer (`src/lib/synthesizer.ts`):**
     - Built an instant, deterministic generator that extracts domain entities and builds full 8-slide decks in under 5ms.
     - Enabled both server-side fast-break and client-side error rescue.
  4. **⚡ Instant Synthesize Button:** Added a prominent zero-latency action button for immediate offline generation.

---

## Step 5: Verification & Latency Benchmarks
- Tested end-to-end curl requests against `/api/generate`:
  - Response time measured: **3.86 seconds** (under high-load condition).
  - HTTP Status: **200 OK**.
  - Output verified: Complete 8-slide carousel, 3 hook variants, 2 caption variants, valid bilingual syntax.
- Lint and compilation verified with zero errors (`tsc --noEmit` and `vite build`).

---

## Step 6: Documentation & GitHub Repository Preparation
- Structured dedicated `specs/` directory:
  - `specs/architecture.md`: System topology, ingestion, server gateway, canvas rendering.
  - `specs/logsteps.md`: Historical engineering record and incident resolution.
  - `specs/archetypes-and-design-system.md`: Visual guidelines and slide archetype blueprints.
  - `specs/api-and-schemas.md`: REST endpoints and TypeScript/JSON schemas.
- Prepared comprehensive `README.md` at project root.
- Staged Git tracking and repository readiness.

---

## Step 7: Dynamic Multi-Theme Engine & Context-Driven Categorization
- **User Feedback Addressed:** Expanded beyond static presets and single-theme generation to unlock:
  1. **Full Custom Color Palette Picker (`src/components/ThemeCustomizer.tsx`):**
     - Full interactive RGB/hex controls for canvas background, card surfaces, borders, neon accents, alert colors, and text.
     - 6 curated presets: *Terminal Teal*, *Cyber Crimson*, *AI Violet*, *Blueprint Navy*, *Solarized Amber*, *Matrix Emerald*, *Obsidian Minimalist*.
     - Live SVG and high-resolution PNG/ZIP export reflection.
  2. **Context-Driven Domain Extraction (`server.ts` & `src/lib/synthesizer.ts`):**
     - Discarded hardcoded category pairs in favor of dynamic context detection (e.g. `LINUX KERNEL & EBPF`, `REVERSE ENGINEERING`, `AI AGENTS & COMPILERS`, `KUBERNETES SEC`).
     - Automated theme pairing based on technical content.
  3. **Topic Inspiration & Trending Hooks Drawer (`src/components/TopicInspirationDrawer.tsx`):**
     - Trending engineering feed with 1-click synthesis.
     - Custom keyword builder to create instant carousels from any technology term.
  4. **Custom Gemini API Key Support (`src/components/ApiKeyModal.tsx`):**
     - Added UI setting to input personal API key passed via `x-gemini-key` header with transparent server fallback.

