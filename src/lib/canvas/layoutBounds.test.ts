import { describe, it, expect } from 'vitest';
import { computeSlideElementBounds, findSlideElementAtPoint } from './layoutBounds.ts';
import { SlideData } from '../../types.ts';

describe('computeSlideElementBounds & findSlideElementAtPoint', () => {
  it('correctly computes dynamic bounds on a Hub slide', () => {
    const hubSlide: SlideData = {
      type: 'hub',
      enTitle: 'Vector Databases, explained.',
      arTitle: 'تحليل معماري لمنظومة قواعد البيانات المتجهية',
      enBody: 'Data is converted into high-dimensional arrays of numbers using an embedding model.',
      arBody: 'نظرة معمارية معمقة تشرح آليات العمل والتحديات.',
    };

    const bounds = computeSlideElementBounds(hubSlide);

    expect(bounds.headerBadge).toBeDefined();
    expect(bounds.graphicCard).toBeDefined();
    expect(bounds.titleBlock).toBeDefined();
    expect(bounds.arabicTitleBlock).toBeDefined();
    expect(bounds.bodyBlock).toBeDefined();
    expect(bounds.arabicBodyBlock).toBeDefined();

    // Graphic card on Hub ends at y=980, so titleBlock baseline is at y>=980 with cap-height offset
    expect(bounds.graphicCard.y).toBe(190);
    expect(bounds.graphicCard.height).toBe(790);
    expect(bounds.titleBlock.y).toBeGreaterThan(900);
    expect(bounds.arabicTitleBlock.y).toBeGreaterThan(bounds.titleBlock.y);
    expect(bounds.bodyBlock.y).toBeGreaterThan(bounds.arabicTitleBlock.y);
    expect(bounds.arabicBodyBlock.y).toBeGreaterThan(bounds.bodyBlock.y);
  });

  it('correctly computes dynamic bounds on a Row/Diagram slide', () => {
    const rowSlide: SlideData = {
      type: 'row',
      diagramVariant: 'scatter',
      enTitle: 'Vectors (Embeddings).',
      arTitle: 'المتجهات والتضمين الدلالي',
      enBody: 'High-dimensional vectors with cosine similarity distance matching.',
      arBody: 'تحويل البيانات إلى مصفوفات رقمية عالية الأبعاد.',
    };

    const bounds = computeSlideElementBounds(rowSlide);

    // Graphic card on Row starts at y=240, height=490 (ends at y=730)
    expect(bounds.graphicCard.y).toBe(240);
    expect(bounds.graphicCard.height).toBe(490);
    expect(bounds.titleBlock.y).toBeGreaterThanOrEqual(730);
  });

  it('correctly computes bounds on a CTA slide', () => {
    const ctaSlide: SlideData = {
      type: 'cta',
      enTitle: 'Scaling Vector Databases?',
      arTitle: 'تبني حلول قواعد البيانات المتجهية؟',
      ctaText: 'Join discussion  •  شارك برأيك',
    };

    const bounds = computeSlideElementBounds(ctaSlide);

    expect(bounds.ctaButton).toBeDefined();
    expect(bounds.attributionCard).toBeDefined();
    expect(bounds.titleBlock).toBeDefined();
    expect(bounds.arabicTitleBlock).toBeDefined();

    // CTA button is positioned above attribution card
    expect(bounds.ctaButton.y).toBeLessThan(bounds.attributionCard.y);
  });

  it('accurately hit-tests clicked coordinates in 1080x1920 space', () => {
    const hubSlide: SlideData = {
      type: 'hub',
      enTitle: 'Vector Databases, explained.',
      arTitle: 'تحليل معماري لمنظومة قواعد البيانات المتجهية',
      enBody: 'High-dimensional arrays.',
      arBody: 'شرح معماري.',
    };

    const bounds = computeSlideElementBounds(hubSlide);

    // Point in center of titleBlock should hit titleBlock
    const titleMidX = bounds.titleBlock.x + bounds.titleBlock.width / 2;
    const titleMidY = bounds.titleBlock.y + bounds.titleBlock.height / 2;
    const hitTitle = findSlideElementAtPoint(titleMidX, titleMidY, bounds);
    expect(hitTitle).toBe('titleBlock');

    // Point in center of graphic card should hit graphicCard
    const cardMidX = bounds.graphicCard.x + bounds.graphicCard.width / 2;
    const cardMidY = bounds.graphicCard.y + bounds.graphicCard.height / 2;
    const hitCard = findSlideElementAtPoint(cardMidX, cardMidY, bounds);
    expect(hitCard).toBe('graphicCard');

    // Point in top header
    const hitHeader = findSlideElementAtPoint(200, 130, bounds);
    expect(hitHeader).toBe('headerBadge');

    // Point in bottom margin outside all elements should return null
    const hitEmpty = findSlideElementAtPoint(100, 1850, bounds);
    expect(hitEmpty).toBeNull();
  });
});
