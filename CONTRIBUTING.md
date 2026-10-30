# Contributing to MARROK Content Studio

## 1. Local Development Setup
1. Use Node.js `>= 20.0.0` (`nvm use` reads `.nvmrc`).
2. Install dependencies with `npm install --legacy-peer-deps` (do not commit `bun.lock` or `yarn.lock`).
3. Copy `.env.example` to `.env` and optionally configure `GEMINI_API_KEY`.
4. Start the full-stack server with `npm run dev` (`http://localhost:3000`).

## 2. Architecture & Code Rules
- **Barrel Files:** `src/lib/synthesizer.ts`, `src/lib/canvasExporter.ts`, and `src/lib/textSanitizer.ts` are thin barrel files. Always implement changes in the modular subdirectories (`src/lib/synthesis/*`, `src/lib/canvas/*`, `src/lib/text/*`).
- **Single Source of Truth:** Character limits (`CHAR_LIMITS`, `SINGLE_SLIDE_CHAR_LIMITS`) live in `src/lib/qaChecks.ts`. Safe-zone and dimension constants live in `src/lib/canvas/constants.ts` and `src/lib/canvas/dimensions.ts`.
- **Canvas Purity:** `src/lib/canvas/renderSlide.ts` is a pure read-only projection. Never mutate or sanitize slide data inside the canvas draw loop.
- **JPG-Only Static Export:** Static slides (`tiktok-9:16`, `ig-4:5`, `ig-3:4`, `ig-1:1`, `ig-reels-9:16`) must always export as `image/jpeg` (Q95), never PNG.

## 3. Pre-PR Verification Checklist
Before opening a pull request, run all three checks locally:
```bash
npm run lint
npm test
npm run build
```
