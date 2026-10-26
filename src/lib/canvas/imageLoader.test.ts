import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CANVAS_IMAGE_CACHE,
  loadIconImage,
  loadWebImage,
  resetCanvasImageCache,
} from './imageLoader';

class FakeImage {
  complete = false;
  naturalWidth = 0;
  naturalHeight = 0;
  crossOrigin: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => {
      this.complete = true;
      this.naturalWidth = 100;
      this.naturalHeight = 100;
      this.onload?.();
    });
  }
}

describe('imageLoader cache', () => {
  beforeEach(() => {
    resetCanvasImageCache();
    vi.stubGlobal('Image', FakeImage);
  });

  afterEach(() => {
    resetCanvasImageCache();
    vi.unstubAllGlobals();
  });

  it('deduplicates concurrent icon loads and caches the resolved image', async () => {
    const first = loadIconImage('cpu', '#ffffff');
    const second = loadIconImage('cpu', '#ffffff');

    expect(first).toBe(second);
    await Promise.all([first, second]);

    expect(CANVAS_IMAGE_CACHE.size).toBe(1);
  });

  it('bounds the LRU cache by entry count', async () => {
    await Promise.all(
      Array.from({ length: 81 }, (_, index) =>
        loadWebImage(`data:image/png;base64,AAAAAAAA${index.toString().padStart(4, '0')}`)
      )
    );

    expect(CANVAS_IMAGE_CACHE.size).toBeLessThanOrEqual(80);
  });
});
