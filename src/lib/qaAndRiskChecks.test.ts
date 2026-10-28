import { describe, expect, it } from 'vitest';
import { runQAChecks } from './qaChecks';
import { runPlatformRiskChecks } from './riskChecks';
import { enrichAndPaceCarousel } from './autonomousPipeline';
import { synthesizeCarousel } from './synthesizer';
import { DEFAULT_STARTER_DECK } from './presets';
import { CarouselData } from '../types';

function cloneStarterDeck(): CarouselData {
  return enrichAndPaceCarousel(JSON.parse(JSON.stringify(DEFAULT_STARTER_DECK)), 'Anthropic Scion');
}

describe('QA Gate & Platform Risk Checks (Phase 4 & 5)', () => {
  it('passes QA on a clean reviewed starter deck with JPG 1080x1920 options', () => {
    const deck = cloneStarterDeck();
    deck.sourceMeta = {
      ...deck.sourceMeta,
      status: 'verified_live',
      isSearchGrounded: true,
      groundingSources: [{ title: 'Anthropic Engineering', url: 'https://www.anthropic.com' }],
      userReviewed: true,
    };
    const report = runQAChecks(deck, { exportFormat: 'jpg', width: 1080, height: 1920 });
    expect(report.failCount).toBe(0);
    expect(report.canExport).toBe(true);
  });

  it('passes QA and Platform Risk checks on a Single-Slide Post (postFormat === "single")', () => {
    const singlePost = synthesizeCarousel({
      prompt: 'Redis 8 multi-threaded engine architecture',
      postFormat: 'single',
    });
    expect(singlePost.postFormat).toBe('single');
    expect(singlePost.slides).toHaveLength(1);
    expect(singlePost.slides[0].enCredit).toBeTruthy();

    singlePost.sourceMeta = {
      ...singlePost.sourceMeta,
      status: 'verified_live',
      isSearchGrounded: true,
      groundingSources: [{ title: 'Redis Engineering', url: 'https://redis.io' }],
      userReviewed: true,
      creator: 'MARROK',
    };

    const qa = runQAChecks(singlePost, { exportFormat: 'jpg', width: 1080, height: 1920 });
    expect(qa.failCount).toBe(0);
    expect(qa.canExport).toBe(true);
    expect(qa.results.find((r) => r.id === 'slide-count')?.severity).toBe('pass');

    const risk = runPlatformRiskChecks(singlePost, 'Redis 8 multi-threaded engine architecture');
    expect(risk.status).toBe('PASS');
    expect(risk.blockCount).toBe(0);
  });

  it('fails QA when PNG output or wrong dimensions are requested', () => {
    const deck = cloneStarterDeck();
    const pngReport = runQAChecks(deck, { exportFormat: 'png', width: 1080, height: 1920 });
    expect(pngReport.canExport).toBe(false);
    expect(pngReport.results.some((r) => r.id === 'export-format-png')).toBe(true);

    const dimReport = runQAChecks(deck, { exportFormat: 'jpg', width: 1080, height: 1080 });
    expect(dimReport.canExport).toBe(false);
    expect(dimReport.results.some((r) => r.id === 'export-dimensions')).toBe(true);
  });

  it('fails QA on placeholder text, Arabic line ending with Latin+punctuation, and text below y=1760', () => {
    const deck = cloneStarterDeck();
    deck.slides[1].enBody = 'Lorem ipsum placeholder text in slide.';
    deck.slides[2].arBody = 'هذا السطر ينتهي بكلمة لاتينية مع نقطة Git.';
    deck.slides[3].layoutOverrides = { arabicBodyBlock: { dy: 180 } };

    const report = runQAChecks(deck);
    expect(report.canExport).toBe(false);
    expect(report.results.some((r) => r.id.startsWith('placeholder-1'))).toBe(true);
    expect(report.results.some((r) => r.id.startsWith('arabic-line-end-2'))).toBe(true);
    expect(report.results.some((r) => r.id === 'vertical-overflow-3')).toBe(true);
  });

  it('returns BLOCK in runPlatformRiskChecks for copyrighted IP, raw reposts, or unreviewed numeric claims', () => {
    const deck = cloneStarterDeck();
    deck.sourceMeta = {
      status: 'unverified_draft',
      isSearchGrounded: false,
      userReviewed: false,
    };
    deck.slides[1].enBody = 'Featuring Spider-Man and Taylor Swift in a 200x faster cluster.';
    const risk = runPlatformRiskChecks(deck, 'repost from tiktok.com/@othercreator');
    expect(risk.status).toBe('BLOCK');
    expect(risk.items.find((i) => i.id === 'originality')?.status).toBe('BLOCK');
    expect(risk.items.find((i) => i.id === 'copyright')?.status).toBe('BLOCK');
    expect(risk.items.find((i) => i.id === 'unverified-numbers')?.status).toBe('BLOCK');
  });

  it('returns PASS in runPlatformRiskChecks when grounded, original, and credited', () => {
    const deck = cloneStarterDeck();
    deck.brand = 'MARROK';
    deck.channel = 'MARROK';
    deck.sourceMeta = {
      status: 'verified_live',
      isSearchGrounded: true,
      groundingSources: [{ title: 'Anthropic Scion', url: 'https://www.anthropic.com' }],
      userReviewed: true,
      creator: 'MARROK',
    };
    const risk = runPlatformRiskChecks(deck, 'Anthropic Scion architecture breakdown');
    expect(risk.status).toBe('PASS');
    expect(risk.blockCount).toBe(0);
  });
});

