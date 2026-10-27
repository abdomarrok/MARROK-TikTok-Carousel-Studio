# Contributing to MARROK TikTok Carousel Studio

## 1. Local Development Setup
1. Use Node.js `>= 20.0.0` (`nvm use` reads `.nvmrc`).
2. Install dependencies with `npm install --legacy-peer-deps` (do not commit `bun.lock` or `yarn.lock`).
3. Copy `.env.example` to `.env` and optionally configure `GEMINI_API_KEY`.
4. Start the full-stack server with `npm run dev` (`http://localhost:3000`).

## 2. Architecture & Code Rules
- **Barrel Files:** `src/lib/synthesizer.ts`, `src/lib/canvasExporter.ts`, and `src/lib/textSanitizer.ts` are thin barrel files. Always implement changes in the modular subdirectories (`src/lib/synthesis/*`, `src/lib/canvas/*`, `src/lib/text/*`).
- **Single Source of Truth:** Character limits (`CHAR_LIMITS`) live in `src/lib/qaChecks.ts`. Safe-zone constants live in `src/lib/canvas/constants.ts`.
- **Canvas Purity:** `src/lib/canvas/renderSlide.ts` is a pure read-only projection. Never mutate or sanitize slide data inside the canvas draw loop.
- **JPG-Only Export:** Slides must always export as 1080×1920 `image/jpeg` (Q95), never PNG.

## 3. Pre-PR Verification Checklist
Before opening a pull request, run all three checks locally:
```bash
npm run lint
npm test
npm run build
```
