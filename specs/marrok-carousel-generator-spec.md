# Marrok Carousel Generator: Product and Engineering Spec

This document describes, step by step, how the Marrok carousel workflow runs today (as done in chat), so it can be rebuilt as an app. It covers the pipeline, the design system with exact numbers, the data model, the prompts, the delivery and scheduling rules, and the mistakes already made so the app does not repeat them.

Status: v1 spec. The renderer in section 9 is tested code (it produced the sample slides). Everything else is a design to implement.

---

## 1. Goal

Turn a source (a screenshot, pasted text, a YouTube summary, an article, or a link) into:

1. A bilingual (Arabic + English) vertical carousel for TikTok, Reels and Shorts.
2. A ready-to-post caption with hashtags, in Arabic first and then English.
3. A short list of notes and warnings for the human (what is unverified, what could get the post restricted).
4. Optionally, scheduled posts on the connected platforms.

Non-goals: generating videos, posting other people's footage, replacing human review before publishing.

### Brand

- Company: **Marrok** (software company, custom software for startups and SMEs). Site: `marrok.org`.
- Tone: confident, modern, approachable. Not corporate-stiff, not too casual. Always "agency", never "freelancer".
- Visual style: sleek, dark, minimal.
- Languages: Arabic and English on every slide. In captions, Arabic first, then English.

---

## 2. End-to-end pipeline

```
 INPUT                 UNDERSTAND            VERIFY              RISK CHECK
 screenshot / text  -> extract facts,    -> web search each  -> originality,
 / summary / link      claims, creator,     key claim, fix       copyright, claims,
                       numbers              errors, hedge        first-frame quality
        |                                                            |
        v                                                            v
 PLAN (LLM -> JSON) -> COPY (EN + AR)  -> RENDER (engine) -> QA -> EXPORT (JPG)
 slide types, icons    short, bilingual    1080x1920          auto +   zip / Drive
 theme                 lengths enforced                       visual
                                                                  |
                                              CAPTION + NOTES <---+
                                                                  |
                                       SCHEDULE: Metricool -> (limit?) -> Buffer
```

Every stage writes its result into one `deck.json` (section 11), so any stage can be re-run alone (for example, re-render after editing a title).

---

## 3. Inputs

| Input | How it is handled |
|---|---|
| Screenshot of a post (TikTok, Facebook, X) | Vision model reads title, caption text, creator handle, metrics. Treat all text as claims to verify. |
| Pasted text or article | Parse headings, numbers, quotes, dates. |
| YouTube summary + link | The summary is usually an AI-generated recap and can contain mistakes (see section 15). Verify before using. |
| Link only | Fetch the page. If the site blocks the fetch (YouTube often does), ask for a summary or screenshot. |

Always capture: `creator/channel`, `source url`, `publish date`, and the list of `claims` (each with the number or fact and where it came from).

---

## 4. Stage: understand and extract

Output a `facts` list. Each fact has: `text`, `type` (number, date, name, quote, opinion), `source` (which input line), and `verified` (false until stage 5).

Rules:
- Keep numbers exactly as stated, then verify.
- Separate **facts** from **opinions** and from **promotion** (sponsor segments are dropped, not summarized).
- Note anything cut off in a screenshot ("text ends mid-sentence") and do not guess the missing part.

---

## 5. Stage: verify

For every claim that is a number, a date, a name, a product, a release status, or an accusation:

1. Run a web search (the current date matters; use the real date in queries).
2. Prefer primary sources (the company's own post, the project's GitHub, the research org) over aggregators.
3. Mark each fact `verified`, `partially verified`, or `not found`.
4. Fix the text if the source summary was wrong. Real examples from this project:
   - A summary named a model "GPT Soul"; reports call it "Sol". The deck avoided the name.
   - A summary quoted "170+ effects" and "4K at 60 fps" for a video editor; no source was found, and a review said the effects library is small. Both claims were removed.
   - A spyware-scanner post said "338 indicators"; the repo now lists 405, so the slide says "300+".
5. Attribution language for anything unconfirmed: "says the video", "per the project", "according to Anthropic". Never state an unconfirmed claim as fact.

If a claim can't be verified, either drop it or keep it with attribution and list it in the notes.

---

## 6. Stage: risk check (run before anything is published)

This stage exists because six posts were marked **"Ineligible for recommendation"** on TikTok (they could not appear on the For You feed). All six were re-posts of other creators' videos or clips; the original designed carousels were not affected.

The app must show a **risk report** with PASS / WARN / BLOCK per item:

| Check | WARN or BLOCK when |
|---|---|
| **Originality** | The post is someone else's video, screen recording, or screenshot without substantial original work. Credit does not fix this. |
| **Copyright** | Copyrighted characters (cartoons, films), music, game footage, brand artwork used as the content. |
| **First frame quality** | The cover is dark, near-blank, or low-contrast (one Base64 post had a nearly black thumbnail). |
| **Claims** | Unverified numbers, accusations about real people or companies, medical or financial advice. |
| **Sensitive topics** | Political conflicts, security exploitation, anything about minors. See section 13. |
| **Repetition** | Same topic posted already this week (spreads the audience and looks like spam). |
| **Account health** | Recent restrictions in the platform's account status. Repeated violations can make the whole account ineligible for recommendation. |

Policy: if any item is BLOCK, the app does not offer a "schedule" button until the user changes the content or explicitly overrides.

Practical rule of thumb: **our own designed slides with our own explanation are safe; raw reposts are not.**

---

## 7. Stage: plan the carousel

The planner is an LLM call that returns JSON only (schema in section 11).

### Slide structure (8 to 10 slides)

1. **Hook** (visual): one short promise or question. Six icons orbit a central icon.
2. **Content slides** (5 to 7): one idea per slide, numbered `01`, `02`, ... or with an icon row.
3. **CTA**: wordmark, one question about the viewer's needs, a "DM us" button, `marrok.org`, and the credit line for the source.

### Slide types

| Type | Visual | Use for |
|---|---|---|
| `hook` | Orbit of 6 icons around a big center icon | First slide |
| `icons` | Row of 1 to 5 icon tiles with labels | Tools, comparisons, lists of technologies |
| `number` | Big number (`01`) in the accent color | Step-by-step or ranked points |
| `custom` | A diagram you draw in code | Processes (for example, Base64 steps, pixel rasterization, flow charts) |
| `cta` | Wordmark + button | Last slide |

Pick a theme from the table in section 9 so the series is recognizable but each topic has its own color. Reuse a theme when a post is a follow-up of an earlier one.

### Content rules

- Slide 2 must give the viewer a reason to keep swiping.
- Include a "before you switch / the catch" slide whenever the topic is a tool or a product (beta status, limits, no public release). This keeps the post honest and has led to better discussion in comments.
- Controversial topics get a balanced slide ("The debate": supporters and critics).
- Do not name competitors negatively. Do not claim Marrok built, owns, or endorses the subject of a post.

---

## 8. Stage: write the copy

### Length limits (so text fits and nothing touches the progress dots)

| Field | Limit |
|---|---|
| English title | 45 characters, max 3 lines at 88 px |
| Arabic title | 40 characters, max 3 lines at 76 px |
| English sub | 140 characters, max 4 lines at 40 px |
| Arabic sub | 150 characters, max 4 lines at 38 px |
| Hook title | Keep to 2 lines (96 px). A 3-line hook title pushed the subtitle onto the progress dots. |
| Icon label | 16 characters |

Text must end above `y = 1760` (the progress dots sit at `y = 1817`).

### Arabic rules

- Write natural Arabic, not word-for-word translation. Keep brand and product names in Latin (Docker, Redis, Scion).
- Do not end an Arabic line with a Latin word followed by punctuation. In right-to-left rendering, the period or question mark jumps to the wrong side (`.Git` instead of `Git.`). Rephrase so the line ends with an Arabic word.
- At small sizes the Arabic letter "و" attached to a Latin name can look like "g" (for example "وQualys"). This is only a rendering artifact; the order is correct.
- No emoji inside images (the Cairo font has none). Emoji belong in captions only.

### Caption format

```
<Hook sentence + emoji>

<One or two lines of context>

<Swipe prompt> 👉
🔹 point 1
🔹 point 2
...
<Engagement question> 👇

<English version of everything above>

🎥 <credit line, original source>

#hashtags (mix of Arabic and English, 8 to 10)
```

Also generate:
- **First comment** with links (links in TikTok captions are not clickable; put the link in the bio and in a pinned first comment).
- **Short caption variant** (2 lines) and a **3-second on-screen hook**.

---

## 9. Stage: render (design system and engine)

### 9.1 Canvas and typography

| Item | Value |
|---|---|
| Canvas | 1080 x 1920 px (9:16) |
| Side margin | 80 px |
| Font | **Cairo** (supports Arabic and Latin). Files: ExtraBold 800, Bold 700, Medium 500, Regular 400 |
| English title | ExtraBold 88 px (96 px on the hook), white, line height 1.12 |
| Arabic title | ExtraBold 76 px, accent color, line height 1.3 |
| English sub | Regular 40 px, color `(195,200,212)`, max width 860, line height 1.3 |
| Arabic sub | Regular 38 px, color `(170,176,190)`, max width 860, line height 1.45 |
| Gaps in the text block | +10 px before Arabic title, +26 px before sub, +6 px before Arabic sub |
| Icon labels | Medium 28 px (24 px when 5 icons), color `(230,230,240)` |

Keep key text above `y = 1650` when possible. Apps overlay the username and caption near the bottom of a photo post; check on a real phone.

### 9.2 Background

1. Vertical gradient from `bg[0]` (top) to `bg[1]` (bottom).
2. Grid overlay: lines every 90 px, color from `theme.grid` (alpha about 10 to 14 out of 255).
3. Glow: a blurred ellipse, radius 420 at `(540, 520)`, color `theme.glow`, alpha 90, Gaussian blur radius = r / 2.2.

### 9.3 Components

| Component | Spec |
|---|---|
| Wordmark | `MARROK`, ExtraBold 42, at `(80, 86)`. Accent dot (15 px) at `x = 80 + text width + 14`, `y = 108`. |
| Topic tag | Top right, right-aligned at `x = 1000`, `y = 92`, Medium 30, color `(170,176,190)`, uppercase. |
| Progress dots | One dot per slide. 14 px circles, 26 px pitch, centered, vertical center `y = 1817`. Active = accent, inactive = `(70,74,86)`. |
| Icon tile | Rounded square, radius 24% of size, glyph 56% of size, centered. |
| Brand tile | Same, but filled with the brand's hex color and a white glyph. Near-black brands (luminance < 45) use a slate tile `(46,52,70)`. Very light brands (luminance > 200) use a dark glyph. |
| CTA button | 660 x 110 px, radius 55, accent fill, label `DM us  .  رسالة خاصة` in Bold 44. |
| Credit lines | Two lines (EN then AR) at `y = H-215` and `y = H-170`, Regular 26, color `(160,160,175)`. |

### 9.4 Slide layouts (coordinates)

| Slide | Layout |
|---|---|
| `hook` | Ring radius 330 centered at `(540, 560)`. Six 130 px tiles on the ring at angles -90, -30, 30, 90, 150, 210 degrees. Center tile 280 px. Text block starts at `y = 1000`. |
| `icons` | Tile sizes by count: 1 = 300, 2 = 260, 3 = 220, 4 = 190, 5 = 156. Gap 36 (26 for five). Row at `y = 290`. Labels 14 px below tiles. Text block at `y = 290 + size + 110`. |
| `number` | Big number ExtraBold 220 in accent at `y = 330`, centered. Text block at `y = 700`. |
| `custom` | Your own drawing in the band `y = 230 to 960`. Text block at `y = 1000` (or lower for tall diagrams). |
| `cta` | Wordmark ExtraBold 150 at `y = 470`. Accent bar 120 x 8 at `y = 740`. CTA lines from `y = 800`. Button 60 px below. `marrok.org` Medium 44, 190 px below the button top. Credits at the bottom. |

### 9.5 Themes (one accent per post)

| Key | Accent | Background (top to bottom) | Used for |
|---|---|---|---|
| `scion` | `(240,150,105)` | `(16,13,14)` to `(34,22,20)` | AI and engineering news |
| `backend` | `(255,110,170)` | `(18,8,24)` to `(36,12,44)` | Backend and infrastructure |
| `pqc` | `(90,215,255)` | `(5,8,22)` to `(8,18,46)` | Post-quantum, cryptography |
| `security` | `(70,240,160)` | `(4,12,12)` to `(6,24,22)` | Security and hacking awareness |
| `node` | `(190,235,90)` | `(10,11,14)` to `(18,22,14)` | Node.js and dev topics |
| `ajax` | `(255,196,70)` | `(8,10,24)` to `(14,20,46)` | AI news |
| `concat` | `(255,100,100)` | `(18,10,12)` to `(38,14,18)` | Video and creative tools |
| `estonia` | `(255,150,110)` | `(8,16,24)` to `(12,32,42)` | Education and policy |
| `artcraft` | `(176,140,255)` | `(10,8,22)` to `(20,12,44)` | Open-source design tools |
| `arch` | `(255,190,90)` | `(8,14,30)` to `(12,26,56)` | Architecture and leadership |
| `zerobreach` | `(70,230,190)` | `(6,14,18)` to `(8,28,32)` | Digital security tools |

The default Figma template (manual fallback) uses accent `#6EA0FF` on `#080A12`. File: `https://www.figma.com/design/untLjb8oUehVAuDC2PcEDh` ("Marrok Carousel Template", frames 00 Guide, 01 Hook, 02 Icon slide, 03 Number slide, 04 CTA, with a "Marrok Brand" variable collection).

### 9.6 Icons

- **Concepts** (server, lock, scale, clock, bot): Lucide icons (`lucide-static`, ISC license).
- **Technology logos** (Docker, Redis, Kafka, Nginx, GitHub Actions): Simple Icons (`simple-icons`, CC0 data). Trademarks still belong to their owners; use logos only to identify the technology, never to imply endorsement.
- If an icon does not exist (AWS is not in Simple Icons), write the name in text instead.
- Never use screenshots, faces or thumbnails of other creators.

### 9.7 Arabic rendering requirements

- Pillow must be built with **libraqm** (`python -c "from PIL import features; print(features.check('raqm'))"` must print `True`). Without it, Arabic letters are not joined correctly.
- Draw Arabic with `direction="rtl", language="ar"`, and measure with the **same** arguments when wrapping.
- Center-align everything. Titles are English first, Arabic second.

### 9.8 Export

- Format: **JPG only**, quality 95, chroma subsampling 4:4:4 (`subsampling=0`). Each slide is about 250 to 300 KB.
- Reason: TikTok photo carousels reject PNG (a scheduled PNG carousel failed). It is also an explicit user preference.
- Names: `slide1.jpg` ... `slideN.jpg`, inside a folder named for the deck.

### 9.9 Instagram feed note

Instagram feed images are limited to roughly 4:5 to 1.91:1 (verify against current docs). 9:16 slides may be cropped or rejected for feed carousels, though they work as Stories and Reels. Plan: parameterize the engine by canvas height so the same deck can be rendered at 1080 x 1350. The reference engine below is 1080 x 1920 only.

### 9.10 Setup

```bash
pip install pillow numpy cairosvg
mkdir -p fonts icons && cd fonts && npm pack @expo-google-fonts/cairo && tar -xzf *.tgz
cd ../icons && npm pack lucide-static simple-icons
mkdir -p lu si && tar -xzf lucide-static-*.tgz -C lu && tar -xzf simple-icons-*.tgz -C si
# layout the engine expects (ASSET_ROOT):
#   fonts/package/800ExtraBold/Cairo_800ExtraBold.ttf (and 700Bold, 500Medium, 400Regular)
#   icons/lu/package/icons/*.svg           icons/si/package/icons/*.svg
#   icons/si/package/data/simple-icons.json
```

Pin versions of the font and icon packages in the real app so renders are reproducible.

### 9.11 Reference engine (tested)

This code produced the slides in this project's style. Save as `carousel_engine.py`.

```python
"""
carousel_engine.py - reference renderer for Marrok carousels.
Pillow (with libraqm for Arabic shaping) + cairosvg for icons + numpy for gradients.
Output: 1080x1920 JPG slides.
"""
import io, json, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cairosvg

W, H = 1080, 1920
ROOT = os.environ.get("ASSET_ROOT", ".")          # folder that holds fonts/ and icons/
CAIRO = {  # Cairo font files (npm: @expo-google-fonts/cairo)
    "xb": "fonts/package/800ExtraBold/Cairo_800ExtraBold.ttf",
    "bd": "fonts/package/700Bold/Cairo_700Bold.ttf",
    "md": "fonts/package/500Medium/Cairo_500Medium.ttf",
    "rg": "fonts/package/400Regular/Cairo_400Regular.ttf",
}
LUCIDE = "icons/lu/package/icons/{}.svg"            # npm: lucide-static
SIMPLE = "icons/si/package/icons/{}.svg"            # npm: simple-icons (CC0)
SIMPLE_DATA = "icons/si/package/data/simple-icons.json"

THEMES = {  # bg = (top, bottom) gradient, accent = highlights, glow = blurred halo
    "scion":    dict(bg=((16,13,14),(34,22,20)), accent=(240,150,105), glow=(210,100,60),  grid=(255,200,170,10), tag="AI + ENGINEERING"),
    "backend":  dict(bg=((18,8,24),(36,12,44)),  accent=(255,110,170), glow=(210,60,140),  grid=(255,190,230,10), tag="BACKEND"),
    "pqc":      dict(bg=((5,8,22),(8,18,46)),    accent=(90,215,255),  glow=(40,110,230),  grid=(130,190,255,12), tag="POST-QUANTUM"),
    "security": dict(bg=((4,12,12),(6,24,22)),   accent=(70,240,160),  glow=(20,180,120),  grid=(120,255,200,10), tag="AI + SECURITY"),
    "node":     dict(bg=((10,11,14),(18,22,14)), accent=(190,235,90),  glow=(120,190,40),  grid=(200,255,120,10), tag="NODE.JS"),
    "ajax":     dict(bg=((8,10,24),(14,20,46)),  accent=(255,196,70),  glow=(60,100,230),  grid=(150,180,255,10), tag="AI NEWS"),
    "concat":   dict(bg=((18,10,12),(38,14,18)), accent=(255,100,100), glow=(220,60,70),   grid=(255,190,190,10), tag="VIDEO EDITING"),
    "estonia":  dict(bg=((8,16,24),(12,32,42)),  accent=(255,150,110), glow=(40,150,165),  grid=(180,230,235,12), tag="AI + EDUCATION"),
    "artcraft": dict(bg=((10,8,22),(20,12,44)),  accent=(176,140,255), glow=(110,70,230),  grid=(190,170,255,12), tag="OPEN SOURCE"),
    "arch":     dict(bg=((8,14,30),(12,26,56)),  accent=(255,190,90),  glow=(60,100,220),  grid=(150,190,255,14), tag="ARCHITECTURE"),
    "zerobreach": dict(bg=((6,14,18),(8,28,32)), accent=(70,230,190),  glow=(30,170,150),  grid=(140,255,230,10), tag="DIGITAL SECURITY"),
}
MUTED = (195, 200, 212)       # secondary text
DARK_GLYPH = "#14141E"        # icon color on accent tiles

def font(key, size):
    return ImageFont.truetype(os.path.join(ROOT, CAIRO[key]), size)

# ---------- text engine (Arabic-safe) ----------
_probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
def _kw(rtl): return dict(direction="rtl", language="ar") if rtl else {}
def text_width(text, f, rtl=False): return _probe.textlength(text, font=f, **_kw(rtl))

def wrap(text, f, max_w, rtl=False):
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if text_width(trial, f, rtl) <= max_w: cur = trial
        else:
            if cur: lines.append(cur)
            cur = word
    if cur: lines.append(cur)
    return lines

def draw_centered(d, text, y, f, fill, max_w=900, line_h=1.18, rtl=False, x=W / 2):
    """Draw wrapped, centered text. Returns the y after the last line."""
    for line in wrap(text, f, max_w, rtl):
        d.text((x, y), line, font=f, fill=fill, anchor="ma", **_kw(rtl))
        y += int(f.size * line_h)
    return y

# ---------- background ----------
def gradient(c1, c2):
    t = np.linspace(0, 1, H)[:, None, None]
    arr = (np.array(c1) * (1 - t) + np.array(c2) * t).astype("uint8")
    return Image.fromarray(np.broadcast_to(arr, (H, W, 3)).copy())

def glow(img, cx, cy, r, color, alpha=120):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(r / 2.2))
    img.paste(layer, (0, 0), layer)

def grid_overlay(img, rgba, step=90):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(layer)
    for x in range(0, W, step): gd.line([(x, 0), (x, H)], fill=rgba, width=1)
    for y in range(0, H, step): gd.line([(0, y), (W, y)], fill=rgba, width=1)
    img.paste(layer, (0, 0), layer)

# ---------- icons ----------
_simple_hex = None
def _hex_for(slug):
    global _simple_hex
    if _simple_hex is None:
        data = json.load(open(os.path.join(ROOT, SIMPLE_DATA)))
        _simple_hex = {e["slug"]: e["hex"] for e in data}
    return _simple_hex[slug]

def _render_svg(svg, px):
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=px, output_height=px)
    return Image.open(io.BytesIO(png)).convert("RGBA")

def icon_tile(kind, name, size, accent):
    """kind='lucide' -> accent tile + dark glyph. kind='brand' -> brand-colored tile + white glyph."""
    t = Image.new("RGBA", (size, size), (0, 0, 0, 0)); td = ImageDraw.Draw(t)
    gp = int(size * 0.56)
    if kind == "brand":
        h = _hex_for(name); r, g, b = int(h[:2], 16), int(h[2:4], 16), int(h[4:], 16)
        lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        bg = (46, 52, 70) if lum < 45 else (r, g, b)          # near-black brands get a slate tile
        glyph = "#14141E" if lum > 200 else "#FFFFFF"          # pale brands get a dark glyph
        svg = open(os.path.join(ROOT, SIMPLE.format(name))).read().replace("<svg ", f'<svg fill="{glyph}" ', 1)
    else:
        bg = accent
        svg = open(os.path.join(ROOT, LUCIDE.format(name))).read().replace("currentColor", DARK_GLYPH)
    td.rounded_rectangle([0, 0, size - 1, size - 1], int(size * 0.24), fill=bg + (255,))
    g_img = _render_svg(svg, gp)
    t.paste(g_img, ((size - gp) // 2, (size - gp) // 2), g_img)
    return t

def paste(img, tile, x, y): img.paste(tile, (int(x), int(y)), tile)

# ---------- shared components ----------
def new_slide(theme, idx, total):
    img = gradient(*theme["bg"]); grid_overlay(img, theme["grid"])
    glow(img, 540, 520, 420, theme["glow"], 90)
    header(img, theme, idx, total)
    return img

def header(img, theme, idx, total):
    d = ImageDraw.Draw(img); f = font("xb", 42); acc = theme["accent"]
    d.text((80, 86), "MARROK", font=f, fill=(255, 255, 255))
    x = 80 + d.textlength("MARROK", font=f) + 14
    d.ellipse([x, 108, x + 15, 123], fill=acc)
    d.text((W - 80, 92), theme["tag"], font=font("md", 30), fill=(170, 176, 190), anchor="ra")
    gap = 26; sx = W / 2 - (total - 1) * gap / 2
    for i in range(total):
        cx = sx + i * gap
        d.ellipse([cx - 7, H - 103, cx + 7, H - 89], fill=acc if i == idx else (70, 74, 86))

def text_block(img, theme, y, en, ar, sub_en="", sub_ar="", big=False):
    d = ImageDraw.Draw(img)
    y = draw_centered(d, en, y, font("xb", 96 if big else 88), (255, 255, 255), line_h=1.12)
    y = draw_centered(d, ar, y + 10, font("xb", 76), theme["accent"], rtl=True, line_h=1.3)
    if sub_en: y = draw_centered(d, sub_en, y + 26, font("rg", 40), MUTED, max_w=860, line_h=1.3)
    if sub_ar: y = draw_centered(d, sub_ar, y + 6, font("rg", 38), (170, 176, 190), max_w=860, rtl=True, line_h=1.45)
    return y

# ---------- slide templates ----------
def hook_slide(theme, idx, total, center, orbit, en, ar, sub_en="", sub_ar=""):
    """center/orbit are (kind, name). 6 orbit icons around one big center icon."""
    img = new_slide(theme, idx, total); d = ImageDraw.Draw(img); acc = theme["accent"]
    cx, cy, R = 540, 560, 330
    dim = tuple(int(c * 0.45 + 30) for c in acc)
    d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=dim, width=3)
    for k in range(6):
        a = math.radians(-90 + 60 * k)
        d.line([(cx, cy), (cx + R * math.cos(a), cy + R * math.sin(a))], fill=tuple(int(c * 0.3 + 25) for c in acc), width=3)
    for k, (kind, name) in enumerate(orbit[:6]):
        a = math.radians(-90 + 60 * k)
        paste(img, icon_tile(kind, name, 130, acc), cx + R * math.cos(a) - 65, cy + R * math.sin(a) - 65)
    paste(img, icon_tile(center[0], center[1], 280, acc), cx - 140, cy - 140)
    text_block(img, theme, 1000, en, ar, sub_en, sub_ar, big=True)
    return img

def icon_slide(theme, idx, total, icons, en, ar, sub_en, sub_ar):
    """icons = [(kind, name, label)] with 1-5 items."""
    img = new_slide(theme, idx, total); d = ImageDraw.Draw(img)
    n = len(icons); s = {1: 300, 2: 260, 3: 220, 4: 190, 5: 156}[n]; gap = 36 if n < 5 else 26
    x0 = (W - (n * s + (n - 1) * gap)) / 2; y0 = 290
    for i, (kind, name, label) in enumerate(icons):
        x = x0 + i * (s + gap)
        paste(img, icon_tile(kind, name, s, theme["accent"]), x, y0)
        d.text((x + s / 2, y0 + s + 14), label, font=font("md", 28 if n < 5 else 24), fill=(230, 230, 240), anchor="ma")
    text_block(img, theme, y0 + s + 110, en, ar, sub_en, sub_ar)
    return img

def number_slide(theme, idx, total, number, en, ar, sub_en, sub_ar):
    img = new_slide(theme, idx, total); d = ImageDraw.Draw(img)
    d.text((W / 2, 330), number, font=font("xb", 220), fill=theme["accent"], anchor="ma")
    text_block(img, theme, 700, en, ar, sub_en, sub_ar)
    return img

def custom_slide(theme, idx, total, draw_visual, en, ar, sub_en, sub_ar, text_y=1000, big=False):
    """draw_visual(img, theme) paints your own diagram in the area y=230..960."""
    img = new_slide(theme, idx, total); draw_visual(img, theme)
    text_block(img, theme, text_y, en, ar, sub_en, sub_ar, big=big)
    return img

def cta_slide(theme, idx, total, cta_en, cta_ar, credit_en, credit_ar, site="marrok.org", btn_dark=(20, 14, 10)):
    img = new_slide(theme, idx, total); glow(img, 540, 700, 460, theme["glow"], 100)
    d = ImageDraw.Draw(img); acc = theme["accent"]
    d.text((W / 2, 470), "MARROK", font=font("xb", 150), fill=(255, 255, 255), anchor="ma")
    d.rounded_rectangle([W / 2 - 60, 740, W / 2 + 60, 748], 4, fill=acc)
    y = draw_centered(d, cta_en, 800, font("xb", 84), (255, 255, 255))
    y = draw_centered(d, cta_ar, y + 10, font("xb", 76), acc, rtl=True, line_h=1.3) + 60
    d.rounded_rectangle([W / 2 - 330, y, W / 2 + 330, y + 110], 55, fill=acc)
    d.text((W / 2, y + 55), "DM us  \u2022  \u0631\u0633\u0627\u0644\u0629 \u062e\u0627\u0635\u0629", font=font("bd", 44), fill=btn_dark, anchor="mm")
    d.text((W / 2, y + 190), site, font=font("md", 44), fill=(225, 225, 235), anchor="ma")
    d.text((W / 2, H - 215), credit_en, font=font("rg", 26), fill=(160, 160, 175), anchor="ma")
    d.text((W / 2, H - 170), credit_ar, font=font("rg", 26), fill=(160, 160, 175), anchor="ma", **_kw(True))
    return img

# ---------- export ----------
def save_jpg(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.convert("RGB").save(path, "JPEG", quality=95, subsampling=0, optimize=True)

def build_deck(deck, out_dir, custom_visuals=None):
    """deck = dict (see schema in the spec). Returns list of written paths."""
    theme = THEMES[deck["theme"]]; slides = deck["slides"]; total = len(slides); paths = []
    for i, s in enumerate(slides):
        t = s["type"]
        if t == "hook":
            img = hook_slide(theme, i, total, tuple(s["center"]), [tuple(o) for o in s["orbit"]], s["en"], s["ar"], s.get("sub_en", ""), s.get("sub_ar", ""))
        elif t == "icons":
            img = icon_slide(theme, i, total, [tuple(x) for x in s["icons"]], s["en"], s["ar"], s["sub_en"], s["sub_ar"])
        elif t == "number":
            img = number_slide(theme, i, total, s["number"], s["en"], s["ar"], s["sub_en"], s["sub_ar"])
        elif t == "custom":
            img = custom_slide(theme, i, total, custom_visuals[s["visual"]], s["en"], s["ar"], s["sub_en"], s["sub_ar"], s.get("text_y", 1000))
        elif t == "cta":
            img = cta_slide(theme, i, total, s["en"], s["ar"], s["credit_en"], s["credit_ar"])
        else: raise ValueError(f"unknown slide type {t}")
        p = os.path.join(out_dir, f"slide{i + 1}.jpg"); save_jpg(img, p); paths.append(p)
    return paths

```

### 9.12 Example: a custom diagram slide

A `custom` slide receives a function that draws into the band `y = 230 to 960`. This tested example draws how Base64 turns `abc` into `YWJj` (bytes, 6-bit groups, numbers, characters). Save as `example_custom.py`.

```python
"""Example custom visual: how Base64 turns 'abc' into 'YWJj'. Plug into build_deck(custom_visuals={"base64": base64_visual})."""
from PIL import ImageDraw
import carousel_engine as ce

B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

def base64_visual(img, theme, text="abc"):
    d = ImageDraw.Draw(img); acc = theme["accent"]
    bits = "".join(f"{ord(c):08b}" for c in text)                  # 24 bits for 3 bytes
    groups = [bits[i:i + 6] for i in range(0, len(bits), 6)]       # four 6-bit groups
    values = [int(g, 2) for g in groups]
    chars = [B64[v] for v in values]
    mono = ce.font("md", 32)
    def label(y, s): d.text((540, y), s, font=ce.font("md", 26), fill=(170, 176, 190), anchor="mm")
    def box(x, y, w, h, fill=None, outline=None): d.rounded_rectangle([x, y, x + w, y + h], 22, fill=fill, outline=outline, width=3)
    # row 1: three bytes
    label(250, "3 bytes = 24 bits")
    for i, c in enumerate(text):
        x = 90 + i * 300; box(x, 280, 280, 170, fill=(30, 26, 24), outline=acc)
        d.text((x + 140, 296), c, font=ce.font("xb", 64), fill=(255, 255, 255), anchor="ma")
        d.text((x + 140, 392), f"{ord(c):08b}", font=mono, fill=acc, anchor="ma")
    # row 2: four 6-bit groups
    label(505, "re-split into four 6-bit groups")
    for i, g in enumerate(groups):
        x = 90 + i * 225; box(x, 530, 210, 90, fill=(30, 26, 24), outline=(90, 80, 74))
        d.text((x + 105, 552), g, font=mono, fill=(255, 255, 255), anchor="ma")
    # row 3: values
    label(660, "as numbers 0 to 63")
    for i, v in enumerate(values):
        x = 90 + i * 225; d.text((x + 105, 712), str(v), font=ce.font("xb", 52), fill=(255, 255, 255), anchor="mm")
    # row 4: characters
    label(805, "mapped to the Base64 table")
    for i, c in enumerate(chars):
        x = 90 + i * 225; box(x, 840, 210, 120, fill=acc)
        d.text((x + 105, 900), c, font=ce.font("xb", 76), fill=(24, 16, 12), anchor="mm")

```

Use it with `build_deck(deck, out_dir, custom_visuals={"base64": base64_visual})` and a slide `{"type": "custom", "visual": "base64", ...}`.

Design rules for custom diagrams:
- Draw everything yourself from primitives (rectangles, circles, lines). Do not paste other people's images.
- Diagram text must be 26 px or larger.
- Anchor centered text with `anchor="mm"` inside boxes. Top anchoring leaves large empty space above Cairo glyphs and clips large letters.
- Keep a 40 px gap between rows and between the diagram and the text block.

---

## 10. Stage: quality assurance

### Automatic checks (block export on failure)

| Check | Rule |
|---|---|
| Dimensions | Every slide is 1080 x 1920 |
| Format | Every file is `.jpg` (no PNG) |
| File size | 120 KB to 450 KB |
| Text overflow | The `y` returned by the text block is below 1760 |
| Line counts | English title <= 3 lines, Arabic title <= 3 lines, subs <= 4 lines |
| Missing glyphs | No emoji or unsupported characters inside images |
| Arabic line ends | No Arabic line ends with a Latin word plus punctuation |
| Slide count | 8 to 10 |
| Credit | The CTA slide contains a credit line when the source is third-party |
| Placeholders | No leftover text such as "CHANNEL NAME" |

### Visual check

Render a contact sheet (all slides in a grid at 300 px wide) and show it to the user. Problems found this way in the past: subtitle touching the progress dots, a wrapped Arabic question mark alone on a line, labels overlapping boxes, text clipped inside a box.

---

## 11. Data model

One JSON document per post, `deck.json`. Every stage reads and writes it.

```json
{
  "id": "2026-10-16-scion-followup",
  "theme": "scion",
  "source": {
    "type": "article",
    "title": "Creating in-house source control",
    "creator": "Anthropic engineering blog",
    "url": "https://example.com/original",
    "published": "2026-10-13"
  },
  "facts": [
    {"text": "Merges grew from ~2,500/day (May) to 30,000+/day (Sept)", "type": "number",
     "verified": "verified", "evidence": ["https://example.com/report"]}
  ],
  "risk": {
    "originality": "PASS",
    "copyright": "PASS",
    "first_frame": "PASS",
    "claims": "WARN",
    "notes": ["Numbers are the company's own, say 'per Anthropic'."]
  },
  "slides": [
    {"type": "hook", "center": ["lucide", "git-merge"],
     "orbit": [["lucide", "server"], ["lucide", "cpu"], ["lucide", "bot"],
               ["lucide", "users"], ["lucide", "database"], ["lucide", "gauge"]],
     "en": "Why did Anthropic move beyond Git?", "ar": "السبب وراء ابتعاد Anthropic عن Git",
     "sub_en": "A deeper look at Scion.", "sub_ar": "نظرة أعمق على Scion."},
    {"type": "icons", "icons": [["lucide", "database", "~100 GB history"]],
     "en": "The repo outgrew Git.", "ar": "المستودع تجاوز قدرة Git.",
     "sub_en": "...", "sub_ar": "..."},
    {"type": "number", "number": "02", "en": "...", "ar": "...", "sub_en": "...", "sub_ar": "..."},
    {"type": "custom", "visual": "base64", "en": "...", "ar": "...", "sub_en": "...", "sub_ar": "...", "text_y": 1010},
    {"type": "cta", "en": "Building with AI agents at scale?", "ar": "تبني بوكلاء الذكاء الاصطناعي على نطاق واسع؟",
     "credit_en": "Based on Anthropic's engineering post. The numbers are Anthropic's own.",
     "credit_ar": "مبني على مقال Anthropic الهندسي، والأرقام من Anthropic نفسها."}
  ],
  "caption": {
    "ar": "...", "en": "...",
    "credit": "Source: ...",
    "hashtags": ["#Anthropic", "#Scion", "#برمجة"],
    "short_ar": "...", "short_en": "...", "screen_hook": "..."
  },
  "first_comment": "Link: https://example.com/original",
  "notes_for_human": ["Numbers come from the company, not independent tests."],
  "schedule": [
    {"platform": "tiktok", "when": "2026-10-16T18:00:00+01:00", "status": "draft"}
  ]
}
```

Icon tuples: `["lucide", "<icon-name>"]` for orbit and center, `["lucide" or "brand", "<name>", "<label>"]` for icon rows.

---

## 12. Prompts for the language-model stages

### 12.1 Planner (returns `deck.json` slides only)

```
You are the content planner for Marrok, a software company with a sleek, dark, modern brand.
Input: verified facts and a theme. Output: JSON only, matching the deck schema.

Rules:
- 8 to 10 slides: 1 hook, 5 to 7 content, 1 CTA.
- One idea per slide. English title (<= 45 chars) and Arabic title (<= 40 chars).
- Sub text: EN <= 140 chars, AR <= 150 chars. Short sentences. No emoji inside slide text.
- Arabic must be natural, not literal. Keep product names in Latin. Never end an Arabic line
  with a Latin word followed by punctuation.
- Attribute unconfirmed claims ("says the video", "per the project", "according to the company").
- Include one "before you switch / the catch" or "the debate" slide for tools and contested topics.
- Do not claim Marrok built, owns or endorses the subject. The CTA is a question about the viewer's needs.
- Icons: Lucide names for concepts, Simple Icons slugs (kind "brand") for technology logos.
- Use only facts marked verified, or attribute them.
```

### 12.2 Verifier

```
For each fact, search the web with the real current date. Prefer primary sources.
Return: verified | partially verified | not found, with URLs.
Flag any number that differs from the input and give the corrected value.
Do not repeat copyrighted text; paraphrase.
```

### 12.3 Risk reviewer

```
Review the post for platform risk. Return PASS/WARN/BLOCK for: originality, copyright,
first frame quality, claims, sensitive topics, repetition. For each WARN or BLOCK give a
concrete fix. Credit to the original creator never fixes an originality problem.
```

### 12.4 Caption writer

```
Write the caption in the Marrok format: Arabic first, then English. Hook line with one emoji,
2 to 3 lines of context, a swipe prompt, 4 to 6 bullet points with the 🔹 marker, an engagement
question, the credit line, then 8 to 10 hashtags (Arabic and English). Also write a 2-line short
version, a 3-second on-screen hook, and a first-comment text with the links.
Match the brand voice: confident, approachable, never hype or all caps.
```

---

## 13. Content and safety rules

- **Security topics**: awareness only. Never include steps, payloads or commands that enable attacks. Tools for defenders are fine; tell people to download from official pages and verify signatures.
- **Political and conflict topics**: use neutral, factual wording. Attribute claims to the named source. Do not copy loaded language from a source into the post. Describe organizations accurately (for example, "a private company that sells to governments", not "the state").
- **Real people and companies**: only verified facts, attributed. No guesses about motives.
- **Medical, financial, legal**: no advice. Say what the source says.
- **Brand logos**: used only to identify a technology.
- **Third-party creators**: always credit, and still follow the originality rule in section 6.
- **Conflict of interest**: if the post is about the AI vendor that powers the app, say so in the notes and keep numbers attributed.

---

## 14. Delivery and scheduling

### 14.1 Hosting the images

Metricool and Buffer need **public URLs** (or, for Metricool, a Google Drive link when Drive is connected in the Metricool account). A chat assistant cannot upload binary files to Drive, so the app must:

1. Upload the slides to its own storage (S3, R2, or the Drive API) and use the public URLs; or
2. Let the user upload to a Drive folder, then read the file links.

### 14.2 Platforms in this account

| Platform | Via | Notes |
|---|---|---|
| TikTok (`marrokorg`) | Metricool | Photo carousel, **JPG only**, music optional |
| Facebook page "Marrok" | Metricool, then Buffer | Reels via Buffer need video height >= 960 px; otherwise post as a regular video |
| Instagram (`marrok_org`) | Metricool, then Buffer | Reels: `shouldShareToFeed: true`. Feed carousels need 4:5 images (see 9.9). |
| LinkedIn page "Marrok" | Buffer only | Not used so far |

TikTok is **not** connected in Buffer (the free plan allows 3 channels).

### 14.3 Choosing the time

Default rule: when the user gives no time, pick the best time per platform without asking, using the account's own data.

1. Call the platform's best-time endpoint for the next 7 days (Metricool `getBestTimeToPostByNetwork`, with the account timezone, `Africa/Algiers`).
2. Call `getScheduledPosts` for the same range and avoid slots already taken. Keep at least 2 to 4 hours between posts on the same platform.
3. TikTok: use the agreed slots **10:00, 12:00, 18:00** (local time) unless the user says otherwise.
4. Observed patterns (re-query, do not hardcode): Facebook peaks on weekday mid-mornings (10:00 to 12:00). Instagram peaks in the evening (about 19:00 to 21:00, strongest on Sundays).
5. Day-of-week numbering in the best-time response must be checked against the date range (do not assume Sunday = 1).
6. If a slot is already past or failed, move to the next best slot. Do not reuse the same hour.
7. Ask a question only when something is truly unclear (this is an allowed default).

### 14.4 Limits and fallbacks

- If **Metricool** returns a limit error, create the same posts in **Buffer** for Facebook and Instagram, with the same text and time.
- After a fallback, tell the user to delete the Metricool copies, otherwise they may post twice. (The assistant tools could not delete Metricool posts.)
- Buffer free plan: 3 channels, 10 scheduled posts. Check `limits` from the account endpoint before creating posts.
- Buffer requires `mode: customScheduled`, `dueAt` (ISO time with offset) and `schedulingType: automatic`, plus per-platform metadata such as `facebook.type` (`reel` or `post`) and `instagram.type` (`reel` or `post`).
- If a scheduled post shows an error status, read it before retrying. Do not blindly resubmit.

### 14.5 Workflow after publishing

- Check the TikTok "Restricted posts" list weekly. If a post shows "Ineligible for recommendation", record which pattern caused it and feed it into the risk checker.
- Never post the same carousel on two platforms in the same hour.

---

## 15. Lessons learned (mistakes to design out)

| Problem | What happened | Fix in the app |
|---|---|---|
| Reposting others' videos | Six posts became "Ineligible for recommendation" | Risk stage (section 6). Own diagrams and explanations only. |
| PNG on TikTok | A scheduled PNG carousel failed | JPG only. |
| Summaries were wrong | "GPT Soul" vs "Sol", unverified star counts, effect counts, indicator counts | Mandatory verify stage, attribute unconfirmed claims. |
| Hook text overlapped the dots | A 3-line hook title pushed text into the dots | Length limits and the overflow check. |
| Arabic punctuation jumped | `.Git` and a lone `؟` line | Arabic line-ending rule and a lint check. |
| Missing credit | Several drafts forgot the creator | CTA slide always has a credit line for third-party sources. |
| Platform limit | Metricool hit its limit | Buffer fallback and a "delete Metricool copies" warning. |
| Reels too short in height | Buffer rejected a Facebook Reel under 960 px height | Validate media before scheduling, fall back to a regular post. |
| Files could not be uploaded from chat | Drive upload needs inline base64 | App uploads to its own storage. |
| Assistant sandbox reset | Fonts and icons disappeared mid-project | Keep assets in the repository and pin versions. |
| Over-claiming | "We build this" on someone else's design | CTA is a question, never a claim of ownership. |

---

## 16. Suggested architecture

```
Web app (upload screenshot / paste text / paste link)
   |
API (FastAPI)
   |-- Ingest: vision model for screenshots, article fetcher
   |-- Research agent: web search + fact table
   |-- Planner / caption LLM calls (JSON mode, schema-validated)
   |-- Risk reviewer
   |-- Renderer: carousel_engine.py (Pillow, raqm, cairosvg)
   |-- QA runner + contact sheet
   |-- Storage: S3/R2 (public URLs), or Google Drive API
   |-- Scheduler adapters: Metricool, Buffer
   |
Review UI: slide preview, edit EN/AR text per slide, re-render, risk report, notes, approve
```

Implementation tips:
- Validate every LLM output against a JSON schema and retry once with the validation error.
- Store each stage's output in `deck.json` so edits in the UI trigger only a re-render.
- Run renders in a worker queue. A 9-slide deck takes a few seconds.
- Keep a `themes.json` and an icon allowlist so the planner cannot invent icon names; if an icon name is missing, fall back to a generic Lucide icon and warn.
- Log every scheduling call and its response (platform, time, status).

### Roadmap

| Version | Scope |
|---|---|
| 0.1 | CLI: `deck.json` to JPGs, contact sheet, QA checks |
| 0.2 | LLM planner and caption writer with the verify and risk stages |
| 0.3 | Web UI with editable text and re-render, 4:5 variant for Instagram feed |
| 0.4 | Storage and Metricool/Buffer scheduling with best-time logic |
| 0.5 | Analytics loop: pull post stats, learn which hooks and themes perform |

---

## 17. User preferences baked in as defaults

- Carousel slides export as **JPG**, never PNG.
- Arabic first, then English, in captions. On slides: English title, then Arabic title.
- When no time is given, choose the best time per platform without asking, unless an agreement exists (TikTok slots 10:00, 12:00, 18:00).
- It is fine to ask a question when something is unclear.
- Metricool first; use Buffer if the Metricool limit is reached.
- Warn about TikTok restrictions before anything is published.
- When the user sends a YouTube summary, run the whole post-creation workflow (verify, risk check, carousel, caption, notes).
- Always add a credit line and a pinned first comment with the link.

---

## 18. Final checklist before publishing

- [ ] All facts verified or attributed
- [ ] Risk report has no BLOCK items
- [ ] The post is original work (own diagrams and explanation), not a repost
- [ ] No copyrighted characters, music or footage
- [ ] Cover (slide 1) is bright and readable at thumbnail size
- [ ] Arabic reads correctly, no punctuation jumping
- [ ] Credit line present on the last slide, creator named in the caption
- [ ] Link in bio and in the pinned first comment
- [ ] Files are JPG, 1080 x 1920
- [ ] Time chosen from best-time data, no clash with other posts
- [ ] Notes for the human reviewed (unverified items, sponsor segments removed)
