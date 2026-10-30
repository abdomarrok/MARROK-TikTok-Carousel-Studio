import { describe, it, expect } from 'vitest';
import {
  computeSlideLayoutAwareness,
  clampElementDrag,
  MIN_GAP_GRAPHIC_TO_TITLE,
  MIN_GAP_TITLES,
  MIN_GAP_TITLE_TO_BODY,
  MIN_GAP_BODIES,
} from './layoutAwareness.ts';
import { CarouselData, SlideData, CanvasDimensionPreset } from '../../types.ts';
import { SAFE_FOOTER_CEILING_Y, getCanvasDimensionSpec } from './constants.ts';

describe('Slide Layout Awareness Engine', () => {
  it('strictly guarantees positive clearance between graphic card and English title', () => {
    const archetypes: SlideData['type'][] = ['row', 'number', 'metric', 'code', 'compare', 'image', 'hub'];

    for (const type of archetypes) {
      const slide: SlideData = {
        type,
        enTitle: 'HNSW The graph approach.',
        arTitle: 'خوارزمية HNSW للبحث السريع',
        enBody: 'A skip-list for graphs. Layers allow greedy hops to neighbors.',
        arBody: 'قائمة تخطي للرسوم البيانية تسمح بالقفز السريع للجيران.',
      };

      const layout = computeSlideLayoutAwareness(slide);
      expect(layout.graphicCard).toBeDefined();
      expect(layout.titleBlock).toBeDefined();

      const cardBottom = layout.graphicCard!.effectiveBottom;
      const titleTop = layout.titleBlock!.top;
      const clearance = titleTop - cardBottom;

      // Clearance must be strictly >= MIN_GAP_GRAPHIC_TO_TITLE (44px)
      expect(clearance).toBeGreaterThanOrEqual(MIN_GAP_GRAPHIC_TO_TITLE);
      // First baseline Y must be below titleTop
      expect(layout.titleBlock!.firstBaselineY).toBeGreaterThan(titleTop);
    }
  });

  it('cascades non-overlapping vertical order: graphicCard -> title -> arTitle -> body -> arBody', () => {
    const slide: SlideData = {
      type: 'row',
      enTitle: 'Vector Indexing Strategies.',
      arTitle: 'استراتيجيات فهرسة المتجهات',
      enBody: 'Approximate Nearest Neighbors algorithm allows trading recall for latency.',
      arBody: 'تتيح خوارزميات الجيران الأقرب المقاربة موازنة دقة الاسترجاع مقابل زمن الاستجابة.',
    };

    const layout = computeSlideLayoutAwareness(slide);

    expect(layout.graphicCard!.effectiveBottom).toBeLessThan(layout.titleBlock!.top);
    expect(layout.titleBlock!.bottom).toBeLessThan(layout.arabicTitleBlock!.top);
    expect(layout.arabicTitleBlock!.bottom).toBeLessThan(layout.bodyBlock!.top);
    expect(layout.bodyBlock!.bottom).toBeLessThan(layout.arabicBodyBlock!.top);

    // Verify minimum safe gaps
    expect(layout.titleBlock!.top - layout.graphicCard!.effectiveBottom).toBeGreaterThanOrEqual(MIN_GAP_GRAPHIC_TO_TITLE);
    expect(layout.arabicTitleBlock!.top - layout.titleBlock!.bottom).toBeGreaterThanOrEqual(MIN_GAP_TITLES);
    expect(layout.bodyBlock!.top - layout.arabicTitleBlock!.bottom).toBeGreaterThanOrEqual(MIN_GAP_TITLE_TO_BODY);
    expect(layout.arabicBodyBlock!.top - layout.bodyBlock!.bottom).toBeGreaterThanOrEqual(MIN_GAP_BODIES);

    // Lowest element must not exceed the TikTok Photo Mode footer ceiling (y=1555)
    expect(layout.arabicBodyBlock!.bottom).toBeLessThanOrEqual(SAFE_FOOTER_CEILING_Y);
  });

  it('respects graphic card scaling and translates title block downward to prevent overlap', () => {
    const normalSlide: SlideData = {
      type: 'row',
      enTitle: 'HNSW Graph Structure.',
      arTitle: 'بنية الرسم البياني HNSW',
      enBody: 'Detailed technical mechanism description.',
      arBody: 'شرح تفصيلي للآلية الهندسية.',
    };

    const scaledSlide: SlideData = {
      ...normalSlide,
      layoutOverrides: {
        graphicCard: { scale: 1.25, dy: 30 },
      },
    };

    const normalLayout = computeSlideLayoutAwareness(normalSlide);
    const scaledLayout = computeSlideLayoutAwareness(scaledSlide);

    expect(scaledLayout.graphicCard!.effectiveBottom).toBeGreaterThan(normalLayout.graphicCard!.effectiveBottom);
    // Scaled slide title must stay below scaled card with at least 44px gap
    expect(scaledLayout.titleBlock!.top - scaledLayout.graphicCard!.effectiveBottom).toBeGreaterThanOrEqual(MIN_GAP_GRAPHIC_TO_TITLE);
  });

  it('clampElementDrag strictly prevents dragging titleBlock upward into graphicCard', () => {
    const slide: SlideData = {
      type: 'row',
      enTitle: 'HNSW Graph.',
      arTitle: 'خوارزمية الرسم البياني',
      enBody: 'High recall vector search.',
      arBody: 'بحث متجهي عالي الدقة.',
    };

    // User attempts to drag titleBlock up by 300px
    const clamped = clampElementDrag('titleBlock', 0, -300, slide);

    // Title should be clamped so that it cannot penetrate the graphic card
    const layoutWithDrag = computeSlideLayoutAwareness({
      ...slide,
      layoutOverrides: {
        titleBlock: { dy: clamped.dy },
      },
    });

    expect(layoutWithDrag.titleBlock!.top - layoutWithDrag.graphicCard!.effectiveBottom).toBeGreaterThanOrEqual(MIN_GAP_GRAPHIC_TO_TITLE);
  });

  it('clampElementDrag strictly prevents dragging arabicBodyBlock downward past footer ceiling', () => {
    const slide: SlideData = {
      type: 'row',
      enTitle: 'Title.',
      arTitle: 'عنوان',
      enBody: 'Body copy.',
      arBody: 'نص عربي.',
    };

    // User attempts to drag arabicBodyBlock down by 800px
    const clamped = clampElementDrag('arabicBodyBlock', 0, 800, slide);

    const layoutWithDrag = computeSlideLayoutAwareness({
      ...slide,
      layoutOverrides: {
        arabicBodyBlock: { dy: clamped.dy },
      },
    });

    expect(layoutWithDrag.arabicBodyBlock!.bottom).toBeLessThanOrEqual(SAFE_FOOTER_CEILING_Y);
  });

  it('handles CTA slide layout with non-overlapping emblem, headlines, and CTA button within safe ceiling', () => {
    const ctaSlide: SlideData = {
      type: 'cta',
      enTitle: 'Master Vector Architecture.',
      arTitle: 'احترف هندسة المتجهات وقواعد البيانات',
      ctaText: 'Follow @MARROK for deep dives',
    };

    const layout = computeSlideLayoutAwareness(ctaSlide);

    expect(layout.graphicCard).toBeDefined();
    expect(layout.titleBlock).toBeDefined();
    expect(layout.arabicTitleBlock).toBeDefined();
    expect(layout.ctaButton).toBeDefined();
    expect(layout.attributionCard).toBeDefined();

    // Verify ordering
    expect(layout.titleBlock!.top).toBeGreaterThan(layout.graphicCard!.effectiveBottom);
    expect(layout.arabicTitleBlock!.top).toBeGreaterThan(layout.titleBlock!.bottom);
    expect(layout.ctaButton!.y).toBeGreaterThan(layout.arabicTitleBlock!.bottom);
    expect(layout.attributionCard!.y).toBeGreaterThan(layout.ctaButton!.y);
    expect(layout.attributionCard!.y + layout.attributionCard!.height / 2).toBeLessThanOrEqual(SAFE_FOOTER_CEILING_Y);
  });

  it('reflows non-overlapping layout across TikTok 9:16 and Instagram 4:5, 3:4, 1:1, and 9:16 presets', () => {
    const presets: CanvasDimensionPreset[] = ['tiktok-9:16', 'ig-4:5', 'ig-3:4', 'ig-1:1', 'ig-9:16'];
    const archetypes: SlideData['type'][] = ['hub', 'row', 'poster', 'cta'];

    for (const preset of presets) {
      const spec = getCanvasDimensionSpec(preset);
      const mockCarousel: CarouselData = {
        brand: '@MARROK',
        category: 'SYSTEM DESIGN',
        theme: 'cyber',
        caption: 'Raft consensus architecture',
        dimensionPreset: preset,
        slides: [],
      };

      for (const type of archetypes) {
        const slide: SlideData = {
          type,
          enTitle: 'Distributed Consensus Under Partition.',
          arTitle: 'الإجماع الموزع تحت تقسيم الشبكة',
          enBody: 'Raft elects a single leader per term and replicates log entries to a majority quorum.',
          arBody: 'ينتخب بروتوكول Raft قائداً واحداً لكل دورة وينسخ السجلات للأغلبية.',
          takeaways:
            type === 'poster'
              ? [
                  { en: 'Leader election bounds split-brain.', ar: 'انتخاب القائد يمنع انقسام القرار.' },
                  { en: 'Quorum intersection guarantees safety.', ar: 'تقاطع الأغلبية يضمن الأمان.' },
                  { en: 'Log compaction bounds memory.', ar: 'ضغط السجل يحد من استهلاك الذاكرة.' },
                ]
              : undefined,
        };

        const layout = computeSlideLayoutAwareness(slide, mockCarousel);
        expect(layout.graphicCard).toBeDefined();
        expect(layout.titleBlock).toBeDefined();
        expect(layout.titleBlock!.top).toBeGreaterThan(layout.graphicCard!.effectiveBottom);

        if (type === 'cta') {
          expect(layout.attributionCard).toBeDefined();
          expect(layout.attributionCard!.y + layout.attributionCard!.height / 2).toBeLessThanOrEqual(
            spec.safeFooterCeilingY + 20
          );
        } else {
          expect(layout.arabicBodyBlock).toBeDefined();
          expect(layout.arabicBodyBlock!.bottom).toBeLessThanOrEqual(spec.safeFooterCeilingY);
        }
      }
    }
  });
});

