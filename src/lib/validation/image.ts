const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const MAX_IMAGE_DATA_URL_LENGTH = 16 * 1024 * 1024;
export const MAX_IMAGE_BASE64_LENGTH = 12 * 1024 * 1024;

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export interface ParsedImageData {
  mimeType: string;
  base64: string;
  dataUrl: string;
}

export function parseImageDataUrl(value: unknown): ParsedImageData | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return null;
  }

  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) return null;

  const base64 = match[2].replace(/\s+/g, '');
  if (base64.length === 0 || base64.length > MAX_IMAGE_BASE64_LENGTH) return null;
  if (base64.length % 4 !== 0 || !BASE64_PATTERN.test(base64)) return null;

  return {
    mimeType,
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`,
  };
}

export function parseRawBase64Image(
  value: unknown,
  mimeType: string
): { mimeType: string; base64: string } | null {
  if (typeof value !== 'string') return null;
  const normalizedMime = mimeType.toLowerCase();

  if (!ALLOWED_IMAGE_MIME_TYPES.has(normalizedMime)) return null;

  const base64 = value.replace(/\s+/g, '');
  if (base64.length === 0 || base64.length > MAX_IMAGE_BASE64_LENGTH) return null;
  if (base64.length % 4 !== 0 || !BASE64_PATTERN.test(base64)) return null;

  return { mimeType: normalizedMime, base64 };
}
