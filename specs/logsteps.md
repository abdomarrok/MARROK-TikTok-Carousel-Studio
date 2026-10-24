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

---

## Step 8: UI Noise Elimination & Smart Dynamic Structure System
- **User Feedback Addressed:** "there is alot of noise in the ui", theme changes should only affect the post not the entire site, slide count shouldn't be fixed to 8, icons shouldn't repeat statically, and structures shouldn't be identical every time.
- **Engineering Solutions Implemented:**
  1. **UI Noise Audit & Streamlining:**
     - Collapsed redundant banner drawers into a clean, unified top action bar with modal dialogs (`Ingest Material`, `Download All (ZIP)`, `API Key`, `Theme Picker`).
     - Kept application site chrome stable dark (`#080d11`) while confining color theme changes strictly to the carousel canvas (`1080×1920`).
  2. **Smart Dynamic Slide Count (5 to 9 Slides):**
     - Replaced rigid 8-slide structure with adaptive length based on content density (lean 5–6 slide decks for concise announcements, 8–9 slides for complex architecture breakdowns).
  3. **7-Archetype Visual System:**
     - Expanded from 3 archetypes to 7 specialized technical layouts:
       - `hub`: Central pulsing icon + 6 orbiting satellites (The Hook).
       - `row`: 1, 2, or 3 cards with micro-labels.
       - `metric`: Giant high-contrast metric value (e.g. `200x`, `0ms`) with label and delta pill.
       - `code`: Monospace terminal window with macOS dots, line numbers, and diff syntax.
       - `compare`: Side-by-side legacy vs modern cards with problem/solution bullet points.
       - `image`: Elevated technical diagram and web visual container.
       - `cta`: Brand geometric emblem, domain question, CTA pill, and bilingual source attribution.
  4. **Subject-Aware Icon Selection:**
     - Expanded icon registry to 32 domain-specific icons with intelligent scoring (e.g. security topics favor `shieldAlert` and `lock`, AI topics favor `brain` and `sparkles`).

---

## Step 9: Subject-Aware Internet Icons & Theme Harmonization Engine
- **User Feedback Addressed:** "we should also be able to use icons and images from the internet based on the subject" and "yes but that image isnt consistent with out post theme and background".
- **Engineering Solutions Implemented:**
  1. **Curated Tech Brand Resolution (`src/lib/icons.ts`):**
     - Integrated Simple Icons CDN catalogue recognizing 40+ top developer brands (Docker, Kubernetes, Redis, PostgreSQL, MySQL, FastAPI, Go, Rust, Linux, AWS, Cloudflare, etc.).
  2. **CORS-Safe Server Image Proxy (`server.ts` - `/api/proxy-image`):**
     - Built image proxy attaching `Access-Control-Allow-Origin: *` to prevent HTML5 Canvas tainting, ensuring single-slide PNG downloads, ZIP exports, and direct 1-click clipboard copying succeed without security exceptions.
  3. **Real-Time Media Search API (`server.ts` - `/api/search-media`):**
     - Added endpoint querying curated tech brand SVGs and Wikimedia Commons technical architecture diagrams.
  4. **Interactive Web Media & Icon Picker Modal (`src/components/MediaSearchModal.tsx`):**
     - 4-tab picker: Tech Brand Logos, Web Diagrams, Direct URL input with preview, and local file upload.
     - Wired into all icon selectors (Hub, Rows, Metric) and Image archetype.
  5. **Theme Harmonization & Tinting Engine (`src/lib/canvasExporter.ts`):**
     - Implemented `drawTintedImage()` using `globalCompositeOperation = 'source-in'` on an offscreen canvas to dynamically recolor web logos and SVGs with `theme.accent` or `theme.iconStroke`.
     - Image card container strictly inherits `theme.surface` and `theme.surfaceBorder` from the active post theme, with technical blueprint grid lines and ambient glow.
     - Added 4 visual tone modes in Slide Editor: `Theme HUD (Auto)` (blueprint grid + accent recoloring), `Invert White BG` (inverts white diagrams into dark mode), `Accent Tint` (color wash), and `Original Colors`.

---

## Step 10: 1-Input Smart Pipeline, Specification Compliance, & QA Suite
- **User Feedback Addressed:** "the goal of this app was that the user need only to put one input like summary of subject or screenshot... after that the system should smart configure the post by the best way until we get the best output based on the project plan".
- **Engineering Solutions Implemented:**
  1. **One-Input Command Center (`src/components/SmartPipelineBar.tsx`):**
     - Autonomous 6-stage pipeline: Ingest $\to$ Domain Detection $\to$ Narrative Arc Planning $\to$ Hook Generation $\to$ Fact Verification $\to$ Safe Zone Canvas Rendering.
  2. **Plan & Fact Verification Inspector (`src/components/PlanInspectorModal.tsx`):**
     - Inspects verifiable entities, numeric metrics, and narrative beat mapping before publishing.
  3. **Visual QA Contact Sheet (`src/components/ContactSheetModal.tsx` & `src/lib/canvasExporter.ts`):**
     - Renders all 8 slides tiled on a master high-res inspection canvas.
  4. **Pre-Publish Quality Gate (`src/components/QAModal.tsx` & `src/lib/qaChecks.ts`):**
     - Hard and soft rule checks (headline limits, body limits, placeholder tokens, and Arabic punctuation jump linting). Blocks export if critical issues exist.

---

## Step 11: Linear-Grade Studio UI/UX & Creator Workflow Revolution
- **User Feedback Addressed:** "no. focuse the improvments on the ui ux and the workflow" and "the slide editor also should be smarter and have autoselection".
- **Engineering Solutions Implemented:**
  1. **TikTok In-App Safe Zone HUD Simulator (`src/components/SlideCanvasPreview.tsx`):**
     - 1:1 mobile feed simulator overlay rendering the right action rail (avatar, like count, comments, bookmarks, share), sound disc, caption ticker, and the $y=1760$ baseline boundary. Keyboard shortcut **`T`** to toggle.
  2. **Sticky Dual-Column Desktop Viewport (`src/App.tsx`):**
     - Pinned canvas preview with `lg:sticky lg:top-20 self-start` to maintain uninterrupted visual feedback while scrolling deep controls.
  3. **Bilingual Side-by-Side Editor (`src/components/SlideEditor.tsx`):**
     - One-click **Split / Stack** toggle enabling side-by-side editing of English headlines and Arabic copy.
  4. **Dynamic Character Progress Bars (`src/components/SlideEditor.tsx`):**
     - Micro-progress bars transitioning from emerald ($\le 75\%$) to amber ($75\text{--}100\%$) to pulsating rose ($>100\%$).
  5. **Interactive Filmstrip & In-Between Inserters (`src/components/SlideCanvasPreview.tsx`):**
     - Thumbnails with archetype tags (`HUB`, `CLI`, `VS`, `ROW`, `CTA`) and hover **`+`** inserters between any two slides.
  6. **Desktop Keyboard Navigation:**
     - **`←` / `→`** to traverse slides, **`1`--`9`** to jump directly to any slide.
  7. **Local Draft Persistence (`src/App.tsx` & `src/components/Header.tsx`):**
     - Auto-save to `localStorage` with a subtle **`✓ Saved [Time]`** status pill and reset action.
  8. **Complete Deliverables ZIP Package (`src/lib/canvasExporter.ts`):**
     - Bundles 8 high-res 1080×1920 JPGs, `caption.txt`, `first_comment.txt`, `short_caption.txt`, `post_metadata.json`, and `README.txt`.
  9. **Font Integration (`index.html`):**
     - Added `JetBrains Mono` for monospace terminal and metric typography.

---

## Step 12: Image Generation & Prompt-Based Editing with `gemini-nano-banana-2.1`
- **Context & User Request:** Integrate high-fidelity server-side AI image generation and natural language image editing for software architecture diagrams and technical visuals.
- **Engineering Solutions Implemented:**
  1. **Image Generation API Endpoint (`api/index.ts` - `POST /api/generate-image`):**
     - Integrated `gemini-nano-banana-2.1` via `@google/genai` TypeScript SDK with native 9:16 vertical ratio (`imageConfig: { aspectRatio: '9:16', imageSize: '1K' }`).
     - Added multi-part input handling (`{ inlineData }` + text prompt) for prompt-based image editing and recoloring.
     - Engineered prompt decorators for software engineering (system blueprint wireframes, dark terminal HUD matrices, distributed service topologies, and threat boundary models).
     - Graceful fallback to `gemini-3.1-flash-lite-image` if quota or rate-limits are reached.
  2. **Embedded Slide Visual Studio (`src/components/SlideImageStudio.tsx`):**
     - One-click technical style presets: *System Blueprint*, *Terminal Core*, *Services Flow*, *Security Boundary*, and *Custom Prompt*.
     - Auto-fill prompt drafted from the active slide's English headline and body copy.
     - Aspect ratio selector (9:16, 16:9, 1:1) and live preview with direct PNG download and 1-click apply to the slide.
  3. **Data Schema Extension (`src/types.ts`):**
     - Extended `SlideData` with `imagePrompt?: string` and `imageModel?: string`.

---

## Step 13: Autonomous Engine & Radical UI/UX Simplification with Progressive Disclosure
- **Context & User Feedback:** "this is very complicated ui the app should be smart and use the tools by its own to give fine results" followed by "thats good ui but we lost a lot of functionalities ??".
- **Engineering Solutions Implemented:**
  1. **End-to-End Autonomous Pipeline (`src/lib/autonomousPipeline.ts`):**
     - Replaced manual button-clicking with a single unified orchestrator:
       - **Synthesize:** Calls `/api/generate` or local synthesizer.
       - **Auto-Sanitize:** Strips markdown syntax (`#`, `**`), orphan dots, and fixes Arabic BiDi character order.
       - **Auto-Fit Limits:** Trims copy to Spec §8 character limits (Title $\le 45$, Body $\le 110$) without visual overflow.
       - **Auto-Generate Architecture Diagram:** Calls `gemini-nano-banana-2.1` to generate a 9:16 blueprint diagram for the core mechanism slide.
       - **Auto-Verify QA:** Silently checks QA compliance and auto-corrects.
  2. **Minimalist Autonomous Studio (`src/components/AutonomousStudio.tsx`):**
     - Single prominent command bar at the top with real-time pipeline status feedback.
     - Integrated **"Ingest Material"** button opening `MultimodalInputPanel` modal for screenshots, code/PDF docs, web URLs, and raw transcripts.
     - Center 1080×1920 slide preview with keyboard navigation (`←`/`→`), safe zones toggle, and slide thumbnail strip.
     - Sleek **Slide Management Bar**: Add (+), Clone/Duplicate, Delete (min 3 guarded), Reorder (Move Left / Right), and Slide 1 Hook variants picker.
     - Direct **Inline Text Editing**: click on any headline or mechanism text (English or Arabic) directly to edit in place.
     - Expandable **Advanced Customizer Drawer**: full archetype controls (Code diff, Metric card, Compare columns, Hub satellite icons, and AI Diagram Studio / Web Media search).
     - Floating 1-Click Delivery Bar: Export All 1080×1920 JPGs (ZIP), Copy TikTok Caption, Copy Slide to Clipboard, Download Active Slide JPG, Theme Switcher, Contact Sheet, and Plan Inspector.
  3. **Streamlined Header (`src/components/Header.tsx`):**
     - Focused wordmark, theme switcher, API key modal, Contact Sheet, Plan Inspector, and auto-save pill.


