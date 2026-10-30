# ADR 002: Unified Multi-Dimension Canvas Projection and 100% JPG Export

## Status
Accepted

## Context
HTML/CSS-to-image libraries (`html2canvas`, `dom-to-image`) suffer from inconsistent Arabic RTL ligature shaping, broken SVG foreignObject policies, and viewport scaling drift between desktop previews and exported files. Furthermore, TikTok photo-mode carousels compress PNG uploads aggressively and social feeds require exact pixel presets across TikTok (`1080×1920`) and Instagram (`1080×1350`, `1080×1440`, `1080×1080`, `1080×1920`).

## Decision
1. Both the interactive studio preview (`ViewportCanvas.tsx`) and the batch exporter (`src/lib/canvas/exporter.ts`) share a single pure 2D Canvas rendering path (`renderSlideToCanvas` in `src/lib/canvas/renderSlide.ts`) backed by `computeSlideLayoutAwareness` (`src/lib/canvas/layoutAwareness.ts`) and `CANVAS_DIMENSIONS` (`src/lib/canvas/dimensions.ts`).
2. `renderSlide.ts` is strictly read-only (no text mutation or sanitization inside the draw loop) and enforces a 26px mobile typography floor and platform-calibrated safe zones (`y <= 1510` default active 3:4 viewport for TikTok Photo Mode, `y <= 1710` hard ceiling).
3. All static file exports — single-slide downloads, Contact Sheet exports, and the Metricool ZIP bundle (`slide1.jpg` ... `slideN.jpg`) — are encoded as `image/jpeg` at quality `0.95` (never PNG).
