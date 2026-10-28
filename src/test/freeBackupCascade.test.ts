import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { getServerConfig, resolveRequestGeminiKeys } from '../../api/config.ts';
import { handleGenerateCarousel } from '../../api/controllers/generateController.ts';
import { handleGenerateImage } from '../../api/controllers/imageController.ts';

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: any = null;

  const res = {
    setHeader: vi.fn((k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    }),
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((payload: any) => {
      body = payload;
      return res;
    }),
  } as unknown as Response;

  return {
    res,
    getStatus: () => statusCode,
    getBody: () => body,
    getHeader: (k: string) => headers[k.toLowerCase()],
  };
}

describe('Multi-Key Gemini Rotation & Zero-Key Free AI Backup Cascade', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deduplicates and prioritizes primary + backup Gemini keys across headers and env', () => {
    const config = getServerConfig({
      GEMINI_API_KEY: 'AIzaServerPrimaryKey111',
      GEMINI_API_KEY_BACKUP: 'AIzaServerBackupKey222',
      GEMINI_API_KEYS: 'AIzaServerBackupKey222,AIzaServerPoolKey333',
    });

    expect(config.geminiApiKeys).toEqual([
      'AIzaServerPrimaryKey111',
      'AIzaServerBackupKey222',
      'AIzaServerPoolKey333',
    ]);

    const mockReq = {
      headers: {
        'x-gemini-key': 'AIzaClientAccount1Key',
        'x-gemini-backup-key': 'AIzaClientAccount2Key',
      },
      body: {},
    } as unknown as Request;

    const resolved = resolveRequestGeminiKeys(mockReq, config);
    expect(resolved.map((k) => k.key)).toEqual([
      'AIzaClientAccount1Key',
      'AIzaClientAccount2Key',
      'AIzaServerPrimaryKey111',
      'AIzaServerBackupKey222',
      'AIzaServerPoolKey333',
    ]);
  });

  it('keeps carousel generation online via zero-key Pollinations AI when Gemini keys are unavailable', async () => {
    const validPollinationsCarousel = {
      brand: 'MARROK',
      category: 'DISTRIBUTED SYSTEMS',
      theme: 'teal',
      caption: 'Zero-key AI backup carousel #SystemDesign',
      slides: [
        {
          type: 'hub',
          enTitle: 'Zero-Trust Mesh Architecture.',
          arTitle: 'معمارية الثقة المعدومة.',
          enBody: 'Isolates service-to-service traffic with mutual TLS.',
          arBody: 'عزل حركة المرور بين الخدمات باستخدام التشفير المتبادل.',
        },
        {
          type: 'row',
          enTitle: 'Identity-Aware Proxies.',
          arTitle: 'وكلاء مدركون للهوية.',
          enBody: 'Short-lived SPIFFE certificates verify every workload.',
          arBody: 'شهادات قصيرة العمر تتحقق من كل خدمة في الوقت الفعلي.',
        },
        {
          type: 'cta',
          enTitle: 'Ready for Production?',
          arTitle: 'هل أنت مستعد للإنتاج؟',
          enBody: 'Follow MARROK for deep systems breakdowns.',
          arBody: 'تابع ماروك لتحليلات هندسية معمقة.',
          ctaText: 'Join discussion',
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(validPollinationsCarousel),
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      headers: {},
      body: {
        prompt: 'Zero-Trust mesh with SPIFFE mTLS',
        postFormat: 'carousel',
      },
    } as unknown as Request;

    const { res, getBody, getHeader } = createMockRes();
    await handleGenerateCarousel(req, res);

    const body = getBody();
    expect(body).toBeTruthy();
    expect(body.sourceMeta?.isFallback).toBe(false);
    expect(body.sourceMeta?.model).toBe('pollinations/openai');
    expect(getHeader('x-marrok-engine')).toBe('ungrounded');
    expect(getHeader('x-marrok-model')).toBe('pollinations/openai');
  });

  it('generates a 9:16 base64 data URL via zero-key Pollinations Flux when Gemini image models are unavailable', async () => {
    const fakeJpegBytes = new Uint8Array(512).fill(120);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      arrayBuffer: async () => fakeJpegBytes.buffer,
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      headers: {},
      body: {
        prompt: 'Isometric system architecture diagram for zero-trust mesh',
        aspectRatio: '9:16',
        stylePreset: 'blueprint',
      },
    } as unknown as Request;

    const { res, getStatus, getBody } = createMockRes();
    await handleGenerateImage(req, res);

    expect(getStatus()).toBe(200);
    const body = getBody();
    expect(body?.model).toBe('pollinations-flux-free');
    expect(body?.imageUrl).toMatch(/^data:image\/jpeg;base64,/);
  });
});
