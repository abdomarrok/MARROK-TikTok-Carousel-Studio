# MARROK TikTok Carousel Studio — Architecture Guide

## 1. System Topology Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     Client SPA (React 19 + Vite 8)                         │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ AutonomousStudio.tsx (Fixed Zero-Scroll Shell — 3 Post Formats)      │  │
│  │  ├─ Command Bar + Overlay Ingestion Drawer (Text / YouTube / OCR)    │  │
│  │  ├─ Format Switcher: Carousel (8-Slide) | 1-Slide Poster | Reel      │  │
│  │  ├─ Left 9:16 Stage: ViewportCanvas OR MotionReelViewport + Transport│  │
│  │  └─ Right Inspector: Slide Editor / MotionReelInspector / Caption QA │  │
│  └───────┬──────────────────────────┬───────────────────────────┬───────┘  │
│          │                          │                           │          │
│          ▼                          ▼                           ▼          │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ Autonomous Pipeline  │  │ Static Slide Canvas  │  │ Motion Reel Eng. │  │
│  │ (autonomousPipeline) │  │ (src/lib/canvas/*)   │  │ (src/lib/motion) │  │
│  │  ├─ parseCarousel    │  │  ├─ layoutAwareness  │  │  ├─ marrokChrome │  │
│  │  ├─ sanitizeCarousel │  │  ├─ layoutBounds     │  │  ├─ marrokSlides │  │
│  │  ├─ condenseSingle   │  │  ├─ renderSlide      │  │  ├─ sfxSynth 48k │  │
│  │  └─ QA & Risk Gates  │  │  └─ exporter (JPG)   │  │  └─ videoExporter│  │
│  └──────────┬───────────┘  └──────────────────────┘  └──────────────────┘  │
└─────────────┼──────────────────────────────────────────────────────────────┘
              │ HTTP JSON (4.5 MB limit, AbortSignal, Multi-Key Headers)
              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                Express Serverless API Gateway (api/index.ts)               │
│                                                                            │
│  ├─ api/config.ts (Multi-Key Pool, Env Validator, Security, Rate Limiter)  │
│  ├─ POST /api/generate       -> api/controllers/generateController.ts      │
│  │    ├─ Tier 1: Gemini Key Pool (Primary -> Backup #2 -> Pool Keys)       │
│  │    ├─ Tier 2: Zero-Key Free AI Backup (Pollinations OpenAI-compatible)  │
│  │    └─ Tier 3: Deterministic Local Fallback (synthesizeCarousel)         │
│  ├─ POST /api/refine-slide   -> api/controllers/refineSlideController.ts   │
│  ├─ POST /api/generate-image -> api/controllers/imageController.ts         │
│  │    ├─ Tier 1: Gemini Image Models across Key Pool (9:16 1K)             │
│  │    └─ Tier 2: Zero-Key Pollinations Flux 9:16 (1080×1920)               │
│  ├─ GET  /api/proxy-image    -> api/controllers/proxyController.ts         │
│  │    └─ HTTPS-only, DNS/IP SSRF Guard, 2MB Cap, 5 MIME Allowlist, SVG San │
│  └─ GET  /api/search-media   -> api/controllers/mediaController.ts         │
└────────────────────────────────────────────────────────────────────────────┘
```

## 2. Module Responsibilities

| Path | Responsibility |
|---|---|
| `api/index.ts` | Express router, Vercel rewrite path restoration (`x-matched-path`), CORS, rate limiting, security headers |
| `api/config.ts` | Startup env validation, `getGeminiKeyPool(req)` multi-key rotation, model cascade parsing, rate limiter |
| `api/freeAiFallback.ts` | Zero-key Pollinations AI text (`openai`/`mistral`) and 9:16 `flux` image fallback when Gemini keys are exhausted |
| `api/controllers/generateController.ts` | Bilingual deck synthesis (Carousel & 1-Slide), Google Search `groundingSupports` fact mapping, multi-key & free AI cascade |
| `api/controllers/proxyController.ts` | SSRF-hardened HTTPS image proxy with DNS resolution check, 2 MB cap, and SVG sanitization |
| `src/lib/canvas/layoutAwareness.ts` | Pure mathematical layout engine enforcing vertical clearances and anti-collision drag clamping |
| `src/lib/canvas/renderSlide.ts` | Pure 1080×1920 2D canvas projection for Carousel slides and 1-Slide Infographic Posters |
| `src/lib/canvas/exporter.ts` | Single JPG Q95 download, clipboard copy, Contact Sheet JPG, and Metricool ZIP bundle |
| `src/lib/synthesis/singleSlideCondenser.ts` | Condenses an 8-slide carousel into a 1-slide infographic poster with 3 bilingual takeaways |
| `src/lib/motion/marrokSlideChrome.ts` | Shared MARROK slide environment for Motion Reels (radial glow, 108px grid, CAD reticles, `drawMarrokVectorBadge` header, surface cards, bilingual spring copy, pagination footer) |
| `src/lib/motion/templates/*` | 4 animated 9:16 templates (`marrok-slides`, `kinetic-text`, `brand-intro`, `product-showcase`) |
| `src/lib/motion/sfxSynthesizer.ts` | 48kHz procedural sound synthesizer (`click`, `pop`, `thump`, `whoosh`) and 16-bit WAV encoder |
| `src/lib/motion/videoExporter.ts` | Browser `MediaRecorder` + Web Audio muxed video exporter (`.webm`/`.mp4`), `.wav` export, and standalone `.html` export |
| `src/lib/qaChecks.ts` | Single source of truth for `CHAR_LIMITS`, `SINGLE_SLIDE_CHAR_LIMITS`, and pre-export QA checks |
| `src/lib/riskChecks.ts` | Platform safety gate (`PASS` / `WARN` / `BLOCK`) for originality, copyright, cover quality, numbers, and repetition |
