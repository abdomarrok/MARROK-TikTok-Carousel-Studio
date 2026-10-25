# MARROK TikTok Carousel & Bilingual Caption Engine

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Google GenAI](https://img.shields.io/badge/Google_GenAI-8E75C2?style=for-the-badge&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<p align="center">
  <strong>Multimodal content engine converting complex engineering breakthroughs, screenshots, code diffs, architecture diagrams, and transcripts into 1080×1920 TikTok carousels and bilingual (English + Arabic) viral captions.</strong>
</p>

[Architecture](specs/architecture.md) • [Log Steps](specs/logsteps.md) • [Design System](specs/archetypes-and-design-system.md) • [API Specs](specs/api-and-schemas.md)

</div>

---

## ⚡ Highlights & Key Capabilities

### 🧠 Autonomous Creation Engine (`src/lib/autonomousPipeline.ts`)
Creators provide a single input (topic prompt, engineering summary, architecture screenshot, or code diff). The engine autonomously executes a complete end-to-end refinement pipeline:
- **Intelligent Synthesis:** Calls `/api/generate` with zero-latency deterministic fallback (`synthesizer.ts`).
- **Autonomous Visual Pacing Balancer:** Enforces zero adjacent duplicate diagram layouts across `row` slides by rotating through `['topology', 'stack', 'isolation', 'takeaway']` using the least-used variant.
- **Self-Healing Canvas Typography:** Auto-fits text inside pills, badges, node cards, and comparison columns using `fitTextInBox`, stepping down font size or smart-wrapping to 2 lines to prevent any overflow without manual edits.
- **Dynamic Vertical Optical Centering:** Measures exact graphic bottom and bilingual copy block height, distributing vertical breathing room with a 38% top cushion / 62% bottom ratio.
- **Arabic RTL Line-Height & Margin Polish:** Generous line-heights (1.45x–1.55x) prevent ascender/descender clashes with English text, strictly maintaining the right safe margin ($x \le 945$).
- **Markdown & Syntax Stripping:** Eliminates noisy bolding markers (`**`), header symbols (`#`), and stray ellipsis dots that clutter high-impact mobile slides.
- **Arabic BiDi Punctuation Linting:** Automatically detects Latin words in Arabic lines and places punctuation on the correct side, eliminating punctuation jump artifacts.
- **Spec §8 Limit Fitting:** Autonomously guarantees headlines stay $\le 45$ characters and body text stays $\le 110$ characters.
- **Auto Architecture Diagram Generation:** Detects technical mechanism slides and generates vertical 9:16 schematics automatically.
- **Silent QA Verification:** Runs pre-publish quality checks (`qaChecks.ts`) and auto-corrects soft violations before display.

### 🖼️ AI Architecture Diagram Studio (`gemini-nano-banana-2.1`)
- **Native 9:16 Vertical Diagrams:** Powered by `POST /api/generate-image` utilizing `gemini-nano-banana-2.1` with `{ aspectRatio: '9:16', imageSize: '1K' }` to generate high-resolution vertical visuals that match TikTok feed geometry.
- **Zero-Config 1-Click Theme Schematic:** Automatically derives the technical diagram prompt from the slide's `enTitle`, `diagramNodes`, and deck's exact hex colors (`theme.accent`, `theme.baseBg`, `theme.surface`), producing a matching dark OLED schematic with 1 click.
- **Engineering Style Presets:** 1-click generation presets tailored for developers:
  - *System Blueprint:* Dark cyan circuit schematics and topology paths.
  - *Terminal Core:* Monospace CLI telemetry matrix with memory buffer traces.
  - *Services Flow:* Distributed microservice boundaries and API queues.
  - *Security Boundary:* Zero-trust firewall perimeters and threat vectors.
- **Prompt-Based Image Editing:** Pass an existing slide diagram with natural language revision directives (e.g. "Highlight the distributed cache in amber", "Invert background to dark blueprint").

### 🎛️ Minimalist Studio with Progressive Disclosure (`AutonomousStudio.tsx`)
- **Single-Bar Command Center:** Top prompt bar with live progress stages and an integrated **"Ingest Material"** modal button for screenshots, code files, and web links.
- **Direct Inline Text Editing:** Click directly on English headlines, Arabic text, or body mechanism copy in the live preview to edit instantly without clumsy forms.
- **Sleek Slide Management Bar:** Rapid Add (`+`), Duplicate, Delete (safely guarded $\ge 3$ slides), Reorder (Move Left / Right), and Slide 1 Hook Variant selector (Curiosity, Metric, Contrast).
- **Expandable Advanced Customizer Drawer:** Power features are cleanly tucked into a collapsible side drawer:
  - *Diagram Layout Switcher & Live Node Editor:* 1-click layout toggle (`Topology Flow`, `Layered Stack`, `Isolation Grid`, `Key Takeaway`), 3 live component nodes, connectors, and telemetry line.
  - *Code Archetype:* Language selector, terminal dot styles, line numbers, and diff syntax (`+`, `-`, `$`).
  - *Metric Archetype:* Giant contrast value, category label, sparkline acceleration curve, and delta pill.
  - *Compare Archetype:* Legacy vs Modern bullet points and advantage tags.
  - *AI Diagram Studio & Web Logos:* Real-time prompt generation, style presets, 1-click diagram creation, and 40+ developer brand SVGs (Docker, Redis, K8s, Linux).
- **Sticky 1080×1920 Preview with HUD Simulator:** Pinned 9:16 canvas preview with 1-click TikTok In-App Safe Zone HUD overlay simulator (toggle with key **`T`**).

### 🎨 The MARROK 8-Archetype Visual System
1. **The Hook (`hub`):** Central pulsing hub icon connected to 6 orbiting satellites (`satLabels`) via radial vectors.
2. **Technical Diagram (`row`):** 4 bespoke technical schematics (`topology`, `stack`, `isolation`, `takeaway`) with connected nodes, connectors, and telemetry bars.
3. **Step Number Counter (`number`):** Giant 220px accent numeral counter with optional micro-badge label for procedural workflows.
4. **Metric Hero Card (`metric`):** Giant high-contrast metric value (e.g. `200x`, `0ms`, `99.9%`), category label, sparkline curve, and delta pill.
5. **Code / Terminal Window (`code`):** Monospace terminal window with macOS dots, line numbers, CRT scanlines, and diff syntax (`$`, `+`, `-`, `✔`).
6. **Comparison Split (`compare`):** Side-by-side legacy vs modern cards with problem/solution bullet points and circular `VS` badge.
7. **Image Visual Card (`image`):** Elevated technical diagram or visual asset container with `contain` or `cover` fit, caption badge, and blueprint grid.
8. **Final CTA (`cta`):** Geometric branding emblem, domain question, CTA pill, and verified source attribution credit.

### 📦 Complete Deliverables & Metricool Publishing Bundle
1-click export packages everything needed to publish immediately on mobile or via social schedulers (Metricool, Buffer):
- `slide1.png` through `slide8.png` (Lossless 1080×1920 9:16 high-res PNGs, Safe-Zone compliant at root and folder level)
- `caption-bilingual.txt` & `caption.txt` (Ready-to-paste Metricool copy with screen hooks, English + Arabic captions, and engineering hashtags)
- `first_comment.txt` (Pinned first comment to drive engagement, discussion points, and source links)
- `carousel-manifest.json` (Full serialized `CarouselData` for deck archival and instant re-import)
- `short_caption.txt` (Clean 2-line version for TikTok quick post)
- `README.txt` (Creator publishing guide with step-by-step mobile & Metricool instructions)

### 🛡️ Pre-Publish QA Gate & Visual Contact Sheet
- **Automated QA Linter (`src/lib/qaChecks.ts`):** Checks headline character limits, body length, placeholder tokens (`Lorem ipsum`, `00%`), and Arabic punctuation jump bugs.
- **Contact Sheet Generator:** Renders all deck slides tiled in a high-resolution master grid for instant visual inspection before posting.

---

## 📂 Project Architecture & Specifications

For comprehensive documentation, see the [`specs/`](specs/) directory:

- 📐 [**`specs/architecture.md`**](specs/architecture.md) — System topology, client ingestion pipeline, backend proxy, AI orchestration, and canvas rasterization.
- 📜 [**`specs/logsteps.md`**](specs/logsteps.md) — Chronological engineering milestones, user feedback cycles, and root-cause analysis of mobile fetch latency.
- 🎨 [**`specs/archetypes-and-design-system.md`**](specs/archetypes-and-design-system.md) — Color tokens, typography, TikTok 9:16 safe zones, and archetype ASCII schematics.
- 🔌 [**`specs/api-and-schemas.md`**](specs/api-and-schemas.md) — REST endpoint contracts (`/api/generate`, `/api/proxy-image`, `/api/search-media`), JSON schemas, and TypeScript interfaces.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons, JSZip.
- **Backend:** Node.js, Express, `@google/genai` TypeScript SDK.
- **Styling & Fonts:** Plus Jakarta Sans (English display), Cairo (Arabic typography), JetBrains Mono (metrics & code).
- **Bundler & Tooling:** Vite 8, tsx.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 20+ installed
- npm or bun package manager
- (Optional) Google Gemini API Key (app includes a zero-latency deterministic synthesizer fallback that operates without an API key)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/marrokmar/marrok-tiktok-studio.git
cd marrok-tiktok-studio

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Set your `GEMINI_API_KEY`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts Express backend and Vite development server on port 3000 |
| `npm run build` | Compiles production bundle with Vite into `/dist` |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run start` | Launches production server with compiled assets |
| `npm run clean` | Cleans build artifacts and caches |

---

## 📱 TikTok Safe Zones Reference

When previewing or downloading 1080×1920 slides, content is automatically positioned within TikTok's mobile UI safe area:

```
0px ──────────────────────────────────────── 1080px
 │  [ Top 180px Safe Margin: Search & Sound ]  │
180px ─────────────────────────────────────────│
 │                                            │
 │      840px × 1420px Content Bounding Box   │
 │                                            │
1600px ────────────────────────────────────────│
 │  [ Bottom 320px Safe Margin: Caption/Bio ] │
1920px ────────────────────────────────────────┘
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
