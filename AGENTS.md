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
- **Resilient generation**: `POST /api/generate` tries Gemini models `gemini-3.1-flash-lite`, `gemini-flash-latest` via `@google/genai`. Each call has a 6s `Promise.race` timeout; on `503/UNAVAILABLE/high demand/Timeout` it fast-breaks to the local synthesizer. **Never returns 500** — falls back to `synthesizeCarousel()` (`src/lib/synthesizer.ts`).
- **AI Image Generation & Editing**: `POST /api/generate-image` uses `gemini-nano-banana-2.1` with `imageConfig: { aspectRatio: '9:16', imageSize: '1K' }` to output high-resolution vertical architecture diagrams. Supports multi-part inputs (`inlineData` + text) for natural language editing. Never pass `responseMimeType` or `responseSchema` to `gemini-nano-banana-2.1`. Graceful fallback to `gemini-3.1-flash-lite-image`.
- **Autonomous Pipeline**: `src/lib/autonomousPipeline.ts` orchestrates 1-input generation end-to-end: synthesis $\to$ markdown stripping $\to$ Arabic BiDi punctuation fixing $\to$ Spec §8 character limit fitting $\to$ auto-generating a 9:16 architecture diagram $\to$ silent QA verification.
- **Progressive Disclosure UI**: `AutonomousStudio.tsx` presents a clean, focused viewport with single command bar, inline direct text editing on canvas, and a slide management bar (Add, Duplicate, Delete, Reorder). Power features (Code diffs, terminal styles, metric cards, comparison tables, AI diagram studio, and web logo search) are accessible via the collapsible "Advanced Customizer" drawer.
- **Deterministic fallback**: `src/lib/synthesizer.ts` extracts domain/theme/icons from prompt/filename/categoryHint and emits a strict MARROK 8–9 slide structure (hub → rows → cta) with bilingual (EN/AR) copy and hook/caption variants. Treat this as source of truth when API is down/unavailable.
- **Strict schema**: Gemini calls use `responseMimeType: 'application/json'` with a detailed schema in `server.ts` (CAROUSEL_RESPONSE_SCHEMA). Output must match `CarouselData` (`src/types.ts`).
- **MARROK archetypes**: 8-type visual system (`hub`, `row`, `number`, `metric`, `code`, `compare`, `image`, `cta`). Slide 1 must be `hub` (centerIcon + 6 satIcons). Final slide must be `cta`. See `specs/archetypes-and-design-system.md` and `specs/api-and-schemas.md`.
- **Themes/palettes**: 7 presets + custom in `src/types.ts` (`DEFAULT_PALETTES`), aliased to legacy keys. UI manages palette separately from carousel data.
- **Canvas/export**: 1080×1920 (9:16). Safe zones and export via `src/lib/canvasExporter.ts` (PNG/ZIP). Typography: Plus Jakarta Sans, Cairo (RTL), JetBrains Mono.
- **Client compression**: `MultimodalInputPanel` downscales large images to ~1280px/~120KB before upload; client has 10s watchdog and can fall back locally.

## Conventions / notes
- TypeScript: `moduleResolution: bundler`, `allowImportingTsExtensions: true`, `noEmit: true`, `jsx: react-jsx`. Path alias `@` -> project root.
- Vite: HMR disabled if `DISABLE_HMR=true` (file watching null) — intentional for agent/edit environments.
- CORS open (`*`) for AI Studio/mobile; Express JSON limit `50mb`.
- Icons come from a fixed set referenced in prompts/synthesizer (e.g. `shieldAlert`, `binary`, `gitMerge`, `brain`, `terminal`). Unknown icons still render per component logic.
- No test runner configured. Verification is typically `npm run lint` and manual UI testing.
- Specs live in `specs/` (architecture, logsteps, archetypes/design system, api/schemas) — treat as helpful context; executable code (`server.ts`, `src/lib/*`) is source of truth.
