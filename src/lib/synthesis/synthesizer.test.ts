import { describe, expect, it } from 'vitest';
import { synthesizeCarousel } from './synthesizer';

describe('synthesizeCarousel offline citations', () => {
  it('does not fabricate authoritative sources or citations', () => {
    const carousel = synthesizeCarousel({
      prompt: 'Rust Actix reached a 1.66x speedup over Go Gin in 2025 benchmarks.',
    });
    const serialized = JSON.stringify(carousel);

    expect(serialized).not.toContain('USENIX');
    expect(serialized).not.toContain('Official Portal');
    expect(carousel.caption).toContain('No external source cited');
    expect(carousel.caption).toContain('1.66x');
    expect(carousel.sourceMeta?.groundingSources).toEqual([]);
    expect(carousel.facts?.every((fact) => !fact.sourceUrl && !fact.sourceTitle)).toBe(true);
    expect(carousel.firstComment).toContain('Add your primary source link');
  });
});
