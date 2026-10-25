/**
 * Gemini Response JSON Schema for MARROK Technical Carousel Generation
 */

import { Type } from '@google/genai';

export const CAROUSEL_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    theme: {
      type: Type.STRING,
      description: 'Spec theme id: scion, backend, pqc, security_spec, node, ajax, concat, estonia, artcraft, arch, zerobreach, teal, cyber, violet, blueprint, amber, emerald, monochrome',
    },
    category: {
      type: Type.STRING,
      description: 'Specific technical domain category extracted directly from input context (e.g. CYBERSECURITY & DEFENSE, VCS & MONOREPOS, DATABASES & CACHING, LINUX KERNEL)',
    },
    brand: {
      type: Type.STRING,
      description: 'Brand wordmark for slide watermark. MUST strictly be "MARROK".',
    },
    brandUrl: {
      type: Type.STRING,
      description: 'Website URL (defaults to "marrok.org")',
    },
    sourceMeta: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        title: { type: Type.STRING },
        creator: { type: Type.STRING },
        url: { type: Type.STRING },
        published: { type: Type.STRING },
        groundingQueries: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Search queries executed during grounding verification',
        },
        groundingSources: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
            },
            required: ['title', 'url'],
          },
          description: 'Authoritative web links found during Google Search grounding',
        },
        isSearchGrounded: { type: Type.BOOLEAN },
      },
      description: 'Spec §4: Source metadata extracted from input & search grounding',
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
          sourceUrl: { type: Type.STRING },
          sourceTitle: { type: Type.STRING },
        },
        required: ['text', 'type', 'verified'],
      },
      description: 'Spec §4 & §5: Extracted and verified facts with source citations',
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
          satLabels: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Array of 6 short technical component names for Slide 1 orbital satellites, directly relevant to the topic (e.g. for Postgres: ["Replica DB", "Connection Pool", "WAL Logs", "Buffer Cache", "Vacuum Worker", "Query Planner"])',
          },
          diagramVariant: {
            type: Type.STRING,
            description: 'Diagram layout style for technical mechanisms: "topology" (3-node protocol flow), "stack" (3-layer architecture pipeline), "isolation" (segmented boundary/quarantine grid), or "takeaway" (principle card)',
          },
          diagramNodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: 'Component name e.g. "PgBouncer", "Primary DB", "Docker Daemon"' },
                sublabel: { type: Type.STRING, description: 'Protocol, port, or spec e.g. "Port 5432", "Tx Mode"' },
                status: { type: Type.STRING, description: 'Status pill text e.g. "POOLED", "ACTIVE", "ISOLATED"' },
                icon: { type: Type.STRING, description: 'Lucide icon name e.g. database, server, cpu, lock' },
              },
              required: ['label'],
            },
            description: 'The 3 component cards, layers, or cells illustrating this specific slide concept. MUST be 100% relevant to the slide topic.',
          },
          diagramEdges: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Labels on the arrows/connectors between nodes (e.g. ["10k Conns", "64 Pooled"] or ["REST API", "OCI Shim"])',
          },
          diagramFooter: {
            type: Type.STRING,
            description: 'Bottom telemetry/summary spec bar line (e.g. "POOL MODE: TRANSACTION • LATENCY: 0.8ms P99 • MAX CLIENTS: 10,000")',
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
            description: 'English headline: MUST be strictly 2 to 5 words ending in a period (.). E.g. "Zero-Trust, explained." or "Redis 8 gets faster." NEVER use colons or rambling titles.',
          },
          arTitle: {
            type: Type.STRING,
            description: 'Concise, contextual Arabic headline (2-5 words). Never use colons touching Latin words.',
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
