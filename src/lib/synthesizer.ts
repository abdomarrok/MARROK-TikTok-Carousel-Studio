import { CarouselData, SlideData, HookVariant, CaptionVariant } from '../types';

interface SynthesisInput {
  prompt?: string;
  imageFileName?: string;
  categoryHint?: string;
  inputMode?: string;
}

interface DomainRule {
  category: string;
  theme: string;
  centerIcon: string;
  satIcons: string[];
  keywords: string[];
  metricFallback: string;
}

const DOMAIN_RULES: DomainRule[] = [
  {
    category: 'LINUX KERNEL & OBSERVABILITY',
    theme: 'emerald',
    centerIcon: 'terminal',
    satIcons: ['cpu', 'lock', 'server', 'gauge', 'binary', 'codeFile'],
    keywords: ['kernel', 'ebpf', 'c/c++', 'assembly', 'xdp', 'bpf', 'linux', 'syscall'],
    metricFallback: '0 context switches',
  },
  {
    category: 'REVERSE ENGINEERING & EXPLOITS',
    theme: 'cyber',
    centerIcon: 'shieldAlert',
    satIcons: ['binary', 'search', 'lock', 'alerts', 'eyeRisk', 'terminal'],
    keywords: ['cve', 'exploit', 'revers', 'binary', 'ghidra', 'ida', 'malware', 'zero-day', 'disassembler'],
    metricFallback: '30 min turnaround',
  },
  {
    category: 'AI MODELS & INFERENCE',
    theme: 'violet',
    centerIcon: 'brain',
    satIcons: ['cpu', 'robot', 'database', 'lightbulb', 'gauge', 'changesets'],
    keywords: ['llm', 'gpt', 'inference', 'token', 'deep learning', 'weights', 'transformer', 'anthropic', 'openai', 'gemini', 'agent'],
    metricFallback: '10x token efficiency',
  },
  {
    category: 'KUBERNETES & CLOUD SEC',
    theme: 'blueprint',
    centerIcon: 'server',
    satIcons: ['lock', 'database', 'shieldAlert', 'gitMerge', 'alerts', 'gauge'],
    keywords: ['kubernetes', 'k8s', 'container', 'cloud', 'docker', 'webhook', 'ingress', 'helm', 'cloud-native'],
    metricFallback: '99.99% uptime',
  },
  {
    category: 'DISTRIBUTED SYSTEMS & STORAGE',
    theme: 'amber',
    centerIcon: 'database',
    satIcons: ['server', 'gitMerge', 'cpu', 'changesets', 'clock', 'scales'],
    keywords: ['consensus', 'raft', 'paxos', 'database', 'distributed', 'kafka', 'replication', 'storage', 'postgres', 'clickhouse'],
    metricFallback: '50x query speedup',
  },
  {
    category: 'VCS & DEVSECOPS',
    theme: 'teal',
    centerIcon: 'gitMerge',
    satIcons: ['server', 'cpu', 'database', 'changesets', 'terminal', 'gauge'],
    keywords: ['git', 'vcs', 'monorepo', 'ci/cd', 'devops', 'scion', 'changeset', 'pull request', 'github'],
    metricFallback: '25M checkouts/day',
  },
  {
    category: 'DEVSECOPS & VULNERABILITY',
    theme: 'cyber',
    centerIcon: 'shieldAlert',
    satIcons: ['funnel', 'alerts', 'eyeRisk', 'search', 'lock', 'terminal'],
    keywords: ['security', 'appsec', 'vulnerability', 'defectdojo', 'sast', 'dast', 'trivy', 'semgrep'],
    metricFallback: '95% noise reduction',
  },
];

const DEFAULT_RULE: DomainRule = {
  category: 'SYSTEMS ARCHITECTURE',
  theme: 'teal',
  centerIcon: 'cpu',
  satIcons: ['database', 'server', 'gitMerge', 'changesets', 'robot', 'gauge'],
  keywords: [],
  metricFallback: '100x scalability',
};

const ICON_AFFINITY: Record<string, string[]> = {
  zap: ['speed', 'latency', 'faster', 'p99', 'fast', 'quick', 'boost', 'ms', 'instant', 'throttle'],
  gauge: ['benchmark', 'rps', 'requests', 'scale', 'load', 'metric', 'rate', 'performance'],
  activity: ['health', 'pulse', 'monitor', 'uptime', 'sla', 'status', 'telemetry', 'realtime'],
  database: ['sql', 'postgres', 'clickhouse', 'database', 'table', 'store', 'storage', 'data', 'redis', 'db'],
  hardDrive: ['disk', 'ssd', 'memory', 'ram', 'io', 'iops', 'cache', 'nvme', 'filesystem', 'heap'],
  server: ['server', 'node', 'cluster', 'backend', 'instance', 'bare-metal', 'datacenter'],
  cloud: ['cloud', 'aws', 'gcp', 'azure', 'serverless', 'lambda', 's3', 'vpc'],
  box: ['docker', 'container', 'pod', 'kubernetes', 'k8s', 'image', 'microservice', 'helm'],
  layers: ['architecture', 'stack', 'layer', 'monolith', 'infrastructure', 'foundation'],
  network: ['network', 'mesh', 'traffic', 'http', 'grpc', 'tcp', 'proxy', 'dns', 'gateway', 'ip'],
  shieldAlert: ['cve', 'exploit', 'vulnerability', 'attack', 'zero-day', 'hacker', 'breach', 'ransomware', 'threat'],
  lock: ['security', 'auth', 'oauth', 'token', 'jwt', 'encrypt', 'tls', 'ssl', 'cert'],
  key: ['key', 'secret', 'credentials', 'vault', 'api-key'],
  bug: ['bug', 'defect', 'crash', 'panic', 'flaw', 'fix', 'patch', 'error'],
  eyeRisk: ['audit', 'risk', 'inspect', 'scan', 'sast', 'dast', 'trivy', 'leak'],
  gitMerge: ['merge', 'pull-request', 'pr', 'branch', 'git', 'vcs', 'trunk'],
  gitBranch: ['branch', 'checkout', 'fork', 'commit', 'diff', 'repo', 'repository'],
  codeFile: ['code', 'file', 'script', 'source', 'syntax', 'function', 'class'],
  terminal: ['terminal', 'cli', 'bash', 'shell', 'command', 'exec', 'sh', 'linux'],
  binary: ['binary', 'elf', 'pe', 'assembly', 'asm', 'ghidra', 'ida', 'disassembly', 'hex'],
  cpu: ['cpu', 'processor', 'core', 'thread', 'hardware', 'chip', 'instruction', 'kernel', 'ebpf'],
  brain: ['ai', 'agent', 'llm', 'gpt', 'model', 'neural', 'transformer', 'deep learning', 'weights'],
  robot: ['bot', 'automation', 'crawler', 'agentic', 'copilot'],
  lightbulb: ['idea', 'tip', 'lesson', 'rule', 'learn', 'pattern', 'insight'],
  scales: ['tradeoff', 'balance', 'vs', 'compare', 'contrast', 'cost'],
  arrowRightLeft: ['migration', 'transition', 'sync', 'transfer', 'switch'],
  checkCircle: ['validated', 'success', 'compliant', 'passed'],
  xCircle: ['flaw', 'bottleneck', 'failed', 'outdated'],
};

import { KNOWN_TECH_LOGOS } from './icons';

/**
 * Dynamically extract relevant icons based on user input keywords and theme context.
 * Automatically resolves official web tech brand logos (Simple Icons) when specific technologies are mentioned.
 */
function extractDynamicIcons(lowerText: string, fallbackBase: string[]): { centerIcon: string; satIcons: string[] } {
  const scoredIcons: { icon: string; score: number }[] = [];

  // 1. Check for official tech brand logos from the internet (highest priority)
  for (const [techKey, cdnUrl] of Object.entries(KNOWN_TECH_LOGOS)) {
    // Exact word or boundary match
    const regex = new RegExp(`\\b${techKey}\\b`, 'i');
    if (regex.test(lowerText) || lowerText.includes(techKey)) {
      scoredIcons.push({ icon: cdnUrl, score: 10 });
    }
  }

  // 2. Check general conceptual technical icons
  for (const [icon, keywords] of Object.entries(ICON_AFFINITY)) {
    let score = 0;
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        score += 2;
      }
    }
    if (score > 0) {
      scoredIcons.push({ icon, score });
    }
  }

  scoredIcons.sort((a, b) => b.score - a.score);

  const centerIcon = scoredIcons[0]?.icon || fallbackBase[0] || 'cpu';

  const satSet = new Set<string>();
  for (const item of scoredIcons) {
    if (item.icon !== centerIcon && satSet.size < 6) {
      satSet.add(item.icon);
    }
  }

  const defaultFillers = ['zap', 'layers', 'box', 'shieldAlert', 'database', 'gitMerge', 'server', 'terminal', 'cpu', 'brain'];
  for (const f of [...fallbackBase, ...defaultFillers]) {
    if (f !== centerIcon && satSet.size < 6) {
      satSet.add(f);
    }
  }

  return { centerIcon, satIcons: Array.from(satSet).slice(0, 6) };
}

/**
 * Extracts meaningful lines, bullet points, and metrics from raw technical user input.
 */
function extractUserInsights(rawText: string) {
  const lines = rawText
    .split(/[\r\n]+/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((l) => l.length > 15 && !l.startsWith('http'));

  // Extract explicit metrics (e.g. 50x, 25%, 100GB, 25M, 30ms, $50k)
  const metricRegex = /\b\d+(?:\.\d+)?\s*(?:%|x|X|GB|TB|MB|ms|s|req|rps|checkouts|k|M|B)\b/gi;
  const metricsFound = Array.from(new Set(rawText.match(metricRegex) || []));

  return { lines, metrics: metricsFound };
}

/**
 * Detect brand or creator organization from text
 */
function detectBrandAndUrl(lowerText: string): { brand: string; brandUrl: string } {
  if (lowerText.includes('anthropic')) return { brand: 'ANTHROPIC', brandUrl: 'anthropic.com' };
  if (lowerText.includes('clickhouse')) return { brand: 'CLICKHOUSE', brandUrl: 'clickhouse.com' };
  if (lowerText.includes('defectdojo')) return { brand: 'DEFECTDOJO', brandUrl: 'defectdojo.org' };
  if (lowerText.includes('low level')) return { brand: 'LOW LEVEL', brandUrl: 'lowlevel.academy' };
  if (lowerText.includes('ghidra')) return { brand: 'GHIDRA', brandUrl: 'ghidra-sre.org' };
  if (lowerText.includes('docker')) return { brand: 'DOCKER', brandUrl: 'docker.com' };
  if (lowerText.includes('kubernetes')) return { brand: 'KUBERNETES', brandUrl: 'kubernetes.io' };
  return { brand: 'MARROK', brandUrl: 'marrok.org' };
}

/**
 * MARROK Context-Driven Content Synthesizer
 * Dynamically synthesizes content-aware slide structures and tailored branding.
 */
export function synthesizeCarousel(input: SynthesisInput): CarouselData {
  const rawText = (input.prompt || input.imageFileName || '').trim();
  const lowerText = rawText.toLowerCase();

  // 1. Domain Detection via Config Rules
  let matchedRule = DOMAIN_RULES.find((rule) =>
    rule.keywords.some((kw) => lowerText.includes(kw))
  );

  if (input.categoryHint && input.categoryHint !== 'auto') {
    const hintMatch = DOMAIN_RULES.find((r) => r.category.includes(input.categoryHint!));
    matchedRule = hintMatch || {
      ...DEFAULT_RULE,
      category: input.categoryHint.toUpperCase(),
    };
  }

  const activeRule = matchedRule || DEFAULT_RULE;
  const domainCategory = activeRule.category;
  const recommendedTheme = activeRule.theme;

  // Extract smart subject-aware dynamic icons (never static/repeated)
  const { centerIcon, satIcons } = extractDynamicIcons(lowerText, activeRule.satIcons);

  // 2. Dynamic Brand and URL
  const { brand, brandUrl } = detectBrandAndUrl(lowerText);

  // 3. Extract Clean Title and User Points
  let cleanTitle = rawText.replace(/^https?:\/\/\S+/gi, '').split('\n')[0].trim();
  if (cleanTitle.length > 60) {
    cleanTitle = cleanTitle.slice(0, 57) + '...';
  }
  if (!cleanTitle || cleanTitle.length < 4) {
    cleanTitle = domainCategory.split('&')[0].trim();
  }

  const words = cleanTitle.split(/\s+/);
  const headline = words.slice(0, 5).join(' ');

  const { lines, metrics } = extractUserInsights(rawText);
  const userPoint1 = lines[0] || 'When system frequency increases, legacy architectures become memory bottlenecks.';
  const userPoint2 = lines[1] || 'Decoupled authoritative state ensures compute scales with payload size.';
  const userPoint3 = lines[2] || 'Offloading heavy computations to specialized nodes eliminates user-facing stalls.';

  const metric1 = metrics[0] || activeRule.metricFallback;
  const metric2 = metrics[1] || 'Low latency';
  const metric3 = metrics[2] || 'Zero downtime';

  // 4. Content Blueprint Classification
  const isBenchmark =
    metrics.length >= 2 ||
    lowerText.includes('speedup') ||
    lowerText.includes('benchmark') ||
    lowerText.includes('latency') ||
    lowerText.includes('faster') ||
    lowerText.includes('cost') ||
    lowerText.includes('reduced storage');

  const isSecurity =
    lowerText.includes('cve') ||
    lowerText.includes('exploit') ||
    lowerText.includes('vulnerab') ||
    lowerText.includes('malware') ||
    lowerText.includes('reverse') ||
    lowerText.includes('ghidra') ||
    lowerText.includes('defectdojo');

  const isMigration =
    lowerText.includes('migrat') ||
    lowerText.includes('moved') ||
    lowerText.includes('beyond git') ||
    lowerText.includes('transition') ||
    lowerText.includes('replace') ||
    lowerText.includes('scion');

  // 5. Determine Dynamic Slide Count (5 to 9 slides based on content density)
  // Short/Punchy input (e.g. 1 point or < 130 chars) -> 5 slides
  // Medium input (2-3 points or 130-320 chars) -> 6-7 slides
  // Deep dive (4+ points or > 320 chars) -> 8 slides
  let targetSlideCount = 7;
  if (lines.length <= 1 && rawText.length < 130) {
    targetSlideCount = 5;
  } else if (lines.length === 2 && rawText.length < 240) {
    targetSlideCount = 6;
  } else if (lines.length >= 4 || rawText.length >= 320) {
    targetSlideCount = 8;
  }

  // 6. Generate Hook Variants (A/B testing)
  const hookVariants: HookVariant[] = [
    {
      tag: 'Curiosity & Surprise',
      enTitle: `${headline}:\nWhat broke?`,
      arTitle: `${headline}:\nما الذي تغيّر؟`,
      enBody: `How engineering constraints forced a paradigm shift in ${domainCategory.toLowerCase()}.`,
      arBody: `كيف أدت التحديات الهندسية إلى إعادة التفكير بالكامل في منظومة ${headline}.`,
      centerIcon,
    },
    {
      tag: 'Hard Metrics & Scale',
      enTitle: `${headline} at scale.`,
      arTitle: `${headline} عند أقصى ضغط.`,
      enBody: `Key benchmarks (${metric1}) and lessons learned from high-throughput production.`,
      arBody: `أهم معايير الأداء والدروس المستفادة (${metric1}) من تشغيل الأنظمة تحت ضغط هائل.`,
      centerIcon: 'gauge',
    },
    {
      tag: 'The Problem & Solution',
      enTitle: `Why standard tools\nfailed for ${headline}.`,
      arTitle: `لماذا فشلت الأدوات التقليدية أمام ${headline}؟`,
      enBody: `Moving beyond legacy assumptions to build modern high-efficiency software.`,
      arBody: `تجاوز الأساليب القديمة لبناء برمجيات عالية الكفاءة والأمان.`,
      centerIcon: 'shieldAlert',
    },
  ];

  // Helper to trim candidate slides to exact dynamic target count while keeping Slide 1 (Hub) and Last Slide (CTA)
  function trimSlides(candidates: SlideData[], count: number): SlideData[] {
    if (candidates.length <= count) return candidates;
    const first = candidates[0];
    const last = candidates[candidates.length - 1];
    const middle = candidates.slice(1, candidates.length - 1);
    const needed = Math.max(count - 2, 1);
    return [first, ...middle.slice(0, needed), last];
  }

  // 7. Generate Rich, Multi-Archetype Slide Structure
  let slides: SlideData[];

  if (isBenchmark) {
    // Structure A: Benchmark & Metrics Deep Dive (Hub -> Metric Hero -> Compare -> Code Diff -> Rows -> CTA)
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'gauge',
        satIcons,
        enTitle: `${headline}:\n${metric1} Speedup.`,
        arTitle: `${headline}:\nقفزة في الأداء بنسبة ${metric1}.`,
        enBody: `How an architectural redesign delivered ${metric1} faster execution and lowered infrastructure cost.`,
        arBody: `كيف حققت إعادة بناء المنظومة تسريعاً بنسبة ${metric1} مع خفض ملحوظ في تكلفة الموارد.`,
      },
      {
        type: 'metric',
        metricValue: metric1,
        metricLabel: 'PRODUCTION SPEEDUP',
        metricDiff: `▲ ${metric1} vs legacy baseline`,
        metricIcon: 'zap',
        enTitle: `${headline} benchmark win.`,
        arTitle: `قفزة في الأداء بنسبة ${metric1}.`,
        enBody: `Measured throughput and latency reductions across live production workloads.`,
        arBody: `نتائج حقيقية موثقة في بيئة الإنتاج الفعلي أظهرت كفاءة استثنائية واستقراراً تاماً.`,
      },
      {
        type: 'compare',
        compareLeftTitle: 'Legacy Bottleneck',
        compareLeftBody: `• Memory allocation spikes\n• Single-thread lockups\n• High p99 tail latency`,
        compareRightTitle: 'Optimized Stack',
        compareRightBody: `• Zero-allocation parsing\n• Lock-free parallel pipelines\n• Steady microsecond p99`,
        enTitle: 'Architectural comparison.',
        arTitle: 'مقارنة معمارية الأنظمة.',
        enBody: userPoint1,
        arBody: 'التحول من المعالجة الثقيلة المقيدة إلى بنية موزعة وخفيفة على الذاكرة.',
      },
      {
        type: 'code',
        codeFileName: 'bench_run.sh',
        codeLanguage: 'bash',
        codeSnippet: `$ ./benchmark --workload=high-concurrency\n> Warming up virtual worktree...\n+ Latency dropped from 240ms -> 12ms\n✔ Target throughput: ${metric1} [PASSED]`,
        enTitle: 'The core optimization in action.',
        arTitle: 'آلية التحسين أثناء التنفيذ.',
        enBody: userPoint2,
        arBody: 'إلغاء العمليات الزائدة وحصر المعالجة فقط في البيانات المتغيرة بشكل فوري.',
      },
      {
        type: 'row',
        icons: [
          { icon: satIcons[0] || 'cpu', label: 'Compute' },
          { icon: satIcons[1] || 'hardDrive', label: 'Memory' },
        ],
        enTitle: 'Decoupled state eliminates stalls.',
        arTitle: 'فصل الحالة يمنع الاختناق.',
        enBody: userPoint3,
        arBody: 'نقل العمليات الثقيلة إلى وحدات متخصصة يضمن استجابة فورية للمستخدمين.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'gauge', label: 'p99 SLA' },
          { icon: 'activity', label: 'Realtime' },
        ],
        enTitle: 'Production ROI & cost savings.',
        arTitle: 'عائد الاستثمار وخفض تكاليف السحابة.',
        enBody: `Optimization reduced cluster compute footprint, freeing capacity for scaling user traffic.`,
        arBody: 'تقليص استهلاك الموارد السحابية مكن الفرق من التوسع دون زيادة في الفواتير.',
      },
      {
        type: 'row',
        icons: [{ icon: 'lightbulb', label: 'SRE Rule' }],
        enTitle: 'Profile p99 continuously.',
        arTitle: 'قاعدة مهندسي الاعتمادية SRE.',
        enBody: `Never optimize based on averages. Track 99th percentile response times and memory allocations.`,
        arBody: 'لا تقيس الأداء بالمتوسطات؛ تتبع أبطأ 1% من الطلبات واستنزاف الذاكرة بشكل مستمر.',
      },
      {
        type: 'cta',
        enTitle: `Benchmarking ${domainCategory.toLowerCase()}?`,
        arTitle: `تقيس أداء أنظمتك التقنية؟`,
        enBody: `Discuss benchmark profiling and systems optimization with engineers.`,
        arBody: `تواصل معنا لمناقشة تحليل الأداء وهندسة الأنظمة عالية الكفاءة.`,
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · ${domainCategory} Benchmark Report`,
        arCredit: `${brand} · تقرير قياس أداء ${domainCategory}`,
      },
    ];
    slides = trimSlides(candidateSlides, targetSlideCount);
  } else if (isSecurity) {
    // Structure B: Security & Exploits (Hub -> Metric Triage -> Exploit Code -> Compare -> Rows -> CTA)
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'shieldAlert',
        satIcons,
        enTitle: `${headline}:\nExploit Breakdown.`,
        arTitle: `${headline}:\nتشريح الثغرة وآلية الحماية.`,
        enBody: `A security deep dive into the vulnerability mechanism, exploit reachability, and defensive hardening.`,
        arBody: `تحليل أمني عميق لجذور الخلل، إمكانية الاستغلال، والحلول الدفاعية الموصى بها.`,
      },
      {
        type: 'metric',
        metricValue: metric1.includes('%') || metric1.includes('min') ? metric1 : '95%',
        metricLabel: 'ATTACK SURFACE TRIAGE',
        metricDiff: '▼ 95% false alarms filtered out',
        metricIcon: 'shieldAlert',
        enTitle: `${headline} blast radius.`,
        arTitle: 'تقييم خطورة الاستغلال الفعلي.',
        enBody: `Distinguishing raw automated alerts from critical vulnerabilities attackers can genuinely reach.`,
        arBody: 'فرز التنبيهات الآلية لتحديد الثغرات الحرجة القابلة للاستغلال الحقيقي.',
      },
      {
        type: 'code',
        codeFileName: 'exploit_poc.py',
        codeLanguage: 'python',
        codeSnippet: `# CVE Validation & Patch Proof\n$ python3 exploit_poc.py --target=staging\n- Payload triggered: unauthenticated memory read\n+ Applied patch: boundary validation active\n✔ Reachability: MITIGATED`,
        enTitle: 'Exploit mechanism & patch proof.',
        arTitle: 'آلية الاستغلال وإثبات الترقيع.',
        enBody: userPoint1,
        arBody: 'فحص مسار الاستغلال البرمجي والتأكد من إغلاق الثغرة تماماً.',
      },
      {
        type: 'compare',
        compareLeftTitle: 'Unfiltered Scanners',
        compareLeftBody: `• 1,000+ noisy alerts\n• Dev fatigue & backlog\n• No reachability context`,
        compareRightTitle: 'Reachability Triage',
        compareRightBody: `• 5% critical flaws prioritized\n• Focus on exposed APIs\n• Immediate defensive win`,
        enTitle: 'Attack surface vs boundary.',
        arTitle: 'مسار الهجوم مقابل خط الدفاع.',
        enBody: userPoint2,
        arBody: 'تحديد المسار الذي يمكن للمهاجم استغلاله مقارنة بنطاق العزل الأمني المعمول به.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'binary', label: 'Decompilation' },
          { icon: 'search', label: 'Static Analysis' },
        ],
        enTitle: 'Binary inspection & decompilation.',
        arTitle: 'فحص الشيفرة المترجمة.',
        enBody: userPoint3,
        arBody: 'فحص ملفات النظام الثنائية للتأكد من عدم وجود مسارات تسريب غير مقصودة.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'funnel', label: 'Triage' },
          { icon: 'clock', label: 'Fast SLA' },
          { icon: 'lock', label: 'Zero Noise' },
        ],
        enTitle: 'The DevSecOps triage funnel.',
        arTitle: 'فرز وتصفية الإنذارات الأمنية.',
        enBody: `Collapse thousands of automated scanner findings into actionable fixes for production engineering teams.`,
        arBody: 'تقليص آلاف التنبيهات المزعجة إلى خطة علاج واضحة للفرق الهندسية.',
      },
      {
        type: 'row',
        icons: [{ icon: 'shieldAlert', label: 'AppSec Rule' }],
        enTitle: 'Fix reachable bugs first.',
        arTitle: 'قاعدة الأمان السيبراني الأساسية.',
        enBody: `Fixing the 5% of reachable flaws provides 95% of real-world defensive protection for production stacks.`,
        arBody: 'معالجة الثغرات القابلة للوصول الفعلي تمنحك 95% من الحماية الحقيقية ضد الهجمات.',
      },
      {
        type: 'cta',
        enTitle: `Building secure\nsoftware?`,
        arTitle: `تبني برمجيات\nآمنة ومحمية؟`,
        enBody: `Connect with security researchers to harden your software supply chain.`,
        arBody: `تواصل معنا لمناقشة أمن البرمجيات وحماية بيئات التطوير والإنتاج.`,
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · ${domainCategory} Advisory`,
        arCredit: `${brand} · تقرير أمني في ${domainCategory}`,
      },
    ];
    slides = trimSlides(candidateSlides, targetSlideCount);
  } else if (isMigration) {
    // Structure C: Architecture Migration (Hub -> Compare -> Metric Scale -> Cutover Code -> Rows -> CTA)
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: centerIcon || 'arrowRightLeft',
        satIcons,
        enTitle: `${headline}:\nThe Migration.`,
        arTitle: `${headline}:\nرحلة الانتقال المعماري.`,
        enBody: `Why traditional systems broke down under high concurrency and what replaced them.`,
        arBody: `أسباب وصول الأدوات السابقة إلى أقصى حدودها والحلول المعمارية الجديدة البديلة.`,
      },
      {
        type: 'compare',
        compareLeftTitle: 'Legacy Monolith / Git',
        compareLeftBody: `• Full history clone\n• Bloats local disk (100GB+)\n• CI lockups at scale`,
        compareRightTitle: 'Modern Decoupled Stack',
        compareRightBody: `• Virtual file system\n• Sparse lazy checkout\n• Instant CI build times`,
        enTitle: 'The architectural contrast.',
        arTitle: 'المقارنة بين النظام القديم والجديد.',
        enBody: userPoint1,
        arBody: 'الأنظمة السابقة اعتمدت على نماذج أحادية لم تعد تناسب حجم العمليات التزامنية اليوم.',
      },
      {
        type: 'metric',
        metricValue: metric1.includes('checkouts') || metric1.includes('GB') ? metric1 : '100x',
        metricLabel: 'SCALE MULTIPLIER',
        metricDiff: '▲ Zero developer wait time',
        metricIcon: 'activity',
        enTitle: `${headline} at scale.`,
        arTitle: `${headline} عند أقصى ضغط.`,
        enBody: `Resource consumption became strictly proportional to modified code rather than repository history.`,
        arBody: 'أصبح استهلاك الموارد مرتبطاً فقط بحجم التعديل الحالي وليس بكامل تاريخ المشروع.',
      },
      {
        type: 'code',
        codeFileName: 'scion_cutover.sh',
        codeLanguage: 'bash',
        codeSnippet: `$ scion init --virtual-mount=/src\n> Initializing sparse lazy checkout...\n+ 100GB worktree mounted in 1.4s\n✔ CI test-after-merge pipeline active`,
        enTitle: 'Safe cutover execution.',
        arTitle: 'استراتيجية النقل والتشغيل الفعلي.',
        enBody: userPoint2,
        arBody: 'تحويل العمليات الثقيلة إلى الخوادم واعتماد حزم التغييرات النسبية خفيفة الوزن.',
      },
      {
        type: 'row',
        icons: [
          { icon: satIcons[2] || 'server', label: 'Server API' },
          { icon: satIcons[3] || 'changesets', label: 'Changesets' },
        ],
        enTitle: 'Server-authoritative state.',
        arTitle: 'بنية تحتية مركزية ومحكمة.',
        enBody: userPoint3,
        arBody: 'إتمام الدمج والتحقق عبر واجهات برمجية مركزية يضمن التزامن التام دون تضارب.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'changesets', label: 'Test-After-Merge' },
          { icon: 'gitMerge', label: 'Throughput' },
        ],
        enTitle: 'High concurrency CI pipelines.',
        arTitle: 'خطوط معالجة عالية التزامن.',
        enBody: `Adopting modern CI pipelines eliminated merge contention for hundreds of parallel automated agents.`,
        arBody: 'تطبيق نماذج الاختبار بعد الدمج أنهى مشكلة الاختناق لمئات المطورين والوكلاء البرمجيين.',
      },
      {
        type: 'row',
        icons: [{ icon: 'lightbulb', label: 'SRE Rule' }],
        enTitle: 'Decouple state from compute.',
        arTitle: 'قاعدة فصل البيانات عن المعالجة.',
        enBody: `When data grows faster than developer hardware, offload state authority to high-bandwidth server clusters.`,
        arBody: 'عندما تتضخم البيانات، يجب تفويض إدارة الحالة إلى خوادم مركزية فائقة السرعة.',
      },
      {
        type: 'cta',
        enTitle: `Scaling your\ninfrastructure?`,
        arTitle: `تطور بنيتك التحتية\nللأنظمة الكبيرة؟`,
        enBody: `Discuss software architecture migration and developer toolchain scaling.`,
        arBody: `تواصل معنا لمناقشة تطوير أدوات المهندسين وبناء أنظمة برمجية سريعة ومستقرة.`,
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · ${domainCategory} Case Study`,
        arCredit: `${brand} · دراسة حالة في ${domainCategory}`,
      },
    ];
    slides = trimSlides(candidateSlides, targetSlideCount);
  } else {
    // Structure D: General Systems & Architecture (Hub -> Metric Win -> Compare -> Code -> Rows -> CTA)
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon,
        satIcons,
        enTitle: `${headline}:\nNext-Gen Shift.`,
        arTitle: `${headline}:\nالنقلة النوعية الجديدة.`,
        enBody: `A breakdown of technical mechanisms, benchmarks, and production architecture.`,
        arBody: `تحليل عميق للبنية التحتية، معايير السرعة، وأهم الدروس العملية.`,
      },
      {
        type: 'metric',
        metricValue: metric1,
        metricLabel: 'PERFORMANCE MULTIPLIER',
        metricDiff: '▲ Measurable architectural speedup',
        metricIcon: 'zap',
        enTitle: `${headline} breakthrough.`,
        arTitle: `النقلة النوعية في ${headline}.`,
        enBody: `How decoupled architecture eliminated memory bottlenecks and lowered infrastructure spend.`,
        arBody: `كيف ساهمت البنية المفصولة في خفض استهلاك الموارد ورفع الكفاءة التشغيلية.`,
      },
      {
        type: 'compare',
        compareLeftTitle: 'Legacy Bottleneck',
        compareLeftBody: `• Tight coupling of state\n• High RAM footprint\n• Latency spikes under load`,
        compareRightTitle: 'Modern Engine',
        compareRightBody: `• Independent state layer\n• Sub-millisecond execution\n• Linear horizontal scaling`,
        enTitle: 'Where legacy approaches hit limits.',
        arTitle: 'أين تتوقف الأنظمة التقليدية؟',
        enBody: userPoint1,
        arBody: `عندما يتضاعف حجم البيانات، تصبح الأدوات السابقة عائقاً في الذاكرة والمعالج.`,
      },
      {
        type: 'code',
        codeFileName: 'sys_exec.sh',
        codeLanguage: 'bash',
        codeSnippet: `$ ./system-engine --mode=distributed\n> Initializing decentralized nodes...\n+ State synchronized across 3 zones\n✔ 0 context switches detected`,
        enTitle: 'Decoupled state execution.',
        arTitle: 'فصل طبقة البيانات عن التنفيذ.',
        enBody: userPoint2,
        arBody: `من خلال إدارة الحالة بشكل مستقل، تصبح العمليات مرتبطة فقط بالملفات المعدلة دون إهدار الموارد.`,
      },
      {
        type: 'row',
        icons: [
          { icon: satIcons[0] || 'cpu', label: 'Processing' },
          { icon: satIcons[1] || 'server', label: 'Cluster' },
        ],
        enTitle: 'Server-side authoritative design.',
        arTitle: 'بنية تحتية مركزية ومحكمة.',
        enBody: userPoint3,
        arBody: `نقل العمليات المعقدة إلى خوادم متخصصة يمنع التجمد وبطء الأجهزة الطرفية.`,
      },
      {
        type: 'row',
        icons: [
          { icon: satIcons[2] || 'gauge', label: metric1.slice(0, 14) },
          { icon: satIcons[3] || 'activity', label: 'Telemetry' },
        ],
        enTitle: 'Measure true production impact.',
        arTitle: 'قياس الأثر الفعلي على الإنتاج.',
        enBody: `Optimization without profiling is guessing. Track p99 latency and allocation rates continuously.`,
        arBody: `التحسين بدون قياس مجرد تخمين؛ تتبع أداء p99 ومعدلات استهلاك الذاكرة بشكل مستمر.`,
      },
      {
        type: 'row',
        icons: [{ icon: 'lightbulb', label: 'Core Rule' }],
        enTitle: 'Ship smaller, verify faster.',
        arTitle: 'انشر تغييرات أصغر، وتحقق أسرع.',
        enBody: `Smaller incremental changesets reduce blast radius and make troubleshooting instantaneous.`,
        arBody: `التغييرات الصغيرة والمستمرة تقلل نطاق الأعطال وتجعل تتبع المشاكل وحلها فورياً.`,
      },
      {
        type: 'cta',
        enTitle: `Engineering ${domainCategory.toLowerCase()}?`,
        arTitle: `تبني أنظمة في مجال ${domainCategory}؟`,
        enBody: `Join the conversation and discuss technical architecture.`,
        arBody: `تواصل معنا لمناقشة التفاصيل الهندسية وأفضل الممارسات.`,
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · ${domainCategory} Deep Dive`,
        arCredit: `${brand} · دراسة تفصيلية في ${domainCategory}`,
      },
    ];
    slides = trimSlides(candidateSlides, targetSlideCount);
  }

  // 7. Generate Dual Captions with Extracted Specifics
  const hashtags = `#${domainCategory.replace(/[^a-zA-Z0-9]/g, '')} #SoftwareEngineering #DevSecOps #TechTrends #SystemDesign #TechInArabic #هندسة_البرمجيات #${brand.replace(/[^a-zA-Z0-9]/g, '')}`;

  const captionVariants: CaptionVariant[] = [
    {
      style: 'Executive Bulletins & Hard Metrics',
      caption: `${headline}: A technical deep dive 🚀
نظرة هندسية متعمقة على ${headline}

Key Mechanisms & Takeaways / أبرز النقاط:
• Domain: ${domainCategory}
• Core Finding: ${userPoint1}
• Architecture: ${userPoint2}
• Production Metric: ${metric1} achieved across workloads

Source: ${brand} Engineering Notes
Full analysis at ${brandUrl}

${hashtags}`,
    },
    {
      style: 'Narrative Breakdown & Story',
      caption: `What happens when systems hit their limits? You don't just patch them; you rethink the architecture from the ground up. 🛠️

In this breakdown of ${headline}, we examine why traditional approaches create bottlenecks and how modern engineering patterns achieve ${metric1} efficiency.

Swipe through the slides for the full architectural teardown.
Read more: ${brandUrl}

${hashtags}`,
    },
  ];

  const firstComment = `🔗 Primary source documentation & reference post: https://${brandUrl}\n\nWhat are your thoughts on this architecture? Share your take below 👇`;
  const shortCaption = `${slides[0]?.arTitle || 'تحليل معماري دقيق'} ⚡\n${slides[0]?.enTitle || 'Technical teardown'} — Swipe through the breakdown 👉`;
  const screenHook = slides[0]?.enTitle ? `${slides[0].enTitle.replace(/[.?!]$/, '')} in 60s` : 'Why this changes everything';

  return {
    theme: recommendedTheme,
    category: domainCategory,
    brand,
    brandUrl,
    caption: captionVariants[0].caption,
    firstComment,
    shortCaption,
    screenHook,
    captionVariants,
    hookVariants,
    slides,
  };
}
