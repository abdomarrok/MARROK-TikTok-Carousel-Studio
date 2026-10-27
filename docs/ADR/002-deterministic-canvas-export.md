# ADR 002: Unified 1080×1920 Canvas Projection and 100% JPG Export

## Status
Accepted

## Context
HTML/CSS-to-image libraries (`html2canvas`, `dom-to-image`) suffer from inconsistent Arabic RTL ligature shaping, broken SVG foreignObject policies, and viewport scaling drift between desktop previews and exported files. Furthermore, TikTok photo-mode carousels compress PNG uploads aggressively and expect 1080×1920 (9:16) JPG frames.

## Decision
1. Both the interactive studio preview (`ViewportCanvas.tsx`) and the batch exporter (`src/lib/canvas/exporter.ts`) share a single pure 2D Canvas rendering path (`renderSlideToCanvas` in `src/lib/canvas/renderSlide.ts`) backed by `computeSlideLayoutAwareness` (`src/lib/canvas/layoutAwareness.ts`).
2. `renderSlide.ts` is strictly read-only (no text mutation or sanitization inside the draw loop) and enforces a 26px mobile typography floor and TikTok safe zones ($x \le 945$, $y \le 1710$).
3. All file exports — single-slide downloads, Contact Sheet exports, and the Metricool ZIP bundle (`slide1.jpg` ... `slideN.jpg`) — are encoded as 1080×1920 `image/jpeg` at quality `0.95` (never PNG).
