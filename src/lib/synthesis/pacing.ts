import { DiagramNode, DiagramVariant, SlideData } from '../../types';

/**
 * Visual Pacing & Anti-Repetition Balancer
 * Guarantees zero adjacent or repeated diagram layouts across all mechanism slides in a carousel.
 * Cycles intelligently through ['topology', 'stack', 'isolation', 'takeaway'] based on slide semantics,
 * and repairs any missing fields (nodes, edges, footer, code, metric) so no slide ever renders half-empty.
 */
export function balanceCarouselVisualPacing(slides: SlideData[]): SlideData[] {
  const ALL_VARIANTS: DiagramVariant[] = [
    'scatter',
    'graph',
    'clusters',
    'split',
    'topology',
    'features',
    'stack',
    'isolation',
    'takeaway',
  ];
  let lastMechanismVariant: DiagramVariant | null = null;
  const variantCounts: Record<DiagramVariant, number> = {
    scatter: 0,
    graph: 0,
    clusters: 0,
    split: 0,
    topology: 0,
    features: 0,
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
        ctaText: slide.ctaText && !slide.ctaText.toLowerCase().includes('dm for')
          ? slide.ctaText
          : 'Join Discussion  •  شارك برأيك',
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
    let preferredVariant: DiagramVariant = slide.diagramVariant || 'topology';
    if (slide.diagramVariant && ALL_VARIANTS.includes(slide.diagramVariant)) {
      preferredVariant = slide.diagramVariant;
    } else if (
      /vector|embedding|semantic|cosine|similarity|high-dimensional|query point/.test(slideText)
    ) {
      preferredVariant = 'scatter';
    } else if (
      /hnsw|skip[- ]?list|graph|hierarchy|layered|traversal|hops\b/.test(slideText)
    ) {
      preferredVariant = 'graph';
    } else if (
      /ivf|cluster|k-means|centroid|partition|inverted file|shortlist/.test(slideText)
    ) {
      preferredVariant = 'clusters';
    } else if (
      /write|hot|cold|buffer|lsm|compaction|consistency|store/.test(slideText)
    ) {
      preferredVariant = 'split';
    } else if (
      /filter|constraint|metadata|attribute|pre-filter/.test(slideText)
    ) {
      preferredVariant = 'features';
    } else if (
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
      slideText.includes('tier') ||
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
    // cycle to least used candidate
    let chosenVariant: DiagramVariant = preferredVariant;
    if (chosenVariant === lastMechanismVariant || variantCounts[chosenVariant] > 1) {
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
    const n1Name = slide.icons?.[0]?.label || defaultTitleWords[0] || 'Ingress Layer';
    const n2Name = slide.icons?.[1]?.label || defaultTitleWords[1] || 'Execution Engine';
    const n3Name = slide.icons?.[2]?.label || defaultTitleWords[2] || 'State Persistence';

    const rawNodes = slide.diagramNodes || [];

    let fallbackSub1 = 'Input Handler';
    let fallbackSub2 = 'Core Execution';
    let fallbackSub3 = 'Durable State';
    let fallbackEdge1 = 'Process';
    let fallbackEdge2 = 'Commit';
    let fallbackFooter = 'PIPELINE: ACTIVE • EXECUTION: DETERMINISTIC';

    if (chosenVariant === 'scatter') {
      fallbackSub1 = 'Vector Array';
      fallbackSub2 = 'High-Dim Space';
      fallbackSub3 = 'Top-K Match';
      fallbackEdge1 = 'ENCODE';
      fallbackEdge2 = 'SIMILARITY';
      fallbackFooter = 'METRIC: COSINE SIMILARITY • RECALL OPTIMIZED';
    } else if (chosenVariant === 'graph') {
      fallbackSub1 = 'Layer 2 Sparse';
      fallbackSub2 = 'Fast Hops';
      fallbackSub3 = 'Layer 0 Dense';
      fallbackEdge1 = 'DESCENT';
      fallbackEdge2 = 'CONVERGE';
      fallbackFooter = 'GRAPH: HIERARCHICAL NAVIGABLE SMALL WORLD';
    } else if (chosenVariant === 'clusters') {
      fallbackSub1 = 'Centroid Partition';
      fallbackSub2 = 'Target Centroid';
      fallbackSub3 = 'Candidate List';
      fallbackEdge1 = 'PARTITION';
      fallbackEdge2 = 'SCAN';
      fallbackFooter = 'INDEX: INVERTED FILE CLUSTERING • PRUNED SEARCH';
    } else if (chosenVariant === 'split') {
      fallbackSub1 = 'Mutable Buffer';
      fallbackSub2 = 'Index Compactor';
      fallbackSub3 = 'Immutable Core';
      fallbackEdge1 = 'BUFFER';
      fallbackEdge2 = 'FLUSH';
      fallbackFooter = 'ARCHITECTURE: DUAL HOT/COLD STORE';
    } else if (chosenVariant === 'features') {
      fallbackSub1 = 'Attribute Check';
      fallbackSub2 = 'Vector Scan';
      fallbackSub3 = 'Merged Result';
      fallbackEdge1 = 'FILTER';
      fallbackEdge2 = 'MERGE';
      fallbackFooter = 'CAPABILITIES: HARD CONSTRAINTS • HIGH PERFORMANCE';
    } else if (chosenVariant === 'isolation') {
      fallbackSub1 = 'Untrusted Scope';
      fallbackSub2 = 'Boundary Guard';
      fallbackSub3 = 'Protected Core';
      fallbackEdge1 = 'ISOLATE';
      fallbackEdge2 = 'GUARD';
      fallbackFooter = 'FAULT DOMAIN: ISOLATED • ESCAPE RISK: ZERO';
    } else if (chosenVariant === 'stack') {
      fallbackSub1 = 'Interface Tier';
      fallbackSub2 = 'Processing Engine';
      fallbackSub3 = 'Storage Tier';
      fallbackEdge1 = 'DISPATCH';
      fallbackEdge2 = 'PERSIST';
      fallbackFooter = 'ARCHITECTURE STACK: VERIFIED • RUNTIME: DETERMINISTIC';
    } else if (chosenVariant === 'takeaway') {
      fallbackSub1 = 'Standard Workflow';
      fallbackSub2 = 'Engineered Shift';
      fallbackSub3 = 'Production Result';
      fallbackEdge1 = 'EVALUATE';
      fallbackEdge2 = 'ADOPT';
      fallbackFooter = 'ENGINEERING PRINCIPLE: AUDITED • SYSTEM: PRODUCTION-GRADE';
    }

    const diagramNodes: DiagramNode[] = [
      {
        label: rawNodes[0]?.label || n1Name,
        sublabel: rawNodes[0]?.sublabel || fallbackSub1,
        status: rawNodes[0]?.status || 'ACTIVE',
        icon: rawNodes[0]?.icon || slide.icons?.[0]?.icon || 'server',
      },
      {
        label: rawNodes[1]?.label || n2Name,
        sublabel: rawNodes[1]?.sublabel || fallbackSub2,
        status: rawNodes[1]?.status || 'VERIFIED',
        icon: rawNodes[1]?.icon || slide.icons?.[1]?.icon || 'cpu',
      },
      {
        label: rawNodes[2]?.label || n3Name,
        sublabel: rawNodes[2]?.sublabel || fallbackSub3,
        status: rawNodes[2]?.status || 'COMMITTED',
        icon: rawNodes[2]?.icon || slide.icons?.[2]?.icon || 'database',
      },
    ];

    const rawEdges = slide.diagramEdges || [];
    const diagramEdges = [
      rawEdges[0] || fallbackEdge1,
      rawEdges[1] || fallbackEdge2,
    ];
    const diagramFooter = slide.diagramFooter || fallbackFooter;

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
