# Changelog — MARROK TikTok Carousel Studio

## [1.0.0] — Production Handoff Release

### Phase 0: Architecture & Security Audit
- Added `docs/AUDIT.md` with system architecture map, end-to-end data flow trace, re-verification table against current code, duplicate/barrel file inventory, dependency audit, and prioritized risk register.

### Phase 1: Security & Grounding Trust
- **Authentic Grounding Provenance (`api/controllers/generateController.ts`):**
  - Results are marked `status: 'verified_live'` and `engine: 'grounded'` **only** when Google Search grounding returns actual web sources (`webSources.length > 0`).
  - Ungrounded LLM outputs are marked `status: 'unverified_draft'`, `engine: 'ungrounded'`, and `userReviewed: false`.
  - Replaced cyclic fake source assignment (`webSources[i % n]`) with `mapFactsWithGroundingSupports()`, which maps fact citations strictly via `groundingMetadata.groundingSupports` segment indices or leaves `sourceUrl` empty.
  - Added a visible Engine Provenance Badge (`Grounded` / `Ungrounded AI` / `Offline`) in the studio command bar and `ExportBar`.
- **Image Proxy Hardening (`api/controllers/proxyController.ts`):**
  - Enforced `https:` only (`http:` rejected with `400`).
  - Added DNS/IP SSRF validation on initial URLs and all redirect hops, plus `ALLOWED_SEARCH_IMAGE_HOSTS` when `?source=search`.
  - Restricted accepted MIME types to `image/png`, `image/jpeg`, `image/webp`, `image/gif`, and `image/svg+xml` (rejecting others with `415`).
  - Capped response size at `2 MB` and timeout at `6s`, added `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`, and added `sanitizeSvgContent()`.
- **Abuse & Secret Controls (`api/config.ts`, `api/index.ts`, `.env.example`):**
  - Added startup environment validator, per-IP rate limiting on `/api/generate`, `/api/refine-slide`, and `/api/generate-image`, security headers middleware, configurable `ALLOWED_ORIGIN`, optional `API_SHARED_SECRET`, and `4.5mb` JSON body limit.

### Phase 2: Reliability
- Replaced manual timers with `AbortSignal.timeout()` across `/api/generate` and `/api/generate-image`, capping `/api/generate` at 45s (1 grounded attempt + 1 ungrounded attempt).
- Made Gemini generation and image models configurable via `GEMINI_GENERATION_MODELS` and `GEMINI_IMAGE_MODELS`.
- Added 413 payload validation in `api/controllers/imageController.ts` and `QuotaExceededError` fallback in `src/App.tsx` (automatically stripping oversized inline `data:image/` strings from `localStorage` drafts).

### Phase 3: Architecture & Code Quality
- Standardized `downloadAllSlidesZip()` (`src/lib/canvas/exporter.ts`) to export `slide1.jpg` ... `slideN.jpg` (`image/jpeg` Q95, never PNG).
- Replaced hardcoded hashtags in `src/components/AutonomousStudio.tsx` with dynamic topic-derived hashtags (`deriveTopicHashtags()`).
- Aligned `README.md` with `CHAR_LIMITS` in `src/lib/qaChecks.ts` (`enBody: 140`, `arBody: 150`).

### Phase 4: Product Safety Rules in Code
- Created `src/lib/riskChecks.ts` (`runPlatformRiskChecks`) returning `PASS` / `WARN` / `BLOCK` across Originality, Copyrighted IP/Audio, First-Frame Cover Quality, Unverified Numeric Claims, and Slide Repetition.
- Added vertical safe-zone overflow (`y > 1760`), PNG format rejection, and dimension validation to `runQAChecks()` (`src/lib/qaChecks.ts`).
- Enforced pre-export safety & QA gate in `AutonomousStudio.tsx` and `ExportBar.tsx`: requires creator/channel attribution on the CTA slide and blocks export on `BLOCK` / `FAIL` unless the creator explicitly toggles **"Override & allow export"**.

### Phase 5 & 6: Tests, Tooling, CI & Documentation
- Expanded `src/lib/network/proxySecurity.test.ts` and added `src/lib/qaAndRiskChecks.test.ts`.
- Renamed package to `marrok-tiktok-carousel-studio`, removed unused `autoprefixer` and `bun.lock`, and added `.nvmrc`, `.editorconfig`, `.github/workflows/ci.yml`, `docs/ARCHITECTURE.md`, `docs/ADR/*`, `CONTRIBUTING.md`, and `SECURITY.md`.

---

## Behavior Changes Summary
1. **Grounding & Review Status:** AI-generated decks without live Google Search sources now start as `status: 'unverified_draft'` and `userReviewed: false` instead of `verified_live` / `userReviewed: true`.
2. **Fact Citations:** Facts without matching `groundingSupports` no longer receive cycled URLs from unrelated search results; their `sourceUrl` remains empty.
3. **ZIP Slide Format:** `downloadAllSlidesZip()` now writes `slide1.jpg` ... `slideN.jpg` (JPEG Q95) instead of `.png` files.
4. **Pre-Export Safety Gate:** Exporting a ZIP when `runQAChecks` fails, `runPlatformRiskChecks` returns `BLOCK`, or Creator Credit is empty now focuses the `Caption & QA` tab and blocks export until fixed or explicitly overridden.
5. **Image Proxy (`/api/proxy-image`):** Rejects `http://` URLs (`400`), non-allowlisted MIME types (`415`), and payloads `> 2 MB` (`413`).
