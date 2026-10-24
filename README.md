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

### 🎛️ Linear-Grade Studio UI/UX & Workflow
Engineered for rapid, precision creation of high-performing technical carousels:
- **TikTok In-App HUD Simulator:** 1:1 mobile feed safe-zone overlay simulator displaying TikTok's action rail (avatar, like count, comments, bookmarks, share), sound disc, caption ticker, and the critical $y=1760$ baseline boundary. Toggle on/off instantly via button or shortcut **`T`**.
- **Sticky Dual-Column Viewport:** The 1080×1920 canvas preview stays pinned (`lg:sticky lg:top-20 self-start`) as you scroll through detailed controls, guaranteeing continuous real-time visual feedback.
- **Bilingual Side-by-Side Editor:** One-click **Split** vs **Stack** view toggle. Edit English headlines and Arabic copy side-by-side in balanced columns.
- **Dynamic Character Limit Progress Bars:** Color-coded micro-progress bars (emerald $\le 75\%$, amber $75\text{--}100\%$, pulsating rose $>100\%$) ensure headlines ($\le 45$ chars) and body text ($\le 110$ chars) strictly comply with Spec §8 without guesswork.
- **Interactive Filmstrip & In-Between Inserters:** Slide thumbnails tagged with archetype badges (`HUB`, `CLI`, `VS`, `MTR`, `ROW`, `CTA`) with hover **`+`** buttons between any two slides to insert new slides anywhere in the narrative arc.
- **Desktop Keyboard Shortcuts:** Navigate with **`←` / `→`**, jump directly to any slide with **`1`--`9`**, and toggle the TikTok overlay with **`T`**.
- **Local Draft Persistence:** Debounced auto-save to `localStorage` with a subtle **`✓ Saved [Time]`** status pill and 1-click template reset in the header.

### 🚀 1-Input Smart Pipeline Command Center (Spec §4–§8)
Creators provide a single input (plain text summary, URL, code snippet, or screenshot). The engine executes an intelligent 6-stage autonomous workflow:
1. **Material Ingestion:** Downsamples camera uploads, extracts core entities and technical takeaways.
2. **Domain & Persona Detection:** Identifies the technical category (e.g. *Linux Kernel & eBPF*, *AI Agents*, *Distributed Consensus*) and assigns the optimal color theme.
3. **Narrative Arc Planning:** Maps slides to the 8-beat viral technical arc (Hook $\to$ The Stakes $\to$ VS Split $\to$ Code Diff $\to$ Step $\to$ The Catch $\to$ SRE Rule $\to$ CTA).
4. **Hook & Multi-Variant Generation:** Generates 3 psychological Slide 1 hook angles (Curiosity, Hard Metrics, Problem/Contrast) and bilingual caption variants.
5. **Fact & Claim Verification:** Checks technical credibility, isolates key numbers, and links claims to verifiable source entities (inspectable via the **Plan Inspector**).
6. **Safe Zone Canvas Rendering:** Formats slides into 1080×1920 (9:16) JPGs guaranteed to render clearly on mobile screens.

### 🎨 The MARROK 8-Archetype Visual System
1. **The Hook (`hub`):** Central pulsing hub icon connected to 6 orbiting satellites via radial vectors.
2. **Icon Row (`row`):** 1, 2, or 3 elevated cards with micro-labels for core concepts or step sequences.
3. **Step Number Counter (`number`):** Giant 220px accent numeral counter with optional micro-badge label for procedural workflows.
4. **Metric Hero Card (`metric`):** Giant high-contrast metric value (e.g. `200x`, `0ms`, `99.9%`), category label, and delta pill.
5. **Code / Terminal Window (`code`):** Monospace terminal window with macOS dots, line numbers, and diff syntax (`$`, `+`, `-`, `✔`).
6. **Comparison Split (`compare`):** Side-by-side legacy vs modern cards with problem/solution bullet points.
7. **Image Visual Card (`image`):** Elevated technical diagram or visual asset container with `contain` or `cover` fit, caption badge, and blueprint grid.
8. **Final CTA (`cta`):** Geometric branding emblem, domain question, CTA pill, and bilingual source attribution credit.

### 📦 Complete Deliverables ZIP Package (Spec §18)
1-click export packages everything needed to publish to TikTok on mobile immediately:
- `slide1.jpg` through `slide8.jpg` (1080×1920 9:16 high-res JPGs, Safe-Zone compliant)
- `caption.txt` (Bilingual TikTok post caption with hashtags)
- `first_comment.txt` (Pinned first comment to drive engagement, discussion points, and source links)
- `short_caption.txt` (Clean 2-line version for TikTok quick post)
- `post_metadata.json` (Structured JSON schema for automation, archiving, or analytics)
- `README.txt` (Creator publishing guide with step-by-step mobile upload instructions)

### 🛡️ Pre-Publish QA Gate & Visual Contact Sheet
- **Automated QA Linter (`src/lib/qaChecks.ts`):** Checks headline character limits, body length, placeholder tokens (`Lorem ipsum`, `00%`), and Arabic punctuation jump bugs (where an Arabic line ending with a Latin word causes punctuation to jump to the wrong side).
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
