import { SlideData, SlideType } from '../types';
import { ICONS_REGISTRY } from './icons';

export interface ArchetypeRecommendation {
  recommendedType: SlideType;
  confidence: number; // 0-100
  reason: string;
  badge: string;
  autoData: Partial<SlideData>;
}

export interface DetectedIcon {
  icon: string;
  label: string;
  score: number;
}

const ICON_AFFINITY_MAP: Record<string, { label: string; keywords: string[] }> = {
  zap: { label: 'Speed / Latency', keywords: ['speed', 'latency', 'faster', 'p99', 'fast', 'quick', 'boost', 'ms', 'instant', 'throttle'] },
  gauge: { label: 'Benchmark', keywords: ['benchmark', 'rps', 'requests', 'scale', 'load', 'metric', 'rate', 'performance', 'throughput'] },
  activity: { label: 'Telemetry', keywords: ['health', 'pulse', 'monitor', 'uptime', 'sla', 'status', 'telemetry', 'realtime'] },
  database: { label: 'Database', keywords: ['sql', 'postgres', 'clickhouse', 'database', 'table', 'store', 'storage', 'data', 'redis', 'db'] },
  hardDrive: { label: 'Memory / Disk', keywords: ['disk', 'ssd', 'memory', 'ram', 'io', 'iops', 'cache', 'nvme', 'filesystem', 'heap'] },
  server: { label: 'Cluster Node', keywords: ['server', 'node', 'cluster', 'backend', 'instance', 'bare-metal', 'datacenter'] },
  cloud: { label: 'Cloud Infra', keywords: ['cloud', 'aws', 'gcp', 'azure', 'serverless', 'lambda', 's3', 'vpc'] },
  box: { label: 'Container', keywords: ['docker', 'container', 'pod', 'kubernetes', 'k8s', 'image', 'microservice', 'helm'] },
  layers: { label: 'Architecture', keywords: ['architecture', 'stack', 'layer', 'monolith', 'infrastructure', 'foundation'] },
  network: { label: 'Network Mesh', keywords: ['network', 'mesh', 'traffic', 'http', 'grpc', 'tcp', 'proxy', 'dns', 'gateway', 'ip'] },
  shieldAlert: { label: 'Exploit / Threat', keywords: ['cve', 'exploit', 'vulnerability', 'attack', 'zero-day', 'hacker', 'breach', 'ransomware', 'threat'] },
  lock: { label: 'Security / Auth', keywords: ['security', 'auth', 'oauth', 'token', 'jwt', 'encrypt', 'tls', 'ssl', 'cert'] },
  key: { label: 'Credentials', keywords: ['key', 'secret', 'credentials', 'vault', 'api-key'] },
  bug: { label: 'Bug / Crash', keywords: ['bug', 'defect', 'crash', 'panic', 'flaw', 'fix', 'patch', 'error'] },
  eyeRisk: { label: 'Audit / Scan', keywords: ['audit', 'risk', 'inspect', 'scan', 'sast', 'dast', 'trivy', 'leak'] },
  gitMerge: { label: 'Git / VCS', keywords: ['merge', 'pull-request', 'pr', 'branch', 'git', 'vcs', 'trunk', 'changeset', 'commit'] },
  terminal: { label: 'CLI / Shell', keywords: ['terminal', 'cli', 'bash', 'shell', 'command', 'exec', 'sh', 'linux', 'kernel'] },
  binary: { label: 'Binary Code', keywords: ['binary', 'elf', 'pe', 'assembly', 'asm', 'ghidra', 'ida', 'disassembly', 'hex'] },
  cpu: { label: 'Compute Engine', keywords: ['cpu', 'processor', 'core', 'thread', 'hardware', 'chip', 'instruction', 'kernel', 'ebpf'] },
  brain: { label: 'AI Model / LLM', keywords: ['ai', 'agent', 'llm', 'gpt', 'model', 'neural', 'transformer', 'deep learning', 'weights'] },
  robot: { label: 'Agent / Automation', keywords: ['bot', 'automation', 'crawler', 'agentic', 'copilot'] },
  lightbulb: { label: 'Rule / Lesson', keywords: ['idea', 'tip', 'lesson', 'rule', 'learn', 'pattern', 'insight', 'principle'] },
  scales: { label: 'Trade-off', keywords: ['tradeoff', 'trade-off', 'balance', 'vs', 'compare', 'contrast', 'cost', 'catch'] },
  alertCircle: { label: 'Caveat / Catch', keywords: ['catch', 'warning', 'drawback', 'overhead', 'complexity', 'limit', 'downside'] },
  arrowRightLeft: { label: 'Migration', keywords: ['migration', 'transition', 'sync', 'transfer', 'switch', 'cutover'] },
};

/**
 * Scan text and return ranked relevant icons from ICONS_REGISTRY.
 */
export function detectRelevantIcons(text: string, count = 5): DetectedIcon[] {
  const lower = (text || '').toLowerCase();
  const results: DetectedIcon[] = [];

  for (const [iconKey, def] of Object.entries(ICON_AFFINITY_MAP)) {
    let score = 0;
    for (const kw of def.keywords) {
      if (lower.includes(kw)) {
        score += kw.length > 4 ? 3 : 2;
      }
    }
    if (score > 0 && ICONS_REGISTRY[iconKey]) {
      results.push({
        icon: iconKey,
        label: def.label,
        score,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    return [
      { icon: 'cpu', label: 'Processing', score: 1 },
      { icon: 'server', label: 'Cluster', score: 1 },
      { icon: 'gauge', label: 'Benchmark', score: 1 },
      { icon: 'zap', label: 'Speed', score: 1 },
      { icon: 'shieldAlert', label: 'Security', score: 1 },
    ];
  }

  return results.slice(0, count);
}

/**
 * Extract numbers, metric multipliers, or performance percentages from text.
 */
export function extractMetricsFromText(text: string): { value?: string; diff?: string } {
  const clean = text || '';
  // Match patterns like "200x", "10x", "99.9%", "0ms", "12ms", "100GB", "25M", "50%"
  const match = clean.match(/\b(\d+(?:\.\d+)?\s*(?:x|%|ms|s|gb|mb|tb|k|m|b|rps))\b/i);
  if (match) {
    const val = match[1].replace(/\s+/g, '');
    return {
      value: val,
      diff: `▲ ${val} performance multiplier`,
    };
  }
  return {};
}

/**
 * Smart Archetype Detection Engine.
 * Recommends the optimal archetype based on content semantics and narrative arc position.
 */
export function detectBestArchetype(
  slide: SlideData,
  slideIndex: number,
  totalSlides: number
): ArchetypeRecommendation {
  const text = `${slide.enTitle || ''} ${slide.enBody || ''} ${slide.arTitle || ''} ${slide.arBody || ''}`.toLowerCase();

  // 1. Position rules (Spec §7)
  if (slideIndex === 0) {
    return {
      recommendedType: 'hub',
      confidence: 96,
      reason: 'Slide 1 is the primary Hook & Hub cover per Spec §7.',
      badge: 'Cover Hook',
      autoData: {
        centerIcon: slide.centerIcon || 'cpu',
        satIcons: slide.satIcons?.length === 6 ? slide.satIcons : ['database', 'server', 'gitMerge', 'changesets', 'robot', 'gauge'],
      },
    };
  }

  if (slideIndex === totalSlides - 1 && totalSlides >= 4) {
    return {
      recommendedType: 'cta',
      confidence: 95,
      reason: 'Final slide closes with creator watermark, website, and DM discussion.',
      badge: 'Closing CTA',
      autoData: {
        ctaText: slide.ctaText || 'DM us  •  رسالة خاصة',
      },
    };
  }

  // 2. Metric detection (Numbers, percentages, latencies)
  const metric = extractMetricsFromText(text);
  if (
    metric.value ||
    text.includes('speedup') ||
    text.includes('p99') ||
    text.includes('latency') ||
    text.includes('throughput') ||
    text.includes('multiplier') ||
    text.includes('benchmark')
  ) {
    const val = metric.value || '10x';
    return {
      recommendedType: 'metric',
      confidence: 92,
      reason: `Detected measurable production metric (${val}).`,
      badge: 'Metric Win',
      autoData: {
        metricValue: slide.metricValue || val,
        metricLabel: slide.metricLabel || 'PRODUCTION MULTIPLIER',
        metricDiff: slide.metricDiff || metric.diff || `▲ ${val} vs legacy baseline`,
        metricIcon: slide.metricIcon || (val.includes('ms') ? 'zap' : 'gauge'),
      },
    };
  }

  // 3. Contrast / Comparison detection
  if (
    text.includes(' vs ') ||
    text.includes('versus') ||
    text.includes('legacy') ||
    text.includes('monolith') ||
    text.includes('old way') ||
    text.includes('compared to') ||
    text.includes('before and after') ||
    text.includes('bottleneck')
  ) {
    return {
      recommendedType: 'compare',
      confidence: 88,
      reason: 'Detected architectural contrast (Legacy Bottleneck vs Modern Stack).',
      badge: 'Comparison',
      autoData: {
        compareLeftTitle: slide.compareLeftTitle || 'Legacy Monolith',
        compareLeftBody: slide.compareLeftBody || '• High memory footprint\n• Latency spikes under load\n• Slow CI lockups',
        compareRightTitle: slide.compareRightTitle || 'Modern Engine',
        compareRightBody: slide.compareRightBody || '• Decoupled state authority\n• Sub-millisecond p99\n• Linear horizontal scaling',
      },
    };
  }

  // 4. Code / Command detection
  if (
    text.includes('$') ||
    text.includes('bash') ||
    text.includes('curl') ||
    text.includes('sh') ||
    text.includes('syntax') ||
    text.includes('command') ||
    text.includes('kubectl') ||
    text.includes('docker') ||
    text.includes('cli')
  ) {
    return {
      recommendedType: 'code',
      confidence: 86,
      reason: 'Detected terminal commands or code execution pattern.',
      badge: 'Code Diff',
      autoData: {
        codeFileName: slide.codeFileName || 'sys_exec.sh',
        codeLanguage: slide.codeLanguage || 'bash',
        codeSnippet:
          slide.codeSnippet ||
          `$ ./engine --mode=distributed\n> Initializing decoupled nodes...\n+ Latency dropped to sub-10ms\n✔ Verified 0 context switches`,
      },
    };
  }

  // 5. Step / Sequence detection
  if (
    text.includes('step') ||
    text.includes('phase') ||
    text.includes('how to') ||
    text.includes('part') ||
    text.includes('stage') ||
    text.includes('guide')
  ) {
    const num = String(slideIndex + 1).padStart(2, '0');
    return {
      recommendedType: 'number',
      confidence: 85,
      reason: `Detected numbered sequence or tutorial progression (Step ${num}).`,
      badge: 'Numbered Step',
      autoData: {
        stepNumber: slide.stepNumber || num,
        stepLabel: slide.stepLabel || `STEP ${num}`,
      },
    };
  }

  // 6. The Catch / Trade-off detection (Spec §7)
  if (
    text.includes('catch') ||
    text.includes('tradeoff') ||
    text.includes('trade-off') ||
    text.includes('drawback') ||
    text.includes('overhead') ||
    text.includes('warning') ||
    text.includes('caveat') ||
    text.includes('before you switch')
  ) {
    return {
      recommendedType: 'row',
      confidence: 89,
      reason: 'Detected authentic trade-off / The Catch (Spec §7).',
      badge: 'The Catch',
      autoData: {
        icons: [
          { icon: 'alertCircle', label: 'The Catch' },
          { icon: 'scales', label: 'Trade-off' },
        ],
      },
    };
  }

  // 7. Default to Row archetype
  const detectedIcons = detectRelevantIcons(text, 2);
  return {
    recommendedType: 'row',
    confidence: 78,
    reason: 'Multi-icon architectural mechanism layout.',
    badge: 'Icon Row',
    autoData: {
      icons: slide.icons?.length
        ? slide.icons
        : detectedIcons.map((d) => ({ icon: d.icon, label: d.label })),
    },
  };
}

/**
 * Intelligently initializes archetype fields when changing archetypes,
 * ensuring no blank fields are left.
 */
export function smartPopulateArchetype(
  currentSlide: SlideData,
  targetType: SlideType,
  slideIndex: number
): SlideData {
  const text = `${currentSlide.enTitle || ''} ${currentSlide.enBody || ''}`;
  const copy: SlideData = { ...currentSlide, type: targetType };

  switch (targetType) {
    case 'number':
      copy.stepNumber = copy.stepNumber || String(slideIndex + 1).padStart(2, '0');
      copy.stepLabel = copy.stepLabel || `STEP ${copy.stepNumber}`;
      break;

    case 'metric': {
      const metric = extractMetricsFromText(text);
      copy.metricValue = copy.metricValue || metric.value || '10x';
      copy.metricLabel = copy.metricLabel || 'PRODUCTION MULTIPLIER';
      copy.metricDiff = copy.metricDiff || metric.diff || '▲ Measurable performance gain';
      copy.metricIcon = copy.metricIcon || (copy.metricValue.includes('ms') ? 'zap' : 'gauge');
      break;
    }

    case 'compare':
      copy.compareLeftTitle = copy.compareLeftTitle || 'Legacy Bottleneck';
      copy.compareLeftBody = copy.compareLeftBody || '• High memory footprint\n• Single-thread lockups\n• High p99 tail latency';
      copy.compareRightTitle = copy.compareRightTitle || 'Modern Engine';
      copy.compareRightBody = copy.compareRightBody || '• Zero-allocation parsing\n• Lock-free parallel pipelines\n• Steady microsecond p99';
      break;

    case 'code':
      copy.codeFileName = copy.codeFileName || 'sys_exec.sh';
      copy.codeLanguage = copy.codeLanguage || 'bash';
      copy.codeSnippet =
        copy.codeSnippet ||
        `$ ./engine --mode=distributed\n> Initializing decoupled nodes...\n+ Latency dropped to sub-10ms\n✔ Verified 0 context switches`;
      break;

    case 'hub':
      copy.centerIcon = copy.centerIcon || 'cpu';
      copy.satIcons = copy.satIcons?.length === 6 ? copy.satIcons : ['database', 'server', 'gitMerge', 'changesets', 'robot', 'gauge'];
      break;

    case 'row':
      if (!copy.icons || copy.icons.length === 0) {
        const topIcons = detectRelevantIcons(text, 2);
        copy.icons = topIcons.map((i) => ({ icon: i.icon, label: i.label }));
      }
      break;

    case 'cta':
      copy.ctaText = copy.ctaText || 'DM us  •  رسالة خاصة';
      break;
  }

  return copy;
}

/**
 * Formats headline to meet Spec §8: complete 2 to 5 word thought ending in a period or question mark.
 */
export function autoPolishHeadline(title: string): string {
  if (!title) return '';
  let clean = title.trim().replace(/\s+/g, ' ');
  // If ending with punctuation, preserve; otherwise add period
  if (!/[.?!:]$/.test(clean)) {
    clean += '.';
  }
  return clean;
}

/**
 * Trims text to fit within character limits without breaking words.
 */
export function autoFitTextToLimits(text: string, limit: number): string {
  if (!text || text.length <= limit) return text;
  const words = text.trim().split(/\s+/);
  let res = '';
  for (const w of words) {
    if ((res + ' ' + w).trim().length > limit - 1) break;
    res = (res + ' ' + w).trim();
  }
  if (!/[.?!]$/.test(res)) {
    res += '.';
  }
  return res;
}

/**
 * Fixes Arabic line ending punctuation jump bug (Spec §8).
 * Ensures the line ends with an Arabic word or properly orders punctuation.
 */
export function fixArabicPunctuation(arabicText: string): string {
  if (!arabicText) return '';
  let text = arabicText.trim();

  // Pattern: Latin token followed by dot/punctuation at the end of the line
  const regex = /([a-zA-Z0-9_-]+)\s*([.?!])$/;
  if (regex.test(text)) {
    // Rephrase to end with an Arabic word like "المعتمد."
    text = text.replace(regex, '$1 المعتمد$2');
  }

  return text;
}

/**
 * Technical Arabic Terminology Dictionary for instant bilingual assistance.
 */
const TECH_TERMS_DICTIONARY: Record<string, string> = {
  monorepo: 'المستودع الأحادي الضخم',
  git: 'نظام Git',
  'ci/cd': 'خطوط الدمج والنشر المستمر',
  concurrency: 'المعالجة التزامنية العالية',
  latency: 'زمن الاستجابة',
  'p99 latency': 'زمن استجابة p99',
  throughput: 'معدل تدفق العمليات',
  benchmark: 'معايير قياس الأداء',
  database: 'قواعد البيانات',
  cache: 'الذاكرة المؤقتة',
  storage: 'بنية التخزين',
  memory: 'استهلاك الذاكرة',
  architecture: 'البنية المعمارية',
  infrastructure: 'البنية التحتية',
  security: 'الأمان السيبراني',
  vulnerability: 'ثغرة أمنية',
  exploit: 'مسار الاستغلال البرمجي',
  patch: 'الترقيع الأمني',
  decoupled: 'البنية المفصولة',
  cluster: 'عناقيد الخوادم',
  agent: 'الوكلاء البرمجيون',
  'ai model': 'نماذج الذكاء الاصطناعي',
  inference: 'معالجة الاستدلال',
  kernel: 'نواة النظام',
  ebpf: 'تقنية eBPF',
};

/**
 * Smart bilingual translation and phrase enhancer for technical slide copy.
 */
export function suggestArabicTranslation(enTitle: string, enBody: string): { arTitle: string; arBody: string } {
  let arTitle = 'تحليل معماري دقيق وموثق.';
  let arBody = 'إعادة بناء المنظومة الهندسية لتحقيق أقصى درجات الكفاءة والاستقرار التشغيلي.';

  const combined = `${enTitle} ${enBody}`.toLowerCase();

  if (combined.includes('git') || combined.includes('monorepo') || combined.includes('scion')) {
    arTitle = 'التحول المعماري لما بعد Git.';
    arBody = 'الانتقال إلى أنظمة ملفات افتراضية تنهي بطء المستودعات الضخمة وتسرع خطوط المعالجة.';
  } else if (combined.includes('ebpf') || combined.includes('kernel') || combined.includes('linux')) {
    arTitle = 'برمجة نواة النظام عبر eBPF.';
    arBody = 'تنفيذ الشيفرات بأمان فائق داخل النواة دون تبديل سياق أو تعديل الشيفرة المصدرية.';
  } else if (combined.includes('exploit') || combined.includes('cve') || combined.includes('security')) {
    arTitle = 'تشريح الثغرة وآلية الحماية.';
    arBody = 'تحديد مسار الاستغلال الفعلي وعزل بيئات التشغيل لمنع التسلل والسيطرة على البيانات.';
  } else if (combined.includes('benchmark') || combined.includes('speed') || combined.includes('p99')) {
    arTitle = 'قفزة ملحوظة في معايير الأداء.';
    arBody = 'تقليص زمن الاستجابة وخفض استهلاك الموارد بنسب قياسية مثبتة في بيئات الإنتاج.';
  } else if (combined.includes('catch') || combined.includes('trade-off') || combined.includes('before you switch')) {
    arTitle = 'ما يجب معرفته قبل اتخاذ القرار.';
    arBody = 'الأنظمة المتقدمة تفرض تكاليف تشغيلية؛ تأكد من جاهزية الفريق والبنية التحتية قبل الانتقال.';
  }

  return { arTitle, arBody };
}

export type NarrativeRole = 'hook' | 'stakes' | 'step' | 'code' | 'compare' | 'catch' | 'rule' | 'cta';

/**
 * 1-Click Narrative Arc Preset Applicator (Spec §7).
 */
export function applyNarrativePreset(
  role: NarrativeRole,
  slideIndex: number,
  category = 'SYSTEMS'
): Partial<SlideData> {
  switch (role) {
    case 'hook':
      return {
        type: 'hub',
        centerIcon: 'cpu',
        satIcons: ['database', 'server', 'gitMerge', 'changesets', 'robot', 'gauge'],
        enTitle: `${category}:\nThe Paradigm Shift.`,
        arTitle: `${category}:\nالنقلة النوعية الجديدة.`,
        enBody: 'A technical deep-dive into internal architecture, real-world benchmarks, and mechanisms.',
        arBody: 'تحليل هندسي عميق للبنية الداخلية ومعايير الأداء والدروس التشغيلية.',
      };

    case 'stakes':
      return {
        type: 'metric',
        metricValue: '10x',
        metricLabel: 'PERFORMANCE MULTIPLIER',
        metricDiff: '▲ Measurable production speedup',
        metricIcon: 'zap',
        enTitle: 'Where legacy approaches failed.',
        arTitle: 'أين تتوقف الأنظمة التقليدية؟',
        enBody: 'Legacy architectures hit hard memory and latency ceilings under high-concurrency traffic.',
        arBody: 'الأنظمة السابقة وصلت إلى أقصى حدود المعالجة والذاكرة مع تزايد العمليات التزامنية.',
      };

    case 'compare':
      return {
        type: 'compare',
        compareLeftTitle: 'Legacy Bottleneck',
        compareLeftBody: '• Monolithic coupling\n• RAM allocation spikes\n• Tail latency lockups',
        compareRightTitle: 'Modern Engine',
        compareRightBody: '• Decoupled state authority\n• Microsecond response times\n• Horizontal elasticity',
        enTitle: 'Architectural contrast.',
        arTitle: 'مقارنة معمارية الأنظمة.',
        enBody: 'Moving from heavyweight monolithic assumptions to a lean, decoupled execution model.',
        arBody: 'التحول من المعالجة الثقيلة المقيدة إلى بنية موزعة وخفيفة على الذاكرة.',
      };

    case 'code':
      return {
        type: 'code',
        codeFileName: 'sys_exec.sh',
        codeLanguage: 'bash',
        codeSnippet: `$ ./engine --mode=distributed\n> Initializing decoupled nodes...\n+ Latency dropped to sub-10ms\n✔ Verified 0 context switches`,
        enTitle: 'The core mechanism in code.',
        arTitle: 'آلية التنفيذ عبر الشيفرة.',
        enBody: 'Inspecting the exact cutover commands and configuration flags powering this shift.',
        arBody: 'فحص أوامر التنفيذ وأهم المعاملات البرمجية التي تقود هذا التحول المعماري.',
      };

    case 'step': {
      const num = String(slideIndex + 1).padStart(2, '0');
      return {
        type: 'number',
        stepNumber: num,
        stepLabel: `PHASE ${num}`,
        enTitle: `Step ${num}: Decouple state authority.`,
        arTitle: `الخطوة ${num}: فصل إدارة الحالة.`,
        enBody: 'Offloading state verification to authoritative clusters keeps local developer hardware fast.',
        arBody: 'تفويض إدارة الحالة إلى خوادم مخصصة يمنع التجمد ويضمن سلاسة العمل.',
      };
    }

    case 'catch':
      return {
        type: 'row',
        icons: [
          { icon: 'alertCircle', label: 'The Catch' },
          { icon: 'scales', label: 'Overhead' },
        ],
        enTitle: 'The Catch: Before you switch.',
        arTitle: 'ما يجب معرفته قبل اتخاذ القرار.',
        enBody: 'Advanced architectures trade code simplicity for operational complexity. Only adopt when bottlenecks hurt production.',
        arBody: 'الأنظمة المتقدمة تستبدل بساطة الكود بتعقيد المراقبة؛ لا تطبقها إلا عند الحاجة الفعلية.',
      };

    case 'rule':
      return {
        type: 'row',
        icons: [{ icon: 'lightbulb', label: 'SRE Rule' }],
        enTitle: 'Profile p99 continuously.',
        arTitle: 'قاعدة مهندسي الاعتمادية SRE.',
        enBody: 'Never optimize based on averages. Track 99th percentile response times and memory allocations.',
        arBody: 'لا تقيس الأداء بالمتوسطات؛ تتبع أبطأ 1% من الطلبات واستنزاف الذاكرة بشكل مستمر.',
      };

    case 'cta':
      return {
        type: 'cta',
        enTitle: 'Building large-scale systems?',
        arTitle: 'تبني أنظمة برمجية ضخمة؟',
        enBody: 'Join the conversation and discuss technical architecture and engineering patterns.',
        arBody: 'تواصل معنا لمناقشة التفاصيل الهندسية وأفضل الممارسات البرمجية.',
        ctaText: 'DM us  •  رسالة خاصة',
      };
  }
}
