# MARROK API & Schema Specifications

## 1. REST API Endpoints

### 1.1 `GET /api/health`
Checks server readiness and verifies that the `GEMINI_API_KEY` environment secret is provisioned.

**Response (HTTP 200):**
```json
{
  "status": "ok",
  "timestamp": 1792790658552,
  "hasApiKey": true
}
```

---

### 1.2 `POST /api/generate`
Generates a complete 8-to-9 slide MARROK carousel, 3 hook variants, and 2 caption styles from raw multimodal input.

**Request Headers:**
- `Content-Type: application/json`

**Request Body Parameters:**
| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | Conditional | Raw text, transcript, blog post, or topic |
| `inputMode` | `string` | Optional | `'screenshot'` \| `'transcript'` \| `'notes'` |
| `imageBase64` | `string` | Conditional | Base64-encoded compressed image string |
| `imageMimeType` | `string` | Optional | e.g. `'image/jpeg'`, `'image/png'` |
| `imageName` | `string` | Optional | Original file name of uploaded asset |
| `categoryHint` | `string` | Optional | Suggested category (e.g. `'AI + ENGINEERING'`) |

*Note: At least one of `prompt` or `imageBase64` must be provided.*

**Response Headers:**
- `Content-Type: application/json`
- `X-Marrok-Engine`: `'gemini-3.1-flash-lite'` \| `'gemini-flash-latest'` \| `'intelligent-synthesizer'`

**Response Body (HTTP 200):**
```json
{
  "theme": "engineering",
  "category": "AI + ENGINEERING",
  "caption": "Is Git finally hitting its limits? Anthropic's new Scion system...",
  "slides": [
    {
      "type": "hub",
      "centerIcon": "gitMerge",
      "satIcons": ["cpu", "database", "server", "terminal", "brain", "changesets"],
      "enTitle": "Beyond Git:\nAnthropic Scion",
      "arTitle": "ما بعد Git: نظام Scion من Anthropic",
      "enBody": "Why Anthropic engineered a custom VCS for massive AI monorepos.",
      "arBody": "لماذا طوّرت Anthropic نظام تحكم في الإصدارات مخصص لمستودعات الذكاء الاصطناعي.",
      "url": "marrok.org"
    },
    {
      "type": "row",
      "icons": [
        { "icon": "server", "label": "Massive Monorepos" }
      ],
      "enTitle": "100 GB History Bottlenecks.",
      "arTitle": "عقبة التاريخ البرمجي بحجم 100 غيغابايت.",
      "enBody": "Standard Git clones choke on AI-generated training checkpoints and monorepo scale.",
      "arBody": "عمليات استنساخ Git التقليدية تنهار أمام حجم نقاط فحص التدريب ومستودعات الذكاء الاصطناعي.",
      "url": "marrok.org"
    },
    {
      "type": "cta",
      "enTitle": "Building for AI\nat scale?",
      "arTitle": "تبني أنظمة للذكاء الاصطناعي؟",
      "enBody": "Let's connect and engineer the future.",
      "arBody": "تواصل معنا لمناقشة هندسة البنية التحتية.",
      "ctaText": "Send us a DM",
      "url": "marrok.org",
      "enCredit": "marrok.org · Anthropic Engineering Post",
      "arCredit": "marrok.org · مدونة Anthropic الهندسية"
    }
  ],
  "captionVariants": [
    {
      "style": "Executive Bulletins & Hard Metrics",
      "caption": "Anthropic's Scion vs. Git: The shift to massive monorepos.\n\n• Problem: Git struggles with massive AI-scale codebases.\n• Solution: Scion, a custom distributed version control system.\n• Impact: Optimized performance for high-frequency AI development.\n\n#DevOps #SoftwareEngineering #Anthropic #Scion #هندسة_البرمجيات"
    },
    {
      "style": "Narrative Breakdown & Story",
      "caption": "As AI agents generate more code than ever, traditional tools are breaking..."
    }
  ],
  "hookVariants": [
    {
      "tag": "Curiosity & Surprise",
      "enTitle": "Why did Anthropic abandon Git?",
      "arTitle": "لماذا تخلت Anthropic عن Git؟",
      "enBody": "The scale of AI development broke traditional version control.",
      "arBody": "حجم تطوير الذكاء الاصطناعي تجاوز قدرات أنظمة التحكم في الإصدار التقليدية.",
      "centerIcon": "shieldAlert"
    },
    {
      "tag": "Hard Metrics & Benchmark",
      "enTitle": "Scion: The new Git killer?",
      "arTitle": "Scion: هل هو بديل Git القادم؟",
      "enBody": "Anthropic's custom system handles monorepos that Git simply cannot.",
      "arBody": "نظام Anthropic المخصص يتعامل مع مستودعات برمجية لا يستطيع Git إدارتها.",
      "centerIcon": "gauge"
    },
    {
      "tag": "The Problem / Paradigm Shift",
      "enTitle": "Git broke under AI pressure.",
      "arTitle": "Git انهار تحت ضغط الذكاء الاصطناعي.",
      "enBody": "Massive monorepos require a new distributed architecture.",
      "arBody": "المستودعات البرمجية الضخمة تتطلب بنية تحتية موزعة جديدة تماماً.",
      "centerIcon": "cpu"
    }
  ]
}
```

---

## 2. TypeScript Interfaces (`src/types.ts`)

```typescript
export type SlideType = 'hub' | 'row' | 'cta';

export interface RowIconItem {
  icon: string;
  label: string;
}

export interface Slide {
  id?: string;
  type: SlideType;
  centerIcon?: string;
  satIcons?: string[];
  icons?: RowIconItem[];
  enTitle?: string;
  arTitle?: string;
  enBody?: string;
  arBody?: string;
  ctaText?: string;
  url?: string;
  enCredit?: string;
  arCredit?: string;
}

export interface HookVariant {
  tag: string;
  enTitle: string;
  arTitle: string;
  enBody: string;
  arBody: string;
  centerIcon?: string;
}

export interface CaptionVariant {
  style: string;
  caption: string;
}

export interface CarouselData {
  theme: 'engineering' | 'cybersecurity' | 'architecture';
  category: string;
  caption: string;
  captionVariants?: CaptionVariant[];
  hookVariants?: HookVariant[];
  slides: Slide[];
}
```
