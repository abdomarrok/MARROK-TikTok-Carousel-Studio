import { describe, it, expect } from 'vitest';
import type { CarouselData, SlideData } from '../types.ts';
import { condenseCarouselToSingleSlide, seedSingleSlideTakeaways } from '../lib/synthesis/singleSlideCondenser.ts';
import { runQAChecks, CHAR_LIMITS, SINGLE_SLIDE_CHAR_LIMITS } from '../lib/qaChecks.ts';
import { computeSlideLayoutAwareness } from '../lib/canvas/layoutAwareness.ts';
import { computeSlideElementBounds, findSlideElementAtPoint } from '../lib/canvas/layoutBounds.ts';

describe('Single-Slide Post & Infographic Poster System', () => {
  const sample8SlideCarousel: CarouselData = {
    theme: 'security',
    category: 'CYBERSECURITY & DEFENSE',
    brand: 'MARROK',
    brandUrl: 'marrok.org',
    caption: 'Zero-Trust Architecture Breakdown',
    slides: [
      {
        type: 'hub',
        enTitle: 'Zero-Trust Architecture at Scale.',
        arTitle: 'معمارية انعدام الثقة في الأنظمة الضخمة.',
        enBody: 'Traditional perimeter defense fails when internal networks are compromised.',
        arBody: 'تنهار الدفاعات المحيطية التقليدية فور اختراق الشبكة الداخلية.',
        diagramVariant: 'topology',
        diagramNodes: [
          { label: 'Policy Engine', sublabel: 'Cryptographic PDP', status: 'ACTIVE', icon: 'shield' },
          { label: 'Enforcement Point', sublabel: 'Envoy Sidecar PEP', status: 'ROUTED', icon: 'server' },
          { label: 'Data Plane', sublabel: 'Mutual TLS Bus', status: 'VERIFIED', icon: 'lock' },
        ],
      },
      {
        type: 'metric',
        metricValue: '99.99%',
        metricLabel: 'POLICY COMPLIANCE',
        metricDiff: '▲ 40% vs legacy VPN',
        metricIcon: 'shield',
        enTitle: 'Continuous Cryptographic Verification.',
        arTitle: 'التحقق التشفيري المستمر.',
        enBody: 'Every request is authenticated and authorized dynamically before access.',
        arBody: 'يتم فحص وتوثيق كل طلب برمجياً قبل منحه حق الوصول.',
      },
      {
        type: 'code',
        enTitle: 'Mutual TLS Handshake Configuration.',
        arTitle: 'إعدادات مصافحة TLS الثنائية.',
        enBody: 'Strict mTLS certificates prevent spoofing across service boundaries.',
        arBody: 'شهادات mTLS الصارمة تمنع انتحال الهوية عبر حدود الخدمات.',
      },
      {
        type: 'compare',
        enTitle: 'Perimeter vs Zero-Trust Model.',
        arTitle: 'المقارنة بين الدفاع المحيطي وانعدام الثقة.',
        enBody: 'Castle-and-moat security assumes internal trust, whereas zero-trust verifies all.',
        arBody: 'يفترض الأسلوب القديم ثقة غير مبررة في الداخل بينما يدقق الأسلوب الحديث في كل اتصال.',
      },
      {
        type: 'row',
        diagramVariant: 'isolation',
        enTitle: 'Blast Radius Containment.',
        arTitle: 'عزل نطاق الخطر في الشبكات.',
        enBody: 'Microsegmentation ensures lateral movement is cryptographically quarantined.',
        arBody: 'التقسيم الشبكي الدقيق يمنع الحركة العرضية للهجمات.',
      },
      {
        type: 'row',
        diagramVariant: 'stack',
        enTitle: 'Distributed Identity Federation.',
        arTitle: 'اتحاد الهويات الموزعة بين الأنظمة.',
        enBody: 'SPIFFE and SPIRE provide verifiable cryptographic identity for workloads.',
        arBody: 'بروتوكولات الهوية الموزعة تمنح كل خدمة بصمة تشفيرية مؤكدة.',
      },
      {
        type: 'row',
        diagramVariant: 'takeaway',
        enTitle: 'Engineering Tradeoffs & Latency.',
        arTitle: 'المفاضلات الهندسية وأزمنة التأخير.',
        enBody: 'Header verification introduces 0.2ms overhead, offset by local Envoy cache.',
        arBody: 'يضيف الفحص 0.2 ملي ثانية لكنه يعوض بالتخزين المؤقت المحلي.',
      },
      {
        type: 'cta',
        enTitle: 'Is Your Infrastructure Truly Zero-Trust?',
        arTitle: 'هل بنية نظامك محصنة تماماً؟',
        enBody: 'Audit your service mesh boundaries before the next compliance audit.',
        arBody: 'راجع حدود شبكتك قبل التدقيق الأمني القادم.',
        enCredit: 'NIST Special Publication 800-207',
        arCredit: 'المعهد الوطني للمعايير والتقنية NIST',
        ctaText: 'Read Full Spec',
      },
    ],
  };

  it('condenses an 8-slide carousel into a standalone 1-slide Infographic Poster with takeaways', () => {
    const condensed = condenseCarouselToSingleSlide(sample8SlideCarousel);

    expect(condensed.postFormat).toBe('single');
    expect(condensed.slides).toHaveLength(1);

    const poster = condensed.slides[0];
    expect(poster.type).toBe('poster');
    expect(poster.enTitle).toBe('Zero-Trust Architecture at Scale.');
    expect(poster.diagramNodes).toHaveLength(3);
    expect(poster.metricValue).toBe('99.99%');
    expect(poster.takeaways).toBeDefined();
    expect(poster.takeaways!.length).toBeGreaterThanOrEqual(2);
    expect(poster.takeaways!.length).toBeLessThanOrEqual(3);
    expect(poster.enCredit).toContain('NIST');
  });

  it('seeds 3 coherent domain-specific takeaways when none exist', () => {
    const takeaways = seedSingleSlideTakeaways({}, 'DATABASES & CACHING');
    expect(takeaways).toHaveLength(3);
    expect(takeaways[0].en).toBeDefined();
    expect(takeaways[0].ar).toBeDefined();
    expect(takeaways[0].icon).toBeDefined();
    expect(takeaways[0].en.length).toBeLessThanOrEqual(SINGLE_SLIDE_CHAR_LIMITS.takeawayEn);
    expect(takeaways[0].ar.length).toBeLessThanOrEqual(SINGLE_SLIDE_CHAR_LIMITS.takeawayAr);
  });

  it('applies expanded single-slide character limits without QA warnings', () => {
    const singleSlideDeck: CarouselData = {
      theme: 'cyber',
      category: 'SYSTEMS',
      postFormat: 'single',
      brand: 'MARROK',
      brandUrl: 'marrok.org',
      caption: 'Single Slide Test',
      slides: [
        {
          type: 'poster',
          // 52 chars: exceeds standard limit 45, but fits within SINGLE_SLIDE_CHAR_LIMITS 55
          enTitle: 'High-Throughput Distributed Systems Architecture.',
          // 46 chars: exceeds standard limit 40, but fits within SINGLE_SLIDE_CHAR_LIMITS 50
          arTitle: 'معمارية الأنظمة الموزعة فائقة الإنتاجية والسرعة.',
          // 195 chars: exceeds standard limit 140, but fits within SINGLE_SLIDE_CHAR_LIMITS 220
          enBody:
            'A unified architectural approach decoupling distributed consensus logs from query execution runtimes, guaranteeing sub-millisecond p99 latency under extreme production traffic spikes without data loss.',
          // 190 chars: exceeds standard limit 150, but fits within SINGLE_SLIDE_CHAR_LIMITS 230
          arBody:
            'منهجية معمارية موحدة تفصل سجلات التوافق الموزعة عن محركات تنفيذ الاستعلامات، مما يضمن استجابة فائقة السرعة بأجزاء من الملي ثانية تحت أعلى ضغوط الأحمال الإنتاجية دون أي فقدان للبيانات.',
          enCredit: 'Martin Kleppmann / Distributed Systems',
          arCredit: 'مارتن كليبمان',
          takeaways: [
            { en: 'Decoupled compute and storage layers.', ar: 'فصل طبقات المعالجة عن التخزين.', icon: 'layers' },
            { en: 'Sub-millisecond p99 read latency.', ar: 'أزمنة قراءة تقل عن جزء من الملي ثانية.', icon: 'zap' },
            { en: 'Zero-data loss write-ahead log replication.', ar: 'نسخ متزامن لسجلات الكتابة دون فقدان.', icon: 'database' },
          ],
        },
      ],
    };

    const qaReport = runQAChecks(singleSlideDeck);
    const charWarnings = qaReport.results.filter(
      (r) => r.severity === 'warn' && r.id.startsWith('char-')
    );

    expect(charWarnings).toHaveLength(0);
    expect(qaReport.canExport).toBe(true);
  });

  it('computes non-overlapping layout awareness bounds for poster archetype including takeaways', () => {
    const posterSlide: SlideData = {
      type: 'poster',
      enTitle: 'High-Throughput Systems.',
      arTitle: 'الأنظمة فائقة الأداء.',
      enBody: 'Decoupled state machines scale compute independently from storage.',
      arBody: 'تتيح الآليات المستقلة توسيع المعالجة بمعزل عن التخزين.',
      takeaways: [
        { en: 'Sub-millisecond p99.', ar: 'استجابة فائقة السرعة.', icon: 'zap' },
        { en: 'Zero-downtime blue-green.', ar: 'نشر بدون انقطاع.', icon: 'checkCircle' },
      ],
    };

    const layout = computeSlideLayoutAwareness(posterSlide);

    expect(layout.graphicCard).toBeDefined();
    expect(layout.titleBlock).toBeDefined();
    expect(layout.arabicTitleBlock).toBeDefined();
    expect(layout.bodyBlock).toBeDefined();
    expect(layout.arabicBodyBlock).toBeDefined();
    expect(layout.takeawaysBlock).toBeDefined();

    // Verify downward sequential stacking (zero vertical collisions)
    expect(layout.titleBlock!.top).toBeGreaterThanOrEqual(layout.graphicCard!.effectiveBottom + 40);
    expect(layout.arabicTitleBlock!.top).toBeGreaterThanOrEqual(layout.titleBlock!.bottom);
    expect(layout.bodyBlock!.top).toBeGreaterThanOrEqual(layout.arabicTitleBlock!.bottom);
    expect(layout.arabicBodyBlock!.top).toBeGreaterThanOrEqual(layout.bodyBlock!.bottom);
    expect(layout.takeawaysBlock!.top).toBeGreaterThanOrEqual(layout.arabicBodyBlock!.bottom);
    expect(layout.takeawaysBlock!.bottom).toBeLessThanOrEqual(1710);
  });

  it('maps bounds and supports point hit-testing on takeawaysBlock', () => {
    const posterSlide: SlideData = {
      type: 'poster',
      enTitle: 'Architecture Poster.',
      arTitle: 'ملصق معماري تقني.',
      enBody: 'Summary details.',
      arBody: 'تفاصيل مكثفة.',
      takeaways: [
        { en: 'Point 1', ar: 'النقطة الأولى', icon: 'zap' },
      ],
    };

    const bounds = computeSlideElementBounds(posterSlide);
    expect(bounds.takeawaysBlock).toBeDefined();
    expect(bounds.takeawaysBlock.id).toBe('takeawaysBlock');

    // Hit test directly inside the takeawaysBlock
    const hitElement = findSlideElementAtPoint(
      bounds.takeawaysBlock.x + 50,
      bounds.takeawaysBlock.y + 20,
      bounds
    );

    expect(hitElement).toBe('takeawaysBlock');
  });
});
