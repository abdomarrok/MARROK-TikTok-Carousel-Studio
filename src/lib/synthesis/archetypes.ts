import { SlideData, SlideType } from '../../types';

/**
 * Instant Archetype Seeder:
 * When switching slide archetype in AutonomousStudio, seeds missing required fields
 * (e.g. code snippet for terminal, metric number for hero card, left/right titles for compare, etc.)
 * Uses existing enTitle, enBody, and diagramNodes to synthesize cohesive, topic-relevant data.
 */
export function seedSlideArchetypeData(slide: SlideData, targetType: SlideType): SlideData {
  const updated: SlideData = {
    ...slide,
    type: targetType,
  };

  const title = slide.enTitle || '';
  const body = slide.enBody || '';
  const dNodes = slide.diagramNodes || [];

  switch (targetType) {
    case 'metric': {
      let extractedMetric = '';
      const metricMatch = `${title} ${body}`.match(/\b(\d+(?:\.\d+)?(?:x|%|ms|μs|s|GB|MB|TB|req\/s|rps)?)\b/i);
      if (metricMatch && metricMatch[1] && /\d/.test(metricMatch[1])) {
        extractedMetric = metricMatch[1];
        if (/^\d+$/.test(extractedMetric) && Number(extractedMetric) <= 100) {
          extractedMetric = `${extractedMetric}x`;
        }
      }
      if (!updated.metricValue) {
        updated.metricValue = extractedMetric || '10x';
      }
      if (!updated.metricLabel) {
        updated.metricLabel = dNodes[0]?.label ? `${dNodes[0].label} Multiplier`.toUpperCase() : 'PERFORMANCE MULTIPLIER';
      }
      if (!updated.metricDiff) {
        updated.metricDiff = dNodes[0]?.sublabel ? `▲ ${dNodes[0].sublabel}` : '▲ 94% faster vs baseline';
      }
      if (!updated.metricIcon) {
        updated.metricIcon = dNodes[0]?.icon || 'zap';
      }
      break;
    }

    case 'code': {
      const text = `${title} ${body}`.toLowerCase();
      if (!updated.codeFileName) {
        const isPgVector = /vector|pgvector|cosine|embedding|similarity|<=>/.test(text);
        const isSql = isPgVector || /sql|query|table|postgres|db/i.test(text);
        const isBash = /deploy|curl|install|docker|cli/i.test(text);
        updated.codeFileName = isPgVector ? 'pgvector_example.sql' : isSql ? 'query.sql' : isBash ? 'deploy.sh' : 'engine.rs';
        updated.codeLanguage = isSql ? 'sql' : isBash ? 'bash' : 'rust';
      }
      if (!updated.codeSnippet) {
        if (/vector|pgvector|cosine|embedding|similarity|<=>/.test(text)) {
          updated.codeSnippet = `-- Semantic similarity query with pgvector\nSELECT id, title, 1 - (embedding <=> $query) AS score\nFROM documents\nWHERE status = 'active'\nORDER BY embedding <=> $query LIMIT 5;`;
        } else if (dNodes.length >= 2) {
          const n0 = dNodes[0]?.label || 'Client';
          const n1 = dNodes[1]?.label || 'Engine';
          const sub1 = dNodes[1]?.sublabel || 'Active';
          updated.codeSnippet = `$ exec --target=${n0.toLowerCase().replace(/[^a-z0-9]/g, '_')}\n> Initializing ${n1}...\n+ ${sub1}\n✔ Execution verified`;
        } else {
          updated.codeSnippet = `$ psql -h localhost -U postgres\n> EXPLAIN ANALYZE SELECT * FROM users;\n+ B-Tree Index Scan using idx_users_id\n✔ Execution verified`;
        }
      }
      break;
    }

    case 'compare': {
      if (!updated.compareLeftTitle) {
        updated.compareLeftTitle = 'STANDARD / BASELINE';
      }
      if (!updated.compareLeftBody) {
        updated.compareLeftBody = '• Exact keyword lookups only\n• High indexing overhead for changes\n• Limited semantic awareness';
      }
      if (!updated.compareRightTitle) {
        updated.compareRightTitle = 'OPTIMIZED APPROACH';
      }
      if (!updated.compareRightBody) {
        if (dNodes.length >= 2) {
          updated.compareRightBody = dNodes.slice(0, 3).map((n) => `• ${n.label}: ${n.sublabel || 'Active'}`).join('\n');
        } else {
          updated.compareRightBody = '• Approximate Nearest Neighbors (ANN)\n• Fast vector index traversal\n• Tuned recall vs latency trade-off';
        }
      }
      break;
    }

    case 'hub': {
      if (!updated.satLabels || updated.satLabels.length < 2) {
        const seeds: string[] = [];
        if (dNodes.length > 0) {
          dNodes.forEach((n) => {
            if (n.label) seeds.push(n.label.toUpperCase().slice(0, 16));
          });
        }
        const titleWords = title
          .replace(/[^A-Za-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length >= 4)
          .map((w) => w.toUpperCase());
        seeds.push(...titleWords);
        const fallbacks = ['INGRESS', 'RUNTIME', 'EXECUTION', 'STORAGE', 'TELEMETRY', 'CORE API'];
        for (const fb of fallbacks) {
          if (seeds.length >= 6) break;
          if (!seeds.includes(fb)) seeds.push(fb);
        }
        updated.satLabels = seeds.slice(0, 6);
      }
      if (!updated.centerIcon) {
        updated.centerIcon = dNodes[0]?.icon || 'cpu';
      }
      break;
    }

    case 'cta': {
      if (!updated.ctaText) {
        updated.ctaText = 'Join Discussion • شارك برأيك';
      }
      break;
    }

    case 'row': {
      const text = `${title} ${body}`.toLowerCase();
      if (!updated.diagramVariant) {
        if (/vector|embedding|cosine|similarity|ann\b|metric|high-dimensional/.test(text)) {
          updated.diagramVariant = 'scatter';
        } else if (/hnsw|skip[- ]?list|graph|hierarchy|layer|hops/.test(text)) {
          updated.diagramVariant = 'graph';
        } else if (/ivf|cluster|k-means|centroid|partition|inverted/.test(text)) {
          updated.diagramVariant = 'clusters';
        } else if (/write|hot|cold|buffer|lsm|compaction|consistency|store/.test(text)) {
          updated.diagramVariant = 'split';
        } else if (/isolation|blast|firewall|boundary|sandbox/.test(text)) {
          updated.diagramVariant = 'isolation';
        } else if (/stack|tier|kernel|hardware|runtime/.test(text)) {
          updated.diagramVariant = 'stack';
        } else if (/takeaway|summary|rule|axiom|conclusion/.test(text)) {
          updated.diagramVariant = 'takeaway';
        } else if (/feature|benefit|aspect|module/.test(text)) {
          updated.diagramVariant = 'features';
        } else {
          updated.diagramVariant = 'topology';
        }
      }

      if (!updated.diagramNodes || updated.diagramNodes.length < 3) {
        if (/vector|embedding|semantic|cosine|similarity|ann\b/.test(text)) {
          updated.diagramNodes = [
            { label: 'Embedding Model', sublabel: 'Dense Float Vector Array', status: 'ENCODED', icon: 'cpu' },
            { label: 'Vector Index', sublabel: 'High-Dimensional Space', status: 'INDEXED', icon: 'database' },
            { label: 'Cosine Search', sublabel: 'Nearest Neighbor Top-K', status: 'MATCHED', icon: 'search' },
          ];
          updated.diagramEdges = ['ENCODE', 'SIMILARITY'];
          updated.diagramFooter = 'METRIC: COSINE SIMILARITY • RECALL OPTIMIZED';
        } else if (/hnsw|skip[- ]?list|graph|hierarchy|layer/.test(text)) {
          updated.diagramNodes = [
            { label: 'Entry Node', sublabel: 'Top Sparse Layer 2', status: 'ENTRY', icon: 'network' },
            { label: 'Skip Traversal', sublabel: 'Fast Long-Range Hops', status: 'ROUTED', icon: 'layers' },
            { label: 'Target Neighbor', sublabel: 'Dense Base Layer 0', status: 'CONVERGED', icon: 'checkCircle' },
          ];
          updated.diagramEdges = ['DESCENT', 'CONVERGE'];
          updated.diagramFooter = 'GRAPH: HIERARCHICAL NAVIGABLE SMALL WORLD';
        } else if (/ivf|cluster|k-means|centroid|partition/.test(text)) {
          updated.diagramNodes = [
            { label: 'K-Means Centroid', sublabel: 'Space Partition Hub', status: 'PARTITIONED', icon: 'layers' },
            { label: 'Target Cluster', sublabel: 'Shortlisted Candidate Subset', status: 'SELECTED', icon: 'zap' },
            { label: 'Inverted List', sublabel: 'Pruned Candidate Scan', status: 'SCANNED', icon: 'search' },
          ];
          updated.diagramEdges = ['PARTITION', 'SCAN'];
          updated.diagramFooter = 'INDEX: INVERTED FILE CLUSTERING • FAST PRUNING';
        } else if (/write|hot|cold|buffer|lsm|compaction|consistency/.test(text)) {
          updated.diagramNodes = [
            { label: 'Hot Store', sublabel: 'Mutable RAM Write Buffer', status: 'FAST WRITE', icon: 'zap' },
            { label: 'Async Compactor', sublabel: 'Batch Index Flusher', status: 'SYNCING', icon: 'arrowRightLeft' },
            { label: 'Cold Store', sublabel: 'Immutable Vector Index', status: 'PERSISTED', icon: 'database' },
          ];
          updated.diagramEdges = ['BUFFER', 'COMPACT'];
          updated.diagramFooter = 'ARCHITECTURE: DUAL HOT/COLD STORE';
        } else {
          const words = title
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length >= 4 && !/this|that|with|from|what|when|where|which|about|does|system/i.test(w));
          const n1 = words[0] || 'Ingress Input';
          const n2 = words[1] || 'Core Pipeline';
          const n3 = words[2] || 'Target State';
          updated.diagramNodes = [
            { label: n1.charAt(0).toUpperCase() + n1.slice(1), sublabel: 'Stage 01 Flow', status: 'INPUT', icon: 'server' },
            { label: n2.charAt(0).toUpperCase() + n2.slice(1), sublabel: 'Stage 02 Engine', status: 'ROUTED', icon: 'cpu' },
            { label: n3.charAt(0).toUpperCase() + n3.slice(1), sublabel: 'Stage 03 Storage', status: 'COMMITTED', icon: 'database' },
          ];
          updated.diagramEdges = ['PROCESS', 'PERSIST'];
          updated.diagramFooter = 'DATA PIPELINE • END-TO-END FLOW';
        }
      }
      break;
    }

    case 'image': {
      if (!updated.imageFit) {
        updated.imageFit = 'contain';
      }
      break;
    }

    case 'number': {
      if (!updated.stepNumber) {
        updated.stepNumber = '01';
      }
      if (!updated.stepLabel) {
        updated.stepLabel = 'STEP 01';
      }
      break;
    }
  }

  return updated;
}
