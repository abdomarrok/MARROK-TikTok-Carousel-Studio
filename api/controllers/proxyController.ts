import type { Request, Response } from 'express';

/**
 * CORS-safe image proxy to prevent canvas tainting on export, with SVG dynamic theme recoloring.
 */
export async function handleProxyImage(req: Request, res: Response) {
  const targetUrl = req.query.url as string;
  const requestedColor = (req.query.color as string) || '';

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'url query parameter is required' });
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'Only http and https protocols are allowed' });
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MARROK-TikTok-Studio/2.0',
        Accept: 'image/*,image/svg+xml,*/*',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ error: `Upstream error: ${upstreamRes.statusText}` });
    }

    let contentType = upstreamRes.headers.get('content-type') || 'image/png';
    const rawBuffer = Buffer.from(await upstreamRes.arrayBuffer());

    const isSvg =
      contentType.includes('svg') ||
      targetUrl.toLowerCase().endsWith('.svg') ||
      rawBuffer.toString('utf-8', 0, 100).includes('<svg');

    if (isSvg) {
      let svgText = rawBuffer.toString('utf-8');
      contentType = 'image/svg+xml;charset=utf-8';

      // Normalize color (e.g. '13131E' -> '#13131E', '37E2C0' -> '#37E2C0')
      let hexColor = requestedColor.trim();
      if (hexColor && !hexColor.startsWith('#') && !hexColor.startsWith('rgb')) {
        hexColor = `#${hexColor}`;
      }

      // If a color is specified, inject/replace colors to harmonize with theme
      if (hexColor) {
        // Ensure root <svg> has fill and style color
        svgText = svgText.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
          const cleanAttrs = attrs.replace(/\bfill="[^"]*"/gi, '');
          return `<svg ${cleanAttrs} fill="${hexColor}" style="color: ${hexColor}; fill: ${hexColor};">`;
        });

        // Replace any path fills that might be hardcoded to black or currentColor
        svgText = svgText.replace(/\bfill="(?:currentColor|#000|#000000|black)"/gi, `fill="${hexColor}"`);
        // For paths with no fill attribute, Simple Icons defaults to black: inject fill
        svgText = svgText.replace(/<path\b((?![^>]*\bfill=)[^>]*)>/gi, `<path fill="${hexColor}" $1>`);
      } else {
        // If no color was passed, ensure SVGs aren't default black on dark canvases (make default white/visible)
        svgText = svgText.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
          if (!attrs.includes('fill=')) {
            return `<svg ${attrs} fill="#FFFFFF" style="color: #FFFFFF; fill: #FFFFFF;">`;
          }
          return `<svg ${attrs}>`;
        });
        svgText = svgText.replace(/<path\b((?![^>]*\bfill=)[^>]*)>/gi, `<path fill="#FFFFFF" $1>`);
      }

      const modifiedBuffer = Buffer.from(svgText, 'utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Type', contentType);
      return res.send(modifiedBuffer);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', contentType);
    return res.send(rawBuffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Failed to proxy image ${targetUrl}:`, msg);
    return res.status(500).json({ error: 'Failed to fetch external image', details: msg });
  }
}
