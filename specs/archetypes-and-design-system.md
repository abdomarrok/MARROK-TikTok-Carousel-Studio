# MARROK Archetypes & Design System Specification

## 1. Design Constitution & Philosophy

MARROK carousels are designed specifically for high-velocity software engineers, cybersecurity researchers, and technical architects on TikTok. The visual style avoids generic social media fluff and adheres to a dark, high-contrast, technical terminal aesthetic.

---

## 2. Color Palette & Semantic Tokens

| Token | Hex Value | Semantic Usage |
|---|---|---|
| **Canvas Background** | `#080d11` | Primary 1080×1920 canvas background |
| **Card Surface** | `#121A21` | Elevated container surfaces for rows & icons |
| **Border Stroke** | `#1E2833` | 1px clean technical boundary borders |
| **Accent Primary** | `#37E2C0` | Neon teal for badges, active states, key metrics |
| **Risk / Alert** | `#F43F5E` | Coral red for security alerts, CVE tags, break points |
| **Text Primary** | `#FFFFFF` | Bold English headlines and high-priority metrics |
| **Text Muted** | `#CDD5D9` | Secondary descriptions and Arabic subtitles |
| **Metadata Muted** | `#8E989E` | Slide counter numbers, URLs, footer credits |

### Multi-Theme Presets Suite

| Theme ID | Name | Canvas Bg | Card Surface | Accent | Best For |
|---|---|---|---|---|---|
| `teal` | **Terminal Teal** | `#081216` | `#0f1a1e` | `#37E2C0` | MARROK Core, DevTools, VCS |
| `cyber` | **Cyber Threat Crimson** | `#12080a` | `#1c0f12` | `#F43F5E` | Security Exploits, CVEs, Reversing |
| `violet` | **Electric AI Violet** | `#0d0917` | `#171126` | `#A855F7` | LLMs, Deep Learning, Agents |
| `blueprint` | **Enterprise Blueprint** | `#080e18` | `#0f1c2d` | `#38BDF8` | Kubernetes, Cloud Architecture |
| `amber` | **Solarized Amber** | `#15100E` | `#211814` | `#F09A67` | Distributed Systems, Databases |
| `emerald` | **Matrix Emerald** | `#06120b` | `#0d2215` | `#10B981` | Linux Kernel, eBPF, Assembly |
| `monochrome` | **Obsidian Minimalist** | `#0a0a0c` | `#141418` | `#E4E4E7` | Systems Benchmarks, Minimalist |

*Full Custom Picker:* Users can also click "Colors..." to customize all 9 individual hex tokens with real-time SVG and PNG/ZIP export reflection.

---

## 3. Typography & Bilingual Formatting Rules

### Fonts
- **English Display & Body:** *Plus Jakarta Sans* (Weights: 600 SemiBold, 700 Bold, 800 ExtraBold).
- **Arabic Display & Body:** *Cairo* (Weights: 600 SemiBold, 700 Bold, 800 ExtraBold), rendered with `direction: rtl`.
- **Monospace & Code:** *JetBrains Mono* for hashes, CLI flags, memory addresses, and benchmark numbers.

### Latin Proper Noun Preservation
In technical Arabic writing, transliterating modern software tools phonetically often creates confusion (e.g. "جيت" instead of "Git", "دوكر" instead of "Docker"). 

**Rule:** All proper nouns, programming languages, tool names, and metrics must remain in Latin script within the Arabic copy:
- *Incorrect:* نظام أنثروبيك الجديد لبديل الجيت
- *Correct:* نظام Scion الجديد من Anthropic لبديل Git

---

## 4. The 5 MARROK Slide Archetypes

```
  Archetype 1: HUB          Archetype 2: ROW (1)       Archetype 3: ROW (2)
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│     [CATEGORY]        │  │     [CATEGORY]        │  │     [CATEGORY]        │
│                       │  │                       │  │                       │
│      o   o   o        │  │   ┌───────────────┐   │  │  ┌───────┐ ┌───────┐  │
│        \ | /          │  │   │   (★) Label   │   │  │  │(★) Lb1│ │(★) Lb2│  │
│      o──(●)──o        │  │   └───────────────┘   │  │  └───────┘ └───────┘  │
│        / | \          │  │                       │  │                       │
│      o   o   o        │  │   English Headline    │  │   English Headline    │
│                       │  │   Arabic Subtitle     │  │   Arabic Subtitle     │
│   English Headline    │  │                       │  │                       │
│   Arabic Subtitle     │  │   Detailed Body Copy  │  │   Detailed Body Copy  │
│   Hook Explanation    │  │   Arabic Explanation  │  │   Arabic Explanation  │
│                       │  │                       │  │                       │
│ marrok.org   [1 / 8]  │  │ marrok.org   [2 / 8]  │  │ marrok.org   [3 / 8]  │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘

  Archetype 4: ROW (3)      Archetype 5: CTA / CLOSE
┌───────────────────────┐  ┌───────────────────────┐
│     [CATEGORY]        │  │     [CATEGORY]        │
│                       │  │                       │
│ ┌─────┐ ┌─────┐ ┌─────┐│  │                       │
│ │(★)L1│ │(★)L2│ │(★)L3││  │    [ MARROK ] Logo    │
│ └─────┘ └─────┘ └─────┘│  │                       │
│                       │  │   Domain Question?    │
│   English Headline    │  │   سؤال تقني موجه؟     │
│   Arabic Subtitle     │  │                       │
│                       │  │   [ Send us a DM ]    │
│   Detailed Body Copy  │  │                       │
│   Arabic Explanation  │  │  marrok.org · Source  │
│                       │  │                       │
│ marrok.org   [5 / 8]  │  │ marrok.org   [8 / 8]  │
└───────────────────────┘  └───────────────────────┘
```

## 4. The MARROK Slide Archetypes System

The MARROK visual system provides 7 archetypes tailored for developer engagement:

1. **Hub Slide (`hub`) (Slide 1 - The Hook)**:
   - Central pulsing hub icon connected to 6 orbiting satellites via radial vectors.
   - Supports built-in technical icons, custom SVG uploads, or official tech brand CDN logos.
2. **Row Cards (`row`) (1, 2, or 3 items)**:
   - Horizontal icon cards with micro-labels for core concepts or step sequences.
3. **Metric Hero Card (`metric`)**:
   - Giant high-contrast metric value (e.g. `200x`, `0ms`, `99.9%`), category label, and delta pill.
4. **Terminal / Code Window (`code`)**:
   - Monospace window with macOS-style window controls, syntax highlighting, diff markings (`+`, `-`, `$`).
5. **Comparison Split (`compare`)**:
   - Side-by-side legacy vs modern cards with problem/solution bullet points.
6. **Image Visual Card (`image`)**:
   - Elevated technical diagram or visual asset container with `contain` or `cover` fit, caption badge, and subject-based web resolution.
   - Built-in CORS image proxy (`/api/proxy-image`) ensures canvases are never tainted, enabling direct PNG/ZIP export and clipboard copying.
7. **CTA Slide (`cta`) (The Closer)**:
   - Geometric branding emblem, domain question, CTA pill, and bilingual source attribution credit.

### Internet Icons & Web Media Resolution
- **Subject-Aware CDN Resolution**: Automatically resolves official logos for 40+ top developer technologies (Redis, Docker, Kubernetes, Rust, Go, FastAPI, PostgreSQL, AWS, Linux, etc.) via jsDelivr CDN.
- **Interactive Web Search Modal**: slide editor includes search modal to query Simple Icons tech brands or Wikimedia Commons technical architecture diagrams, paste HTTPS URLs, or upload custom SVGs.
- **Theme Harmonization & Tinting Engine**:
  - Automatically tints web logos and SVGs using `globalCompositeOperation = 'source-in'` to match the active post theme accent (`theme.accent`) or icon stroke (`theme.iconStroke`), preventing dark or clashing icons.
  - Image card containers strictly inherit the post theme's `theme.surface` and `theme.surfaceBorder` with a technical blueprint grid and ambient radial glow.
  - Supports 4 visual harmonization modes in Slide Editor: `Theme HUD (Auto)` (blueprint grid + accent recoloring), `Invert White BG` (inverts harsh white diagrams into dark mode), `Accent Tint` (color wash), and `Original Colors`.

---

## 5. TikTok 9:16 Viewport Safe Zones

To prevent TikTok interface elements (profile picture, like/comment buttons, caption box, and search bar) from obscuring critical content, the 1080×1920 canvas enforces strict safe zones:

- **Top Safe Zone (180px):** Cleared for TikTok search bar, sound ticker, and live tags.
- **Bottom Safe Zone (320px):** Cleared for TikTok creator handle, sound name, and multi-line caption overlay.
- **Right Margin Safe Zone (120px):** Cleared for like, bookmark, comment, and share icon column.
- **Safe Content Box:** 840px width × 1420px height, centered at `x = 120px, y = 180px`.
