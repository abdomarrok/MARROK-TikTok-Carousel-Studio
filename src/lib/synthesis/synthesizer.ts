import { CaptionVariant, CarouselData, ExtractedFact, HookVariant, PostSourceMeta, SlideData } from '../../types';
import {
  extractCleanHeadline,
  normalizePunctuation,
  sanitizeFullCarousel,
  sanitizeMetricForArabic,
  stripMarkdown,
} from '../text';
import {
  DEFAULT_RULE,
  DOMAIN_RULES,
  DomainRule,
  SynthesisInput,
  detectBrandAndUrl,
  extractDynamicIcons,
  extractUserInsights,
  resolveDomainTheme,
} from './domains';
import { enrichCarouselDiagrams } from './enrichment';
import { balanceCarouselVisualPacing } from './pacing';
import { buildCandidateSlides } from './templates';
import { buildCustomSynthesizedSlides, isCustomUserPrompt } from './customSynthesizer';

export function synthesizeCarousel(input: SynthesisInput): CarouselData {
  const rawText = (input.prompt || input.imageFileName || '').trim();
  const lowerText = rawText.toLowerCase();

  // 1. Scored Domain Detection via Config Rules (highest specificity wins)
  let bestScore = 0;
  let matchedRule: DomainRule | undefined;

  for (const rule of DOMAIN_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      const kwRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (kwRegex.test(lowerText)) {
        if (['zero-trust', 'zerotrust', 'mtls', 'scion', 'monorepo', 'redis', 'redis 8', 'valkey', 'ebpf', 'cve', 'actix', 'gin', 'rust', 'go'].includes(kw)) {
          score += 10;
        } else {
          score += 2;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      matchedRule = rule;
    }
  }

  if (input.categoryHint && input.categoryHint !== 'auto') {
    const hintMatch = DOMAIN_RULES.find((r) => r.category.includes(input.categoryHint!));
    matchedRule = hintMatch || {
      ...DEFAULT_RULE,
      category: input.categoryHint.toUpperCase(),
    };
  }

  const autoTheme = resolveDomainTheme(rawText);
  const activeRule = bestScore > 0 && matchedRule ? matchedRule : DEFAULT_RULE;
  const domainCategory = activeRule.category;
  const recommendedTheme = bestScore > 0 && matchedRule ? activeRule.theme : autoTheme;

  // Extract smart subject-aware dynamic icons
  const { centerIcon, satIcons } = extractDynamicIcons(lowerText, activeRule.satIcons);

  // 2. Strict Brand Wordmark (Always MARROK per Spec)
  const { brand, brandUrl } = detectBrandAndUrl(lowerText);

  // 3. Extract Clean Title and User Points
  const { headline, cleanTitle } = extractCleanHeadline(rawText, domainCategory);

  const { lines, metrics } = extractUserInsights(rawText);
  const userPoint1 = lines[0] || `Scaling ${cleanTitle} requires rethinking state isolation and memory allocation patterns.`;
  const userPoint2 = lines[1] || `Decoupled authoritative state ensures compute resources scale with actual payload size.`;
  const userPoint3 = lines[2] || `Offloading intensive runtime computations eliminates user-facing latency stalls.`;

  const rawMetric1 = metrics[0] || activeRule.metricFallback;
  const metric1 = normalizePunctuation(stripMarkdown(rawMetric1)).replace(/[.?!]+$/, '');
  const arMetric1 = sanitizeMetricForArabic(metric1);

  // 4. Content Blueprint Classification
  const isZeroTrust =
    lowerText.includes('zero-trust') ||
    lowerText.includes('zerotrust') ||
    lowerText.includes('mtls') ||
    lowerText.includes('mutual-tls') ||
    lowerText.includes('least-privilege');

  const isRedis =
    lowerText.includes('redis') ||
    lowerText.includes('valkey') ||
    lowerText.includes('memcached');

  const isScion =
    lowerText.includes('scion') ||
    (lowerText.includes('anthropic') && lowerText.includes('git')) ||
    (lowerText.includes('beyond git') && lowerText.includes('vcs'));

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
    lowerText.includes('replace');

  // 5. Determine Dynamic Slide Count (Spec §7: 8 slides standard for technical narrative arc)
  let targetSlideCount = 8;
  if (lines.length <= 1 && rawText.length < 80) {
    targetSlideCount = 6;
  }

  // 6. Generate Rich, Multi-Archetype Slide Structure
  const isCustom = isCustomUserPrompt(rawText);
  let slides: SlideData[];

  if (isCustom) {
    slides = buildCustomSynthesizedSlides(rawText, {
      brand,
      brandUrl,
      targetSlideCount,
    });
  } else {
    slides = buildCandidateSlides({
      isZeroTrust,
      isRedis,
      isScion,
      isBenchmark,
      isSecurity,
      isMigration,
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
    });
  }

  // Strict Safety Invariant: Guarantee Slide 1 is hub, final slide is cta, and NO mid-deck slide has type 'cta'
  slides = slides.map((s, idx) => {
    if (idx === 0) return { ...s, type: 'hub' };
    if (idx === slides.length - 1) return { ...s, type: 'cta' };
    if (s.type === 'cta' || s.type === 'hub') return { ...s, type: 'row' };
    return s;
  });

  // Dynamic Diagram & Satellite Enrichment: Guarantee 100% topic relevance on every slide
  slides = enrichCarouselDiagrams(slides, rawText, domainCategory, brand);
  slides = balanceCarouselVisualPacing(slides);

  // 7. Generate Hook Variants (A/B testing) adhering strictly to 2-5 words ending in a period
  const hookVariants: HookVariant[] = [
    {
      tag: 'Curiosity & Shift',
      enTitle: isCustom ? `${headline}` : isZeroTrust ? 'Zero-Trust, explained.' : isRedis ? 'Redis 8 gets faster.' : isScion ? 'Beyond traditional Git.' : `${headline}.`,
      arTitle: isCustom ? (slides[0]?.arTitle || `هندسة ${cleanTitle}`) : isZeroTrust ? 'شرح معمارية Zero-Trust' : isRedis ? 'تسريع محرك Redis 8' : isScion ? 'منظومة Scion لإدارة الشيفرات' : `هندسة منظومة ${cleanTitle}`,
      enBody: isCustom ? (slides[0]?.enBody || `How architectural redesign achieved ${metric1}.`) : `How engineering constraints forced an architectural paradigm shift in ${domainCategory.toLowerCase()}.`,
      arBody: isCustom ? (slides[0]?.arBody || `كيف أدت التحديات الهندسية إلى إعادة التفكير بالكامل في بنية النظام.`) : `كيف أدت التحديات الهندسية إلى إعادة التفكير بالكامل في بنية النظام.`,
      centerIcon: slides[0]?.centerIcon || centerIcon,
    },
    {
      tag: 'Hard Metrics & Scale',
      enTitle: isCustom ? `${cleanTitle} telemetry.` : isZeroTrust ? 'mTLS encryption at scale.' : isRedis ? 'Redis 8 throughput record.' : 'Performance telemetry at scale.',
      arTitle: isCustom ? `أرقام أداء ${cleanTitle}` : isZeroTrust ? 'تأمين الشبكات عند التوسع' : isRedis ? 'رقم قياسي في سرعة المعالجة' : 'معايير الأداء عند أقصى ضغط',
      enBody: `Key benchmarks (${metric1}) and lessons learned from high-throughput production.`,
      arBody: `أهم معايير الأداء والدروس المستفادة (${arMetric1}) من تشغيل الأنظمة تحت ضغط هائل.`,
      centerIcon: 'gauge',
    },
    {
      tag: 'Problem & Solution',
      enTitle: isCustom ? `Overcoming ${cleanTitle} limits.` : isZeroTrust ? 'Why perimeter firewalls failed.' : isRedis ? 'Eliminating memory bottlenecks.' : 'Overcoming legacy system limits.',
      arTitle: isCustom ? `تجاوز اختناقات الأداء` : isZeroTrust ? 'لماذا فشلت الجدران النارية التقليدية؟' : isRedis ? 'التخلص من اختناقات الذاكرة' : 'تجاوز حدود الأنظمة السابقة',
      enBody: `Moving beyond legacy assumptions to build modern high-efficiency software.`,
      arBody: `تجاوز الأساليب القديمة لبناء برمجيات عالية الكفاءة والأمان.`,
      centerIcon: 'shieldAlert',
    },
  ];

  // 8. Generate Dual Captions with Extracted Specifics & Grounding Citations
  const domainTag = domainCategory.replace(/[^a-zA-Z0-9]/g, '');
  const brandTag = brand.replace(/[^a-zA-Z0-9]/g, '');
  const hashtags = `#TechInArabic #هندسة_البرمجيات #${domainTag} #SoftwareEngineering #DevSecOps #TechTrends #SystemDesign #${brandTag} #برمجة`;

  const domainGroundingSources: { title: string; url: string }[] = [];
  const domainGroundingQueries: string[] = [
    `${brand} ${domainCategory} architecture benchmark`,
    `${headline} implementation production trade-offs`,
    `${domainCategory} performance telemetry`,
  ];

  if (domainCategory.includes('KERNEL') || domainCategory.includes('OBSERVABILITY')) {
    domainGroundingSources.push(
      { title: 'The Linux Kernel Archives', url: 'https://kernel.org' },
      { title: 'eBPF Documentation & Specifications', url: 'https://ebpf.io/what-is-ebpf' },
      { title: 'IOVisor Kernel Tracing Tools', url: 'https://github.com/iovisor/bcc' }
    );
  } else if (domainCategory.includes('REVERSE') || domainCategory.includes('EXPLOITS') || domainCategory.includes('SECURITY')) {
    domainGroundingSources.push(
      { title: 'NVD National Vulnerability Database', url: 'https://nvd.nist.gov' },
      { title: 'MITRE CVE Program', url: 'https://cve.mitre.org' },
      { title: 'NSA Ghidra Software Reverse Engineering', url: 'https://github.com/NationalSecurityAgency/ghidra' }
    );
  } else if (domainCategory.includes('AI') || domainCategory.includes('INFERENCE') || domainCategory.includes('VCS')) {
    domainGroundingSources.push(
      { title: `${brand} Engineering & Research`, url: brandUrl ? `https://${brandUrl}` : 'https://anthropic.com/research' },
      { title: 'ACM Digital Library Systems Architecture', url: 'https://dl.acm.org' },
      { title: 'GitHub Open Engineering Specifications', url: 'https://github.com' }
    );
  } else if (domainCategory.includes('DISTRIBUTED') || domainCategory.includes('STORAGE')) {
    domainGroundingSources.push(
      { title: 'ClickHouse Architecture & Vector Engines', url: 'https://clickhouse.com/docs' },
      { title: 'PostgreSQL Global Development Group', url: 'https://www.postgresql.org/docs/' },
      { title: 'Apache Kafka Distributed Event Streaming', url: 'https://kafka.apache.org' }
    );
  } else {
    domainGroundingSources.push(
      { title: `${brand} Technical Documentation`, url: brandUrl ? `https://${brandUrl}` : 'https://marrok.org' },
      { title: 'USENIX Association Systems Research', url: 'https://www.usenix.org' }
    );
  }

  const extractedFacts: ExtractedFact[] = [
    {
      text: `Primary architectural domain: ${domainCategory}`,
      type: 'claim',
      verified: 'unverified',
      evidence: `Synthesizer domain heuristics (unverified offline draft)`,
      sourceTitle: domainGroundingSources[0]?.title || `${brand} Engineering`,
      sourceUrl: domainGroundingSources[0]?.url || `https://${brandUrl}`,
    },
    {
      text: `Primary engineering source / brand: ${brand}`,
      type: 'name',
      verified: 'unverified',
      evidence: `Identified from technical publication reference (${brandUrl})`,
      sourceTitle: `${brand} Official Portal`,
      sourceUrl: brandUrl ? `https://${brandUrl}` : 'https://marrok.org',
    },
    {
      text: `Production benchmark / headline metric: ${metric1}`,
      type: 'number',
      verified: 'unverified',
      evidence: `Fallback estimate — ungrounded local synthesizer metric`,
      sourceTitle: domainGroundingSources[0]?.title || 'Performance Telemetry',
      sourceUrl: domainGroundingSources[0]?.url || `https://${brandUrl}`,
    },
    {
      text: `Core architectural mechanism: ${userPoint1}`,
      type: 'claim',
      verified: 'unverified',
      evidence: `Template fallback — not grounded via live web search`,
      sourceTitle: domainGroundingSources[1]?.title || 'Architecture Whitepaper',
      sourceUrl: domainGroundingSources[1]?.url || `https://${brandUrl}`,
    },
    {
      text: `Operational trade-offs and limits identified for Slide 6: ${userPoint2}`,
      type: 'claim',
      verified: 'unverified',
      evidence: `Spec §7 "Before You Switch / The Catch" hedge (offline draft)`,
      sourceTitle: domainGroundingSources[0]?.title || 'Systems Report',
      sourceUrl: domainGroundingSources[0]?.url || `https://${brandUrl}`,
    },
  ];

  const slide1ArHeader = (slides[0]?.arTitle || headline).replace(/[:.]\s*\n+/g, ' — ').replace(/\n+/g, ' — ').trim();
  const slide1EnHeader = (slides[0]?.enTitle || headline).replace(/[:.]\s*\n+/g, ' — ').replace(/\n+/g, ' — ').replace(/[:.]\s*$/, '').trim();

  const formattedBilingualCaption = `⚡ ${slide1ArHeader}
تحليل تقني ومعماري متعمق لأحدث نقلة برمجية 🛠️

${slide1EnHeader} — Engineering Deep Dive
Why traditional architectures stall at scale and how modern systems solve the bottleneck.

🔹 أبرز آليات العمل والنتائج / Key Technical Takeaways:
• Domain: ${domainCategory}
• Core Mechanism: ${userPoint1}
• Production Win: ${metric1} vs legacy stack
• Caveats: ${userPoint2}

⚠️ Citations & Draft Facts (Offline Synthesizer Estimate):
• Unverified offline draft — creator review required before publishing
• Source: ${domainGroundingSources[0]?.title || brand} (${domainGroundingSources[0]?.url || brandUrl})

👇 هل واجهتم هذه المشكلة في بيئات الإنتاج عندكم؟ شاركونا تجربتكم في التعليقات!
What's your take on this architecture? Share below!

🎥 مرجع التحليل والتوثيق / Reference: ${brandUrl ? `https://${brandUrl}` : 'https://marrok.org'}

${hashtags}`;

  const captionVariants: CaptionVariant[] = [
    {
      style: 'Executive Bulletins & Hard Metrics (Recommended)',
      caption: formattedBilingualCaption,
    },
    {
      style: 'Narrative Breakdown & Story',
      caption: `ماذا يحدث عندما تصل الأنظمة التقليدية إلى حدودها القصوى؟ 🚨
الحل ليس الترقيع، بل إعادة التفكير في المعمارية البرمجية من الصفر.

في هذا التحليل المفصل حول ${headline}، نستعرض كيف نجحت الفرق الهندسية في تحقيق ${metric1} مع تفادي نقاط الاختناق الشائعة.

اسحب الصور لمتابعة الشرح خطوة بخطوة 👉
Swipe through the slides for the complete breakdown!

🔗 المرجع والمصدر: https://${brandUrl}

${hashtags}`,
    },
  ];

  const firstComment = `🔗 Primary source documentation & reference post: https://${brandUrl}\n\nWhat are your thoughts on this architecture? Share your take below 👇`;
  const shortCaption = `${slide1ArHeader} ⚡\n${slide1EnHeader} — Swipe through the breakdown 👉`;
  const screenHook = `${slide1EnHeader} in 60s`;

  const sourceMeta: PostSourceMeta = {
    type: (input.inputMode === 'upload' || Boolean(input.imageFileName)) ? 'screenshot' : (rawText.length > 400 ? 'article' : 'notes'),
    title: headline,
    creator: brand,
    url: brandUrl ? `https://${brandUrl}` : 'https://marrok.org',
    published: new Date().toISOString().split('T')[0],
    isSearchGrounded: false,
    groundingQueries: domainGroundingQueries,
    groundingSources: domainGroundingSources,
    isFallback: true,
    engine: 'offline-synthesizer',
    status: 'unverified_draft',
    userReviewed: false,
  };

  const notesForHuman: string[] = [
    `Unverified offline draft: Synthesized from offline domain heuristics without active web search grounding. Verify all numbers and claims before publication.`,
    `Review and customize slide copy using the studio editor, or connect a Gemini API key for live search-grounded research.`,
    `Bilingual Arabic typography checked for RTL line-endings and numbers positioned per Spec §9.`,
    `Attribution and link included in pinned first comment for TikTok comment section.`,
  ];

  const scheduleSlot = '18:00–21:00 ME / 16:00–19:00 UTC (Peak developer engagement)';

  return sanitizeFullCarousel({
    theme: recommendedTheme,
    category: domainCategory,
    brand,
    brandUrl,
    caption: captionVariants[0].caption,
    firstComment,
    shortCaption,
    screenHook,
    sourceMeta,
    facts: extractedFacts,
    notesForHuman,
    scheduleSlot,
    captionVariants,
    hookVariants,
    slides,
  });
}
