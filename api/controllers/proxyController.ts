import type { Request, Response } from 'express';
import dns from 'node:dns';
import net from 'node:net';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB cap

const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

/**
 * Checks whether an IP belongs to private, loopback, link-local, or cloud metadata ranges.
 */
export function isPrivateOrLoopbackIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;
    const [b0, b1] = parts;
    if (b0 === 127) return true; // 127.0.0.0/8 (Loopback)
    if (b0 === 10) return true; // 10.0.0.0/8 (Private)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12 (Private)
    if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16 (Private)
    if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 (Link-local / Cloud metadata: 169.254.169.254)
    if (b0 === 0) return true; // 0.0.0.0/8
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true; // 100.64.0.0/10 (Shared NAT)
    if (b0 >= 224) return true; // Multicast & reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // fc00::/7 (Unique local)
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true; // fe80::/10 (Link-local)
    }
    if (normalized.startsWith('::ffff:')) {
      const v4Part = normalized.substring(7);
      return isPrivateOrLoopbackIp(v4Part);
    }
    return false;
  }
  return true;
}

/**
 * Validates hostname against internal/private naming conventions and patterns.
 */
export function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.arpa') ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower === '[::1]'
  ) {
    return true;
  }
  // Decimal integer or hex IP bypasses (e.g., 2130706433 or 0x7f000001)
  if (/^\d+$/.test(lower) || /^0x[0-9a-f]+$/i.test(lower)) {
    return true;
  }
  return false;
}

/**
 * Performs DNS resolution to guarantee the host does not resolve to an internal/private address.
 */
export async function resolveAndValidateHost(hostname: string): Promise<boolean> {
  if (isBlockedHostname(hostname)) return false;
  if (net.isIP(hostname)) {
    return !isPrivateOrLoopbackIp(hostname);
  }
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) return false;
    for (const addr of addresses) {
      if (isPrivateOrLoopbackIp(addr.address)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely fetches an image following controlled redirects and rejecting private destinations.
 */
async function fetchSafeImage(initialUrl: string, maxHops = 3): Promise<globalThis.Response> {
  let currentUrl = initialUrl;
  for (let hop = 0; hop <= maxHops; hop++) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only http and https protocols are allowed');
    }

    const isSafe = await resolveAndValidateHost(parsed.hostname);
    if (!isSafe) {
      throw new Error(`Target destination "${parsed.hostname}" is restricted or private.`);
    }

    const response = await fetch(currentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MARROK-TikTok-Studio/2.0',
        Accept: 'image/png,image/jpeg,image/webp,image/svg+xml,image/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'manual',
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect returned with missing Location header');
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }
  throw new Error('Too many redirects encountered');
}

/**
 * CORS-safe image proxy with strict SSRF protection, size caps, and dynamic SVG recoloring.
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
    const upstreamRes = await fetchSafeImage(targetUrl);

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ error: `Upstream error: ${upstreamRes.statusText}` });
    }

    // 1. Content-Length early exit
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Image exceeds maximum allowed size (5MB)' });
    }

    // 2. Strict Content-Type validation
    const rawContentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
    const isAllowedType = ALLOWED_CONTENT_TYPES.some((allowed) => rawContentType.includes(allowed));

    const isSvgUrl = targetUrl.toLowerCase().endsWith('.svg') || targetUrl.includes('simple-icons');

    if (!isAllowedType && !isSvgUrl) {
      return res.status(415).json({
        error: `Unsupported content type "${rawContentType}". Only images are permitted.`,
      });
    }

    // 3. Size-capped arrayBuffer read
    const rawBuffer = Buffer.from(await upstreamRes.arrayBuffer());
    if (rawBuffer.byteLength > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Image exceeds maximum allowed size (5MB)' });
    }

    const isSvg =
      rawContentType.includes('svg') ||
      isSvgUrl ||
      rawBuffer.toString('utf-8', 0, 100).includes('<svg');

    if (isSvg) {
      let svgText = rawBuffer.toString('utf-8');

      // Sanitize SVG against XSS (strip scripts and inline event handlers)
      svgText = svgText
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

      let hexColor = requestedColor.trim();
      if (hexColor && !hexColor.startsWith('#') && !hexColor.startsWith('rgb')) {
        hexColor = `#${hexColor}`;
      }

      // Dynamic theme recoloring
      if (hexColor) {
        svgText = svgText.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
          const cleanAttrs = attrs.replace(/\bfill="[^"]*"/gi, '');
          return `<svg ${cleanAttrs} fill="${hexColor}" style="color: ${hexColor}; fill: ${hexColor};">`;
        });
        svgText = svgText.replace(/\bfill="(?:currentColor|#000|#000000|black)"/gi, `fill="${hexColor}"`);
        svgText = svgText.replace(/<path\b((?![^>]*\bfill=)[^>]*)>/gi, `<path fill="${hexColor}" $1>`);
      } else {
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
      res.setHeader('Content-Type', 'image/svg+xml;charset=utf-8');
      return res.send(modifiedBuffer);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', rawContentType || 'image/png');
    return res.send(rawBuffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Failed to proxy image ${targetUrl}:`, msg);
    return res.status(400).json({ error: 'Failed to proxy external image', details: msg });
  }
}
