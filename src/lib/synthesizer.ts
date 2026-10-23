import { CarouselData, SlideData, HookVariant, CaptionVariant } from '../types';

interface SynthesisInput {
  prompt?: string;
  imageFileName?: string;
  categoryHint?: string;
  inputMode?: string;
}

/**
 * MARROK Context-Driven Content Synthesizer
 * Dynamically analyzes multimodal prompt / text / notes to detect the exact
 * engineering domain, recommended theme palette, and tailored bilingual slides.
 */
export function synthesizeCarousel(input: SynthesisInput): CarouselData {
  const rawText = (input.prompt || input.imageFileName || '').trim();
  const lowerText = rawText.toLowerCase();

  // 1. Dynamic Domain & Category Extraction
  let domainCategory = 'SYSTEMS ARCHITECTURE';
  let recommendedTheme = 'teal';
  let centerIcon = 'cpu';
  let satIcons = ['database', 'server', 'gitMerge', 'changesets', 'robot', 'gauge'];

  if (input.categoryHint && input.categoryHint !== 'auto' && input.categoryHint !== 'AI + ENGINEERING' && input.categoryHint !== 'AI + SECURITY') {
    domainCategory = input.categoryHint.toUpperCase();
  } else if (lowerText.includes('kernel') || lowerText.includes('ebpf') || lowerText.includes('c/c++') || lowerText.includes('assembly') || lowerText.includes('xdp')) {
    domainCategory = 'LINUX KERNEL & OBSERVABILITY';
    recommendedTheme = 'emerald';
    centerIcon = 'terminal';
    satIcons = ['cpu', 'lock', 'server', 'gauge', 'binary', 'codeFile'];
  } else if (lowerText.includes('cve') || lowerText.includes('exploit') || lowerText.includes('revers') || lowerText.includes('binary') || lowerText.includes('ghidra') || lowerText.includes('ida') || lowerText.includes('malware') || lowerText.includes('zero-day')) {
    domainCategory = 'REVERSE ENGINEERING & EXPLOITS';
    recommendedTheme = 'cyber';
    centerIcon = 'shieldAlert';
    satIcons = ['binary', 'search', 'lock', 'alerts', 'eyeRisk', 'terminal'];
  } else if (lowerText.includes('llm') || lowerText.includes('gpt') || lowerText.includes('inference') || lowerText.includes('token') || lowerText.includes('deep learning') || lowerText.includes('weights') || lowerText.includes('transformer')) {
    domainCategory = 'AI MODELS & INFERENCE';
    recommendedTheme = 'violet';
    centerIcon = 'brain';
    satIcons = ['cpu', 'robot', 'database', 'lightbulb', 'gauge', 'changesets'];
  } else if (lowerText.includes('kubernetes') || lowerText.includes('k8s') || lowerText.includes('container') || lowerText.includes('cloud') || lowerText.includes('docker') || lowerText.includes('webhook')) {
    domainCategory = 'KUBERNETES & CLOUD SEC';
    recommendedTheme = 'blueprint';
    centerIcon = 'server';
    satIcons = ['lock', 'database', 'shieldAlert', 'gitMerge', 'alerts', 'gauge'];
  } else if (lowerText.includes('consensus') || lowerText.includes('raft') || lowerText.includes('paxos') || lowerText.includes('database') || lowerText.includes('distributed') || lowerText.includes('kafka') || lowerText.includes('replication')) {
    domainCategory = 'DISTRIBUTED SYSTEMS & STORAGE';
    recommendedTheme = 'amber';
    centerIcon = 'database';
    satIcons = ['server', 'gitMerge', 'cpu', 'changesets', 'clock', 'scales'];
  } else if (lowerText.includes('git') || lowerText.includes('vcs') || lowerText.includes('monorepo') || lowerText.includes('ci/cd') || lowerText.includes('devops') || lowerText.includes('scion')) {
    domainCategory = 'VCS & DEVSECOPS';
    recommendedTheme = 'teal';
    centerIcon = 'gitMerge';
    satIcons = ['server', 'cpu', 'database', 'changesets', 'terminal', 'gauge'];
  } else if (lowerText.includes('security') || lowerText.includes('appsec') || lowerText.includes('vulnerability') || lowerText.includes('defectdojo')) {
    domainCategory = 'DEVSECOPS & VULNERABILITY';
    recommendedTheme = 'cyber';
    centerIcon = 'shieldAlert';
    satIcons = ['funnel', 'alerts', 'eyeRisk', 'search', 'lock', 'terminal'];
  }

  // 2. Extract Clean Title and Concept Terms
  let cleanTitle = rawText.replace(/^https?:\/\/\S+/gi, '').split('\n')[0].trim();
  if (cleanTitle.length > 60) {
    cleanTitle = cleanTitle.slice(0, 57) + '...';
  }
  if (!cleanTitle || cleanTitle.length < 4) {
    cleanTitle = domainCategory.split('&')[0].trim();
  }

  // Format clean headline (2-6 words)
  const words = cleanTitle.split(/\s+/);
  const headline = words.slice(0, 5).join(' ');

  // 3. Generate Hook Variants (A/B testing)
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
      enBody: `Key benchmarks and infrastructure lessons learned from high-throughput production.`,
      arBody: `أهم معايير الأداء والدروس المستفادة من تشغيل الأنظمة تحت ضغط هائل.`,
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

  // 4. Generate 8 Archetype-Compliant Slides
  const slides: SlideData[] = [
    // Slide 1: Archetype 1 (Hub)
    {
      type: 'hub',
      centerIcon,
      satIcons,
      enTitle: `${headline}:\nNext-Gen Shift.`,
      arTitle: `${headline}:\nالنقلة النوعية الجديدة.`,
      enBody: `A breakdown of technical mechanisms, benchmarks, and production architecture.`,
      arBody: `تحليل عميق للبنية التحتية، معايير السرعة، وأهم الدروس العملية.`,
      url: 'marrok.org',
    },
    // Slide 2: Archetype 2 (Row - 1 Icon)
    {
      type: 'row',
      icons: [{ icon: centerIcon, label: 'The Bottleneck' }],
      enTitle: 'Where legacy approaches hit limits.',
      arTitle: 'أين تتوقف الأنظمة التقليدية؟',
      enBody: `When scale and frequency increase 100x, traditional tools become CPU and memory bottlenecks.`,
      arBody: `عندما يتضاعف حجم البيانات ومعدل العمليات 100 ضعف، تصبح الأدوات السابقة عائقاً في الذاكرة والمعالج.`,
      url: 'marrok.org',
    },
    // Slide 3: Archetype 3 (Row - 2 Icons)
    {
      type: 'row',
      icons: [
        { icon: satIcons[0] || 'database', label: 'Storage' },
        { icon: satIcons[1] || 'server', label: 'Execution' },
      ],
      enTitle: 'Decoupling the data layer.',
      arTitle: 'فصل طبقة البيانات عن التنفيذ.',
      enBody: `By treating state independently, operations become proportional only to modified elements.`,
      arBody: `من خلال إدارة الحالة بشكل مستقل، تصبح العمليات مرتبطة فقط بالملفات المعدلة دون إهدار الموارد.`,
      url: 'marrok.org',
    },
    // Slide 4: Archetype 2 (Row - 1 Icon)
    {
      type: 'row',
      icons: [{ icon: satIcons[2] || 'terminal', label: 'The Mechanism' }],
      enTitle: 'Server-side authoritative design.',
      arTitle: 'بنية تحتية مركزية ومحكمة.',
      enBody: `Offloading complex computations to high-performance servers prevents client stalls.`,
      arBody: `نقل العمليات المعقدة إلى خوادم متخصصة يمنع التجمد وبطء الأجهزة الطرفية.`,
      url: 'marrok.org',
    },
    // Slide 5: Archetype 4 (Row - 3 Icons)
    {
      type: 'row',
      icons: [
        { icon: satIcons[3] || 'gauge', label: 'Low Latency' },
        { icon: satIcons[4] || 'lock', label: 'Resilient' },
        { icon: satIcons[5] || 'cpu', label: 'Scalable' },
      ],
      enTitle: 'The 3 engineering pillars.',
      arTitle: 'الأعمدة الثلاثة للهندسة الحديثة.',
      enBody: `Low latency execution, fault tolerance, and zero-downtime scalability across environments.`,
      arBody: `استجابة سريعة، استمرارية في العمل عند الأعطال، وقابلية توسع مرنة في جميع البيئات.`,
      url: 'marrok.org',
    },
    // Slide 6: Archetype 2 (Row - 1 Icon)
    {
      type: 'row',
      icons: [{ icon: 'eyeRisk', label: 'Key Finding' }],
      enTitle: 'Measure true production impact.',
      arTitle: 'قياس الأثر الفعلي على الإنتاج.',
      enBody: `Optimization without profiling is guessing. Track p99 latency and allocation rates continuously.`,
      arBody: `التحسين بدون قياس مجرد تخمين؛ تتبع أداء p99 ومعدلات استهلاك الذاكرة بشكل مستمر.`,
      url: 'marrok.org',
    },
    // Slide 7: Archetype 3 (Row - 2 Icons)
    {
      type: 'row',
      icons: [
        { icon: 'lightbulb', label: 'Core Rule' },
        { icon: 'changesets', label: 'Deployment' },
      ],
      enTitle: 'Ship smaller, verify faster.',
      arTitle: 'انشر تغييرات أصغر، وتحقق أسرع.',
      enBody: `Smaller incremental changesets reduce blast radius and make troubleshooting instantaneous.`,
      arBody: `التغييرات الصغيرة والمستمرة تقلل نطاق الأعطال وتجعل تتبع المشاكل وحلها فورياً.`,
      url: 'marrok.org',
    },
    // Slide 8: Archetype 5 (CTA Slide)
    {
      type: 'cta',
      enTitle: `Engineering ${domainCategory.toLowerCase()}?`,
      arTitle: `تبني أنظمة في مجال ${domainCategory}؟`,
      enBody: `Join the conversation and discuss technical architecture.`,
      arBody: `تواصل معنا لمناقشة التفاصيل الهندسية وأفضل الممارسات.`,
      ctaText: 'DM us  •  رسالة خاصة',
      url: 'marrok.org',
      enCredit: `marrok.org · ${domainCategory} Deep Dive`,
      arCredit: `marrok.org · دراسة تفصيلية في ${domainCategory}`,
    },
  ];

  // 5. Generate Dual Captions
  const hashtags = `#${domainCategory.replace(/[^a-zA-Z0-9]/g, '')} #SoftwareEngineering #DevSecOps #TechTrends #SystemDesign #TechInArabic #هندسة_البرمجيات #MARROK`;

  const captionVariants: CaptionVariant[] = [
    {
      style: 'Executive Bulletins & Hard Metrics',
      caption: `${headline}: A technical deep dive 🚀
نظرة هندسية متعمقة على ${headline}

Key Mechanisms & Takeaways / أبرز النقاط:
• Domain: ${domainCategory}
• Bottlenecks: Legacy architectures struggle at 100x frequency
• Solution: Decoupled authoritative state and optimized resource footprint
• Practical Rule: Fix critical paths and measure true remediation

Source: Engineering Architecture Notes
Full analysis at marrok.org

${hashtags}`,
    },
    {
      style: 'Narrative Breakdown & Story',
      caption: `What happens when systems hit their limits? You don't just patch them; you rethink the architecture from the ground up. 🛠️

In this breakdown of ${headline}, we examine why traditional approaches create bottlenecks and how modern engineering patterns solve them with high efficiency.

Swipe through the slides for the full architectural teardown.
Read more: marrok.org

${hashtags}`,
    },
  ];

  return {
    theme: recommendedTheme,
    category: domainCategory,
    caption: captionVariants[0].caption,
    captionVariants,
    hookVariants,
    slides,
  };
}
