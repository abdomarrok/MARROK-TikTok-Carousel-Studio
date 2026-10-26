import { DiagramNode, DiagramVariant, SlideData } from '../../types';

/**
 * Visual Pacing & Anti-Repetition Balancer
 * Guarantees zero adjacent or repeated diagram layouts across all mechanism slides in a carousel.
 * Cycles intelligently through ['topology', 'stack', 'isolation', 'takeaway'] based on slide semantics,
 * and repairs any missing fields (nodes, edges, footer, code, metric) so no slide ever renders half-empty.
 */
export function balanceCarouselVisualPacing(slides: SlideData[]): SlideData[] {
  const ALL_VARIANTS: DiagramVariant[] = ['topology', 'stack', 'isolation', 'takeaway'];
  let lastMechanismVariant: DiagramVariant | null = null;
  const variantCounts: Record<DiagramVariant, number> = {
    topology: 0,
    stack: 0,
    isolation: 0,
    takeaway: 0,
  };

  return slides.map((slide, idx) => {
    // Hub Slide (Slide 1)
    if (idx === 0 || slide.type === 'hub') {
      const satLabels = slide.satLabels && slide.satLabels.length >= 2
        ? slide.satLabels
        : ['INGRESS', 'RUNTIME', 'EXECUTION', 'STORAGE', 'TELEMETRY', 'CORE API'];
      return {
        ...slide,
        type: 'hub',
        satLabels,
      };
    }

    // CTA Slide (Final Slide)
    if (idx === slides.length - 1 || slide.type === 'cta') {
      return {
        ...slide,
        type: 'cta',
        ctaText: slide.ctaText || 'DM us  •  رسالة خاصة',
      };
    }

    // Specialized Archetypes: Validate & Repair Missing Data
    if (slide.type === 'code') {
      return {
        ...slide,
        codeFileName: slide.codeFileName || 'system_core.rs',
        codeLanguage: slide.codeLanguage || 'rust',
        codeSnippet: slide.codeSnippet || `// Architecture execution engine\n+ pub async fn execute_pipeline() -> Result<()> {\n+     let node = Engine::spawn().await?;\n+     node.commit_state().await\n+ }`,
      };
    }

    if (slide.type === 'metric') {
      return {
        ...slide,
        metricValue: slide.metricValue || '10x',
        metricLabel: slide.metricLabel || 'THROUGHPUT MULTIPLIER',
        metricDiff: slide.metricDiff || '▲ 94% faster vs legacy baseline',
        metricIcon: slide.metricIcon || 'zap',
      };
    }

    if (slide.type === 'compare') {
      return {
        ...slide,
        compareLeftTitle: slide.compareLeftTitle || 'Legacy Baseline',
        compareLeftBody: slide.compareLeftBody || '• Monolithic bottlenecks\n• High memory drift\n• Unindexed state scans',
        compareRightTitle: slide.compareRightTitle || 'Modern Engine',
        compareRightBody: slide.compareRightBody || '• Zero-copy dataflow\n• Deterministic execution\n• Sub-millisecond latency',
      };
    }

    if (slide.type === 'number') {
      const stepStr = slide.stepNumber || String(idx + 1).padStart(2, '0');
      return {
        ...slide,
        stepNumber: stepStr,
        stepLabel: slide.stepLabel || `STEP ${stepStr}`,
      };
    }

    if (slide.type === 'image') {
      return slide;
    }

    // Mechanism (Row) Slides: Enforce Anti-Repetition & Variety
    const slideText = `${slide.enTitle || ''} ${slide.enBody || ''} ${slide.arTitle || ''}`.toLowerCase();

    // Determine semantic affinity
    let preferredVariant: DiagramVariant = 'topology';
    if (
      slideText.includes('blast radius') ||
      slideText.includes('microsegment') ||
      slideText.includes('isolation') ||
      slideText.includes('isolate') ||
      slideText.includes('perimeter') ||
      slideText.includes('firewall') ||
      slideText.includes('quarantine') ||
      slideText.includes('sandbox') ||
      slideText.includes('boundary') ||
      slideText.includes('guard')
    ) {
      preferredVariant = 'isolation';
    } else if (
      slideText.includes('stack') ||
      slideText.includes('layer') ||
      slideText.includes('pipeline') ||
      slideText.includes('server-side') ||
      slideText.includes('engine') ||
      slideText.includes('tier') ||
      slideText.includes('storage') ||
      slideText.includes('virtual mount')
    ) {
      preferredVariant = 'stack';
    } else if (
      slideText.includes('rule') ||
      slideText.includes('principle') ||
      slideText.includes('takeaway') ||
      slideText.includes('lesson') ||
      slideText.includes('best practice') ||
      slide.icons?.length === 1
    ) {
      preferredVariant = 'takeaway';
    } else {
      preferredVariant = 'topology';
    }

    // Anti-repetition: if preferred matches immediately previous mechanism slide,
    // or if preferred has already been used more than others in this deck, cycle to least used candidate
    let chosenVariant: DiagramVariant = preferredVariant;
    if (chosenVariant === lastMechanismVariant || variantCounts[chosenVariant] > 0) {
      const candidates = ALL_VARIANTS.filter((v) => v !== lastMechanismVariant);
      candidates.sort((a, b) => variantCounts[a] - variantCounts[b]);
      if (candidates.length > 0) {
        chosenVariant = candidates[0];
      }
    }

    lastMechanismVariant = chosenVariant;
    variantCounts[chosenVariant]++;

    // Validate and repair diagram nodes, edges, footer
    const defaultTitleWords = (slide.enTitle || 'System Component')
      .replace(/[.?!]$/, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const n1Name = defaultTitleWords[0] || 'Client Ingress';
    const n2Name = defaultTitleWords[1] || 'Execution Core';
    const n3Name = defaultTitleWords[2] || 'Storage State';

    const rawNodes = slide.diagramNodes || [];
    const diagramNodes: DiagramNode[] = [
      {
        label: rawNodes[0]?.label || n1Name,
        sublabel: rawNodes[0]?.sublabel || 'Port 443 / Ingress',
        status: rawNodes[0]?.status || 'ACTIVE',
        icon: rawNodes[0]?.icon || slide.icons?.[0]?.icon || 'server',
      },
      {
        label: rawNodes[1]?.label || n2Name,
        sublabel: rawNodes[1]?.sublabel || 'Policy Engine',
        status: rawNodes[1]?.status || 'VERIFIED',
        icon: rawNodes[1]?.icon || slide.icons?.[1]?.icon || 'cpu',
      },
      {
        label: rawNodes[2]?.label || n3Name,
        sublabel: rawNodes[2]?.sublabel || 'Encrypted Storage',
        status: rawNodes[2]?.status || 'SECURED',
        icon: rawNodes[2]?.icon || slide.icons?.[2]?.icon || 'database',
      },
    ];

    const rawEdges = slide.diagramEdges || [];
    const diagramEdges = [rawEdges[0] || 'MUTUAL AUTH', rawEdges[1] || 'SYNC PIPE'];
    const diagramFooter = slide.diagramFooter || 'LATENCY: P99 < 1.0ms • PROTOCOL: DETERMINISTIC • STATUS: 100% HEALTHY';

    return {
      ...slide,
      type: 'row',
      diagramVariant: chosenVariant,
      diagramNodes,
      diagramEdges,
      diagramFooter,
    };
  });
}
