# AGENTS.md

## Quick facts
- React 19 + TypeScript, Vite 8, Tailwind CSS v4, Express (`server.ts` + `api/index.ts`), `@google/genai`; single package (package name `marrok-tiktok-carousel-studio`), no workspaces.
- Path alias `@/*` -> repo root (tsconfig + vite). Entry flow: `server.ts` -> `api/index.ts` + Vite middleware/static; `src/main.tsx` -> `src/App.tsx` -> `src/components/AutonomousStudio.tsx`.
- Shared domain types live in `src/types.ts`; theme tokens in `src/lib/theme/palettes.ts`. Canvas output is 1080x1920 (9:16).

## Commands
- `npm run dev` — Express + Vite on `http://localhost:3000` (`PORT` overrides).
- `npm run lint` — `tsc --noEmit`; `npm test` — Vitest regression suite (jsdom + RTL). `scratch/*.mjs` is local/gitignored.
- `npm run build` — production bundle -> `dist/`.
- `npm run start` — does **not** set `NODE_ENV`; without `NODE_ENV=production` it runs Vite middleware, not `dist/`. PowerShell: `$env:NODE_ENV='production'; npm run start`.
- `npm run preview`, `npm run clean` — as defined in `package.json`.
- Verify with `npm test` + `npm run lint`; run `npm run build` for bundling/import regressions.

## Source layout / gotchas
- These are barrels: `src/lib/synthesizer.ts` -> `src/lib/synthesis/`, `src/lib/canvasExporter.ts` -> `src/lib/canvas/`, `src/lib/textSanitizer.ts` -> `src/lib/text/`. Edit the modular files, not the barrels.
- `src/lib/canvas/` is the render/export pipeline. `renderSlide.ts` is a pure read-only projection (do not sanitize in the draw loop); text fitting is `textLayout.ts`; safe-zone constants (`x <= 945`, `y <= 1710`) are in `constants.ts`. `layoutAwareness.ts` is the Layout Awareness Engine computing non-overlapping vertical clearances (`MIN_GAP_GRAPHIC_TO_TITLE = 44`, `MIN_GAP_TITLES = 18`, `MIN_GAP_TITLE_TO_BODY = 36`, `MIN_GAP_BODIES = 22`), baseline conversions, dynamic font scaling, ceiling compression, and `clampElementDrag()` anti-collision clamping. `layoutBounds.ts` consumes `computeSlideLayoutAwareness()` for 1:1 synchronized 1080x1920 element bounds and point hit-testing for viewport overlays.
- `src/components/studio/` holds the viewport, navigator, inline editor, archetype controls, and export bar. `ViewportCanvas` renders instantly on slide/archetype changes, debounces text edits 150ms, and features dynamic bounding boxes with bidirectional selection sync to `InlineSlideEditor`, collision-clamped dragging, and keyboard micro-nudging.
- `api/index.ts` is a small Express app with startup env config (`api/config.ts`), security headers, rate limiting, and `4.5mb` JSON limit; routes live in `api/controllers/`, prompts/schema in `api/prompts/`, shared catalogs in `api/constants.ts`. Brand icons are shared via `src/lib/techLogos.ts`; canvas glyphs via `src/lib/icons.ts`. `src/components/studio/IconThumbnail.tsx` provides dual-rendering (`getIconDisplayName`, `<IconThumbnail />`) bridging `ICONS_REGISTRY` vector SVGs and `TECH_ICONS_LIST`/CDN URLs so editor controls match canvas projections 1:1.
- Vercel rewrites `/api/*` to `/api/index` (`vercel.json`); `api/index.ts` restores the real path from `x-matched-path`/`x-forwarded-uri`. Preserve this when changing routing.
- `specs/*.md` is useful design context; see `docs/AUDIT.md`, `docs/ARCHITECTURE.md`, and `docs/ADR/*` for current architectural decisions. Trust `server.ts`, `api/*`, and `src/lib/*` as source of truth.

## AI generation
- `.env`: `GEMINI_API_KEY`. Custom keys are accepted via `x-gemini-key`, `x-gemini-api-key`, or body `apiKey`; the client stores one as `marrok_custom_gemini_key`.
- `POST /api/generate` model cascade (`GEMINI_GENERATION_MODELS` configurable): bounded within a 45s budget using `AbortSignal.timeout()` (1 grounded attempt when prompt <= 200 chars, followed by 1 ungrounded fallback attempt). Authentic grounding sets `status: 'verified_live'` and maps citations via `mapFactsWithGroundingSupports()`; ungrounded AI sets `status: 'unverified_draft'` (`userReviewed: false`). On total failure it returns local `synthesizeCarousel()` (`engine: 'offline-synthesizer'`) with no 5xx, and sets `X-Marrok-Engine`/`X-Marrok-Model`.
- `POST /api/generate-image` (`GEMINI_IMAGE_MODELS` configurable): defaults to 9:16 / 1K and supports image editing with `inlineData` + text (`<= 4 MB` validated). Pass only `imageConfig` (never `responseMimeType`/`responseSchema`). Requires a key (401) and can return 500.
- `runAutonomousPipeline` deliberately applies only `sanitizeFullCarousel()` to authentic AI output; the full character-limit fitting, pacing, and QA rewrite runs only for the offline fallback. Do not "fix" AI copy unless asked.
- Fallback enrichment: `balanceCarouselVisualPacing()` (`src/lib/synthesis/pacing.ts`) prevents adjacent/repeated diagram variants across 9 schematics (`topology`, `stack`, `isolation`, `takeaway`, `scatter`, `graph`, `clusters`, `split`, `features`) and fills missing nodes/edges/footer; `seedSlideArchetypeData()` (`src/lib/synthesis/archetypes.ts`) fills fields when switching archetypes.

## Content / export conventions
- Slide types: `hub`, `row`, `number`, `metric`, `code`, `compare`, `image`, `cta`. Keep bilingual `en*`/`ar*` fields populated. QA limits are in `src/lib/qaChecks.ts` (`enTitle` 45, `arTitle` 40, `enBody` 140, `arBody` 150). Platform safety checks are in `src/lib/riskChecks.ts` (`PASS` / `WARN` / `BLOCK`). Mobile typography floor $\ge 26\text{px}$ is enforced in `renderSlide.ts`.
- Export via `src/lib/canvas/exporter.ts`: single JPG (1080x1920 Q95), clipboard, and a ZIP Metricool bundle (`slide1.jpg`..., `caption-bilingual.txt`, `caption.txt`, `first_comment.txt`, `short_caption.txt`, `carousel-manifest.json`, `post_metadata.json`, `claims_citations.txt`, `README.txt`). Pre-export QA (`FAIL`) and Platform Risk (`BLOCK`) gates block export unless explicitly overridden in the **Caption & QA** tab; creator attribution is rendered on the CTA slide. Batch/contact-sheet loops yield with `setTimeout(0)`.
- `ContactSheetModal` previews at 270x480; the downloaded contact sheet is JPG Q95.
- Vite: `DISABLE_HMR=true` disables HMR and file watching (intentional for agent/edit environments). CORS respects `ALLOWED_ORIGIN`; JSON body limit is `4.5mb`.
- TS: `moduleResolution: bundler`, `allowImportingTsExtensions`, `noEmit`, `jsx: react-jsx`. `.npmrc` sets `legacy-peer-deps=true`; `package-lock.json` is the single lockfile.
