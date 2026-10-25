# MARROK Project Chronological Log & Engineering Steps

This document records the chronological development history, engineering decisions, issue resolutions, and user feedback cycles for the **MARROK TikTok Carousel Studio**.

---

## Step 1: Initial Discovery & Product Scoping
- **Context:** The goal was established to build the MARROK TikTok Carousel & Bilingual Caption Engine, translating complex engineering topics into visual TikTok carousels and captions.
- **Requirements Identified:**
  1. Strict adherence to the 5 MARROK slide archetypes (Hub Hook, Row with 1 icon, Row with 2 icons, Row with 3 icons, CTA slide).
  2. Native bilingual layout: Bold English headline on top, natural technical Arabic subtitle directly underneath.
  3. Latin technical noun preservation: Keep proper nouns (e.g. *Git, Anthropic, Docker, DefectDojo, Ghidra*) in Latin characters inside Arabic text to avoid phonetic distortion.
  4. TikTok 1080Ã—1920 9:16 export with safe zones.
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
  1. **Uncompressed Mobile Uploads:** Uploading uncompressed 15MBâ€“20MB camera photos over cellular LTE caused request timeouts and high memory spikes.
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
  4. **âš¡ Instant Synthesize Button:** Added a prominent zero-latency action button for immediate offline generation.

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
     - Kept application site chrome stable dark (`#080d11`) while confining color theme changes strictly to the carousel canvas (`1080Ã—1920`).
  2. **Smart Dynamic Slide Count (5 to 9 Slides):**
     - Replaced rigid 8-slide structure with adaptive length based on content density (lean 5â€“6 slide decks for concise announcements, 8â€“9 slides for complex architecture breakdowns).
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
     - **`â†�` / `â†’`** to traverse slides, **`1`--`9`** to jump directly to any slide.
  7. **Local Draft Persistence (`src/App.tsx` & `src/components/Header.tsx`):**
     - Auto-save to `localStorage` with a subtle **`âœ“ Saved [Time]`** status pill and reset action.
  8. **Complete Deliverables ZIP Package (`src/lib/canvasExporter.ts`):**
     - Bundles 8 high-res 1080Ã—1920 JPGs, `caption.txt`, `first_comment.txt`, `short_caption.txt`, `post_metadata.json`, and `README.txt`.
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
       - **Auto-Fit Limits:** Trims copy to Spec Â§8 character limits (Title $\le 45$, Body $\le 110$) without visual overflow.
       - **Auto-Generate Architecture Diagram:** Calls `gemini-nano-banana-2.1` to generate a 9:16 blueprint diagram for the core mechanism slide.
       - **Auto-Verify QA:** Silently checks QA compliance and auto-corrects.
  2. **Minimalist Autonomous Studio (`src/components/AutonomousStudio.tsx`):**
     - Single prominent command bar at the top with real-time pipeline status feedback.
     - Integrated **"Ingest Material"** button opening `MultimodalInputPanel` modal for screenshots, code/PDF docs, web URLs, and raw transcripts.
     - Center 1080Ã—1920 slide preview with keyboard navigation (`â†�`/`â†’`), safe zones toggle, and slide thumbnail strip.
     - Sleek **Slide Management Bar**: Add (+), Clone/Duplicate, Delete (min 3 guarded), Reorder (Move Left / Right), and Slide 1 Hook variants picker.
     - Direct **Inline Text Editing**: click on any headline or mechanism text (English or Arabic) directly to edit in place.
     - Expandable **Advanced Customizer Drawer**: full archetype controls (Code diff, Metric card, Compare columns, Hub satellite icons, and AI Diagram Studio / Web Media search).
     - Floating 1-Click Delivery Bar: Export All 1080Ã—1920 JPGs (ZIP), Copy TikTok Caption, Copy Slide to Clipboard, Download Active Slide JPG, Theme Switcher, Contact Sheet, and Plan Inspector.
  3. **Streamlined Header (`src/components/Header.tsx`):**
     - Focused wordmark, theme switcher, API key modal, Contact Sheet, Plan Inspector, and auto-save pill.

---

## Step 14: Codebase Pruning, UI Noise Reduction & Build Optimization
- **Context & User Feedback:** Clean up project dead code, investigate preset data redundancy, and reduce UI clutter.
- **Engineering Solutions Implemented:**
  1. **Purged 7 Dead Components (~194.4 KB / ~3,940 lines):**
     - Safely deleted `SlideEditor.tsx`, `SlideCanvasPreview.tsx`, `QAModal.tsx`, `ExportView.tsx`, `SmartPipelineBar.tsx`, `CaptionBox.tsx`, and `CreateView.tsx` with zero regressions.
  2. **Streamlined Presets & Dynamic Starter Topics:**
     - Reduced `src/lib/presets.ts` from 23 KB to ~4 KB, maintaining a single lean `DEFAULT_STARTER_DECK` for initial hydration.
     - Upgraded starter chips to `STARTER_TOPICS` that dynamically populate the command bar and trigger `runAutonomousPipeline()`, creating custom on-demand decks instead of loading static mock JSON.
  3. **Cleaned Ingestion UI (`MultimodalInputPanel.tsx`):**
     - Removed the redundant static "Presets" tab from the ingestion modal, focusing purely on authentic creator inputs: Screenshots/Images, Web/GitHub URLs, and Code/Transcripts.
  4. **Realistic TikTok HUD Safe Zone Simulator:**
     - Upgraded the Safe Zone overlay on the canvas preview to accurately simulate TikTok's top 180px margin (search/header), bottom 320px margin (caption/audio), right-side interaction column (like, comment, bookmark, share), and central 840Ã—1420 content bounding box.
  5. **Vite 8 & Tooling Modernization:**
     - Replaced deprecated `__dirname` in `vite.config.ts` with `import.meta.dirname`.
     - Configured `rollupOptions.output.manualChunks` splitting React/ReactDOM, Lucide icons, and JSZip into separate cached chunks, eliminating the `>500 kB` bundle warning.
     - Updated `npm run clean` to a cross-platform Node script and removed unused `motion` dependency.




---

## Step 15: Generator Authenticity, Grounding, Strict Headline Rules & UI Overlap Fix
- **Context & User Feedback:**
  - Fallback text was silently shipping identical boilerplate copy across topics ("A breakdown of technical mechanisms...") and identical Arabic titles ("?????? ????????? ??????? X").
  - Toast falsely claimed "Autonomously generated and perfected..." on offline drafts.
  - Headlines violated Spec §8 rule (used colons or >5 words like "Zero-Trust mesh architecture with mTLS:" and "Redis 8 architectural leap: Next-Gen Shift.").
  - BiDi punctuation inversion flipped Arabic text touching Latin words ("???? :Anthropic's Scion").
  - False positive subject detection matched the Rust logo on Zero-Trust decks due to "zero-trust".includes("rust").
  - Wordmark improperly adopted topic names ("ANTHROPIC") instead of staying strictly locked to "MARROK".
  - Floating action bar overlapped the bottom of the 1080x1920 preview canvas and obscured subtitle copy on laptop viewports.
- **Engineering Solutions Implemented:**
  1. **Strict Fallback Labeling & Export Blocker:**
     - Added isFallback: boolean and engine: string flags to PostSourceMeta.
     - Decks generated via offline fallback display an **Offline Draft (AI Engine Unavailable)** warning banner with an amber status pill.
     - Export is strictly blocked in both UI and runQAChecks() (fallback-draft-blocker fail rule). Editing any slide copy unmarks fallback status.
  2. **Spec §8 Headline Rule Enforcement (2-5 words ending in a period, zero colons):**
     - Updated enforceHeadlineSpecRule() in src/lib/textSanitizer.ts.
     - Integrated checkHeadlineSpecRule() into src/lib/qaChecks.ts failing any slide with colons, >5 words, or missing terminal period.
     - Updated LLM generation schema and all synthesizer templates ("Zero-Trust, explained.", "Redis 8 gets faster.", "Beyond traditional Git.").
  3. **BiDi & Arabic Typography Hardening:**
     - Sanitized all Arabic punctuation touching Latin words (:Latin and Latin:), preventing BiDi inversion.
     - Implemented typographic widow/orphan prevention in wrapTextLines() (canvasExporter.ts) binding Latin words to Arabic descriptors (\u00A0) so terms like "Zero-Trust" never wrap alone on a line.
     - Replaced boilerplate Arabic templates with tailored technical translations per domain.
  4. **Subject Classification & Icon Resolution Fix:**
     - Eliminated substring matching in extractDynamicIcons(), using strict word boundary regex (\b\b) and guarding against "rust" inside "trust" or "zero-trust".
     - Added dedicated domain rules: CYBERSECURITY & ZERO-TRUST MESH (lock icon, cyber theme) and IN-MEMORY CACHE & DATA STORES (official Redis SVG logo, amber theme).
     - Prioritized VCS keywords (scion, monorepo, git) over generic AI keywords to correctly classify Scion under VCS & DEVSECOPS.
     - Permanently locked brand wordmark to 'MARROK' across both LLM prompts and synthesizer templates.
  5. **Docked Toolbar & Zero Canvas Overlap:**
     - Docked the Action Bar (JPG, Copy, Export ZIP) directly below the slide thumbnails and controls in the left column.
     - Removed the redundant floating bottom bar, guaranteeing zero overlap with the preview canvas and leaving subtitle copy 100% visible on all viewports.
     - Constrained canvas preview to max-h-[min(540px,calc(100vh-250px))] to ensure comfortable fit on standard screens.

---

## Step 16: Draft Review Confirmation, Strict QA Duplicate/Boilerplate Rules, Flexible Headlines & Security Sanitization
- **Context & User Feedback:**
  - Editing any slide character previously cleared the fallback draft status, allowing immediate bypass to export boilerplate.
  - Required an explicit "I reviewed this" confirmation instead of auto-unmarking.
  - Added QA rules that fail duplicated body text across slides and known boilerplate phrases.
  - Headline rule was overly rigid: forcing 2-5 words ending in a period across all slides blocked question hooks and CTA questions like "Need a custom tool?".
  - Required 2-5 words ending in '.', '?', or '!' only for Slide 1 hook, allowed '?' and '!' on CTA slides (up to 8 words), and allowed content slide titles up to 8 words.
  - Hardcoded facts in fallback drafts must be explicitly marked `unverified` and presented as `unverified_draft` (never finished/verified).
  - The `x-gemini-key` header and API secrets must never be logged to console/stdout/stderr.
  - Non-breaking spaces (`\u00A0`) binding Latin to Arabic must be stripped from `caption.txt` and clipboard copies, and long unbreakable chunks must never overflow canvas lines.
- **Engineering Solutions Implemented:**
  1. **Explicit Draft Review Confirmation & Invariant Typing:**
     - Removed auto-clearing of `isFallback` in `handleUpdateCurrentSlide()`. Slide text editing keeps draft metadata intact.
     - Added `handleToggleReviewDraft()` and explicit confirmation button `[✓ I reviewed this draft]` (ID: `confirm-review-draft-btn`).
     - Added `userReviewed?: boolean` and `status: 'unverified_draft'` to `PostSourceMeta`. Export remains locked until creator explicitly confirms review AND passes all pre-export QA rules.
  2. **Automated QA Duplicate Body & Boilerplate Rules (`qaChecks.ts`):**
     - Implemented `checkDuplicateBodyText()`: Fails with severity `fail` if any two slides share identical normalized English or Arabic body copy.
     - Implemented `checkBoilerplatePhrases()`: Fails with severity `fail` if any slide contains known unedited template phrases (e.g. `"A breakdown of technical mechanisms"`, `"النقلة المعمارية لمنظومة"`, `"When system frequency increases, legacy architectures become memory bottlenecks"`).
     - Updated `fallback-draft-blocker` check in `runQAChecks()`: Blocks export unless `carousel.sourceMeta?.userReviewed === true`.
  3. **Multi-Archetype Headline Rules (`textSanitizer.ts` & `qaChecks.ts`):**
     - Slide 1 Hook: Strictly 2 to 5 words, ending in `.`, `?`, or `!`, zero colons.
     - CTA Slide: Allows question hooks up to 8 words ending in `?`, `!`, or `.`.
     - Content Slides: Up to 8 words, clean punctuation, no trailing colons.
     - Updated `enforceHeadlineSpecRule()` to support `{ isHook, isCta }` and preserved hyphens in compound technical tokens (e.g. `Zero-Trust`).
  4. **Unverified Fallback Draft Representation (`synthesizer.ts`):**
     - Fallback facts marked `verified: 'unverified'` with evidence stating `Template fallback estimate — unverified offline draft`.
     - Synthesizer metadata initialized with `status: 'unverified_draft'` and `userReviewed: false`.
     - Dynamic subject-aware fallbacks replace static sentences in general synthesizer structures.
  5. **Zero Secret Logging (`api/index.ts`):**
     - Added `sanitizeLogText()` redacting `x-gemini-key`, `AIza...` tokens, and URL key query parameters before any error or notice is logged.
     - Guaranteed `x-gemini-key` and API keys are never printed in console output or stack traces.
  6. **NBSP Protection & Canvas Overflow Prevention (`canvasExporter.ts`):**
     - In `wrapTextLines()`, bound chunks with `\u00A0` that exceed `maxWidth` are unbound back to spaces so they wrap naturally. Single oversized tokens are chunked to guarantee zero canvas line overflow.
     - Stripped `\u00A0` from `caption.txt`, `claims_citations.txt`, `first_comment.txt`, `short_caption.txt`, and clipboard copies.

---

## Step 17: Implementation of Phase 1 & Phase 2 Graphics Visual System & Arabic RTL Safe Zone
- **Context & Design Philosophy:**
  - Implemented the "Precision Silicon & Terminal Brutalism" visual system outlined in `graphics_visual_system_plan.md`.
  - Followed strict engineering rules:
    1. Sleek, sharp, minimal dark aesthetic using OLED palettes (`teal`, `cyber`, `violet`, `blueprint`, `monochrome`, etc.), crisp 1px–2px borders, and CAD reticles.
    2. Restrained Glow Rule: Tight `shadowBlur` (8px–16px max on active nodes, badges, and borders; strictly 0px blur on text and code) to prevent mobile compression blur.
    3. Terminal Crispness: Subtle 3.5% opacity CRT scanline texture in the code archetype so monospace text remains razor-sharp.
    4. Strict Safe-Zone Rule for Arabic RTL & Typography ($y: 960 \to 1650$): Enforced a right safe margin of at least 135px ($x \le 945$) to guarantee Arabic RTL subtitles, body copy, and punctuation never collide with TikTok's native sidebar action buttons (Like, Comment, Bookmark).
- **Engineering Solutions Implemented in `src/lib/canvasExporter.ts`:**
  1. **Canvas Background CAD Reticles & Tick Marks:**
     - Corner CAD crosshairs (`+`) rendered at structural safe boundaries: $(90, 200)$, $(945, 200)$, $(90, 930)$, $(945, 930)$, $(90, 1720)$, $(945, 1720)$.
     - Vertical tick marks (6px notch inwards) at key vertical intervals along $x = 90$ and $x = 945$.
     - Added `SYS_REF // 1080x1920.CAD_SAFE` coordinate reference stamp in JetBrains Mono.
     - Top-right Category Tag aligned with the right safe CAD boundary at $x = 945$.
  2. **Archetype 3 (`metric`) — Acceleration Sparkline & Gauge Meter:**
     - Giant hero stat rendered with restrained 12px blur, with zero blur on surrounding typography.
     - Exponential bezier sparkline curve with gradient area fill under the curve, accent stroke, and focal peak node.
     - Gauge baseline axis line with 11 tick marks (0% to 100%) and `BASELINE`, `50%`, `PEAK // P99` micro-labels.
     - Paired delta pill dynamically styled in Matrix emerald (`#10B981`) for speedups/latency drops, Threat crimson (`#F43F5E`) for bottlenecks/exploit regressions, or theme accent.
  3. **Archetype 4 (`code`) — Precision Terminal Window & Diff Highlights:**
     - macOS window title bar with traffic dots, centered file name, and top-right syntax language badge (`BASH`, `RUST`, `TS`, `SQL`, `YAML`).
     - Clipped interior with subtle 3.5% opacity CRT scanline texture (`rgba(255, 255, 255, 0.035)`).
     - Muted left-gutter line numbers ($w = 64\text{px}$) with gutter divider line.
     - Line-level diff highlights: `rgba(16, 185, 129, 0.12)` for `+`/`✔` additions, `rgba(244, 63, 94, 0.12)` for `-`/`✖` deletions, and `${theme.accent}0A` for `$` commands.
  4. **Archetype 5 (`compare`) — Dual Split Contrast Tinting & 48px `VS` Badge:**
     - Left Card (`BEFORE · LEGACY`): Elevated dark surface with 10% crimson contrast tint (`rgba(244, 63, 94, 0.08)` fill, `rgba(244, 63, 94, 0.40)` border, 2.5px top crimson line), header badge with red `xCircle`, and red `✖` bullets.
     - Right Card (`AFTER · OPTIMIZED`): Elevated dark surface with theme accent contrast tint (`${theme.accent}12` fill, `${theme.accent}65` border, 2.5px top neon line), header badge with neon `checkCircle`, and emerald `✔` bullets.
     - Midpoint ($x = 540$) centered 48px circular `VS` badge with horizontal bridge line, dark OLED fill, outer glowing ring (12px blur), and crisp monospace `VS` lettering (0px text blur).
  5. **Arabic RTL & Typography Safe-Zone Enforcement ($x \le 945$):**
     - Typography Tier centered at $x = 518$ (midpoint of $x = 90$ and $x = 945$).
     - Title max wrap width set to $850\text{px}$ (bounds: $x = 93 \to 943\text{px}$).
     - Body copy max wrap width set to $820\text{px}$ (bounds: $x = 108 \to 928\text{px}$).
     - CTA buttons, divider lines, and attribution footers centered at $x = 518$.
     - Guarantees complete clearance from TikTok native right-side action icons ($x = 940 \to 1080$ for $y \ge 900$).
- **Verification:**
  - Type-checked with zero errors (`npm run lint`).
  - Production build compiled successfully (`npm run build`).
  - Verified QA check pipeline with zero failures (`runQAChecks`).
  - Visually inspected in browser subagent across hub, metric, code, and compare slides.


## Step 18: Phase 3 Geometric Refinements (Hub & CTA) and Visual Customizer Toggles
- **Context & Design Philosophy:**
  - Completed Phase 3 of the visual graphics system: Archetype 1 (`hub`) calibration geometry, Archetype 8 (`cta`) standardized Marrok closer, and user-facing toggles in `ThemeCustomizer.tsx`.
  - Followed strict engineering constraints:
    1. Precision Silicon & Terminal Brutalism: OLED surfaces, crisp 1px–2px borders, restrained glow (8px–16px max on active badges/nodes; strictly 0px on text and code).
    2. Safe-zone compliance: Enforced right margin clearance $\ge 135\text{px}$ ($x \le 945$) and bottom TikTok overlay limit ($y \le 1840$).
    3. Coaxial symmetry: Aligned all CTA components (isometric diamond, brand wordmark, domain category pill, bilingual question hook, CTA button, and verified attribution card) at $x = 518$.
- **Engineering Solutions Implemented:**
  1. **Archetype 1 (`hub` — Slide 1 Hook):**
     - Tangent Coordinate Crosshairs (`+`): Added 4 tangent coordinate reticles at the orbital ring perimeter $(cx \pm r, cy)$ and $(cx, cy \pm r)$ with 8px arm lengths in `${theme.accent}80`.
     - Concentric Calibration Ring: Added inner solid calibration circle ($r = 192$, lineWidth 1.5), outer segmented dashed ring ($r = 202$, dash pattern `[4, 10]`), ambient pulse glow, and 12 radial ticks at $30^\circ$ increments around the 280×280 Center Hero Badge.
     - Glowing Connection Nodes: Added 76px perimeter connection rings and 10px glowing neon accent nodes (with 10px blur and dark core) where the radial axes intersect the 6 satellite badges.
  2. **Archetype 8 (`cta` — Standardized Marrok Closer):**
     - Outer $45^\circ$ Calibration Ring & CAD Reticles: 145px radius ring with dashed outer track, 8 tick marks at $45^\circ$ increments, and 4 cardinal CAD crosshairs (`+`) at $0^\circ, 90^\circ, 180^\circ, 270^\circ$.
     - Layered Isometric Cube / Diamond Geometry: 3-facet shaded isometric cube at $(518, 440)$ with top diamond (`${theme.accent}26` fill), left diamond (#0c151c dark fill), right diamond (`${theme.accent}14` fill), glowing outer hexagonal perimeter (12px blur), and central neon core badge with bold `M` monogram.
     - Standardized Closer Architecture:
       - Bold `MARROK` brand wordmark (56px) and 100×6 accent divider pill.
       - Domain Category Tag (`[ AI + SOFTWARE ARCHITECTURE ]` or custom category) in JetBrains Mono.
       - Domain Question Hook with safe line wrapping centered at $x = 518$.
       - High-Contrast Bilingual CTA Pill: 656×110 pill button at $y = 1380$ with 14px restrained glow (`[ DM us  •  رسالة خاصة ]`).
       - Verified Attribution Card: $780 \times 96$ card at $y = 1595 \to 1691$ with verified shield icon, brand URL (`marrok.org`), and bilingual credits. All elements strictly clear of bottom ($y \le 1840$) and right ($x \le 945$).
  3. **Theme & Visual Graphics Studio Toggles (`ThemeCustomizer.tsx` + `types.ts` + `canvasExporter.ts`):**
     - Defined `VisualSystemOptions` in `src/types.ts` (`showCadReticles`, `showSparklines`, `terminalScanlines`).
     - Added dedicated 3rd tab `Visual Graphics Toggles` in `ThemeCustomizer.tsx` with interactive iOS-style toggle switches, safe-zone tags, and instant reactive toasts.
     - Wired toggles through `renderSlideToCanvas` in `canvasExporter.ts` with graceful fallback to `carousel.visualOptions`, `customPalette`, and defaulting to `true`.
- **Verification:**
  - Type-checked cleanly with zero errors (`npm run lint`).
  - Production build compiled successfully (`npm run build`).
  - Interactive browser testing executed via `browser_subagent`: verified Hub calibration geometry, CTA isometric emblem, and customizer toggle reactivity with saved visual artifacts.

## Step 19: Full Canvas Integration of Authentic MARROK Vector Logo
- **Context & Design Philosophy:**
  - Integrated the authentic MARROK vector logo (`specs/marrok-logo-square-source.svg`) into the core 1080x1920 canvas export engine (`canvasExporter.ts`) rather than relying solely on the web app header.
  - Ensured synchronous, bulletproof asset loading without network latency, image proxy dependencies, or blank-icon race conditions during export.
- **Engineering Solutions Implemented:**
  1. **Instant Vector Preloading & Synchronous SVG Decode (`icons.ts` + `canvasExporter.ts`):**
     - Implemented `getMarrokLogoSvg()` in `src/lib/icons.ts` emitting the authentic MARROK SVG geometry with custom theme accenting and dark #0D0D0D badge background.
     - Handled `'marrok'` and `'marroklogo'` in `getIconSvg()` and `getIconDataUrl()` via immediate `data:image/svg+xml;charset=utf-8,...` data URIs.
     - Updated `loadIconImage()` in `canvasExporter.ts` with synchronous decode checks (`img.complete && img.naturalWidth > 0`) for data URLs and preloaded `marrokLogoImg` at the start of `renderSlideToCanvas`.
  2. **Top Header Tier on All Slides (`y: 80 -> 220`):**
     - Rendered a compact $34 \times 34\text{px}$ authentic MARROK vector badge at $(82, 110)$ with rounded corners, subtle theme glow, and dark backplate.
     - Positioned the brand wordmark (`MARROK`) immediately to the right ($x = 130$) followed by the pulsing accent dot and category tag.
  3. **Slide 8 (`cta`) Central Core Emblem:**
     - Replaced the plain text `'M'` monogram inside the layered isometric diamond/cube at $(518, 440)$ with a $58 \times 58\text{px}$ dark OLED badge containing the authentic MARROK vector logo and glowing accent perimeter.
  4. **Slide 8 Verified Attribution Card (`marrok.org`):**
     - Rendered a miniature $42 \times 42\text{px}$ authentic MARROK logo badge alongside the verified shield badge inside the attribution card at $y = 1595 \to 1691$.
- **Verification:**
  - Type-checked cleanly with zero errors (`npm run lint`).
  - Production build compiled successfully (`npm run build`).
  - Visually verified in browser subagent on Slide 1 canvas header, Slide 8 CTA emblem, and the attribution card with zero rendering artifacts.

---

## Step 20: Mathematical Optical Centering & Native Path2D Canvas Engine
- **Context & Problem Analysis:**
  - The authentic MARROK SVG logo geometry paths span $x \in [262.0, 445.6]$ (width = $183.6$, center $X = 353.8$) and $y \in [289.0, 477.9]$ (height = $188.9$, center $Y = 383.45$).
  - The legacy `viewBox="250 260 260 260"` created an asymmetrical padding of $12\text{px}$ left margin vs $64.4\text{px}$ right margin, resulting in a visible rightward optical bias when rendered inside square badges.
  - Furthermore, rasterizing SVG via asynchronous `HTMLImageElement` decoding introduced micro-delays and potential blank-canvas race conditions during batch slide rendering.
- **Engineering Solutions Implemented:**
  1. **Optical Dead-Center SVG ViewBox (`specs/marrok-logo-square-source.svg` & `public/marrok-logo.svg`):**
     - Recalibrated both SVGs to `viewBox="234 263 240 240"` with `<rect x="234" y="263" width="240" height="240" fill="#0D0D0D"/>`.
     - Calculated exact margins: $28.0\text{px}$ left vs $28.4\text{px}$ right margin ($<0.4\text{px}$ delta), and $26.0\text{px}$ top vs $25.1\text{px}$ bottom margin ($<0.9\text{px}$ delta), guaranteeing true sub-pixel optical dead-centering.
  2. **Synchronous Native Path2D Vector Engine (`src/lib/icons.ts`):**
     - Extracted `MARROK_LOGO_PATHS` containing path definitions for `pathMain`, `pathRightBottom`, `pathAccent`, and `pathLeftFrame`, along with true center $(353.8, 383.45)$ and viewBox definitions.
     - Implemented `drawMarrokVectorBadge(ctx, cx, cy, size, accentColor, bgColor, borderRadius)` using native HTML5 Canvas `Path2D`.
     - Scaled dynamically using `scale = size / 240` and transformed relative to dead-center $(353.8, 383.45)$, rendering 100% synchronously with zero decode latency and zero raster blur.
     - Preserved the authentic two-tone signature: 3 white paths (`#FFFFFF`) and 1 theme-accented top-right triangle path (`theme.accent` / `#364bde`).
     - Updated `ICONS_REGISTRY.marrok` and `getMarrokLogoSvg()` to use the new $(353.8, 383.45)$ translation offset.
  3. **Canvas Exporter Integration (`src/lib/canvasExporter.ts`):**
     - **Slide Header Tier (`y: 80 -> 220`):** Rendered a crisp $32 \times 32\text{px}$ logo badge at $(82, 112)$ using `drawMarrokVectorBadge()`, paired with `ARROK` logotype wordmark at a tight 9px kerning gap so the badge functions as the visual initial `'M'`.
     - **Slide 8 (`cta`) Central Core:** Replaced plain text `'M'` inside the central core of the isometric diamond at $(518, 440)$ with `drawMarrokVectorBadge(ctx, emblemX, emblemY, coreSize - 6, theme.accent, 'transparent')`.
     - **Slide 8 Attribution Card:** Replaced image rendering in the `marrok.org` verified card with `drawMarrokVectorBadge()`.
- **Verification:**
  - TypeScript validation passed with zero errors (`npm run lint`).
  - Production build compiled cleanly in 245ms (`npm run build`).
  - Browser inspection confirmed dead-center alignment on Slide 1 header and Slide 8 CTA core and attribution card.

---

## Step 21: Upstream AI Synthesizer Routing + Metricool Publishing Bundle
- **Context & Design Decisions:**
  - Standardized the header brand presentation to avoid dropping the 'M' character when paired with the authentic square badge, rendering `[Badge] MARROK •` with a crisp 12px gap across both the web studio navbar and exported slide canvas headers.
  - Implemented domain-aware visual theme selection to automatically route input topics to the optimal OLED palette (`teal` for SRE/DevTools/Backend, `cyber` for Security/Post-Quantum/Zero-Trust, `violet` for AI/LLMs, `blueprint` for Cloud/K8s/System Architecture, `amber` for Databases/SQL/Caching, and `emerald` for Linux Kernel/eBPF).
  - Enhanced archetype synthesis with strict typing and formatting: uppercase `codeLanguage` badges (`BASH`, `TS`, `RUST`, `JAVA`, `SQL`, `YAML`) with terminal diff prefixes (`$`, `+`, `-`, `✔`), metric delta pills with explicit polarity indicators (`▲`/`▼`), and standardized Slide 8 CTA hooks.
  - Built the Metricool Publishing Bundle inside `downloadAllSlidesZip` to package ready-to-schedule captions and portable carousel manifests alongside high-res slides.
- **Engineering Solutions Implemented:**
  1. **Header Wordmark Refinement (`canvasExporter.ts` & `Header.tsx`):**
     - Retained the $32 \times 32\text{px}$ `drawMarrokVectorBadge()` icon and rendered the full brand wordmark `MARROK` at $x = 126$ with a clean 12px gap.
     - Updated web studio navbar brand link in `Header.tsx` to match.
  2. **Domain-Aware Theme Routing & Archetype Fields (`synthesizer.ts`, `autonomousPipeline.ts`, `AutonomousStudio.tsx`):**
     - Implemented and exported `resolveDomainTheme()` in `src/lib/synthesizer.ts` with comprehensive regex heuristics covering cyber threat crimson, electric AI violet, matrix emerald, solarized amber, enterprise blueprint, and terminal teal.
     - Wired auto-theme routing through `runAutonomousPipeline()` and reactive studio theme switching in `AutonomousStudio.tsx` (`onSelectTheme(DEFAULT_PALETTES[generated.theme])`).
     - Standardized `code` slides with uppercase `codeLanguage` badges and terminal syntax highlighting prefixes (`$`, `>`, `-`, `+`, `✔`).
     - Enforced `▲` and `▼` polarity indicators across all benchmark and telemetry metric slides.
     - Locked in recognizable domain question hooks and bilingual CTA format (`[ DM us  •  رسالة خاصة ]`) across Slide 8 candidate arcs.
  3. **Metricool Publishing Bundle (`canvasExporter.ts`):**
     - Added `caption-bilingual.txt` to the export ZIP archive containing formatted English + Arabic copy, hook, reference link, CTA action, and hashtags formatted for Metricool scheduling.
     - Added `carousel-manifest.json` containing the serialized `CarouselData`, active theme palette, visual options, and export timestamp for auditing and re-importing.
  4. **Pre-Publish QA Suite Enhancement (`qaChecks.ts`):**
     - Implemented `checkArchetypeFields()` to validate code snippet presence, language badge specification, diff syntax prefixes, metric value/diff existence, delta polarity symbols, and compare column headers.
     - Implemented `checkArabicSafeZone()` to verify that Arabic body line counts (max 4 lines) and token lengths stay strictly within safe-zone thresholds ($x \le 945$, $y \le 1760$).
- **Verification:**
  - `npm run lint` (`tsc --noEmit`): Passed with 0 errors.
  - `npm run build` (`vite build`): Production bundle compiled in 255ms.
  - Verified in browser with `browser_subagent`: confirmed `[Badge] MARROK •` header formatting, auto-theme routing on topic generation, syntax diff code highlighting, metric polarity pills, and QA checks contact sheet.

---

## Step 22: Redesign of Slide Graphics Engine (Abolish Static Icon Boxes, Labeled Architecture Maps, Bespoke Schematics & CTA Isolation)
- **Context & Design Decisions:**
  - Abolished rigid, repetitive, solid-colored icon boxes (`[Icon] [Icon]`) that visually failed to explain architecture on exported slides (`canvasExporter.ts`).
  - Redesigned Slide 1 (`hub`) from anonymous floating squares into an authentic, labeled system architecture map with technical label pills (`mTLS / x509`, `Envoy Mesh`, `IAM Policy`, etc.) and directional flow paths.
  - Eliminated the bug where Slide 4 rendered the `cta` Marrok closer in the middle of the deck, strictly isolating the `cta` closer to the final slide (`slideIndex === totalSlides - 1`).
  - Replaced lonely single-icon placeholder boxes on Slide 7 with rich metric telemetry cards and architectural takeaway cards.
  - Fixed `/api/generate` parameter parsing to accept `prompt`, `topic`, and `notes`, eliminating 400 Bad Request fallbacks.
- **Engineering Solutions Implemented:**
  1. **Bespoke Architecture Diagram Engines (`canvasExporter.ts`):**
     - `drawMultiNodeTopologyFlow`: 3-node connected protocol handshake sequence (`Client Node` $\to$ `mTLS Envoy Proxy` $\to$ `Isolated Workload Pod`) with dark glassmorphic cards, protocol badge pills (`mTLS`, `ALLOW`), status pills (`INITIATOR`, `VERIFIED`, `ISOLATED`), and telemetry footer.
     - `drawBlastRadiusIsolationGrid`: Multi-cell segmented boundary featuring quarantined breached pod (crimson), vertical air-gap firewall barrier (`|| DENY ||`), protected mesh pod, and air-gapped DB vault with lateral spread prevention benchmark banner.
     - `drawLayeredArchitectureStack`: 3-tier horizontal architecture stack (Edge Ingress & Auth, Service Mesh Control Plane, Hardened Storage) with left neon strips, flow chevrons, and end-to-end cryptographic traceability.
     - `drawKeyTakeawayCard`: High-impact architectural principle card with prominent headline, left neon bar, and dual comparative constraint sub-cards (`CRITICAL CONSTRAINT` vs `PRODUCTION DEFENSE`).
  2. **Slide 1 Labeled Architecture Map (`canvasExporter.ts`):**
     - Central hero hub rendered with dark glassmorphic plate (`#081216` with accent border, not solid neon) and `[ SYSTEM CORE ]` micro-badge.
     - 6 satellites rendered as dark glassmorphic plates with CAD corner marks, directional flow chevrons (`►`), and crisp technical label pills (`mTLS / x509`, `Envoy Mesh`, `IAM Policy`, `Micro-Seg`, `Cert Rotation`, `Telemetry API`).
  3. **Strict CTA Archetype Isolation (`canvasExporter.ts`, `textSanitizer.ts`, `synthesizer.ts`):**
     - Guarded `cta` rendering in `canvasExporter.ts` with `slideIndex === totalSlides - 1`. Non-final slides with `type: 'cta'` are redirected to technical schematics and render text zones cleanly.
     - Enforced `safeType` in `sanitizeSlide` (`src/lib/textSanitizer.ts`) and slide mapping invariant in `src/lib/synthesizer.ts`.
  4. **Upstream API Parameter Normalization (`api/index.ts` & `autonomousPipeline.ts`):**
     - Added `rawPrompt = req.body.prompt || req.body.topic || req.body.notes` to handle all client payloads without 400 Bad Request errors.
  5. **No Repeated Graphic Layouts Across Slide Decks:**
     - Decks now present 8 unique visual archetypes:
       - Slide 1: Labeled Hub Architecture Map
       - Slide 2: Metric Benchmark Card
       - Slide 3: Split Architecture Comparison (`compare`)
       - Slide 4: Silicon Monospace Terminal Diff (`code`)
       - Slide 5: Layered Architecture Pipeline Stack
       - Slide 6: Multi-Node Protocol Topology Flow
       - Slide 7: Blast Radius Isolation Grid / Takeaway Card
       - Slide 8: Standardized Marrok CTA Closer
- **Verification:**
  - `npm run lint` (`tsc --noEmit`): Passed with 0 errors.
  - `npm run build` (`vite build`): Production bundle compiled in 516ms.
  - Subagent visual inspection of Contact Sheet (`contact_sheet_8_slides_1792932004426.png`) verified all 8 slides render bespoke technical schematics with zero static flat boxes and zero mid-deck CTA duplications.

---

### Step 23: 100% Topic-Driven Slide Graphics & Dynamic Diagram Data Pipeline
- **Context & Core Problem:**
  - Graphics on slides in `canvasExporter.ts` previously had hardcoded fallbacks to Zero-Trust / Envoy Proxy / mTLS / SPIFFE / AES-256-GCM. When users generated carousels on non-security topics (such as PostgreSQL, Docker, Proxmox, Next.js, or AI Agents), rendering mTLS/Envoy diagrams was contextually incorrect.
- **Engineering Solutions Implemented:**
  1. **Dynamic Diagram Data in `SlideData` (`src/types.ts`):**
     - Added `satLabels?: string[]` (for Slide 1 Hub orbital satellite badges).
     - Added `diagramVariant?: 'topology' | 'stack' | 'isolation' | 'takeaway'`.
     - Added `diagramNodes?: Array<{ label: string; sublabel?: string; status?: string; icon?: string }>`.
     - Added `diagramEdges?: string[]` (for inter-node flow badges).
     - Added `diagramFooter?: string` (for bottom telemetry bar).
  2. **Upstream Gemini Prompt & Response Schema (`api/index.ts`):**
     - Updated `CAROUSEL_RESPONSE_SCHEMA` to validate `satLabels`, `diagramVariant`, `diagramNodes`, `diagramEdges`, and `diagramFooter`.
     - Updated `MARROK_SYSTEM_PROMPT` and `userPromptText` with strict rules requiring topic-specific diagrams and forbidding generic networking terms.
     - Enriched API returns with `enrichCarouselDiagrams` to ensure complete diagram coverage.
  3. **Universal Synthesizer Diagram Pipeline (`src/lib/synthesizer.ts` & `autonomousPipeline.ts`):**
     - Implemented `enrichCarouselDiagrams()` providing domain-specific diagram packs:
       - **PostgreSQL / SQL / Databases:** satLabels (`PgBouncer Pool`, `Shared Buffers`, `WAL Engine`, `B-Tree Index`, `Query Planner`, `Vacuum Worker`); Stack nodes (`PgBouncer Pool`, `B-Tree Index Scan`, `Shared Buffers Storage`); Telemetry (`ZERO UNINDEXED TABLE SCANS • EXPLAIN ANALYZE < 1.0ms`).
       - **Docker / Proxmox / Virtualization:** satLabels (`OCI Container`, `OverlayFS`, `cgroups v2`, `Bridge Net`, `Host Kernel`, `ZFS Storage`); Stack nodes (`CONTAINER WORKLOAD & SHIM`, `KERNEL VIRTUALIZATION ENGINE`, `HARDWARE HOST & HYPERVISOR`); Telemetry (`ZERO EMULATION PENALTY • HARDWARE-ASSISTED VIRTUALIZATION`).
       - **Next.js / Web / Edge:** satLabels (`Edge CDN`, `RSC Engine`, `SSR Worker`, `Static ISR`, `API Route`, `Client DOM`); Stack nodes (`GLOBAL EDGE & ROUTING`, `REACT SERVER COMPONENTS`, `DATA FETCH & BACKEND`); Telemetry (`CORE WEB VITALS: 100/100 • INSTANT CLIENT INTERACTIVITY`).
       - **AI Models & Agents:** satLabels (`Prompt Core`, `Context Window`, `Vector Store`, `Tool Calling`, `Inference Run`, `Token Stream`); Topology nodes (`Agent Planner`, `Vector Store`, `Inference Engine`); Telemetry (`TTFT: 110ms • TOKENS/SEC: 85`).
       - **Dynamic Keyword Extractor Fallback:** Extracts clean tokens from slide title/body for any unseen tech domain.
  4. **100% Data-Driven Canvas Drawing Engine (`src/lib/canvasExporter.ts`):**
     - Refactored `drawMultiNodeTopologyFlow`: Renders `slide.diagramNodes`, `slide.diagramEdges`, `slide.diagramFooter` with dynamic title-keyword fallbacks.
     - Refactored `drawBlastRadiusIsolationGrid`: Renders 3 cells dynamically from `slide.diagramNodes`, barrier tag from `slide.diagramEdges[0]`, and bottom banner from `slide.diagramFooter`.
     - Refactored `drawLayeredArchitectureStack`: Renders 3 tiers from `slide.diagramNodes` and traceability line from `slide.diagramFooter`.
     - Refactored `drawKeyTakeawayCard`: Dynamically pulls principle, constraints, and production standards from `slide.enTitle`, `slide.enBody`, and `slide.diagramNodes`.
     - Refactored `drawHub`: Neutralized `DEFAULT_ICON_LABELS` and prioritizes `slide.satLabels`.
- **Verification:**
  - `npm run lint` (`tsc --noEmit`): Passed with 0 errors.
  - `npm run build` (`vite build`): Passed with 0 errors.
  - Visual QA in Contact Sheet verified with 2 distinct non-security topics:
    - **PostgreSQL Indexing & Query Optimization:** Contact sheet screenshot (`contact_sheet_postgres_1792935738273.png`) shows PostgreSQL elephant SVG, amber palette, PgBouncer / Buffer Cache / B-Tree satellites, and database connection pool stack.
    - **Docker & Proxmox Virtualization Architecture:** Contact sheet screenshot (`contact_sheet_docker_proxmox_1792935833157.png`) shows Docker whale SVG, blueprint palette, OCI / OverlayFS / cgroups satellites, and container shim / kernel virtualization stack.
  - Verified 0 occurrences of hardcoded mTLS/Envoy on non-security decks.

## Step 24: Live Diagram Controls in Slide Editor & Metricool Publishing Bundle
- **1. Live Diagram Controls in Slide Editor (`AutonomousStudio.tsx`):**
  - **Slide 1 (`hub`)**: Added compact input pills allowing live editing of each of the 6 orbital satellite labels (`satLabels`), with real-time canvas preview updates.
  - **Architecture Diagram Slides (`row` / mechanism slides)**:
    - **Diagram Layout Switcher**: Added 1-click layout switcher pills (`Topology Flow`, `Layered Stack`, `Isolation Grid`, `Key Takeaway`) bound to `slide.diagramVariant`. Prioritized `slide.diagramVariant` in `canvasExporter.ts` over heuristic fallback to ensure immediate 1-click schematic toggling.
    - **Schematic Nodes (3 Components)**: Added compact editable fields for `label`, `sublabel`, and `status` tags on all 3 nodes.
    - **Connectors & Telemetry**: Added live inputs for Connector 1 → 2 (`diagramEdges[0]`), Connector 2 → 3 (`diagramEdges[1]`), and Footer Telemetry Line (`diagramFooter`).
  - Added dedicated helper update functions (`handleUpdateSatLabel`, `handleUpdateDiagramNode`, `handleUpdateDiagramEdge`) that preserve source metadata and trigger reactive canvas updates.
  - Sanitized diagram fields in `textSanitizer.ts` (`sanitizeSlide`).
- **2. Header Wordmark Polish (`canvasExporter.ts` & `Header.tsx`):**
  - Ensured top-left slide header text next to `drawMarrokVectorBadge()` strictly renders the full word **`MARROK`** (`[Badge] MARROK •`), guarding against any raw brand string starting with or set to `ARROK`.
  - Updated web application header wordmark in `Header.tsx` to `MARROK` for consistency.
- **3. Metricool ZIP Export Bundle (`downloadAllSlidesZip` in `canvasExporter.ts`):**
  - High-res PNG export: Slides are generated lossless as 1080x1920 PNGs (`slide1.png` to `slideN.png`) at both folder and root levels.
  - `caption-bilingual.txt`: Formatted ready-to-paste Metricool copy including screen hook, bilingual English + Arabic caption, standardized Marrok closing line/CTA (`marrok.org`), and engineering hashtags.
  - `carousel-manifest.json`: Full serialized `CarouselData` (with active palette, visualOptions, and diagram fields) for deck archival and re-import.
  - Updated `README.txt` with clear step-by-step Metricool publishing instructions.
- **Verification:**
  - `npm run lint` (`tsc --noEmit`): Passed with 0 errors.
  - `npm run build` (`vite build`): Passed with 0 errors.
  - Browser subagent tested and recorded live interactive editing on `http://localhost:3000`:
    - Slide 1 Hub: Edited satellite node 1 to `CORE GATEWAY` and verified real-time canvas update.
    - Slide Mechanism (`row`): Toggled layout switcher between `Layered Stack`, `Isolation Grid`, and `Topology Flow`.
    - Live node editing: Updated node 1 to `CUSTOM CLIENT`, sublabel to `TLS 1.3`, status to `VERIFIED`, connector to `SYNC`, and footer to `TESTED LIVE // P99 < 0.2ms` with instantaneous visual feedback on canvas.
  - Automated Node.js script verified Metricool ZIP file hierarchy and parsing.

---

## Step 25: Zero-Touch Autonomous Layout & Pacing Engine
- **Context & User Goal:**
  - Eliminate manual tweaking and maximize automatic slide layout quality on the first pass so that generating a carousel produces balanced, varied, and collision-free slides without manual label edits or layout switching.
- **Engineering Solutions Implemented:**
  1. **Autonomous Visual Pacing & Anti-Repetition (`src/lib/synthesizer.ts` & `src/lib/autonomousPipeline.ts`):**
     - Implemented `balanceCarouselVisualPacing(slides: SlideData[])`:
       - Tracks preceding mechanism layout (`lastMechanismVariant`) and cumulative variant counts to guarantee **zero adjacent duplicate diagram layouts** across a carousel.
       - Cycles mechanism slides through `['topology', 'stack', 'isolation', 'takeaway']` based on slide semantics, picking the least-used candidate to prevent repetition.
       - Automatically validates and repairs missing `diagramNodes`, `diagramEdges`, `diagramFooter`, `codeFileName`, `codeLanguage`, `codeSnippet`, and `metricDiff` fields during pipeline execution so no slide renders half-empty.
     - Integrated `balanceCarouselVisualPacing()` directly into Step 3b of `autonomousPipeline.ts` and `synthesizeCarousel()`.
  2. **Self-Healing Canvas Layout & Auto-Fit Typography (`src/lib/canvasExporter.ts`):**
     - **`fitTextInBox` Helper:** Dynamically measures `ctx.measureText(text).width` and steps down font size (down to readable minimums) or wraps into 2 lines for `satLabels` pills, `diagramNodes` cards, `diagramEdges` badges, status pills, and `compare` columns, eliminating text overflow and manual shortening.
     - Applied `fitTextInBox` across:
       - `drawHub`: Auto-fits all 6 orbital satellite label pills.
       - `drawMultiNodeTopologyFlow`: Auto-fits 3 node titles, sublabels, status pills, 2 connector edge pills, and bottom telemetry bar.
       - `drawBlastRadiusIsolationGrid`: Auto-fits 3 cell titles, sublabels, status pills, firewall barrier badge, and benchmark banner.
       - `drawLayeredArchitectureStack`: Auto-fits 3 tier titles, sublabels, right status pills, and bottom traceability line.
       - `drawKeyTakeawayCard`: Auto-fits principle headline, subheadline, body copy, and 2 constraint/standard cards.
       - `drawCompare`: Auto-fits left/right column header badges and bullet lines with 2-line auto-wrap.
     - **Dynamic Vertical Optical Centering:**
       - Replaced hardcoded vertical coordinates with dynamic tracking of `yGraphicEnd` (`980` for `hub`, `540` for `number`, `670` for `row`/`metric`/`code`/`compare`/`image`).
       - Pre-measures English and Arabic titles and body lines, computing exact `hTextTotal`.
       - Distributes breathing room using an optical ratio (38% top cushion, 62% bottom breathing room) between `yGraphicEnd` and `y = 1710` (116px safe cushion above footer pagination dots).
       - Automatically scales down vertical line spacing if copy is exceptionally long, preventing both awkward empty gaps on short slides and footer collisions on long slides.
     - **Arabic RTL Line-Height & Margin Polish:**
       - Provided generous line-heights (`102px` for 70px Cairo headline = 1.457x; `58px` for 38px Cairo body = 1.526x) to prevent ascender/descender/diacritic clashes with Latin text above.
       - Strictly maintained right margin safe zone (`maxWidth <= 850` centered at `x = 518`, ensuring `x <= 943 <= 945` safe CAD boundary clearing TikTok right-side action buttons).
  3. **Zero-Config Theme-Aware AI Diagrams (`src/components/SlideImageStudio.tsx` & `api/index.ts`):**
     - Exported `buildThemeAwareDiagramPrompt(slide, theme)` which automatically constructs a technical dark OLED schematic prompt using `slide.enTitle`, `slide.diagramNodes`, and the deck's exact hex colors (`theme.accent`, `theme.baseBg`, `theme.surface`).
     - Added prominent `⚡ 1-Click Generate Theme Schematic (Zero-Config)` button in `SlideImageStudio.tsx` that triggers generation with 1 click without requiring the user to type a prompt.
     - Updated `api/index.ts` (`POST /api/generate-image`) to accept `themeAccent`, `themeBg`, and `themeSurface` and inject exact palette directives into the image generation prompt.
- **Verification:**
  - `npm run lint` (`tsc --noEmit`): Passed with 0 errors.
  - `npm run build` (`vite build`): Passed with 0 errors (built in 340ms).
  - Browser subagent tested and recorded live interactive generation on `http://localhost:3000`:
    - Generated complex engineering topic: *"PostgreSQL B-Tree Indexing vs LSM Tree Write Amplification in Distributed Storage"*.
    - Contact Sheet verified all 8 slides:
      - Slide 1: Hub archetype with PostgreSQL elephant icon and 6 auto-fitted satellite pills (`PgBouncer Pool`, `Shared Buffers`, `WAL Engine`, `B-Tree Index`, `Query Planner`, `Vacuum Worker`).
      - Slide 2: Metric card (`50x query speedup`, sparkline, delta pill).
      - Slide 3: Compare card (`Where legacy approaches hit limits`, VS badge).
      - Slide 4: Code terminal (`Decoupled state execution`, syntax highlighting).
      - Slide 5: Layered Architecture Stack (`Server-side authoritative design`, 3 tiers).
      - Slide 6: Fault Isolation Grid (`The Catch The operational cost`, 3 cells with firewall air-gap).
      - Slide 7: Metric card (`10x`, sparkline).
      - Slide 8: Standardized Marrok Closer (CTA, isometric badge, DM pill, attribution card).
    - Verified zero adjacent duplicate diagram layouts (Slide 5 = `stack`, Slide 6 = `isolation`).
    - Verified balanced optical vertical breathing room and collision-free typography throughout.

---

## Step 26: Slide Layout Archetype Switching & Node Auto-Wrap Bug Fix
- **Context & Problem Statement:**
  - Clicking buttons under `SLIDE LAYOUT ARCHETYPE` (`Hub`, `Mechanism`, `Diagram / AI`, `Code Diff`, `Metric`, `Compare`, `CTA`) in `AutonomousStudio.tsx` failed to switch the slide graphic on the canvas.
  - On Slide 5, inside the 3 horizontal cards of `Topology Flow`, long titles (`CONNECTION POOL & IN...`, `QUERY OPTIMIZER & INDE...`, `BUFFER CACHE & STORAG...`) were truncated with `...` due to single-line truncation in ~240px wide cards.
- **Root Cause Analysis:**
  1. **Sanitizer Mid-Deck Overwrite (`textSanitizer.ts`):** `sanitizeSlide()` contained `const safeType = slideIndex === 0 ? 'hub' : slideIndex === totalSlides - 1 ? 'cta' : (slide.type === 'cta' || slide.type === 'hub' ? 'row' : slide.type);`, which forcefully reset any mid-deck slide clicked to `Hub` or `CTA` back to `row`.
  2. **Canvas Exporter Type Dispatch Interference (`canvasExporter.ts`):** Line 1507 checked `slide.type === 'row' || (slide.type === 'cta' && slideIndex !== totalSlides - 1)`, routing mid-deck CTA slides into `row` schematics, while line 2318 strictly checked `slideIndex === totalSlides - 1`.
  3. **Empty Data on Archetype Switch:** Switching a slide from `row` to `code`, `metric`, or `compare` left `codeSnippet`, `metricValue`, or `compareLeftTitle`/`compareRightTitle` undefined, causing empty/fallback renders without slide context.
  4. **Node Title Truncation:** `drawMultiNodeTopologyFlow` called `fitTextInBox` with `initialFontSize: 19, minFontSize: 13`, causing titles exceeding 2 lines at 13px to truncate with `...`. Furthermore, `synthesizer.ts` domain presets had verbose 25–34 character node labels.
- **Engineering Solutions Implemented:**
  1. **Preserve User-Selected Archetypes (`src/lib/textSanitizer.ts`):**
     - Updated `sanitizeSlide()` to use `const safeType = slide.type || (slideIndex === 0 ? 'hub' : slideIndex === totalSlides - 1 ? 'cta' : 'row');`.
     - Preserves user explicit archetype clicks on any slide, enforcing the no-mid-deck-CTA rule strictly during initial AI synthesis (`synthesizer.ts`).
  2. **Strict Archetype Dispatching (`src/lib/canvasExporter.ts`):**
     - Changed dispatch order to strictly evaluate `slide.type` FIRST (`hub`, `metric`, `code`, `compare`, `image`, `cta`, `number`, default `row`), ensuring `slide.diagramVariant` never overrides `slide.type` when `slide.type !== 'row'`.
     - Updated text zone rendering to `if (slide.type !== 'cta')`, allowing CTA closer slides to render self-contained at any slide index.
  3. **Auto-Seed Archetype Data on Switch (`src/lib/synthesizer.ts`, `src/components/AutonomousStudio.tsx`, `src/lib/canvasExporter.ts`):**
     - Implemented and exported `seedSlideArchetypeData(slide, targetType)`:
       - `metric`: Extracts metrics from title/body or defaults to `'10x'`, auto-populates `metricLabel` and delta pill from `diagramNodes[0]`.
       - `code`: Formats terminal diff snippet from `diagramNodes` with appropriate syntax language and filename (`query.sql`, `deploy.sh`, `engine.rs`).
       - `compare`: Synthesizes Before/After comparison columns (`LEGACY BOTTLENECK` vs `MODERN ARCHITECTURE`) using `diagramNodes`.
       - `hub`: Auto-populates 6 orbital `satLabels` from `diagramNodes` and topic keywords.
       - `image`: Activates HUD blueprint frame and exposes `SlideImageStudio` controls.
       - `cta`: Populates bilingual closer action copy (`DM us • رسالة خاصة`).
     - Added `handleSetSlideType(newType)` in `AutonomousStudio.tsx` to immediately seed data and update canvas on archetype button click.
     - Added `seedSlideArchetypeData` fallback inside `renderSlideToCanvas` so rendering is always robust even if called externally.
  4. **Self-Healing 2-Line Auto-Wrapping for Topology Nodes (`src/lib/canvasExporter.ts` & `src/lib/synthesizer.ts`):**
     - In `drawMultiNodeTopologyFlow` and `drawBlastRadiusIsolationGrid`, updated `fitTextInBox` to scale font size from `16px` down to `12px` with `maxLines: 2` and adjusted vertical baseline positions (`nodeY + 98` and `nodeY + 98 + lineHeight`).
     - In `wrapTextLines()`, safeguarded orphan reflow so words are only moved to the last line if `candidateLastLine` fits within `maxWidth`.
     - In `synthesizer.ts`, pruned all generated `diagramNodes[i].label` across all domain packs (Postgres, Docker, Next.js, AI, Scion, Zero-Trust) to concise 2–3 word names ($\le 18$ characters: e.g. `PgBouncer Pool`, `Query Planner`, `Buffer Cache`), keeping rich technical explanations in `sublabel`.
- **Verification:**
  - `npm run lint` (`tsc --noEmit`): Passed with 0 errors.
  - `npm run build` (`vite build`): Production bundle built in 228ms with 0 errors.
  - Browser subagent tested interactive archetype switching on `http://localhost:3000` (Slide 5):
    - Clicked `Hub` -> Canvas immediately updated to Hub circular orbit with 6 auto-seeded satellite badges.
    - Clicked `Code Diff` -> Canvas immediately updated to Terminal window with clean diff lines and language badge.
    - Clicked `Metric` -> Canvas immediately updated to Metric benchmark card with `10x` multiplier and sparkline.
    - Clicked `Compare` -> Canvas immediately updated to Before vs After dual-card columns.
    - Clicked `CTA` -> Canvas immediately updated to Marrok Closer with calibration rings and DM pill.
    - Clicked `Diagram / AI` -> Canvas immediately updated to Blueprint HUD frame with corner CAD brackets.
    - Clicked `Mechanism` -> Canvas returned to Topology Flow with all 3 node titles cleanly wrapped across 2 lines without any `...` truncation.

---

## Step 27: Architecture Audit & Batch 1 Refactoring (Phases 1, 2, and 3)
- **Context & Audit:**
  - Evaluated the codebase against `specs/codebase_audit_and_refactor_plan.md` to eliminate file bloat, dead code, and god-files without regressions.
- **Engineering Solutions Implemented:**
  1. **Phase 1: Pure Foundations & Dead Code Purge:**
     - Extracted themes and palettes into `src/lib/theme/palettes.ts` and `src/lib/theme/specThemes.ts`.
     - Purged 300+ lines of dead code and top-level mutation loops in `src/types.ts`.
     - Kept `src/types.ts` as a backwards-compatible barrel re-export.
  2. **Phase 2: Text Processing & BiDi Pipeline Modularization:**
     - Split 740-line `textSanitizer.ts` into `src/lib/text/`: `bidi.ts`, `arabicPunctuation.ts`, `headlineRules.ts`, `characterLimits.ts`, `markdownStripper.ts`, `slideSanitizer.ts`.
     - Maintained `src/lib/textSanitizer.ts` as a barrel re-export.
  3. **Phase 3: Content Synthesizer Decomposition:**
     - Split 1,223-line `synthesizer.ts` into `src/lib/synthesis/`: `types.ts`, `domainProfiles.ts`, `pacingEngine.ts`, `diagramPacing.ts`, `templates.ts`, `pipeline.ts`.
     - Maintained `src/lib/synthesizer.ts` as a barrel re-export.
- **Verification:**
  - Gates 1, 2, and 3 verified with `npm run lint` and `npm run build` passing with 0 errors.

---

## Step 28: Architecture Refactoring Batch 2 (Phases 4, 5, and 6) & System Optimization
- **Context & Objectives:**
  - Execute Batch 2 of the approved refactoring plan to modularize the 3,118-line canvas exporter, 1,434-line studio UI, and 1,011-line server API routes.
- **Engineering Solutions Implemented:**
  1. **Phase 4: Canvas Exporter Modularization (`src/lib/canvas/`):**
     - Split monolithic `canvasExporter.ts` into focused modules:
       - `constants.ts`: Centralized 1080x1920 coordinates, safe zones (`x <= 945`, `y <= 1840`), and typography scales.
       - `textLayout.ts`: `wrapTextLines` with NBSP metric unit protection and orphan prevention, plus `fitTextInBox` self-healing font auto-scaler.
       - `imageLoader.ts`: SVG rasterization, image caching, and CORS proxy routing.
       - `background.ts`: OLED backgrounds, ambient radial glow, engineering grid, CAD corner brackets, brand header, and footer.
       - `archetypes/`: Dedicated render modules (`renderHub.ts`, `renderMetric.ts`, `renderCode.ts`, `renderCompare.ts`, `renderDiagram.ts`, `renderImage.ts`, `renderCta.ts`).
       - `renderSlide.ts`: Master slide coordinator. **Critical fix**: Removed text re-sanitization from inside the canvas draw loop; text rendering is now a pure, read-only projection of state.
       - `exporter.ts`: PNG export, Contact Sheet generation, and `downloadAllSlidesZip` with asynchronous microtask yielding (`await new Promise(r => setTimeout(r, 0))`) preventing UI thread lock.
     - Kept `src/lib/canvasExporter.ts` as a backwards-compatible 5-line barrel re-export.
  2. **Phase 5: Studio UI Decomposition & GPU Performance (`src/components/studio/`):**
     - Split `AutonomousStudio.tsx` into modular subcomponents:
       - `ViewportCanvas.tsx`: Interactive canvas viewport with safe-zone guides and ~150ms debounced text input redrawing (with 0ms instant archetype switching).
       - `SlideNavigator.tsx`: Slide thumbnail strip, add/duplicate/delete/reorder controls, and hook variant picker.
       - `InlineSlideEditor.tsx`: Direct bilingual headline and body inputs.
       - `ArchetypeControls.tsx`: Collapsible drawer for diagram nodes, code diffs, metrics, and comparisons.
       - `ExportBar.tsx`: Export triggers and review status indicators.
     - Reduced `AutonomousStudio.tsx` from 1,434 lines to 594 lines as a clean coordinator.
     - Optimized `ContactSheetModal.tsx`: Scaled thumbnail previews from 1080x1920 to 270x480 preview canvases with microtask yielding, reducing GPU texture memory from ~83MB down to ~5MB while preserving full Q95 master exports.
  3. **Phase 6: Server & API Modularization (`api/`):**
     - Created `src/lib/techLogos.ts`: Single source of truth for `TECH_ICONS_LIST` and `KNOWN_TECH_LOGOS` shared across client and server.
     - Split 1,011-line `api/index.ts` into:
       - `api/prompts/systemPrompt.ts`: MARROK system prompt and prompt decorator utilities.
       - `api/prompts/responseSchema.ts`: Structured JSON schema for Gemini.
       - `api/constants.ts`: Shared constants and log sanitization.
       - `api/controllers/proxyController.ts`: CORS image proxy with SVG dynamic recoloring.
       - `api/controllers/mediaController.ts`: Curated tech icons + Wikimedia Commons search.
       - `api/controllers/imageController.ts`: AI diagram generator/editor with `gemini-nano-banana-2.1`.
       - `api/controllers/generateController.ts`: Autonomous carousel generator with Google Search Grounding, direct LLM fallback, and local synthesizer fallback.
       - `api/index.ts`: Clean Express router entry point (< 50 lines).
- **Verification:**
  - Gates 4, 5, and 6 verified: `npm run lint` and `npm run build` passing with 0 errors.
  - Server verification: `/api/health` returned `{ status: 'ok', hasApiKey: true }`.
  - Endpoint verification: `/api/generate` successfully generated a 6-slide deck via resilient synthesis without errors.
  - Interactive Browser subagent verified on `http://localhost:3000`:
    - Canvas rendering, safe-zone overlays, and 150ms text debouncing.
    - All 8 archetypes (`hub`, `row`, `number`, `metric`, `code`, `compare`, `image`, `cta`) switched smoothly with auto-seeded context.
    - Contact Sheet visual QA modal opened and rendered all 8 slide previews instantly with low memory usage.
    - ZIP export functionality tested and operational.




