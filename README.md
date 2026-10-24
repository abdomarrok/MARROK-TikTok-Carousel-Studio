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

### 🎨 The MARROK 7-Archetype Visual System
Engineered specifically for developer engagement on mobile feeds:
1. **The Hook (`hub`):** Central pulsing hub icon connected to 6 orbiting satellites via radial vectors.
2. **Icon Row (`row`):** 1, 2, or 3 elevated cards with micro-labels for core concepts or step sequences.
3. **Metric Hero Card (`metric`):** Giant high-contrast metric value (e.g. `200x`, `0ms`, `99.9%`), category label, and delta pill.
4. **Code / Terminal Window (`code`):** Monospace window with macOS dots, line numbers, and diff syntax (`$`, `+`, `-`, `✔`).
5. **Comparison Split (`compare`):** Side-by-side legacy vs modern cards with problem/solution bullet points.
6. **Image Visual Card (`image`):** Elevated technical diagram or visual asset container with `contain` or `cover` fit, caption badge, and blueprint grid.
7. **Final CTA (`cta`):** Geometric branding emblem, domain question, CTA pill, and bilingual source attribution credit.

### 🌐 Subject-Based Internet Icons & Web Media Resolution
- **Curated Tech Brand Resolution:** Automatically identifies mentions of 40+ top developer technologies (Redis, Docker, Kubernetes, Linux, PostgreSQL, MySQL, FastAPI, Go, Rust, AWS, Cloudflare, etc.) and pulls official vector logos from Simple Icons CDN.
- **Interactive Web Media & Icon Picker Modal:** Search official tech brand logos, search Wikimedia Commons technical architecture diagrams, paste direct HTTPS URLs, or upload local SVGs/images.
- **CORS-Safe Server Image Proxy (`/api/proxy-image`):** Solves HTML5 Canvas tainting, ensuring single-slide PNG downloads, ZIP exports, and direct 1-click clipboard copying work reliably.

### 🔮 Theme Harmonization & Tinting Engine
- **Canvas-Only Theming:** Changing themes alters only the carousel slide canvas; application chrome remains stable dark (`#080d11`).
- **Dynamic Accent Tinting (`drawTintedImage`):** Vector logos and SVGs are dynamically recolored into the active post's neon accent (`theme.accent`) or icon stroke (`theme.iconStroke`), preventing dark or clashing icons.
- **Blueprint Grid & Ambient Glow:** Image cards strictly inherit `theme.surface` and `theme.surfaceBorder` with subtle technical blueprint grid lines and ambient radial glow.
- **4 Visual Tone Modes:**
  - `Theme HUD (Auto)`: Blueprint grid + auto-colorizes SVGs and logos with active theme accent.
  - `Invert White BG`: Inverts white background diagrams into sleek dark-mode terminal visuals.
  - `Accent Tint`: Washes raster graphics in the active theme’s neon accent.
  - `Original Colors`: Preserves raw unaltered colors for photos and screenshots.

### 🧠 Adaptive Structure & Content Synthesis
- **Dynamic Slide Count (5–9 Slides):** Replaced fixed 8-slide decks with intelligent density analysis—lean 5–6 slide decks for concise announcements, 8–9 slides for in-depth architecture breakdowns.
- **Intelligent Icon Selection:** 32 domain-specific icons scored dynamically against technical topics (security, AI, databases, infrastructure, kernel, etc.).
- **Native Bilingual Copy (English + Technical Arabic):** Bold English headlines with idiomatic technical Arabic directly underneath (`dir="rtl"` with *Cairo* typography), preserving proper nouns in Latin script (e.g. `Anthropic`, `Git`, `Docker`, `eBPF`).

### 📱 Publishing & Mobile-First Zero-Lag Pipeline
- **Canvas Downscaler:** Downsamples 15MB+ camera uploads to ~120KB before transmission, preventing mobile upload timeouts.
- **6s Promise.race Timeout & 503 Fast-Break:** Upstream Gemini spikes instantly fall back to the built-in deterministic synthesizer.
- **1-Click Mobile Clipboard:** Direct image copy to system clipboard for instant pasting into TikTok/Instagram.
- **Batch ZIP Export:** High-res numbered 1080×1920 PNG files packaged via JSZip.

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
