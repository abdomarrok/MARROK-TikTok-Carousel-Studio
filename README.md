# MARROK TikTok Carousel & Bilingual Caption Engine

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Google GenAI](https://img.shields.io/badge/Google_GenAI-8E75C2?style=for-the-badge&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<p align="center">
  <strong>Multimodal content engine converting complex engineering breakthroughs, screenshots, code diffs, and transcripts into 1080×1920 TikTok carousels and bilingual (English + Arabic) viral captions.</strong>
</p>

[Architecture](specs/architecture.md) • [Log Steps](specs/logsteps.md) • [Design System](specs/archetypes-and-design-system.md) • [API Specs](specs/api-and-schemas.md)

</div>

---

## ⚡ Highlights & Key Capabilities

- **Full Custom Color Palette & Multi-Theme Suite:**
  - 6 curated engineering presets: *Terminal Teal*, *Cyber Threat Crimson*, *Electric AI Violet*, *Enterprise Blueprint*, *Solarized Amber*, *Matrix Emerald*, *Obsidian Minimalist*.
  - Interactive **Full Custom Color Palette Picker** giving granular hex controls for canvas background, card surfaces, borders, neon accents, alert colors, and text.
  - Live SVG updates and full high-DPI 1080×1920 PNG/ZIP export reflection.
- **Context-Driven Domain Extraction:**
  - Automatically identifies domain categories (e.g. *Linux Kernel & eBPF*, *Reverse Engineering & Exploits*, *AI Models & Inference*, *Kubernetes & Cloud Security*, *Distributed Storage & Raft*) directly from input context without static restrictions.
- **Topic Inspiration & Trending Hooks Studio:**
  - 1-click discovery feed featuring high-CTR engineering breakthroughs.
  - Custom keyword topic builder to create complete decks from any technology term.
- **Custom Gemini API Key Support:**
  - Optional user-provided API key configuration in UI with seamless fallback to built-in synthesizer.
- **Strict 5-Archetype Visual System:** Faithfully renders MARROK layout archetypes:
  - **Archetype 1 (Hub Slide):** Center icon surrounded by 6 orbital satellite icons for high-CTR Slide 1 hooks.
  - **Archetype 2 (Row - 1 Icon):** Single full-width elevated row with micro-label for high-impact metric slides.
  - **Archetype 3 (Row - 2 Icons):** Side-by-side comparison cards (e.g. *Git Bottlenecks* vs. *Scion Architecture*).
  - **Archetype 4 (Row - 3 Icons):** 3-step toolchain or technical sequence layout.
  - **Archetype 5 (CTA Slide):** MARROK geometric branding, domain question hook, DM call-to-action, and dual-language source attribution.
- **Native Bilingual Layout (English + Technical Arabic):**
  - Bold English headline on top with idiomatic technical Arabic translation immediately underneath (`dir="rtl"` with *Cairo* typography).
  - **Latin Technical Noun Preservation:** Preserves proper nouns, frameworks, and tools in Latin script (e.g., `Anthropic`, `Git`, `Docker`, `DefectDojo`, `Python`, `Ghidra`, `eBPF`) inside Arabic sentences without phonetic distortion.
- **Mobile-First Zero-Lag Pipeline:**
  - **Canvas Downscaler:** Automatically compresses 15MB+ mobile camera screenshots to ~120KB before transmission, preventing LTE upload stalls.
  - **6s Promise.race Timeout & 503 Fast-Break:** Upstream Gemini API spikes instantly route to the deterministic MARROK Synthesizer, ensuring sub-second response times.
  - **⚡ Instant Synthesize:** One-tap offline generation that produces complete 8-slide decks in 0ms without network dependence.
- **Publishing & Export Subsystem:**
  - One-tap mobile clipboard copy for TikTok captions with niche hashtag clusters.
  - 3 A/B Hook Variant testing toggles (*Curiosity & Surprise*, *Hard Metrics & Benchmark*, *The Problem / Paradigm Shift*).
  - 2 Caption style variants (*Executive Bulletins & Metrics* vs. *Narrative Story Breakdown*).
  - High-res 1080×1920 PNG export & batch ZIP packaging via JSZip.

---

## 📂 Project Architecture & Specifications

For comprehensive documentation, see the [`specs/`](specs/) directory:

- 📐 [**`specs/architecture.md`**](specs/architecture.md) — System topology, client ingestion pipeline, backend proxy, AI orchestration, and canvas rasterization.
- 📜 [**`specs/logsteps.md`**](specs/logsteps.md) — Chronological engineering milestones, user feedback cycles, and root-cause analysis of mobile fetch latency.
- 🎨 [**`specs/archetypes-and-design-system.md`**](specs/archetypes-and-design-system.md) — Color tokens, typography, TikTok 9:16 safe zones, and archetype ASCII schematics.
- 🔌 [**`specs/api-and-schemas.md`**](specs/api-and-schemas.md) — REST endpoint contracts (`/api/generate`, `/api/health`), JSON schemas, and TypeScript interfaces.

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
