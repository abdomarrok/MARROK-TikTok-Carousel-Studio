import { SlideData } from '../../types';

export interface TemplateContext {
  isZeroTrust: boolean;
  isRedis: boolean;
  isScion: boolean;
  isBenchmark: boolean;
  isSecurity: boolean;
  isMigration?: boolean;
  headline: string;
  cleanTitle: string;
  domainCategory: string;
  brand: string;
  brandUrl: string;
  centerIcon: string;
  satIcons: string[];
  userPoint1: string;
  userPoint2: string;
  userPoint3: string;
  metric1: string;
  arMetric1: string;
  targetSlideCount: number;
}

// Helper to trim candidate slides to exact dynamic target count while keeping Slide 1 (Hub) and Last Slide (CTA)
export function trimSlides(candidates: SlideData[], count: number): SlideData[] {
  if (candidates.length <= count) return candidates;
  const first = candidates[0];
  const last = candidates[candidates.length - 1];
  const middle = candidates.slice(1, candidates.length - 1);
  const needed = Math.max(count - 2, 1);
  return [first, ...middle.slice(0, needed), last];
}

export function buildCandidateSlides(ctx: TemplateContext): SlideData[] {
  const {
    isZeroTrust,
    isRedis,
    isScion,
    isBenchmark,
    isSecurity,
    headline,
    cleanTitle,
    domainCategory,
    brand,
    brandUrl,
    centerIcon,
    satIcons,
    userPoint1,
    userPoint2,
    userPoint3,
    metric1,
    arMetric1,
    targetSlideCount,
  } = ctx;

  if (isZeroTrust) {
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'lock',
        satIcons: ['shieldAlert', 'network', 'key', 'server', 'activity', 'terminal'],
        satLabels: ['mTLS / x509', 'Envoy Mesh', 'IAM Policy', 'Micro-Seg', 'Cert Rotation', 'Telemetry API'],
        enTitle: 'Zero-Trust, explained.',
        arTitle: 'شرح معمارية Zero-Trust',
        enBody: 'How cryptographic identity and least-privilege egress replace perimeter networks.',
        arBody: 'كيف تلغي معمارية التحقق المستمر الثغرات التقليدية وتؤمن بيئات الإنتاج السحابية.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'server', label: 'Client Node' },
          { icon: 'shieldAlert', label: 'Envoy Proxy' },
          { icon: 'lock', label: 'Isolated Pod' },
        ],
        enTitle: 'Mutual TLS encryption active.',
        arTitle: 'تشفير كامل عبر mTLS',
        enBody: 'Every internal microservice verifies identity with short-lived cryptographic certificates.',
        arBody: 'كل خدمة داخلية تتحقق من هوية الطرف الآخر باستخدام شهادات رقمية مؤقتة وموثقة.',
      },
      {
        type: 'compare',
        compareLeftTitle: 'Perimeter Defense',
        compareLeftBody: '• Flat internal network\n• Implicit trust inside\n• Lateral move exploits',
        compareRightTitle: 'Zero-Trust Mesh',
        compareRightBody: '• Cryptographic auth\n• Strict egress control\n• Zero implicit access',
        enTitle: 'Perimeter vs Zero-Trust.',
        arTitle: 'الدفاع التقليدي مقابل العزل',
        enBody: 'Breaching one container no longer grants access to the surrounding cluster.',
        arBody: 'اختراق أي حاوية فردية لا يمنح المهاجم أي وصول إلى بقية أجزاء الشبكة الداخلية.',
      },
      {
        type: 'code',
        codeFileName: 'envoy-mtls.yaml',
        codeLanguage: 'YAML',
        codeSnippet: `# Envoy Strict TLS Handshake Enforcement\n$ envoy -c /etc/envoy.yaml --validate\n- tls_mode: PERMISSIVE (unencrypted fallback)\n+ tls_mode: STRICT_MUTUAL (require x509 cert)\n✔ Handshake: STRICT_MTLS [SPIFFE ID VERIFIED]`,
        enTitle: 'Strict client certificate proof.',
        arTitle: 'إثبات الهوية بالشهادات الرقمية',
        enBody: 'Traffic between services fails closed without a valid mutual cryptographic handshake.',
        arBody: 'يتم رفض أي اتصال داخلي فوراً ما لم يقدم شهادة مصادقة مشفرة وسارية المفعول.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'shieldAlert', label: 'Breached Pod' },
          { icon: 'lock', label: 'Protected Mesh' },
          { icon: 'database', label: 'Air-Gapped DB' },
        ],
        enTitle: 'Microsegmentation limits blast radius.',
        arTitle: 'تقسيم الشبكة يحد الأضرار',
        enBody: 'Network policies restrict egress to only pre-approved service dependencies.',
        arBody: 'سياسات العزل الصارمة تمنع خروج أي حزم بيانات إلا إلى الخدمات المعرفة مسبقاً.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'network', label: 'Ingress Gateway' },
          { icon: 'gitMerge', label: 'Envoy Mesh' },
          { icon: 'database', label: 'Secure Storage' },
        ],
        enTitle: 'Automated cert rotation.',
        arTitle: 'أتمتة تجديد الشهادات الرقمية',
        enBody: 'Short-lived certificates require automated control planes to prevent unexpected service outages.',
        arBody: 'الشهادات قصيرة الأجل تتطلب أتمتة كاملة لإدارتها تفادياً لانقطاع الخدمات المفاجئ.',
      },
      {
        type: 'metric',
        metricValue: '100% mTLS',
        metricLabel: 'ENCRYPTED ZERO-TRUST TRAFFIC',
        metricDiff: '▼ 0 unauthenticated packets allowed',
        metricIcon: 'shieldAlert',
        enTitle: 'Never trust, always verify.',
        arTitle: 'القاعدة الذهبية: لا تثق أبداً',
        enBody: 'Treat every network packet as if it originated from an untrusted public internet node.',
        arBody: 'تعامل مع كل اتصال داخلي وكأنه قادم من شبكة عامة غير موثوقة تماماً.',
      },
      {
        type: 'cta',
        enTitle: 'Hardening cloud networks?',
        arTitle: 'تؤمن شبكتك السحابية اليوم؟',
        enBody: 'Discuss service mesh, mTLS, and Zero-Trust architecture with security engineers.',
        arBody: 'تواصل معنا لمناقشة تطبيق معمارية Zero-Trust وتأمين بيئات الإنتاج.',
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · Zero-Trust Security Report`,
        arCredit: `${brand} · تقرير أمني في معمارية Zero-Trust`,
      },
    ];
    return trimSlides(candidateSlides, targetSlideCount);
  }

  if (isRedis) {
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/redis.svg',
        satIcons: ['database', 'zap', 'hardDrive', 'server', 'cpu', 'activity'],
        satLabels: ['Shared Memory', 'Sub-ms Cache', 'Memory P99', 'Cluster Shards', 'Persistence', 'Replica Sync'],
        enTitle: 'Redis 8 gets faster.',
        arTitle: 'تسريع محرك Redis 8',
        enBody: 'How asynchronous I/O and query pipelining deliver sub-millisecond in-memory throughput.',
        arBody: 'كيف ترفع المعمارية الجديدة سرعة المعالجة في الذاكرة مع خفض استهلاك الموارد.',
      },
      {
        type: 'metric',
        metricValue: '1.2M ops/s',
        metricLabel: 'IN-MEMORY THROUGHPUT',
        metricDiff: '▲ 40% higher ops/sec',
        metricIcon: 'zap',
        enTitle: 'Redis 8 throughput record.',
        arTitle: 'رقم قياسي في سرعة المعالجة',
        enBody: 'Multi-threaded I/O multiplexing handles millions of operations per second with microsecond latency.',
        arBody: 'معالجة متزامنة وموزعة للطلبات تضمن استجابة فورية حتى تحت أقصى ضغط تشغيلي.',
      },
      {
        type: 'compare',
        compareLeftTitle: 'Legacy Redis',
        compareLeftBody: '• Single-thread bottlenecks\n• Blocking save latency\n• High memory fragmentation',
        compareRightTitle: 'Redis 8 Engine',
        compareRightBody: '• Multi-thread I/O workers\n• Zero-copy memory pooling\n• Steady microsecond p99',
        enTitle: 'Redis 8 architecture contrast.',
        arTitle: 'المقارنة بين الإصدارين',
        enBody: 'Offloading network read/write from the main execution thread keeps cache pipelines fluid.',
        arBody: 'فصل عمليات قراءة الشبكة عن معالج الأوامر الرئيسي يمنع أي بطء في استرجاع البيانات.',
      },
      {
        type: 'code',
        codeFileName: 'redis_bench.sh',
        codeLanguage: 'BASH',
        codeSnippet: `$ redis-benchmark -q -n 1000000 -c 50 -P 16\n> Pipelining active across 4 IO threads...\n- Legacy single-thread queue: 180,000 ops/s\n+ Multi-thread I/O multiplexer: 1,240,000 ops/s\n✔ Microsecond p99 latency: 0.18ms`,
        enTitle: 'Microsecond p99 benchmark proof.',
        arTitle: 'إثبات السرعة تحت الضغط',
        enBody: 'Pipelined requests execute in lock-free shared buffers without thread contention.',
        arBody: 'تنفيذ الاستعلامات المجمعة في الذاكرة المشتركة دون أي تضارب أو إبطاء للمعالج.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'hardDrive', label: 'Zero-Copy' },
          { icon: 'cpu', label: 'Threading' },
        ],
        enTitle: 'Optimized memory allocation buffers.',
        arTitle: 'إدارة ذاكرة فائقة الدقة',
        enBody: 'Custom memory allocators eliminate fragmentation spikes during high key churn.',
        arBody: 'محسنات الذاكرة الخاصة تمنع تبعثر البيانات وتضمن استقرار استهلاك الرام.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'alertCircle', label: 'The Catch' },
          { icon: 'database', label: 'Sharding' },
        ],
        enTitle: 'The Catch: Cluster sharding.',
        arTitle: 'تحدي توزيع المفاتيح والشظايا',
        enBody: 'Multi-key queries across disparate cluster shards require cross-slot routing overhead.',
        arBody: 'الاستعلامات المتعددة عبر عقد مختلفة تتطلب توجيهاً إضافياً قد يقلل من الفائدة.',
      },
      {
        type: 'metric',
        metricValue: '< 64 KB',
        metricLabel: 'OPTIMAL PAYLOAD THRESHOLD',
        metricDiff: '▲ Sub-millisecond p99 guarantee',
        metricIcon: 'gauge',
        enTitle: 'Keep payloads minimal and lean.',
        arTitle: 'احرص على تقليص أحجام البيانات',
        enBody: 'In-memory stores remain sub-millisecond only when value payloads stay under 64KB.',
        arBody: 'قواعد البيانات في الذاكرة تحافظ على سرعتها الفائقة طالما بقيت أحجام السجلات صغيرة.',
      },
      {
        type: 'cta',
        enTitle: 'Scaling in-memory cache?',
        arTitle: 'تطور محركات التخزين المؤقت؟',
        enBody: 'Discuss Redis 8 clustering, memory sizing, and high-throughput cache topologies.',
        arBody: 'تواصل معنا لمناقشة أداء Redis وتصميم حلول التخزين المؤقت عالية السرعة.',
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · Redis 8 Architecture Report`,
        arCredit: `${brand} · دراسة أداء محرك Redis 8`,
      },
    ];
    return trimSlides(candidateSlides, targetSlideCount);
  }

  if (isScion) {
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'gitMerge',
        satIcons: ['server', 'cpu', 'database', 'changesets', 'terminal', 'gauge'],
        satLabels: ['Virtual FS', 'Server Merge', 'API VCS', 'Changesets', 'CI Runners', 'Telemetry'],
        enTitle: 'Beyond traditional Git.',
        arTitle: 'منظومة Scion لإدارة الشيفرات',
        enBody: 'Why AI agent concurrency broke standard Git and how Anthropic engineered Scion for monorepos.',
        arBody: 'لماذا عجزت أنظمة Git التقليدية أمام وتيرة الوكلاء البرمجيين وكيف صممت Anthropic منظومة Scion.',
      },
      {
        type: 'compare',
        compareLeftTitle: 'Standard Git Model',
        compareLeftBody: '• Full tree local cloning\n• Merge conflicts with bots\n• 100GB disk bloat per seat',
        compareRightTitle: 'Scion Agent-Scale VCS',
        compareRightBody: '• Virtual sparse checkout\n• Server-authoritative state\n• Instant atomic changesets',
        enTitle: 'Git vs Scion monorepo.',
        arTitle: 'مقارنة معمارية Git و Scion',
        enBody: 'Agents generate thousands of commits per hour, rendering client-side git locks unusable.',
        arBody: 'الوكلاء الآليون ينشئون آلاف التعديلات كل ساعة مما يجعل قفل المستودع محلياً مستحيلاً.',
      },
      {
        type: 'metric',
        metricValue: '25M checkouts/day',
        metricLabel: 'AGENT CONCURRENCY',
        metricDiff: '▲ Zero local disk clone wait',
        metricIcon: 'activity',
        enTitle: 'Scion agent concurrency scale.',
        arTitle: 'استيعاب آلاف الوكلاء بالتزامن',
        enBody: 'Decoupled virtual filesystem mounts mount only the exact source files an agent inspects.',
        arBody: 'نظام الملفات الافتراضي يقوم بتحميل وتثبيت الملفات التي يحتاجها الوكيل فقط دون غيرها.',
      },
      {
        type: 'code',
        codeFileName: 'scion-mount.sh',
        codeLanguage: 'BASH',
        codeSnippet: `$ scion checkout --virtual --sparse=agent-workspace\n> Mounting virtual repository tree at /work...\n- Local Git clone disk bloat: 120GB\n+ Scion virtual sparse pointer: 420ms\n✔ Atomic changeset verified by server`,
        enTitle: 'Virtual filesystem lazy checkout.',
        arTitle: 'تحميل فوري عبر النظام الافتراضي',
        enBody: 'Local working copies become lightweight pointers to authoritative server storage.',
        arBody: 'تصبح النسخ المحلية مجرد مؤشرات خفيفة جداً تشير مباشرة إلى الخوادم المركزية.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'server', label: 'Server API' },
          { icon: 'changesets', label: 'Changesets' },
        ],
        enTitle: 'Server authoritative changesets.',
        arTitle: 'تأكيد التغييرات عبر الخادم',
        enBody: 'Server-side conflict resolution eliminates the need for agents to rebase whole histories.',
        arBody: 'معالجة التضارب على مستوى الخادم تلغي حاجة الوكلاء إلى إعادة بناء تاريخ المستودع.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'alertCircle', label: 'The Catch' },
          { icon: 'server', label: 'Monorepo Scale' },
        ],
        enTitle: 'The Catch: Monorepo scale.',
        arTitle: 'متى تحتاج إلى هذه المنظومة',
        enBody: 'Custom VCS engines like Scion require dedicated infrastructure teams. Stick to Git under 50GB.',
        arBody: 'الأنظمة المخصصة مثل Scion تحتاج لفرق دعم متفرغة؛ المستودعات الأصغر من 50GB تبقى أفضل مع Git.',
      },
      {
        type: 'metric',
        metricValue: '200x',
        metricLabel: 'COMPUTE FOOTPRINT REDUCTION',
        metricDiff: '▲ 25% of all CI computing freed',
        metricIcon: 'cpu',
        enTitle: 'Decouple storage from compute.',
        arTitle: 'افصل التخزين عن المعالجة',
        enBody: 'Never force developer or agent machines to hold the full historical weight of the repository.',
        arBody: 'لا تجبر أجهزة المطورين أو الوكلاء على تحميل وتخزين كامل تاريخ المستودع الضخم.',
      },
      {
        type: 'cta',
        enTitle: 'Scaling agent developer toolchains?',
        arTitle: 'تطور أدوات التطوير للوكلاء؟',
        enBody: 'Discuss monorepo architectures, virtual checkouts, and developer infrastructure at scale.',
        arBody: 'تواصل معنا لمناقشة هندسة المستودعات الضخمة وبناء أدوات الوكلاء البرمجيين.',
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · Scion VCS Architecture Report`,
        arCredit: `${brand} · دراسة معمارية Scion لإدارة المستودعات`,
      },
    ];
    return trimSlides(candidateSlides, targetSlideCount);
  }

  if (isBenchmark) {
    const enBenchmarkTitle = `${headline} speedup.`;
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'gauge',
        satIcons,
        enTitle: enBenchmarkTitle,
        arTitle: `قفزة في أداء ${cleanTitle}`,
        enBody: `How an architectural redesign delivered ${metric1} faster execution and lowered infrastructure cost.`,
        arBody: `كيف حققت إعادة بناء المنظومة تسريعاً بنسبة ${arMetric1} مع خفض ملحوظ في تكلفة الموارد.`,
      },
      {
        type: 'metric',
        metricValue: metric1,
        metricLabel: 'PRODUCTION SPEEDUP',
        metricDiff: `▲ ${metric1} vs legacy baseline`,
        metricIcon: 'zap',
        enTitle: `${headline} benchmark win.`,
        arTitle: `قفزة في الأداء بنسبة ${arMetric1}`,
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
        arTitle: 'مقارنة معمارية الأنظمة',
        enBody: userPoint1,
        arBody: 'التحول من المعالجة الثقيلة المقيدة إلى بنية موزعة وخفيفة على الذاكرة.',
      },
      {
        type: 'code',
        codeFileName: 'bench_run.sh',
        codeLanguage: 'BASH',
        codeSnippet: `$ ./benchmark --workload=high-concurrency\n> Warming up virtual worktree...\n- Legacy tail latency: 240ms\n+ Optimized runtime latency: 12ms\n✔ Target throughput: ${metric1} [PASSED]`,
        enTitle: 'The core optimization in action.',
        arTitle: 'آلية التحسين أثناء التنفيذ',
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
        arTitle: 'فصل الحالة يمنع الاختناق',
        enBody: userPoint3,
        arBody: 'نقل العمليات الثقيلة إلى وحدات متخصصة يضمن استجابة فورية للمستخدمين.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'alertCircle', label: 'Trade-off' },
          { icon: 'gauge', label: 'Complexity' },
        ],
        enTitle: 'The Catch: When not to optimize.',
        arTitle: 'ما يجب معرفته قبل الانتقال',
        enBody: `Low-level optimization introduces cognitive overhead. Only adopt when profiling proves memory or p99 tail latency harms user workflows.`,
        arBody: `التحسين العميق يزيد من تعقيد الشيفرة؛ لا تطبقه إلا إذا أثبتت القياسات أن بطء الاستجابة يؤثر فعلياً على النظام.`,
      },
      {
        type: 'metric',
        metricValue: 'p99 < 1ms',
        metricLabel: 'TAIL LATENCY BENCHMARK',
        metricDiff: '▲ 99.9% requests stay sub-millisecond',
        metricIcon: 'gauge',
        enTitle: 'Profile p99 continuously.',
        arTitle: 'قاعدة مهندسي الاعتمادية SRE',
        enBody: `Never optimize based on averages. Track 99th percentile response times and memory allocations.`,
        arBody: 'لا تقيس الأداء بالمتوسطات؛ تتبع أبطأ 1% من الطلبات واستنزاف الذاكرة بشكل مستمر.',
      },
      {
        type: 'cta',
        enTitle: 'Benchmarking production systems?',
        arTitle: 'تقيس أداء أنظمتك التقنية؟',
        enBody: `Discuss benchmark profiling and systems optimization with engineers.`,
        arBody: `تواصل معنا لمناقشة تحليل الأداء وهندسة الأنظمة عالية الكفاءة.`,
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · ${domainCategory} Benchmark Report`,
        arCredit: `${brand} · تقرير قياس أداء ${domainCategory}`,
      },
    ];
    return trimSlides(candidateSlides, targetSlideCount);
  }

  if (isSecurity) {
    const enSecurityTitle = `${headline} vulnerability.`;
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'shieldAlert',
        satIcons,
        enTitle: enSecurityTitle,
        arTitle: `تشريح أمني لمنظومة ${cleanTitle}`,
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
        arTitle: 'تقييم خطورة الاستغلال الفعلي',
        enBody: `Distinguishing raw automated alerts from critical vulnerabilities attackers can genuinely reach.`,
        arBody: 'فرز التنبيهات الآلية لتحديد الثغرات الحرجة القابلة للاستغلال الحقيقي.',
      },
      {
        type: 'code',
        codeFileName: 'exploit_poc.py',
        codeLanguage: 'PYTHON',
        codeSnippet: `# CVE Validation & Defensive Proof\n$ python3 exploit_poc.py --target=staging\n- Payload triggered: unauthenticated memory read\n+ Applied patch: boundary validation active\n✔ Reachability: MITIGATED`,
        enTitle: 'Exploit mechanism and patch proof.',
        arTitle: 'آلية الاستغلال وإثبات الترقيع',
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
        arTitle: 'مسار الهجوم مقابل خط الدفاع',
        enBody: userPoint2,
        arBody: 'تحديد المسار الذي يمكن للمهاجم استغلاله مقارنة بنطاق العزل الأمني المعمول به.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'binary', label: 'Decompilation' },
          { icon: 'search', label: 'Static Analysis' },
        ],
        enTitle: 'Binary inspection and decompilation.',
        arTitle: 'فحص الشيفرة المترجمة',
        enBody: userPoint3,
        arBody: 'فحص ملفات النظام الثنائية للتأكد من عدم وجود مسارات تسريب غير مقصودة.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'shieldAlert', label: 'Reality Check' },
          { icon: 'lock', label: 'Defense' },
        ],
        enTitle: 'The Catch: Beyond vulnerability scans.',
        arTitle: 'حدود الحماية وأهمية الدفاع المتعدد',
        enBody: `Patching reachable CVEs is only half the battle. Without strict network isolation and least-privilege tokens, blast radius remains high.`,
        arBody: `ترقيع الثغرات ليس كافياً بمفرده؛ بدون عزل بيئات التشغيل وتقييد الصلاحيات، يبقى خطر الاختراق الداخلي قائماً.`,
      },
      {
        type: 'metric',
        metricValue: '95%',
        metricLabel: 'ATTACK SURFACE ELIMINATED',
        metricDiff: '▲ Prioritizing top 5% reachable CVEs',
        metricIcon: 'shieldAlert',
        enTitle: 'Fix reachable bugs first.',
        arTitle: 'قاعدة الأمان السيبراني الأساسية',
        enBody: `Fixing the 5% of reachable flaws provides 95% of real-world defensive protection for production stacks.`,
        arBody: 'معالجة الثغرات القابلة للوصول الفعلي تمنحك 95% من الحماية الحقيقية ضد الهجمات.',
      },
      {
        type: 'cta',
        enTitle: 'Building secure software stacks?',
        arTitle: 'تبني برمجيات آمنة ومحمية؟',
        enBody: `Connect with security researchers to harden your software supply chain.`,
        arBody: `تواصل معنا لمناقشة أمن البرمجيات وحماية بيئات التطوير والإنتاج.`,
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · ${domainCategory} Advisory`,
        arCredit: `${brand} · تقرير أمني في ${domainCategory}`,
      },
    ];
    return trimSlides(candidateSlides, targetSlideCount);
  }

  // General Systems & Architecture Default Template
  const enGeneralTitle = `${headline} overview.`;
  const candidateSlides: SlideData[] = [
    {
      type: 'hub',
      centerIcon,
      satIcons,
      enTitle: enGeneralTitle,
      arTitle: `هندسة منظومة ${cleanTitle}`,
      enBody: `How modern architecture patterns eliminate bottlenecks in ${domainCategory.toLowerCase()}.`,
      arBody: `كيف تساهم المعمارية الحديثة في معالجة نقاط الاختناق ورفع كفاءة وموثوقية النظام.`,
    },
    {
      type: 'metric',
      metricValue: metric1,
      metricLabel: 'PERFORMANCE MULTIPLIER',
      metricDiff: '▲ Measurable architectural speedup',
      metricIcon: 'zap',
      enTitle: `${headline} breakthrough.`,
      arTitle: `نقلة نوعية في الأداء`,
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
      codeLanguage: 'BASH',
      codeSnippet: `$ ./system-engine --mode=distributed\n> Initializing decentralized nodes...\n- Monolithic blocking state: 3400ms\n+ State synchronized across 3 zones: 24ms\n✔ 0 context switches detected`,
      enTitle: 'Decoupled state execution.',
      arTitle: 'فصل طبقة البيانات عن التنفيذ',
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
      arTitle: 'بنية تحتية مركزية ومحكمة',
      enBody: userPoint3,
      arBody: `نقل العمليات المعقدة إلى خوادم متخصصة يمنع التجمد وبطء الأجهزة الطرفية.`,
    },
    {
      type: 'row',
      icons: [
        { icon: 'alertCircle', label: 'The Catch' },
        { icon: 'layers', label: 'Complexity' },
      ],
      enTitle: 'The Catch: The operational cost.',
      arTitle: 'التكلفة التشغيلية الخفية',
      enBody: `Decoupled architectures trade local simplicity for network complexity. Ensure distributed tracing is configured before migration.`,
      arBody: `الأنظمة الموزعة تستبدل بساطة الكود بتعقيد الشبكة والمراقبة؛ تأكد من جاهزية أدوات الرصد قبل فصل البيانات.`,
    },
    {
      type: 'metric',
      metricValue: '10x',
      metricLabel: 'RELIABILITY MULTIPLIER',
      metricDiff: '▼ 90% reduced blast radius',
      metricIcon: 'activity',
      enTitle: 'Ship smaller, verify faster.',
      arTitle: 'انشر تغييرات أصغر، وتحقق أسرع',
      enBody: `Smaller incremental changesets reduce blast radius and make troubleshooting instantaneous.`,
      arBody: `التغييرات الصغيرة والمستمرة تقلل نطاق الأعطال وتجعل تتبع المشاكل وحلها فورياً.`,
    },
    {
      type: 'cta',
      enTitle: 'Engineering modern software architectures?',
      arTitle: 'تبني أنظمة برمجية حديثة؟',
      enBody: `Join the conversation and discuss technical architecture.`,
      arBody: `تواصل معنا لمناقشة التفاصيل الهندسية وأفضل الممارسات في بناء الأنظمة.`,
      ctaText: 'DM us  •  رسالة خاصة',
      url: brandUrl,
      enCredit: `${brand} · ${domainCategory} Deep Dive`,
      arCredit: `${brand} · دراسة تفصيلية في ${domainCategory}`,
    },
  ];
  return trimSlides(candidateSlides, targetSlideCount);
}
