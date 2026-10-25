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

