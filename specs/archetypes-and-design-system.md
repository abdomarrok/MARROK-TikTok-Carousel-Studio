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

### Archetype 1: Hub Slide (Slide 1 - The Hook)
- **Position:** Exclusively Slide 1.
- **Visuals:** Central pulsing icon enclosed in a neon circle, surrounded by 6 satellite icons connected via subtle orbital radial vectors.
- **Copy:** 2–6 word high-impact headline, followed immediately by Arabic technical translation, and 1 crisp sentence explaining the hook premise.

### Archetype 2: Row Slide with 1 Icon
- **Position:** Slides 2 through 7 (Architecture & Benchmarks).
- **Visuals:** Single full-width elevated pill/card showcasing 1 primary icon and a concise 1–3 word micro-label (e.g. `~100 GB history`, `Server-side cache`).
- **Copy:** High-priority metric or fundamental technical concept.

### Archetype 3: Row Slide with 2 Icons
- **Position:** Slides 2 through 7.
- **Visuals:** Two parallel cards side-by-side, each with an icon and label. Ideal for comparisons (e.g. `Git Limits` vs. `Scion Architecture`, `Old Way` vs. `New Way`).

### Archetype 4: Row Slide with 3 Icons
- **Position:** Slides 2 through 7.
- **Visuals:** Three compact cards in a horizontal row. Ideal for sequences, toolchains, or 3-step technical workflows (e.g. `Capture`, `Analyze`, `Mitigate`).

### Archetype 5: CTA Slide (The Closer)
- **Position:** Final Slide (Slide 8 or 9).
- **Visuals:** Centered MARROK geometric emblem, high-impact domain question addressing the engineering viewer, call-to-action pill button (`Send us a DM` / `تواصل معنا`), and source citation footer.

---

## 5. TikTok 9:16 Viewport Safe Zones

To prevent TikTok interface elements (profile picture, like/comment buttons, caption box, and search bar) from obscuring critical content, the 1080×1920 canvas enforces strict safe zones:

- **Top Safe Zone (180px):** Cleared for TikTok search bar, sound ticker, and live tags.
- **Bottom Safe Zone (320px):** Cleared for TikTok creator handle, sound name, and multi-line caption overlay.
- **Right Margin Safe Zone (120px):** Cleared for like, bookmark, comment, and share icon column.
- **Safe Content Box:** 840px width × 1420px height, centered at `x = 120px, y = 180px`.
