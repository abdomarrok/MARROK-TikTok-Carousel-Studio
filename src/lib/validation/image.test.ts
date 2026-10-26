import { describe, expect, it } from 'vitest';
import {
  MAX_IMAGE_BASE64_LENGTH,
  parseImageDataUrl,
  parseRawBase64Image,
} from './image';

const PNG_DATA_URL = 'data:image/png;base64,aGVsbG8=';

describe('parseImageDataUrl', () => {
  it('accepts supported embedded images and normalizes whitespace', () => {
    const parsed = parseImageDataUrl('data:image/png;base64,aGVs\nbG8=');

    expect(parsed).toEqual({
      mimeType: 'image/png',
      base64: 'aGVsbG8=',
      dataUrl: PNG_DATA_URL,
    });
  });

  it('rejects remote URLs, unsupported mime types, and malformed base64', () => {
    expect(parseImageDataUrl('https://example.com/image.png')).toBeNull();
    expect(parseImageDataUrl('data:image/svg+xml;base64,aGVsbG8=')).toBeNull();
    expect(parseImageDataUrl('data:image/png;base64,not-base64!')).toBeNull();
    expect(parseImageDataUrl('data:image/png;base64,abc')).toBeNull();
    expect(parseImageDataUrl('data:image/png;base64,')).toBeNull();
  });

  it('rejects payloads over the base64 size cap', () => {
    const oversized = `data:image/png;base64,${'A'.repeat(MAX_IMAGE_BASE64_LENGTH + 4)}`;
    expect(parseImageDataUrl(oversized)).toBeNull();
  });
});

describe('parseRawBase64Image', () => {
  it('accepts raw base64 with an allowed mime type', () => {
    expect(parseRawBase64Image('aGVsbG8=', 'image/jpeg')).toEqual({
      mimeType: 'image/jpeg',
      base64: 'aGVsbG8=',
    });
  });

  it('rejects disallowed mime types and invalid raw payloads', () => {
    expect(parseRawBase64Image('aGVsbG8=', 'text/plain')).toBeNull();
    expect(parseRawBase64Image('', 'image/png')).toBeNull();
    expect(parseRawBase64Image('aGVsbG8', 'image/png')).toBeNull();
  });
});
