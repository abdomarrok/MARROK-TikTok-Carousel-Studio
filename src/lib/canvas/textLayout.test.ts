import { describe, expect, it } from 'vitest';
import { fitTextInBox, truncateTextToWidth } from './textLayout';

function createMeasureContext(charWidth = 10, ellipsisWidth = 10): CanvasRenderingContext2D {
  return {
    font: '',
    measureText: (text: string) => ({
      width: Array.from(text).length * charWidth + (text.includes('…') ? ellipsisWidth - charWidth : 0),
    }),
  } as unknown as CanvasRenderingContext2D;
}

describe('truncateTextToWidth', () => {
  it('truncates by code point without splitting surrogate pairs', () => {
    const ctx = createMeasureContext(10, 10);

    expect(truncateTextToWidth(ctx, 'a😀b', 30, '…', true)).toBe('a😀…');
  });

  it('returns the original text when it already fits', () => {
    const ctx = createMeasureContext(10, 10);

    expect(truncateTextToWidth(ctx, 'short', 50)).toBe('short');
  });
});

describe('fitTextInBox', () => {
  it('caps multi-line text and forces an ellipsis on the final visible line', () => {
    const ctx = createMeasureContext(10, 10);
    const result = fitTextInBox(
      ctx,
      'alpha beta gamma delta epsilon zeta',
      50,
      20,
      'sans-serif',
      '700',
      { maxLines: 2, minFontSize: 9 }
    );

    expect(result.lines).toHaveLength(2);
    expect(result.lines[1].endsWith('…')).toBe(true);
    expect(result.lines.every((line) => ctx.measureText(line).width <= 50)).toBe(true);
  });
});
