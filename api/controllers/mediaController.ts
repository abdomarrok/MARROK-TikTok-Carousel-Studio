import type { Request, Response } from 'express';
import { TECH_ICONS_LIST } from '../constants.ts';

/**
 * Subject-based media search: official tech icons + Wikimedia technical diagrams.
 */
export async function handleSearchMedia(req: Request, res: Response) {
  const query = ((req.query.q as string) || '').trim().toLowerCase();

  // 1. Filter curated tech brand icons
  const matchedIcons = TECH_ICONS_LIST.filter(
    (item) =>
      !query ||
      item.name.includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
  );

  // 2. Fetch subject-based diagrams / illustrations from Wikimedia Commons API
  const matchedImages: { title: string; url: string; thumbUrl: string; source: string }[] = [];

  if (query && query.length >= 2) {
    try {
      const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        `${query} diagram OR architecture OR logo`
      )}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=400&format=json`;

      const wikiRes = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'MARROK-TikTok-Studio/2.0 (marrok.org; technical carousel generator)' },
        signal: AbortSignal.timeout(4000),
      });

      if (wikiRes.ok) {
        const data = await wikiRes.json();
        const pages = data.query?.pages || {};
        for (const pageId of Object.keys(pages)) {
          const info = pages[pageId]?.imageinfo?.[0];
          if (info?.thumburl || info?.url) {
            matchedImages.push({
              title: pages[pageId].title?.replace(/^File:/, '') || query,
              url: info.url,
              thumbUrl: info.thumburl || info.url,
              source: 'Wikimedia Commons',
            });
          }
        }
      }
    } catch (wikiErr) {
      console.warn('Wikimedia media search fallback error:', wikiErr);
    }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.json({
    icons: matchedIcons.slice(0, 24),
    images: matchedImages.slice(0, 16),
  });
}
