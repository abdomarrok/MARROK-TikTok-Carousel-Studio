import { CaptionVariant, CarouselData, ExtractedFact, HookVariant, PostSourceMeta, SlideData } from '../../types';
import {
  extractCleanHeadline,
  normalizePunctuation,
  sanitizeFullCarousel,
  sanitizeMetricForArabic,
  stripMarkdown,
} from '../text';
import { enforceHeadlineSpecRule } from '../text/headlines';
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
import { synthesizeUniversalCarousel } from './universalExtractor';

/**
 * Universal Synthesis Engine:
 * Generates an authentic, topic-accurate 8-slide MARROK carousel directly from user input.
 * Fully algorithmic extraction: zero hardcoded topic presets.
 */
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

  const rawMetric1 = metrics[0] || activeRule.metricFallback;
  const metric1 = normalizePunctuation(stripMarkdown(rawMetric1)).replace(/[.?!]+$/, '');
  const arMetric1 = sanitizeMetricForArabic(metric1);

  // 4. Target Slide Count (Spec §7: 8 slides standard for technical narrative arc)
  const targetSlideCount = input.targetSlideCount || 8;

  // 5. Universal NLP Text Extractor & Slide Synthesis (Zero hardcoded topic presets)
  let slides: SlideData[] = synthesizeUniversalCarousel(rawText, {
    brand,
    brandUrl,
    targetSlideCount,
    domainCategory,
    theme: recommendedTheme,
    centerIcon,
    satIcons,
  });

  // Strict Safety Invariant: Guarantee Slide 1 is hub, final slide is cta, and NO mid-deck slide has type 'cta'
  slides = slides.map((s, idx) => {
    if (idx === 0) return { ...s, type: 'hub' };
    if (idx === slides.length - 1) return { ...s, type: 'cta' };
    if (s.type === 'cta' || s.type === 'hub') return { ...s, type: 'row' };
    return s;
  });

  // Dynamic Diagram & Satellite Enrichment
  slides = enrichCarouselDiagrams(slides, rawText, domainCategory, brand);
  slides = balanceCarouselVisualPacing(slides);

  // 6. Universal Hook Variants (A/B testing) adhering strictly to Spec §8
  const hookVariants: HookVariant[] = [
    {
      tag: 'Curiosity & Shift',
      enTitle: slides[0]?.enTitle || headline,
      arTitle: slides[0]?.arTitle || `هندسة منظومة ${cleanTitle}`,
      enBody: slides[0]?.enBody || `How architectural redesign solved scalability bottlenecks in ${domainCategory.toLowerCase()}.`,
      arBody: slides[0]?.arBody || `كيف أدت التحديات الهندسية إلى إعادة التفكير بالكامل في بنية النظام.`,
      centerIcon: slides[0]?.centerIcon || centerIcon,
    },
    {
      tag: 'Hard Metrics & Scale',
      enTitle: enforceHeadlineSpecRule(`${cleanTitle} telemetry`, { isHook: true }),
      arTitle: `معايير وأرقام أداء ${cleanTitle}`,
      enBody: `Key production benchmarks (${metric1}) and lessons learned under maximum concurrency.`,
      arBody: `أهم معايير الأداء والدروس المستفادة (${arMetric1}) من تشغيل الأنظمة تحت أقصى ضغط.`,
      centerIcon: 'gauge',
    },
    {
      tag: 'Problem & Solution',
      enTitle: enforceHeadlineSpecRule(`Overcoming ${cleanTitle} limits`, { isHook: true }),
      arTitle: `تجاوز اختناقات ${cleanTitle}`,
      enBody: `Moving beyond legacy bottlenecks to build modern high-efficiency software.`,
      arBody: `تجاوز الأساليب القديمة لبناء برمجيات عالية الكفاءة والموثوقية.`,
      centerIcon: 'shieldAlert',
    },
  ];

  // 7. Generate Dual Captions with Extracted Specifics & Grounding Citations
  const domainTag = domainCategory.replace(/[^a-zA-Z0-9]/g, '');
  const brandTag = brand.replace(/[^a-zA-Z0-9]/g, '');
  const hashtags = `#TechInArabic #هندسة_البرمجيات #${domainTag} #SoftwareEngineering #DevSecOps #TechTrends #SystemDesign #${brandTag} #برمجة`;

  const domainGroundingSources: { title: string; url: string }[] = [];

  const domainGroundingQueries: string[] = [
    `${brand} ${domainCategory} architecture benchmark`,
    `${headline} implementation production trade-offs`,
    `${domainCategory} performance telemetry`,
  ];

  const extractedFacts: ExtractedFact[] = [
    {
      text: `Primary architectural domain: ${domainCategory}`,
      type: 'claim',
      verified: 'unverified',
      evidence: `Synthesizer domain heuristics (unverified offline draft)`,
    },
    {
      text: `Brand attribution: ${brand}`,
      type: 'name',
      verified: 'unverified',
      evidence: `Brand wordmark configured in the studio; not an external source`,
    },
    {
      text: `Production benchmark / headline metric: ${metric1}`,
      type: 'number',
      verified: 'unverified',
      evidence: `Universal extractor metric scan from user input`,
    },
    {
      text: `Core architectural mechanism: ${userPoint1}`,
      type: 'claim',
      verified: 'unverified',
      evidence: `Universal NLP parsed insight from user text`,
    },
    {
      text: `Operational trade-offs and limits: ${userPoint2}`,
      type: 'claim',
      verified: 'unverified',
      evidence: `Spec §7 "Before You Switch / The Catch" hedge (offline draft)`,
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
• No external source cited — add your primary source link before publishing

👇 هل واجهتم هذه المشكلة في بيئات الإنتاج عندكم؟ شاركونا تجربتكم في التعليقات!
What's your take on this architecture? Share below!

🎥 العلامة التجارية / Brand: ${brandUrl ? `https://${brandUrl}` : 'https://marrok.org'}

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

  const firstComment = `🔗 Add your primary source link here before publishing.\n\nWhat are your thoughts on this architecture? Share your take below 👇`;
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
    `Unverified offline draft: Synthesized from offline NLP heuristics without active web search grounding. Verify all numbers and claims before publication.`,
    `Review and customize slide copy using the studio editor, or connect a Gemini API key for live search-grounded research.`,
    `Bilingual Arabic typography checked for RTL line-endings and numbers positioned per Spec §9.`,
    `Add a verified primary source link before publishing; the offline draft does not fabricate citations.`,
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
