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
      if (!updated.codeFileName) {
        const isSql = /sql|query|table|postgres|db/i.test(`${title} ${body}`);
        const isBash = /deploy|curl|install|docker|cli/i.test(`${title} ${body}`);
        updated.codeFileName = isSql ? 'query.sql' : isBash ? 'deploy.sh' : 'engine.rs';
        updated.codeLanguage = isSql ? 'sql' : isBash ? 'bash' : 'rust';
      }
      if (!updated.codeSnippet) {
        if (dNodes.length >= 2) {
          const n0 = dNodes[0]?.label || 'Client';
          const n1 = dNodes[1]?.label || 'Engine';
          const sub1 = dNodes[1]?.sublabel || 'Active';
          updated.codeSnippet = `$ exec --target=${n0.toLowerCase().replace(/[^a-z0-9]/g, '_')}\n> Initializing ${n1}...\n+ ${sub1}\n✔ Execution verified · 0 disk stalls`;
        } else {
          updated.codeSnippet = `$ psql -h localhost -U postgres\n> EXPLAIN ANALYZE SELECT * FROM users;\n+ B-Tree Index Scan using idx_users_id\n✔ Execution time: 0.12ms`;
        }
      }
      break;
    }

    case 'compare': {
      if (!updated.compareLeftTitle) {
        updated.compareLeftTitle = 'LEGACY BOTTLENECK';
      }
      if (!updated.compareLeftBody) {
        updated.compareLeftBody = '• Full table sequential scans\n• High disk I/O wait & drift\n• Stalls active pipeline';
      }
      if (!updated.compareRightTitle) {
        updated.compareRightTitle = 'MODERN ARCHITECTURE';
      }
      if (!updated.compareRightBody) {
        if (dNodes.length >= 2) {
          updated.compareRightBody = dNodes.slice(0, 3).map((n) => `• ${n.label}: ${n.sublabel || 'Active'}`).join('\n');
        } else {
          updated.compareRightBody = '• Zero-copy memory architecture\n• Sub-millisecond latency\n• Strict bounded blast radius';
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
        updated.ctaText = 'DM us • رسالة خاصة';
      }
      break;
    }

    case 'row': {
      if (!updated.diagramVariant) {
        updated.diagramVariant = 'topology';
      }
      if (!updated.diagramNodes || updated.diagramNodes.length < 3) {
        updated.diagramNodes = [
          { label: 'Client Ingress', sublabel: 'Port 443 / HTTPS', status: 'CLIENT', icon: 'server' },
          { label: 'Processing Core', sublabel: 'Zero-Copy Engine', status: 'ROUTED', icon: 'cpu' },
          { label: 'Storage Target', sublabel: 'State Committed', status: 'COMMITTED', icon: 'database' },
        ];
        updated.diagramEdges = ['DISPATCH', 'SYNC'];
        updated.diagramFooter = 'LATENCY: P99 < 1.0ms • SYSTEM: ONLINE';
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
