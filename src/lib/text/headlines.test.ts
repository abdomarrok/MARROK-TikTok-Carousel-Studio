import { describe, expect, it } from 'vitest';
import {
  enforceHeadlineSpecRule,
  extractCleanHeadline,
  extractCleanSubject,
  extractTopicFromFileName,
  isNonSemanticFileName,
} from './headlines';

describe('isNonSemanticFileName', () => {
  it('identifies pure numeric filenames as non-semantic', () => {
    expect(isNonSemanticFileName('20760.png')).toBe(true);
    expect(isNonSemanticFileName('20760png')).toBe(true);
    expect(isNonSemanticFileName('20760')).toBe(true);
    expect(isNonSemanticFileName('100002345.jpg')).toBe(true);
  });

  it('identifies camera, mobile, and screenshot filenames as non-semantic', () => {
    expect(isNonSemanticFileName('IMG_20760.jpg')).toBe(true);
    expect(isNonSemanticFileName('DSC_0012.JPG')).toBe(true);
    expect(isNonSemanticFileName('PXL_20261027_1052.png')).toBe(true);
    expect(isNonSemanticFileName('Screenshot_20261027-105200.png')).toBe(true);
    expect(isNonSemanticFileName('Screen Shot 2026-10-27 at 10.52.00 AM.png')).toBe(true);
    expect(isNonSemanticFileName('Screenshot.png')).toBe(true);
    expect(isNonSemanticFileName('Capture.PNG')).toBe(true);
    expect(isNonSemanticFileName('pasted image.png')).toBe(true);
    expect(isNonSemanticFileName('image.png')).toBe(true);
    expect(isNonSemanticFileName('photo.jpg')).toBe(true);
  });

  it('identifies hex hashes and uuid filenames as non-semantic', () => {
    expect(isNonSemanticFileName('44b08b41.jpg')).toBe(true);
    expect(isNonSemanticFileName('637edc85.jpg')).toBe(true);
    expect(isNonSemanticFileName('a1b2c3d4-e5f6-7890-abcd-ef1234567890.png')).toBe(true);
  });

  it('recognizes authentic human-named technical topics as semantic', () => {
    expect(isNonSemanticFileName('distributed-caching-architecture.png')).toBe(false);
    expect(isNonSemanticFileName('vector-databases.png')).toBe(false);
    expect(isNonSemanticFileName('zero-trust-mesh.jpg')).toBe(false);
    expect(isNonSemanticFileName('Rust Actix vs Go Gin')).toBe(false);
    expect(isNonSemanticFileName('Scion Architecture')).toBe(false);
  });
});

describe('extractTopicFromFileName', () => {
  it('returns null for non-semantic filenames', () => {
    expect(extractTopicFromFileName('20760.png')).toBeNull();
    expect(extractTopicFromFileName('IMG_20760.jpg')).toBeNull();
    expect(extractTopicFromFileName('Screenshot 2026-10-27.png')).toBeNull();
    expect(extractTopicFromFileName('image.png')).toBeNull();
    expect(extractTopicFromFileName('44b08b41.jpg')).toBeNull();
    expect(extractTopicFromFileName('')).toBeNull();
    expect(extractTopicFromFileName(undefined)).toBeNull();
  });

  it('extracts and formats clean title-cased topic from human-named filenames', () => {
    expect(extractTopicFromFileName('distributed-caching-architecture.png')).toBe('Distributed Caching Architecture');
    expect(extractTopicFromFileName('zero_trust_service_mesh.jpg')).toBe('Zero Trust Service Mesh');
    expect(extractTopicFromFileName('event-driven-microservices.webp')).toBe('Event Driven Microservices');
  });
});

describe('extractCleanSubject with filenames', () => {
  it('falls back to System Architecture when given non-semantic filenames', () => {
    const { cleanSubject, arSubject } = extractCleanSubject('20760.png');
    expect(cleanSubject).toBe('System Architecture');
    expect(arSubject).toBe('الأنظمة المعمارية');
    expect(cleanSubject).not.toContain('20760');
    expect(cleanSubject).not.toContain('png');
  });

  it('falls back to System Architecture when given stripped non-semantic string 20760png', () => {
    const { cleanSubject, arSubject } = extractCleanSubject('20760png');
    expect(cleanSubject).toBe('System Architecture');
    expect(arSubject).toBe('الأنظمة المعمارية');
  });
});

describe('extractCleanHeadline with filenames', () => {
  it('produces clean architectural hook without filename pollution', () => {
    const { headline } = extractCleanHeadline('20760.png');
    expect(headline).toBe('System Architecture, explained.');
    expect(headline).not.toContain('20760');
    expect(headline).not.toContain('png');
  });

  it('does not produce "20760png explained."', () => {
    const headline = enforceHeadlineSpecRule('20760png', { isHook: true, fallbackSubject: 'System' });
    expect(headline).toBe('System, explained.');
    expect(headline).not.toContain('20760');
    expect(headline).not.toContain('png');
  });
});
