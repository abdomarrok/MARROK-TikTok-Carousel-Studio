# AGENTS.md

## Quick facts
- Stack: React 19 + TypeScript, Vite 8, Tailwind CSS v4, Express (server.ts / api/index.ts), @google/genai, tsx. Path alias `@/*` -> `./*` (tsconfig/vite).
- Single-package app (no workspaces). `package.json` name `react-example`.
- Entry points: `server.ts` (dev/prod server + API + Vite middleware/static), `src/main.tsx`, `index.html`.
- Main UI Component: `src/components/AutonomousStudio.tsx` (minimalist command bar, inline text editing, slide management strip, progressive disclosure drawer).
- Build output: `vite build` -> `dist/` (served in prod).

## Dev commands (package.json)
| Command | What it does |
| --- | --- |
| `npm run dev` | `tsx server.ts` — runs Express on port 3000 with Vite dev middleware (SPA). Open http://localhost:3000. |
| `npm run build` | `vite build` — production bundle to `dist/`. |
| `npm run start` | `tsx server.ts` — production mode (serves `dist/` if exists). |
| `npm run preview` | `vite preview` (Vite preview server). |
| `npm run lint` | `tsc --noEmit` (typecheck only). |
| `npm run clean` | `node -e ...` — cross-platform cleanup of `dist/` and `server.js` (works on Windows, macOS, Linux). |

## Environment
- Copy `.env.example` to `.env`. Set `GEMINI_API_KEY` (optional in practice — see fallback). `APP_URL` is injected by some hosts.
- Server reads `process.env.GEMINI_API_KEY` (also accepts custom key via header `x-gemini-key` or body `apiKey`).
- Health: `GET /api/health` returns `{ status, timestamp, hasApiKey }`.

## Architecture gotchas
- **Modular Codebase Architecture**:
  - `src/lib/canvas/`: Split 3,118-line monolithic exporter into `constants.ts`, `textLayout.ts`, `imageLoader.ts`, `background.ts`, `archetypes/` (`renderHub`, `renderMetric`, `renderCode`, `renderCompare`, `renderDiagram`, `renderImage`, `renderCta`), `renderSlide.ts`, and `exporter.ts`. `src/lib/canvasExporter.ts` remains as a backwards-compatible barrel re-export.
  - `src/components/studio/`: Split 1,434-line studio into focused subcomponents: `ViewportCanvas.tsx` (with 150ms debounced canvas redraw), `SlideNavigator.tsx`, `InlineSlideEditor.tsx`, `ArchetypeControls.tsx`, and `ExportBar.tsx`.
  - `api/`: Modular Express architecture under `api/prompts/` (`systemPrompt.ts`, `responseSchema.ts`) and `api/controllers/` (`generateController.ts`, `imageController.ts`, `proxyController.ts`, `mediaController.ts`), keeping `api/index.ts` under 50 lines.
  - `src/lib/techLogos.ts`: Single source of truth for `TECH_ICONS_LIST` and `KNOWN_TECH_LOGOS` shared across client and server.
- **Resilient generation**: `POST /api/generate` tries Gemini models `gemini-3.1-flash-lite`, `gemini-3.8-flash` via `@google/genai`. Each call has an 8s `Promise.race` timeout; on `429/503/UNAVAILABLE/Timeout` it first retries direct LLM schema mode and then fast-breaks to the local synthesizer. **Never returns 500** — falls back to `synthesizeCarousel()` (`src/lib/synthesizer.ts`).
- **AI Image Generation & Editing**: `POST /api/generate-image` uses `gemini-nano-banana-2.1` with `imageConfig: { aspectRatio: '9:16', imageSize: '1K' }` to output high-resolution vertical architecture diagrams. Supports multi-part inputs (`inlineData` + text) for natural language editing. Never pass `responseMimeType` or `responseSchema` to `gemini-nano-banana-2.1`. Graceful fallback to `gemini-3.1-flash-lite-image`.
- **Autonomous Pipeline**: `src/lib/autonomousPipeline.ts` orchestrates 1-input generation end-to-end: synthesis $\to$ markdown stripping $\to$ Arabic BiDi punctuation fixing $\to$ Spec §8 character limit fitting $\to$ visual layout balancing $\to$ auto-generating a 9:16 architecture diagram $\to$ silent QA verification.
- **Zero-Touch Autonomous Layout & Pacing Engine**: `balanceCarouselVisualPacing()` in `src/lib/synthesizer.ts` guarantees zero adjacent duplicate diagram layouts across `['topology', 'stack', 'isolation', 'takeaway']` and auto-heals missing diagram nodes/edges/footer telemetry so no slide renders half-empty.
- **Pure Canvas Projection**: Text rendering in `renderSlide.ts` is a pure read-only projection of state; sanitization runs at generation/edit time rather than inside the canvas drawing loop to prevent input lag.
- **Self-Healing Typography & Optical Centering**: `fitTextInBox()` in `src/lib/canvas/textLayout.ts` auto-scales font sizes or wraps to 2 lines for pills, cards, badges, and comparison columns to prevent text overflow. Dynamic vertical optical centering distributes breathing room between `yGraphicEnd` and `y = 1710` (38% top cushion, 62% bottom) with generous Arabic line-heights (`102px` for 70px title, `58px` for 38px body) respecting the $x \le 945$ safe boundary.
- **Zero-Config Theme-Aware AI Schematics**: `buildThemeAwareDiagramPrompt()` in `src/components/SlideImageStudio.tsx` auto-constructs prompts from slide titles, nodes, and exact hex colors (`theme.accent`, `theme.baseBg`, `theme.surface`), allowing 1-click OLED schematic generation without manual prompt typing.
- **Instant Archetype Switching & Live Auto-Seeding**: When the user clicks any archetype button (`hub`, `row`, `image`, `code`, `metric`, `compare`, `cta`) in `AutonomousStudio.tsx`, `seedSlideArchetypeData()` (`src/lib/synthesizer.ts`) auto-populates required archetype fields (`codeSnippet`, `metricValue`, `compareLeftTitle`/`compareRightBody`, `satLabels`) on the fly from existing slide content.
- **Canvas/export**: 1080×1920 (9:16). Safe zones and export via `src/lib/canvas/exporter.ts` (PNG/ZIP). Asynchronous microtask yielding (`setTimeout(0)`) prevents UI freeze during batch ZIP compilation. Metricool packaging bundle (`slide1.png`-`slide8.png`, `caption-bilingual.txt`, `carousel-manifest.json`). Typography: Plus Jakarta Sans, Cairo (RTL), JetBrains Mono.
- **Contact Sheet GPU Optimization**: `ContactSheetModal.tsx` previews use 270x480 downsampled thumbnail canvases with microtask yielding to minimize GPU texture memory while maintaining high-resolution full-canvas export.

## Conventions / notes
- TypeScript: `moduleResolution: bundler`, `allowImportingTsExtensions: true`, `noEmit: true`, `jsx: react-jsx`. Path alias `@` -> project root.
- Vite: HMR disabled if `DISABLE_HMR=true` (file watching null) — intentional for agent/edit environments.
- CORS open (`*`) for AI Studio/mobile; Express JSON limit `50mb`.
- Icons come from a fixed set referenced in prompts/synthesizer (e.g. `shieldAlert`, `binary`, `gitMerge`, `brain`, `terminal`). Unknown icons still render per component logic.
- No test runner configured. Verification is typically `npm run lint` and manual UI testing.
- Specs live in `specs/` (architecture, logsteps, archetypes/design system, api/schemas) — treat as helpful context; executable code (`server.ts`, `src/lib/*`) is source of truth.
