import { getIconDataUrl, getIconSvg } from '../icons.ts';

// In-memory image cache for fast re-renders without repeated network round-trips
export const CANVAS_IMAGE_CACHE = new Map<string, HTMLImageElement>();

/**
 * Creates a guaranteed valid fallback SVG image so canvas operations never crash
 */
export function createFallbackIcon(strokeColor: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const fallbackSvg = getIconSvg('gitMerge', strokeColor);
    const fallbackUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fallbackSvg)}`;
    const fb = new Image();
    fb.onload = () => resolve(fb);
    fb.onerror = () => resolve(fb);
    fb.src = fallbackUrl;
  });
}

/**
 * Helper to load an SVG, custom image icon, or web image as an HTMLImageElement
 */
export function loadIconImage(iconName: string, strokeColor: string): Promise<HTMLImageElement> {
  const url = getIconDataUrl(iconName, strokeColor);
  if (CANVAS_IMAGE_CACHE.has(url)) {
    const cached = CANVAS_IMAGE_CACHE.get(url)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve) => {
    let settled = false;
    const img = new Image();
    // Only set crossOrigin for remote http(s) URLs, never for data: or blob:
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    // Safety timeout: never block canvas render for more than 1000ms
    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      console.warn(`Timeout loading icon/image: ${iconName}, falling back to SVG`);
      const fb = await createFallbackIcon(strokeColor);
      CANVAS_IMAGE_CACHE.set(url, fb);
      resolve(fb);
    }, 1000);

    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      CANVAS_IMAGE_CACHE.set(url, img);
      resolve(img);
    };

    img.onerror = async () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.warn(`Failed to load icon/image: ${iconName}, falling back to SVG`);
      const fb = await createFallbackIcon(strokeColor);
      CANVAS_IMAGE_CACHE.set(url, fb);
      resolve(fb);
    };

    img.src = url;
    if (img.complete && img.naturalWidth > 0 && !settled) {
      settled = true;
      clearTimeout(timer);
      CANVAS_IMAGE_CACHE.set(url, img);
      resolve(img);
    }
  });
}

/**
 * Helper to load full web images / diagrams via CORS proxy with theme recoloring
 */
export function loadWebImage(imageUrl: string, color?: string): Promise<HTMLImageElement> {
  const isSvg = imageUrl.toLowerCase().includes('.svg') || imageUrl.includes('simple-icons');
  let safeUrl = imageUrl;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const colorParam = isSvg && color ? `&color=${encodeURIComponent(color)}` : '';
    safeUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}${colorParam}`;
  }

  if (CANVAS_IMAGE_CACHE.has(safeUrl)) {
    return Promise.resolve(CANVAS_IMAGE_CACHE.get(safeUrl)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (!safeUrl.startsWith('data:') && !safeUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    const timer = setTimeout(() => {
      resolve(img);
    }, 1500);

    img.onload = () => {
      clearTimeout(timer);
      CANVAS_IMAGE_CACHE.set(safeUrl, img);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      console.warn(`Failed to load web image: ${imageUrl}`);
      resolve(img);
    };
    img.src = safeUrl;
  });
}

/**
 * Safely draws an image to canvas without throwing InvalidStateError on broken images
 */
export function safeDrawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (!img || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0 || w <= 0 || h <= 0) {
    return;
  }
  try {
    ctx.drawImage(img, x, y, w, h);
  } catch (err) {
    console.warn('safeDrawImage caught error:', err);
  }
}

/**
 * Tinted image drawer helper (replaces non-transparent pixels with theme color via source-in)
 */
export function drawTintedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  tintColor?: string
) {
  if (!img || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0 || w <= 0 || h <= 0) {
    return;
  }
  if (!tintColor) {
    safeDrawImage(ctx, img, x, y, w, h);
    return;
  }
  try {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = Math.max(1, Math.round(w));
    offCanvas.height = Math.max(1, Math.round(h));
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) {
      safeDrawImage(ctx, img, x, y, w, h);
      return;
    }
    offCtx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
    offCtx.globalCompositeOperation = 'source-in';
    offCtx.fillStyle = tintColor;
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

    ctx.drawImage(offCanvas, x, y, w, h);
  } catch (_err) {
    safeDrawImage(ctx, img, x, y, w, h);
  }
}
