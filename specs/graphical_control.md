# MARROK Architecture Specification: Direct Graphical Element Editing System

**Document Version:** 1.0.0  
**Status:** Approved & Implemented (Proof of Concept + Core Pipeline Active)  
**Author:** Principal Systems Architect & Full-Stack Lead  
**Scope:** `MARROK-TikTok-Carousel-Studio` Layout & Rendering Architecture  

---

## 1. Executive Summary & Problem Statement

Prior to this architecture, MARROK slides were generated and formatted through deterministic layout algorithms (`renderSlide.ts`, `archetypes/*.ts`). While these algorithms strictly conform to TikTok's 9:16 safe-zones (`x <= 945`, `y <= 1710`), engineering creators frequently require direct micro-adjustments:
- Shifting a complex architecture topology up or down to give more breathing room to an English/Arabic title.
- Scaling down an archetype diagram slightly (e.g. from 1.0x to 0.9x) to prevent visual crowding with technical sublabels.
- Offsetting Arabic titles horizontally to match asymmetric visual flow or typography accents.
- Repositioning the bilingual CTA button on final slides.

Previously, creators had to accept the rigid programmatic positions. This specification defines the **Direct Graphical Element Editing System**, providing millimeter-accurate layout control over slide elements while preserving pure read-only projection rendering and safe-zone guarantees.

---

## 2. Core Architectural Principles

1. **Pure Projection Integrity**:
   Canvas rendering remains a pure read-only function of `SlideData` and `ThemePalette`. Layout overrides are stored declaratively as state and applied during canvas draw passes. No layout mutations occur inside the draw loop.

2. **Logical 1080×1920 Coordinate Space**:
   All offsets (`dx`, `dy`) and bounds are calculated and stored in the canonical 1080×1920 canvas pixel space, completely independent of device display scaling or viewport aspect ratios.

3. **Safe-Zone Invariance**:
   Even with user overrides, the render pipeline enforces hard clamps against the TikTok safe margin ceiling (`SAFE_FOOTER_CEILING_Y = 1710`) and right HUD boundary (`x <= 945`). Overrides cannot break platform readability.

4. **Zero-Breaking-Change Serialization**:
   All graphical override fields are optional. Existing AI generation payloads, starter decks, and saved drafts without `layoutOverrides` continue to render identically.

---

## 3. Data Model & Schema Specification

The schema is integrated directly into `src/types.ts`:

```typescript
export type GraphicalElementId =
  | 'headerBadge'        // Top MARROK vector brand badge & category pill
  | 'graphicCard'        // Central visual archetype (diagram, code block, metric)
  | 'titleBlock'         // Primary English headline (Plus Jakarta Sans)
  | 'arabicTitleBlock'   // Primary Arabic headline (Cairo Bold)
  | 'bodyBlock'          // English body copy
  | 'arabicBodyBlock'    // Arabic body copy
  | 'ctaButton'          // Final slide bilingual CTA button
  | 'attributionCard';   // Brand verification link card

export interface ElementLayoutOverride {
  dx?: number;           // Horizontal offset in canvas pixels (range: -200 to +200)
  dy?: number;           // Vertical offset in canvas pixels (range: -200 to +200)
  scale?: number;        // Scale factor multiplier (range: 0.50 to 1.50, default: 1.00)
  opacity?: number;      // Alpha multiplier (range: 0.10 to 1.00, default: 1.00)
}

export interface SlideData {
  type: SlideType;
  // ... core slide fields (enTitle, arTitle, diagramNodes, etc.)
  layoutOverrides?: Partial<Record<GraphicalElementId, ElementLayoutOverride>>;
}
```

### JSON Serialization Example

In `carousel-manifest.json` and saved drafts:

```json
{
  "type": "hub",
  "enTitle": "High-Throughput Ingress Engine",
  "arTitle": "محرك الاستقبال عالي المعالجة",
  "layoutOverrides": {
    "graphicCard": {
      "dy": -24,
      "scale": 0.95
    },
    "arabicTitleBlock": {
      "dy": 10
    }
  }
}
```

---

## 4. Pipeline Integration & Canvas Transformation Math

Layout overrides are applied within `src/lib/canvas/renderSlide.ts` and archetype renderers using standard 2D canvas context transformations.

### 4.1 Archetype Visual Card (`graphicCard`)
The archetype card represents the central visual illustration. It is transformed around its optical center $(x = 540, y = 460)$:

$$\begin{aligned}
x' &= x_c + dx + (x - x_c) \cdot scale \\
y' &= y_c + dy + (y - y_c) \cdot scale
\end{aligned}$$

**Implementation:**
```typescript
const graphicOverride = slide.layoutOverrides?.graphicCard;
ctx.save();
if (graphicOverride) {
  const cx = CANVAS_WIDTH / 2; // 540
  const cy = 460;
  ctx.translate(cx + (graphicOverride.dx || 0), cy + (graphicOverride.dy || 0));
  const s = graphicOverride.scale ?? 1;
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  if (graphicOverride.opacity !== undefined) {
    ctx.globalAlpha *= Math.max(0, Math.min(1, graphicOverride.opacity));
  }
}

// Execute archetype draw subroutine (e.g. drawHubSlide, drawRowSlide)
yGraphicEnd = await drawArchetype(ctx, slide, theme, options);
ctx.restore();
```

### 4.2 Text Blocks (`titleBlock`, `arabicTitleBlock`, `bodyBlock`, `arabicBodyBlock`)
For text lines, vertical and horizontal offsets are applied to line draw coordinates with safe-ceiling clamping:

```typescript
const titleOverride = slide.layoutOverrides?.titleBlock;
const tDx = titleOverride?.dx || 0;
const tDy = titleOverride?.dy || 0;

for (const line of enTitleLines) {
  if (currentY + tDy + enTitle.lineHeight * 0.7 > SAFE_FOOTER_CEILING_Y) break;
  ctx.fillText(line, SAFE_TEXT_CENTER_X + tDx, currentY + tDy);
  currentY += enTitle.lineHeight;
}
```

---

## 5. Direct Viewport Hit-Testing & Interactive Selection

To allow creators to point and select elements naturally, `ViewportCanvas.tsx` implements responsive viewport hit-testing.

### 5.1 Coordinate Translation Math
The visible canvas is scaled by CSS inside the studio layout. Mouse clicks in CSS screen coordinates are mapped to 1080×1920 logical canvas coordinates:

```typescript
const rect = activeCanvasRef.current.getBoundingClientRect();
const clickYRatio = (e.clientY - rect.top) / rect.height;
```

### 5.2 Element Boundary Partitions

| Element ID | Normalized Vertical Partition ($y / 1920$) | Logical Canvas Range |
|---|---|---|
| `headerBadge` | $y < 0.12$ | $y < 230$px |
| `graphicCard` | $0.12 \le y < 0.42$ | $230 \le y < 806$px |
| `titleBlock` | $0.42 \le y < 0.53$ | $806 \le y < 1017$px |
| `arabicTitleBlock` | $0.53 \le y < 0.64$ | $1017 \le y < 1228$px |
| `bodyBlock` | $0.64 \le y < 0.77$ | $1228 \le y < 1478$px |
| `arabicBodyBlock` | $0.77 \le y < 0.90$ | $1478 \le y < 1728$px |
| `ctaButton` *(CTA Slide)* | $0.45 \le y < 0.60$ | $864 \le y < 1152$px |

### 5.3 Visual Feedback Overlay
When an element is selected (either by clicking the canvas or selecting it in the inspector), `ViewportCanvas.tsx` renders a high-contrast theme-accented dashed bounding box with corner sizing pips and an identifying pill tag.

---

## 6. Layer & Element Inspector Panel (`ElementInspector.tsx`)

A dedicated collapsible inspector panel is mounted in the right column of `AutonomousStudio.tsx`:
- **Graphical Block Selector**: Grid pills for each active layer with visual modification badges.
- **Horizontal Offset ($dX$)**: Continuous slider (-200px to +200px) and discrete step buttons (-10, +10).
- **Vertical Offset ($dY$)**: Continuous slider (-200px to +200px) and discrete step buttons (-10, +10).
- **Scale Factor**: Continuous slider (0.50x to 1.50x) and fine step buttons (-0.05, +0.05).
- **Reset Controls**: One-click reset for the selected element or all overrides on the current slide.
- **Debounced Instant Rerender**: Real-time canvas preview with zero latency.

---

## 7. State Concurrency, Persistence & Bundling

1. **Atomic Functional Updaters**:
   All override updates pass through `setCarousel((prev) => ...)` functional updaters, preventing stale closure overwrites when tweaking sliders rapidly.

2. **ZIP Bundle Integration**:
   When exporting the full Metricool bundle (`src/lib/canvas/exporter.ts`), each slide canvas is projected using its active `layoutOverrides`. Furthermore, `carousel-manifest.json` persists the full `layoutOverrides` dictionary, allowing exports to be restored or re-edited with 100% fidelity.

---

## 8. Roadmap & Future Enhancements

1. **Direct Viewport Dragging (Phase 3)**:
   Pointer event listeners (`onPointerDown`, `onPointerMove`, `onPointerUp`) allowing direct drag-to-translate directly on the viewport canvas.
2. **Magnetic Alignment Guides**:
   Canvas center guidelines and safe-zone boundary snapping when dragging within 10px of standard positions.
3. **Multi-Slide Layout Stamping**:
   "Apply this element offset to all slides" action for consistent branding adjustments across 8-slide decks.
