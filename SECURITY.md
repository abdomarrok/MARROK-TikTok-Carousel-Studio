# Security Policy & Architecture Controls

## 1. Image Proxy SSRF & XSS Defenses (`api/controllers/proxyController.ts`)
- **HTTPS-Only:** `/api/proxy-image` rejects any non-`https:` URL immediately (`400`).
- **DNS Resolution & Private IP Blocking:** Before each outbound fetch and at every redirect hop (max 3 hops), the proxy resolves all `A` and `AAAA` DNS records and blocks loopback (`127.0.0.0/8`, `::1`), RFC1918 private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local/cloud metadata (`169.254.0.0/16`, `fe80::/10`), and unique local IPv6 (`fc00::/7`).
- **Auto-Search Host Allowlist:** When `?source=search` is passed, only curated media CDNs (`upload.wikimedia.org`, `commons.wikimedia.org`, `cdn.jsdelivr.net`, `raw.githubusercontent.com`, `SimpleIcons`, `Openverse`) are permitted.
- **Strict MIME Allowlist (`415`):** Only `image/png`, `image/jpeg`, `image/webp`, `image/gif`, and `image/svg+xml` are accepted; all other content types return `415 Unsupported Media Type`.
- **Size & Time Caps:** Streams are aborted at `2 MB` (`MAX_IMAGE_BYTES`) or `6 seconds`.
- **SVG Sanitization & CSP Sandbox:** Proxied SVGs are stripped of `<script>`, `<foreignObject>`, `<iframe>`, `on*` event attributes, and `javascript:` URIs, and served with `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` and `X-Content-Type-Options: nosniff`.

## 2. API Abuse & Secret Controls (`api/config.ts`, `api/index.ts`)
- **Per-IP Rate Limiting:** `/api/generate`, `/api/refine-slide`, and `/api/generate-image` enforce a sliding-window IP rate limit (`RATE_LIMIT_RPM`, default 30 req/min).
- **Body Size Limit:** `express.json({ limit: '4.5mb' })` matches Vercel's serverless payload ceiling.
- **Secret Redaction:** `sanitizeLogText()` redacts `GEMINI_API_KEY` and client-provided `x-gemini-key` values from all server logs.
- **Optional Server Key Guard:** Setting `API_SHARED_SECRET` requires `x-api-secret` whenever a request relies on the server's `GEMINI_API_KEY`.
