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

const MARROK_SYSTEM_PROMPT = `You are MARROK TikTok Carousel Studio & Multimodal Content Engine.
Your purpose is to accept raw user input (screenshots of social media posts/code, YouTube summaries/transcripts, engineering blog posts, GitHub repos, or rough notes) and generate production-ready deliverables:

1. BILINGUAL (English + Arabic) TikTok Post Descriptions (Captions):
- Provide a default high-impact caption plus 2 variants in captionVariants:
  - Variant 1 (Style: "Executive Bulletins & Hard Metrics"): Punchy hook, structured bullet points with metrics, creator attribution, and hashtags.
  - Variant 2 (Style: "Narrative Breakdown & Story"): Engaging storytelling hook, technical breakdown paragraphs, lessons learned, attribution, and hashtags.
- Proper nouns (Anthropic, Git, Scion, Docker, Ghidra, IDA, DefectDojo, Python) remain in Latin script inside the Arabic text.
- Hashtags should be niche and targeted (e.g., #DevSecOps #CyberSecurity #AppSec #SoftwareEngineering #Git #AIAgents #TechInArabic #هندسة_البرمجيات #الأمن_السيبراني #MARROK).

2. 3 Slide 1 Hook Variants (for A/B testing on TikTok):
- In hookVariants, provide 3 distinct alternatives for Slide 1 (The Hook):
  1. "Curiosity & Surprise": Question or counter-intuitive premise (e.g., "Why did Anthropic move beyond Git?")
  2. "Hard Metrics & Benchmark": Leading with concrete numbers (e.g., "100 GB repos & 25M CI checkouts a day.")
  3. "The Problem / Paradigm Shift": Leading with what broke (e.g., "Git broke when agents took over.")
- Each hook variant has: tag, enTitle (2-6 words), arTitle, enBody (1 crisp sentence), arBody, and recommended centerIcon.

3. 8 to 9 Slide Carousel Structure matching the exact MARROK layout archetypes:
- Archetype 1: "hub" (Used EXCLUSIVELY for Slide 1 - The Hook).
  - centerIcon: one of [shieldAlert, binary, codeFile, search, database, server, gitMerge, funnel, alerts, lifecycle, eyeRisk, gauge, lightbulb, cpu, clock, scales, robot, calculator, gradCap, brain, changesets, terminal, lock]
  - satIcons: array of 6 distinct icon names from the library
  - enTitle: 2 to 6 punchy words, bold headline (use \\n for two lines if needed)
  - arTitle: Natural, idiomatic technical Arabic translation directly underneath
  - enBody: Subtitle or hook summary (1 crisp sentence)
  - arBody: Modern technical Arabic translation matching English structure
- Archetype 2: "row" with 1 icon:
  - icons: [{ icon: "...", label: "1-3 word English label" }] (e.g. "~100 GB history", "Server-side", "Changesets", "Merge first", "The demo", "Not a Git killer")
  - enTitle: 2-6 words punchy title ending with period or question mark
  - arTitle: Arabic translation
  - enBody: 1-2 crisp sentences (12-24 words total) with zero fluff, pulling hard numbers and technical mechanisms
  - arBody: Modern technical Arabic translation
- Archetype 3: "row" with 2 icons:
  - icons: [{ icon: "...", label: "Label 1" }, { icon: "...", label: "Label 2" }]
  - Used for contrasts, transformations, or two-part workflows (e.g. "Binary" & "Source code", "Expert skill" & "Ghidra / IDA", "AI loop" & "Ask, answer, ask")
- Archetype 4: "row" with 3 icons:
  - icons: [{ icon: "...", label: "200x smaller" }, { icon: "...", label: "Seconds" }, { icon: "...", label: "25% freed" }]
  - Used for metrics, benchmarks, or 3-part capabilities
- Archetype 5: "cta" (Used EXCLUSIVELY for the final slide - Slide 8 or 9):
  - enTitle: Domain question hook tailored to the topic (e.g. "Building with AI agents\\nat scale?" or "Building secure\\nsoftware?")
  - arTitle: Arabic translation (e.g. "تبني بوكلاء الذكاء\\nالاصطناعي على نطاق واسع؟" or "تبني برمجيات\\nآمنة؟")
  - ctaText: "DM us  •  رسالة خاصة"
  - url: "marrok.org"
  - enCredit: Attribution string (e.g. "Based on Anthropic's engineering post. The numbers are Anthropic's own." or "Based on a video by Low Level. Full credit to its creator.")
  - arCredit: Arabic attribution string (e.g. "مبني على مقال Anthropic الهندسي، والأرقام من Anthropic نفسها." or "مبني على فيديو من قناة Low Level، والفضل لصاحبها.")

Category & Theme Classification:
- Dynamically extract the specific domain category and badges from the input context (e.g. 'REVERSE ENGINEERING', 'LINUX KERNEL & EBPF', 'KUBERNETES & CLOUD SEC', 'AI AGENTS & COMPILERS', 'DISTRIBUTED SYSTEMS', 'DEVSECOPS & APPOPS'). Never default to a generic label if the input provides technical specifics.
- Recommend a matching theme id:
  - "teal": Core software engineering, devtools, monorepos, systems.
  - "cyber": Security exploits, CVEs, reverse engineering, binary analysis, malware.
  - "violet": AI research, LLMs, neural networks, inference engines, tokenizers.
  - "blueprint": Cloud infrastructure, Kubernetes, networking, cloud security.
  - "amber": Distributed systems, databases, consensus (Raft/Paxos), storage.
  - "emerald": Linux kernel, systems programming, eBPF, assembly, C/C++.
  - "monochrome": Minimalist, high-performance computing, benchmarks.

Third-Party Attribution Rules:
Inside the slides, always attribute claims and benchmarks objectively ("per Anthropic", "Anthropic says", "says the video", "In the video", "The video says yes") rather than claiming them as first-party facts.
Return valid JSON matching the schema.`;

const CAROUSEL_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    theme: {
      type: Type.STRING,
      description: 'Theme id: teal, cyber, violet, blueprint, amber, emerald, monochrome',
    },
    category: {
      type: Type.STRING,
      description: 'Specific technical domain category extracted directly from input context (e.g. REVERSE ENGINEERING, LINUX KERNEL, KUBERNETES SEC, AI AGENTS, DISTRIBUTED SYSTEMS)',
    },
    caption: {
      type: Type.STRING,
      description: 'Primary bilingual English + Arabic TikTok description',
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
            description: 'hub, row, or cta',
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
            description: 'Array of 1 to 3 icons with micro-labels for row slides',
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

// API endpoint for generating carousel and TikTok caption
app.post('/api/generate', async (req, res) => {
  const { prompt, inputMode, imageBase64, imageMimeType, categoryHint, imageName } = req.body;

  if (!prompt && !imageBase64) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }

  try {
    const parts: any[] = [];

    // If an image was uploaded, attach it as inlineData
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: imageMimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    // Build user text prompt
    let userPromptText = `Generate a complete MARROK 8-to-9 slide TikTok carousel, 3 Hook Variants for Slide 1, and 2 Caption Variants from this input.\n`;
    if (categoryHint && categoryHint !== 'auto') {
      userPromptText += `Preferred Domain Category: ${categoryHint}\n`;
    }
    if (inputMode) {
      userPromptText += `Input Mode: ${inputMode}\n`;
    }
    if (prompt) {
      userPromptText += `Raw Content / Topic / Transcript:\n"""\n${prompt}\n"""\n`;
    }

    userPromptText += `\nFollow the MARROK copywriting formula strictly:
- Slide 1 must be Archetype 1 (hub) with centerIcon + 6 satIcons.
- Provide hookVariants with 3 alternatives for Slide 1 (Curiosity, Hard Metrics, Problem/Contrast).
- Slide 2 to Slide 7 or 8 should use Archetype 2, 3, or 4 ("row" with 1, 2, or 3 icons) presenting the technical mechanism, benchmarks, and lessons learned.
- Final Slide (8 or 9) must be Archetype 5 (cta) with MARROK branding, domain question hook, DM us CTA, and bilingual attribution.
- Return valid JSON matching the exact schema.`;

    parts.push({ text: userPromptText });

    // Support user-provided API key from UI or default to system environment key
    const customKey = (req.headers['x-gemini-key'] as string) || req.body.apiKey;
    const activeApiKey = customKey || process.env.GEMINI_API_KEY;
    const activeAi = activeApiKey ? new GoogleGenAI({ apiKey: activeApiKey }) : null;

    // Primary: 'gemini-3.1-flash-lite' (high throughput, ultra-fast, handles multimodal)
    // Fallbacks: 'gemini-flash-latest'
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;
    let jsonResult: any = null;

    if (activeAi) {
      for (const model of candidateModels) {
        try {
          console.log(`Calling Gemini model: ${model} (using ${customKey ? 'custom user key' : 'system key'})...`);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${model} exceeded 6000ms threshold`)), 6000)
          );

          const response: any = await Promise.race([
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
            jsonResult = JSON.parse(text);
            console.log(`Successfully generated carousel with model ${model}`);
            break;
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
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
    console.log('Activating MARROK resilient content synthesizer for input:', prompt || imageName);
    const synthesizedData = synthesizeCarousel({
      prompt,
      categoryHint,
      inputMode,
      imageFileName: imageName,
    });

    res.setHeader('X-Marrok-Engine', 'intelligent-synthesizer');
    return res.json(synthesizedData);
  } catch (error: any) {
    console.error('Error generating carousel, using fallback:', error);
    // Never fail with 500: synthesize archetype-compliant output
    const fallbackData = synthesizeCarousel({
      prompt,
      categoryHint,
      inputMode,
      imageFileName: imageName,
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
