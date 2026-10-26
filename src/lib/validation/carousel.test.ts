import { describe, expect, it } from 'vitest';
import { parseCarouselData } from './carousel';

const validPayload = {
  id: 'deck-1',
  theme: 'cyber',
  category: 'SECURITY',
  caption: 'A bilingual caption',
  brand: 'MARROK',
  sourceMeta: {
    type: 'article',
    engine: 'gemini-ai',
    status: 'verified_live',
    groundingSources: [{ title: 'Example source', url: 'https://example.com' }],
  },
  facts: [
    {
      text: 'Measured 1.66x speedup',
      type: 'number',
      verified: 'partially_verified',
      sourceUrl: 'https://example.com',
    },
  ],
  captionVariants: [{ style: 'Executive', caption: 'Caption variant' }],
  hookVariants: [
    {
      tag: 'Curiosity',
      enTitle: 'Hook',
      arTitle: 'خطاف',
      enBody: 'Body',
      arBody: 'نص',
    },
  ],
  slides: [
    { type: 'hub', enTitle: 'Hook', arTitle: 'خطاف', satLabels: ['Ingress', 'Runtime'] },
    {
      type: 'metric',
      enTitle: 'Throughput',
      metricValue: '129k req/s',
      metricDiff: '▲ 1.66x',
      diagramVariant: 'not-a-real-variant',
    },
    { type: 'cta', enTitle: 'Scale', ctaText: 'DM us', url: 'https://marrok.org' },
  ],
  unknownHostileField: { nested: true },
};

describe('parseCarouselData', () => {
  it('accepts a valid carousel and strips unknown fields', () => {
    const parsed = parseCarouselData(validPayload, { minSlides: 3, requireSlideContent: true });

    expect(parsed).not.toBeNull();
    expect(parsed?.theme).toBe('cyber');
    expect(parsed?.slides).toHaveLength(3);
    expect(parsed?.slides[1].metricValue).toBe('129k req/s');
    expect(parsed?.slides[1].diagramVariant).toBeUndefined();
    expect(parsed).not.toHaveProperty('unknownHostileField');
    expect(parsed?.sourceMeta?.groundingSources?.[0].url).toBe('https://example.com');
  });

  it('rejects malformed roots and invalid slide arrays', () => {
    expect(parseCarouselData(null)).toBeNull();
    expect(parseCarouselData('{}')).toBeNull();
    expect(parseCarouselData({})).toBeNull();
    expect(parseCarouselData({ slides: [] })).toBeNull();
    expect(parseCarouselData({ slides: [{ enTitle: 'only one' }] }, { minSlides: 3 })).toBeNull();
    expect(parseCarouselData({ slides: [null, {}, {}] })).toBeNull();
  });

  it('infers missing slide types and normalizes optional fields', () => {
    const parsed = parseCarouselData({
      slides: [
        { enTitle: 'First' },
        { type: 'unknown', enTitle: 'Middle', imageFit: 'cover', imageFilter: 'tint' },
        { enTitle: 'Last' },
      ],
    });

    expect(parsed?.slides.map((slide) => slide.type)).toEqual(['hub', 'row', 'cta']);
    expect(parsed?.slides[1].imageFit).toBe('cover');
    expect(parsed?.slides[1].imageFilter).toBe('tint');
  });

  it('requires slide content only when requested', () => {
    const blankDeck = {
      slides: [{ type: 'row' }, { type: 'row' }, { type: 'row' }],
    };

    expect(parseCarouselData(blankDeck)).not.toBeNull();
    expect(parseCarouselData(blankDeck, { requireSlideContent: true })).toBeNull();
  });

  it('drops malformed optional metadata instead of rejecting the deck', () => {
    const parsed = parseCarouselData({
      sourceMeta: {
        type: 'not-a-source',
        groundingSources: [{ title: 'missing url' }, { title: 'ok', url: 'https://example.com' }],
        userReviewed: 'yes',
      },
      facts: [{ text: 'Fact', type: 'invalid-type', verified: 'invalid-status' }],
      slides: [
        { type: 'hub', enTitle: 'One' },
        { type: 'row', enTitle: 'Two' },
        { type: 'cta', enTitle: 'Three' },
      ],
    });

    expect(parsed?.sourceMeta?.type).toBeUndefined();
    expect(parsed?.sourceMeta?.userReviewed).toBeUndefined();
    expect(parsed?.sourceMeta?.groundingSources).toHaveLength(1);
    expect(parsed?.facts?.[0]).toMatchObject({ type: 'claim', verified: 'unverified' });
  });
});
