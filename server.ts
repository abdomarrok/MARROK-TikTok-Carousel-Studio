import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { synthesizeCarousel } from './src/lib/synthesizer.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Universal CORS configuration for AI Studio iframe & mobile browsers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

// Server-side Google GenAI initialization with required telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Quick healthcheck endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Curated Tech Brand Icons from Simple Icons CDN
const TECH_ICONS_LIST = [
  { name: 'docker', title: 'Docker', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/docker.svg', category: 'DevOps & Containers' },
  { name: 'kubernetes', title: 'Kubernetes', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/kubernetes.svg', category: 'DevOps & Containers' },
  { name: 'redis', title: 'Redis', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/redis.svg', category: 'Databases & Caching' },
  { name: 'postgresql', title: 'PostgreSQL', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/postgresql.svg', category: 'Databases & Caching' },
  { name: 'mysql', title: 'MySQL', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/mysql.svg', category: 'Databases & Caching' },
  { name: 'mongodb', title: 'MongoDB', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/mongodb.svg', category: 'Databases & Caching' },
  { name: 'clickhouse', title: 'ClickHouse', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/clickhouse.svg', category: 'Databases & Analytics' },
  { name: 'apachekafka', title: 'Apache Kafka', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/apachekafka.svg', category: 'Distributed Systems' },
  { name: 'fastapi', title: 'FastAPI', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/fastapi.svg', category: 'Backend & APIs' },
  { name: 'python', title: 'Python', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/python.svg', category: 'Languages' },
  { name: 'go', title: 'Go (Golang)', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/go.svg', category: 'Languages' },
  { name: 'rust', title: 'Rust', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/rust.svg', category: 'Languages' },
  { name: 'typescript', title: 'TypeScript', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/typescript.svg', category: 'Languages' },
  { name: 'javascript', title: 'JavaScript', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/javascript.svg', category: 'Languages' },
  { name: 'linux', title: 'Linux', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/linux.svg', category: 'Operating Systems' },
  { name: 'ubuntu', title: 'Ubuntu', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/ubuntu.svg', category: 'Operating Systems' },
  { name: 'git', title: 'Git', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/git.svg', category: 'VCS & Tooling' },
  { name: 'github', title: 'GitHub', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/github.svg', category: 'VCS & Tooling' },
  { name: 'gitlab', title: 'GitLab', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/gitlab.svg', category: 'VCS & Tooling' },
  { name: 'amazonwebservices', title: 'AWS', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/amazonwebservices.svg', category: 'Cloud Infrastructure' },
  { name: 'googlecloud', title: 'Google Cloud', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/googlecloud.svg', category: 'Cloud Infrastructure' },
  { name: 'microsoftazure', title: 'Microsoft Azure', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/microsoftazure.svg', category: 'Cloud Infrastructure' },
  { name: 'cloudflare', title: 'Cloudflare', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/cloudflare.svg', category: 'Cloud & Networking' },
  { name: 'nginx', title: 'Nginx', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/nginx.svg', category: 'Networking' },
  { name: 'graphql', title: 'GraphQL', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/graphql.svg', category: 'Backend & APIs' },
  { name: 'terraform', title: 'Terraform', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/terraform.svg', category: 'DevOps & IaC' },
  { name: 'ansible', title: 'Ansible', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/ansible.svg', category: 'DevOps & IaC' },
  { name: 'prometheus', title: 'Prometheus', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/prometheus.svg', category: 'Observability' },
  { name: 'grafana', title: 'Grafana', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/grafana.svg', category: 'Observability' },
  { name: 'anthropic', title: 'Anthropic', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/anthropic.svg', category: 'AI Research' },
  { name: 'openai', title: 'OpenAI', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/openai.svg', category: 'AI Research' },
  { name: 'react', title: 'React', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/react.svg', category: 'Frontend' },
  { name: 'nodejs', title: 'Node.js', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/nodedotjs.svg', category: 'Backend' },
  { name: 'cplusplus', title: 'C++', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/cplusplus.svg', category: 'Languages' },
  { name: 'sqlite', title: 'SQLite', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/sqlite.svg', category: 'Databases' },
  { name: 'supabase', title: 'Supabase', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/supabase.svg', category: 'Backend & DB' },
];

// CORS-safe image proxy to prevent canvas tainting on export, with SVG dynamic theme recoloring
app.get('/api/proxy-image', async (req, res) => {
  const targetUrl = req.query.url as string;
  const requestedColor = (req.query.color as string) || '';
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'url query parameter is required' });
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'Only http and https protocols are allowed' });
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MARROK-TikTok-Studio/2.0',
        Accept: 'image/*,image/svg+xml,*/*',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ error: `Upstream error: ${upstreamRes.statusText}` });
    }

    let contentType = upstreamRes.headers.get('content-type') || 'image/png';
    const rawBuffer = Buffer.from(await upstreamRes.arrayBuffer());

    const isSvg =
      contentType.includes('svg') ||
      targetUrl.toLowerCase().endsWith('.svg') ||
      rawBuffer.toString('utf-8', 0, 100).includes('<svg');

    if (isSvg) {
      let svgText = rawBuffer.toString('utf-8');
      contentType = 'image/svg+xml;charset=utf-8';

      // Normalize color (e.g. '13131E' -> '#13131E', '37E2C0' -> '#37E2C0')
      let hexColor = requestedColor.trim();
      if (hexColor && !hexColor.startsWith('#') && !hexColor.startsWith('rgb')) {
        hexColor = `#${hexColor}`;
      }

      // If a color is specified, inject/replace colors to harmonize with theme
      if (hexColor) {
        // Ensure root <svg> has fill and style color
        svgText = svgText.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
          const cleanAttrs = attrs.replace(/\bfill="[^"]*"/gi, '');
          return `<svg ${cleanAttrs} fill="${hexColor}" style="color: ${hexColor}; fill: ${hexColor};">`;
        });

        // Replace any path fills that might be hardcoded to black or currentColor
        svgText = svgText.replace(/\bfill="(?:currentColor|#000|#000000|black)"/gi, `fill="${hexColor}"`);
        // For paths with no fill attribute, Simple Icons defaults to black: inject fill
        svgText = svgText.replace(/<path\b((?![^>]*\bfill=)[^>]*)>/gi, `<path fill="${hexColor}" $1>`);
      } else {
        // If no color was passed, ensure SVGs aren't default black on dark canvases (make default white/visible)
        svgText = svgText.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
          if (!attrs.includes('fill=')) {
            return `<svg ${attrs} fill="#FFFFFF" style="color: #FFFFFF; fill: #FFFFFF;">`;
          }
          return `<svg ${attrs}>`;
        });
        svgText = svgText.replace(/<path\b((?![^>]*\bfill=)[^>]*)>/gi, `<path fill="#FFFFFF" $1>`);
      }

      const modifiedBuffer = Buffer.from(svgText, 'utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Type', contentType);
      return res.send(modifiedBuffer);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', contentType);
    return res.send(rawBuffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Failed to proxy image ${targetUrl}:`, msg);
    return res.status(500).json({ error: 'Failed to fetch external image', details: msg });
  }
});

// Subject-based media search: official tech icons + Wikimedia technical diagrams
app.get('/api/search-media', async (req, res) => {
  const query = ((req.query.q as string) || '').trim().toLowerCase();

  // 1. Filter curated tech brand icons
  const matchedIcons = TECH_ICONS_LIST.filter(
    (item) =>
      !query ||
      item.name.includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
  );

  // 2. Fetch subject-based diagrams / illustrations from Wikimedia Commons API
  const matchedImages: { title: string; url: string; thumbUrl: string; source: string }[] = [];

  if (query && query.length >= 2) {
    try {
      const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        `${query} diagram OR architecture OR logo`
      )}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=400&format=json`;

      const wikiRes = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'MARROK-TikTok-Studio/2.0 (marrok.org; technical carousel generator)' },
        signal: AbortSignal.timeout(4000),
      });

      if (wikiRes.ok) {
        const data = await wikiRes.json();
        const pages = data.query?.pages || {};
        for (const pageId of Object.keys(pages)) {
          const info = pages[pageId]?.imageinfo?.[0];
          if (info?.thumburl || info?.url) {
            matchedImages.push({
              title: pages[pageId].title?.replace(/^File:/, '') || query,
              url: info.url,
              thumbUrl: info.thumburl || info.url,
              source: 'Wikimedia Commons',
            });
          }
        }
      }
    } catch (wikiErr) {
      console.warn('Wikimedia media search fallback error:', wikiErr);
    }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.json({
    icons: matchedIcons.slice(0, 24),
    images: matchedImages.slice(0, 16),
  });
});

const MARROK_SYSTEM_PROMPT = `You are MARROK TikTok Carousel Studio & Autonomous Content Pipeline Engine.
Your purpose is to take ONE raw input (a screenshot of social media/code, YouTube summary, blog post, repo, or rough notes) and automatically plan, fact-check, and configure a publication-ready technical carousel according to the MARROK Production Spec.

Follow the 7-Stage Pipeline autonomously:

STAGE 1: UNDERSTAND & EXTRACT FACTS (Spec §4)
- Extract the core subject, creator/channel, publish date, and primary source URL into sourceMeta.
- Extract 3 to 6 key technical facts into facts[]: numbers, benchmark speedups, architectural mechanisms, quotes.
- Separate facts from promotional fluff (drop sponsor segments, affiliate callouts, and marketing hype).

STAGE 2: VERIFY & HEDGE CLAIMS (Spec §5)
- Attribute unconfirmed numbers or claims ("per Anthropic", "per the project", "according to reports").
- Fix common recap errors (e.g. models named incorrectly or unverified 4K claims).

STAGE 3: PLATFORM RISK REVIEW (Spec §6)
- Ensure 100% original designed slides — no raw video re-posts (which caused 6 TikTok recommendation bans).
- Nominative tech logos only (Simple Icons / Lucide). No copyrighted characters or footage.

STAGE 4: SMART CAROUSEL PLANNER (Spec §7 & §12.1)
- Produce a tight 8 to 10 slide narrative arc:
  * Slide 1: "hub" (The Hook) — central brand/tech icon + 6 orbital satellite icons. High curiosity or metric promise.
  * Slide 2: The Stakes / Reason to Swipe — why this architecture broke the old way or matters now.
  * Slides 3–5: The Mechanics / Implementation — step-by-step points using "number" (01, 02), "code" (terminal window), "metric" (benchmark card), or "row" (1 to 5 icons).
  * Slide 6 or 7: "The Catch / Before You Switch" or "The Debate" — crucial honest analysis (beta status, memory overhead, lock-in, tradeoffs). This builds massive credibility and comment engagement.
  * Final Slide: "cta" — viewer domain challenge question, DM us prompt, and clear source credit.
- Select the optimal theme from the 11 spec themes:
  scion (AI + engineering), backend (infrastructure), pqc (cryptography), security_spec (defense/CVEs), node (Node/JS), ajax (AI news), concat (video/graphics), estonia (education/policy), artcraft (design tools), arch (architecture), zerobreach (digital security).

STAGE 5: COPYWRITING & RTL LINT (Spec §8)
- Strict character limits:
  * English title: max 45 characters (max 60 on Slide 1 hook)
  * Arabic title: max 40 characters
  * English body: max 140 characters
  * Arabic body: max 150 characters
- Arabic rules: Write natural, idiomatic technical Arabic. Keep product names in Latin (Docker, Redis, Scion). NEVER end an Arabic line with a Latin word followed by punctuation (e.g. do not end with .Git or ?AI).
- No emojis inside slides (Cairo font has none).

STAGE 6 & 7: CAPTIONS, FIRST COMMENT & SCHEDULING (Spec §8 & §14)
- Caption: Arabic first, then English. Hook emoji, context lines, swipe prompt 👉, bullet points 🔹, question 👇, credit 🎥, 8-10 hashtags.
- firstComment: Pinned first comment with reference link (TikTok caption links are not clickable).
- shortCaption: 2-line quick-scroll version.
- screenHook: 3-second on-screen hook for Slide 1 cover.
- notesForHuman: 2 to 3 notes for human review (unverified claims, sponsor fluff removed).
- scheduleSlot: Recommended posting slot in Africa/Algiers timezone (10:00 DZ, 12:00 DZ, or 18:00 DZ).

Return valid JSON matching the exact schema.`;

const CAROUSEL_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    theme: {
      type: Type.STRING,
      description: 'Spec theme id: scion, backend, pqc, security_spec, node, ajax, concat, estonia, artcraft, arch, zerobreach, teal, cyber, violet, blueprint, amber, emerald, monochrome',
    },
    category: {
      type: Type.STRING,
      description: 'Specific technical domain category extracted directly from input context (e.g. AI SYSTEMS & MONOREPOS, LINUX KERNEL, REVERSE ENGINEERING)',
    },
    brand: {
      type: Type.STRING,
      description: 'Brand or creator wordmark for slide watermark and CTA (e.g. ANTHROPIC, MARROK)',
    },
    brandUrl: {
      type: Type.STRING,
      description: 'Website URL or social handle (e.g. anthropic.com, marrok.org)',
    },
    sourceMeta: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        title: { type: Type.STRING },
        creator: { type: Type.STRING },
        url: { type: Type.STRING },
        published: { type: Type.STRING },
      },
      description: 'Spec §4: Source metadata extracted from input',
    },
    facts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          type: { type: Type.STRING },
          verified: { type: Type.STRING },
          evidence: { type: Type.STRING },
        },
        required: ['text', 'type', 'verified'],
      },
      description: 'Spec §4 & §5: Extracted and verified facts',
    },
    notesForHuman: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Spec §11: Caveats, sponsor segments dropped, and verification notes for human review',
    },
    scheduleSlot: {
      type: Type.STRING,
      description: 'Spec §14: Recommended posting slot (e.g. 18:00 DZ)',
    },
    caption: {
      type: Type.STRING,
      description: 'Primary bilingual English + Arabic TikTok description',
    },
    firstComment: {
      type: Type.STRING,
      description: 'Pinned first comment with reference link per Spec §8 & §14',
    },
    shortCaption: {
      type: Type.STRING,
      description: '2-line short caption variant for quick scroll per Spec §8',
    },
    screenHook: {
      type: Type.STRING,
      description: '3-second on-screen hook text for Slide 1 per Spec §8',
    },
    captionVariants: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING },
          caption: { type: Type.STRING },
        },
        required: ['style', 'caption'],
      },
      description: '2 caption style variants (Bulletins vs. Narrative)',
    },
    hookVariants: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tag: { type: Type.STRING },
          enTitle: { type: Type.STRING },
          arTitle: { type: Type.STRING },
          enBody: { type: Type.STRING },
          arBody: { type: Type.STRING },
          centerIcon: { type: Type.STRING },
        },
        required: ['tag', 'enTitle', 'arTitle', 'enBody', 'arBody'],
      },
      description: '3 alternative Slide 1 Hook variations for A/B testing',
    },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: 'hub, row, number, metric, code, compare, or cta',
          },
          stepNumber: {
            type: Type.STRING,
            description: 'Step numeral e.g. 01, 02, 03 for number archetype slides',
          },
          stepLabel: {
            type: Type.STRING,
            description: 'Step badge label e.g. STEP 01 for number archetype slides',
          },
          centerIcon: {
            type: Type.STRING,
            description: 'Icon name for hub center box',
          },
          satIcons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Array of 6 icon names for hub satellites',
          },
          icons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                icon: { type: Type.STRING },
                label: { type: Type.STRING },
              },
              required: ['icon', 'label'],
            },
            description: 'Array of 1 to 5 icons with micro-labels for row slides',
          },
          metricValue: {
            type: Type.STRING,
            description: 'Hero metric number for metric slide (e.g. 200x, 0ms, 99.9%)',
          },
          metricLabel: {
            type: Type.STRING,
            description: 'Micro-label for metric slide (e.g. THROUGHPUT MULTIPLIER)',
          },
          metricDiff: {
            type: Type.STRING,
            description: 'Improvement delta for metric slide (e.g. ▲ 12x vs baseline)',
          },
          metricIcon: {
            type: Type.STRING,
            description: 'Icon for metric slide badge',
          },
          codeSnippet: {
            type: Type.STRING,
            description: 'Multi-line code snippet for code slide',
          },
          codeFileName: {
            type: Type.STRING,
            description: 'File or tab name for code window (e.g. bench_run.sh)',
          },
          codeLanguage: {
            type: Type.STRING,
            description: 'Language for code slide (e.g. bash, rust, python, sql)',
          },
          compareLeftTitle: {
            type: Type.STRING,
            description: 'Left card title for compare slide (e.g. Legacy Monolith)',
          },
          compareLeftBody: {
            type: Type.STRING,
            description: 'Left card bullet points for compare slide',
          },
          compareRightTitle: {
            type: Type.STRING,
            description: 'Right card title for compare slide (e.g. Modern Engine)',
          },
          compareRightBody: {
            type: Type.STRING,
            description: 'Right card bullet points for compare slide',
          },
          enTitle: {
            type: Type.STRING,
            description: 'English headline (2-6 words)',
          },
          arTitle: {
            type: Type.STRING,
            description: 'Arabic headline',
          },
          enBody: {
            type: Type.STRING,
            description: 'English body copy or hook subtitle',
          },
          arBody: {
            type: Type.STRING,
            description: 'Arabic body copy or hook subtitle',
          },
          ctaText: {
            type: Type.STRING,
            description: 'Pill button text for cta slide',
          },
          url: {
            type: Type.STRING,
            description: 'Website URL for cta slide',
          },
          enCredit: {
            type: Type.STRING,
            description: 'English source attribution footer for cta slide',
          },
          arCredit: {
            type: Type.STRING,
            description: 'Arabic source attribution footer for cta slide',
          },
        },
        required: ['type'],
      },
    },
  },
  required: ['theme', 'category', 'caption', 'slides'],
};

import { CarouselData } from './src/types.ts';

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

// Allowed input modes
const ALLOWED_INPUT_MODES = new Set(['upload', 'text', 'youtube', 'presets']);
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// API endpoint for generating carousel and TikTok caption
app.post('/api/generate', async (req, res) => {
  const { prompt, inputMode, imageBase64, imageMimeType, categoryHint, imageName } = req.body;

  if (!prompt && !imageBase64) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }

  // Validate and sanitize parameters
  const safeInputMode = typeof inputMode === 'string' && ALLOWED_INPUT_MODES.has(inputMode) ? inputMode : 'text';
  const safeCategoryHint = typeof categoryHint === 'string' ? categoryHint.slice(0, 100).replace(/[<>{}]/g, '') : 'auto';
  const safeMimeType = typeof imageMimeType === 'string' && ALLOWED_IMAGE_MIMES.has(imageMimeType) ? imageMimeType : 'image/jpeg';
  const safePrompt = typeof prompt === 'string' ? prompt.slice(0, 50000) : '';
  const safeImageName = typeof imageName === 'string' ? imageName.slice(0, 200) : '';

  try {
    const parts: GeminiPart[] = [];

    // If an image was uploaded, attach it as inlineData
    if (typeof imageBase64 === 'string' && imageBase64.length > 0) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: safeMimeType,
          data: cleanBase64,
        },
      });
    }

    // Build user text prompt
    let userPromptText = `Generate a dynamic MARROK 5-to-9 slide TikTok carousel, 3 Hook Variants for Slide 1, and 2 Caption Variants from this input.\n`;
    if (safeCategoryHint && safeCategoryHint !== 'auto') {
      userPromptText += `Preferred Domain Category: ${safeCategoryHint}\n`;
    }
    if (safeInputMode) {
      userPromptText += `Input Mode: ${safeInputMode}\n`;
    }
    if (safePrompt) {
      userPromptText += `Raw Content / Topic / Transcript:\n"""\n${safePrompt}\n"""\n`;
    }

    userPromptText += `\nFollow the MARROK copywriting formula strictly:
- Dynamically determine slide count (5 to 9 slides): 5 slides for quick tips or single takeaways, 6-7 for technical case studies, 8-9 for deep whitepapers.
- Slide 1 must be Archetype "hub" with centerIcon + 6 topic-specific satIcons.
- Provide hookVariants with 3 alternatives for Slide 1 (Curiosity, Hard Metrics, Problem/Contrast).
- Mid-deck slides must blend varied visual archetypes:
  - "metric" (Stat Hero Card with huge metricValue, metricLabel, metricDiff, and metricIcon) for benchmarks/throughput wins.
  - "code" (Terminal Window with codeFileName, codeLanguage, and syntax codeSnippet) for CLI commands, configs, or exploit proofs.
  - "compare" (Side-by-side comparison with compareLeftTitle, compareLeftBody, compareRightTitle, compareRightBody) for Old Way vs Modern Stack.
  - "row" (1 to 3 icons with micro-labels) for technical mechanisms.
- Final Slide must be Archetype "cta" with creator/brand watermark, domain question hook, DM us CTA, and bilingual attribution.
- Return valid JSON matching the exact schema.`;

    parts.push({ text: userPromptText });

    // Support user-provided API key from UI or default to system environment key
    const customKey = (req.headers['x-gemini-key'] as string) || req.body.apiKey;
    const activeApiKey = customKey || process.env.GEMINI_API_KEY;
    const activeAi = activeApiKey ? new GoogleGenAI({ apiKey: activeApiKey }) : null;

    // Primary: 'gemini-3.1-flash-lite' (high throughput, ultra-fast, handles multimodal)
    // Fallbacks: 'gemini-flash-latest'
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: unknown = null;
    let jsonResult: CarouselData | null = null;

    if (activeAi) {
      for (const model of candidateModels) {
        try {
          console.log(`Calling Gemini model: ${model} (using ${customKey ? 'custom user key' : 'system key'})...`);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${model} exceeded 6000ms threshold`)), 6000)
          );

          const response = await Promise.race([
            activeAi.models.generateContent({
              model,
              contents: { parts },
              config: {
                systemInstruction: MARROK_SYSTEM_PROMPT,
                temperature: 0.2,
                responseMimeType: 'application/json',
                responseSchema: CAROUSEL_RESPONSE_SCHEMA,
              },
            }),
            timeoutPromise,
          ]);

          const text = response.text;
          if (text) {
            jsonResult = JSON.parse(text) as CarouselData;
            console.log(`Successfully generated carousel with model ${model}`);
            break;
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`Model ${model} failed:`, errMsg);
          lastError = err;
          // If the model is experiencing 503 high demand, UNAVAILABLE, or timeout,
          // don't waste seconds trying more models. Fast-break immediately!
          if (
            errMsg.includes('503') ||
            errMsg.includes('high demand') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('Timeout')
          ) {
            console.log('Upstream bottleneck or timeout detected. Fast-breaking to resilient synthesizer.');
            break;
          }
        }
      }
    }

    if (jsonResult) {
      return res.json(jsonResult);
    }

    // Upstream AI API is experiencing high demand (503) or rate limits.
    // Gracefully activate MARROK intelligent content synthesizer:
    console.log('Activating MARROK resilient content synthesizer for input:', safePrompt || safeImageName);
    const synthesizedData = synthesizeCarousel({
      prompt: safePrompt,
      categoryHint: safeCategoryHint,
      inputMode: safeInputMode,
      imageFileName: safeImageName,
    });

    res.setHeader('X-Marrok-Engine', 'intelligent-synthesizer');
    return res.json(synthesizedData);
  } catch (error: unknown) {
    console.error('Error generating carousel, using fallback:', error);
    // Never fail with 500: synthesize archetype-compliant output
    const fallbackData = synthesizeCarousel({
      prompt: safePrompt,
      categoryHint: safeCategoryHint,
      inputMode: safeInputMode,
      imageFileName: safeImageName,
    });
    return res.json(fallbackData);
  }
});

// Vite middleware for development or static serving for production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Explicitly listen on 0.0.0.0 for container networking
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MARROK TikTok Carousel Studio listening on http://0.0.0.0:${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

startServer();
