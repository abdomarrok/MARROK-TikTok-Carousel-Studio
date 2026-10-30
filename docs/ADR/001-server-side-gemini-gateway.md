# ADR 001: Server-Side Gemini Gateway with Multi-Key Failover & Deterministic Offline Fallback

## Status
Accepted

## Context
MARROK Content Studio synthesizes bilingual (EN + AR) technical carousels, 1-slide posters, and motion reels using `@google/genai`. Calling Gemini directly from the browser with server secrets would expose `GEMINI_API_KEY` in client network traffic and leave the application non-functional when API quotas or network connectivity fail.

## Decision
1. All Gemini calls (`/api/generate`, `/api/refine-slide`, `/api/generate-image`) execute server-side in Express (`api/index.ts`), deployed as a Vercel Serverless Function (`maxDuration: 60`).
2. Each outbound SDK call uses `AbortSignal.timeout()` so timed-out requests cancel underlying HTTP streams immediately and stop billing.
3. `/api/generate` caps total execution at 45s across the ordered key pool (`getGeminiKeyPool(req)`).
4. Grounding provenance is strictly enforced:
   - `status: 'verified_live'` and `engine: 'grounded'` are set **only** when Google Search returns actual web sources (`webSources.length > 0`).
   - Fact `sourceUrl` fields are populated strictly from `groundingMetadata.groundingSupports` segment indices — never by cycling through `webSources[i % n]`.
   - `userReviewed` always starts `false`; only an explicit user action in the UI sets `userReviewed: true`.
5. If all Gemini keys fail or hit quota (`429`), `/api/generate` cascades to the zero-key Free AI Backup (`api/freeAiFallback.ts`) and finally returns a deterministic deck from `synthesizeCarousel()` with `engine: 'offline'`, `status: 'unverified_draft'`, and HTTP 200 so the creator's workflow never hard-crashes.
