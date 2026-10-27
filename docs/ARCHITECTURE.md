# MARROK TikTok Carousel Studio — Architecture Guide

## 1. System Topology Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     Client SPA (React 19 + Vite 8)                         │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ AutonomousStudio.tsx (Fixed Zero-Scroll Shell)                       │  │
│  │  ├─ Command Bar + Overlay Ingestion Drawer (Text / YouTube / OCR)    │  │
│  │  ├─ Left 9:16 Stage: ViewportCanvas + SlideNavigator + Quick Export  │  │
│  │  └─ Right Inspector: Copy | Visual Layout | Position | Caption & QA  │  │
│  └───────────────┬──────────────────────────────────────┬───────────────┘  │
│                  │                                      │                  │
│                  ▼                                      ▼                  │
│  ┌───────────────────────────────┐      ┌───────────────────────────────┐  │
│  │ Autonomous Pipeline           │      │ Canvas & Layout Engine        │  │
│  │ (src/lib/autonomousPipeline)  │      │ (src/lib/canvas/*)            │  │
│  │  ├─ parseCarouselData         │      │  ├─ layoutAwareness.ts        │  │
│  │  ├─ sanitizeFullCarousel      │      │  ├─ layoutBounds.ts           │  │
│  │  ├─ enrichAndPaceCarousel     │      │  ├─ renderSlide.ts            │  │
│  │  ├─ runQAChecks               │      │  └─ exporter.ts (JPG + ZIP)   │  │
│  │  └─ runPlatformRiskChecks     │      └───────────────────────────────┘  │
│  └───────────────┬───────────────┘                                         │
└──────────────────┼─────────────────────────────────────────────────────────┘
                   │ HTTP JSON (4.5 MB limit, AbortSignal)
                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                Express Serverless API Gateway (api/index.ts)               │
│                                                                            │
│  ├─ api/config.ts (Startup Env Validation, Security Headers, Rate Limiter) │
│  ├─ POST /api/generate       -> api/controllers/generateController.ts      │
│  │    ├─ Attempt 1: Grounded (Google Search, <=200 chars, 12s timeout)     │
│  │    ├─ Attempt 2: Ungrounded Schema (15s timeout)                        │
│  │    └─ Fallback: synthesizeCarousel() (X-Marrok-Engine: offline)         │
│  ├─ POST /api/refine-slide   -> api/controllers/refineSlideController.ts   │
│  ├─ POST /api/generate-image -> api/controllers/imageController.ts         │
│  ├─ GET  /api/proxy-image    -> api/controllers/proxyController.ts         │
│  │    └─ HTTPS-only, DNS/IP SSRF Guard, 2MB Cap, 5 MIME Allowlist, SVG San │
│  └─ GET  /api/search-media   -> api/controllers/mediaController.ts         │
└────────────────────────────────────────────────────────────────────────────┘
```

## 2. Module Responsibilities

| Path | Responsibility |
|---|---|
| `api/index.ts` | Express router, Vercel rewrite path restoration (`x-matched-path`), CORS, rate limiting, security headers |
| `api/config.ts` | Startup env validation, model cascade parsing, sliding-window rate limiter, security headers |
| `api/controllers/generateController.ts` | Bilingual deck synthesis, Google Search `groundingSupports` fact mapping, offline fallback |
| `api/controllers/proxyController.ts` | SSRF-hardened HTTPS image proxy with DNS resolution check, 2 MB cap, and SVG sanitization |
| `src/lib/canvas/layoutAwareness.ts` | Pure mathematical layout engine enforcing vertical clearances and anti-collision drag clamping |
| `src/lib/canvas/renderSlide.ts` | Pure 1080×1920 2D canvas projection shared 1:1 by the interactive preview and JPG exporter |
| `src/lib/canvas/exporter.ts` | Single JPG Q95 download, clipboard copy, Contact Sheet JPG, and Metricool ZIP bundle |
| `src/lib/qaChecks.ts` | Single source of truth for `CHAR_LIMITS` and pre-export structural/typographic QA checks |
| `src/lib/riskChecks.ts` | Platform safety gate (`PASS` / `WARN` / `BLOCK`) for originality, copyright, cover quality, numbers, and repetition |
