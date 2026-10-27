import { describe, expect, it } from 'vitest';
import {
  isPrivateOrLoopbackIp,
  isBlockedHostname,
  isAllowedProxyUrl,
  sanitizeSvgContent,
} from '../../../api/controllers/proxyController';
import { mapFactsWithGroundingSupports } from '../../../api/controllers/generateController';

describe('SSRF Protection & SVG Sanitization in Image Proxy', () => {
  it('blocks IPv4 loopback and private ranges', () => {
    expect(isPrivateOrLoopbackIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('127.1.2.3')).toBe(true);
    expect(isPrivateOrLoopbackIp('10.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('10.254.254.254')).toBe(true);
    expect(isPrivateOrLoopbackIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('172.31.255.255')).toBe(true);
    expect(isPrivateOrLoopbackIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('192.168.0.254')).toBe(true);
  });

  it('blocks AWS / Azure / GCP cloud metadata IP 169.254.169.254', () => {
    expect(isPrivateOrLoopbackIp('169.254.169.254')).toBe(true);
    expect(isPrivateOrLoopbackIp('169.254.1.1')).toBe(true);
  });

  it('blocks IPv6 loopback and unique local ranges', () => {
    expect(isPrivateOrLoopbackIp('::1')).toBe(true);
    expect(isPrivateOrLoopbackIp('::')).toBe(true);
    expect(isPrivateOrLoopbackIp('fc00::1')).toBe(true);
    expect(isPrivateOrLoopbackIp('fd12:3456:789a::1')).toBe(true);
    expect(isPrivateOrLoopbackIp('fe80::1')).toBe(true);
  });

  it('allows public IPv4 addresses', () => {
    expect(isPrivateOrLoopbackIp('8.8.8.8')).toBe(false);
    expect(isPrivateOrLoopbackIp('1.1.1.1')).toBe(false);
    expect(isPrivateOrLoopbackIp('140.82.121.4')).toBe(false); // GitHub
  });

  it('blocks internal hostnames and decimal / hex obfuscated IPs', () => {
    expect(isBlockedHostname('localhost')).toBe(true);
    expect(isBlockedHostname('app.localhost')).toBe(true);
    expect(isBlockedHostname('server.local')).toBe(true);
    expect(isBlockedHostname('metadata.google.internal')).toBe(true);
    expect(isBlockedHostname('2130706433')).toBe(true); // 127.0.0.1 in decimal
    expect(isBlockedHostname('0x7f000001')).toBe(true); // 127.0.0.1 in hex
  });

  it('allows valid public domain names', () => {
    expect(isBlockedHostname('github.com')).toBe(false);
    expect(isBlockedHostname('images.unsplash.com')).toBe(false);
    expect(isBlockedHostname('raw.githubusercontent.com')).toBe(false);
  });

  it('enforces https-only and search host allowlist in isAllowedProxyUrl', () => {
    expect(isAllowedProxyUrl('http://upload.wikimedia.org/logo.svg')).toBe(false);
    expect(isAllowedProxyUrl('https://localhost/logo.svg')).toBe(false);
    expect(isAllowedProxyUrl('https://upload.wikimedia.org/logo.svg', true)).toBe(true);
    expect(isAllowedProxyUrl('https://untrusted-site.example.com/img.png', true)).toBe(false);
  });

  it('sanitizes dangerous scripts, event handlers, and foreignObject from SVG payloads', () => {
    const rawSvg = `<svg onload="alert(1)"><script>fetch("https://evil.tld")</script><foreignObject><iframe></iframe></foreignObject><path d="M0 0h10v10z" onclick="evil()" href="javascript:alert(1)"/></svg>`;
    const clean = sanitizeSvgContent(rawSvg);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('<foreignObject');
    expect(clean).not.toContain('onload=');
    expect(clean).not.toContain('onclick=');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('<path d="M0 0h10v10z"');
  });
});

describe('Grounding Support Fact Mapping (No Cyclic Fake Citations)', () => {
  it('leaves sourceUrl empty when groundingSupports do not back a claim', () => {
    const facts = [{ text: 'Redis 8 improves throughput by 40%', type: 'number' as const, verified: 'verified' as const }];
    const mapped = mapFactsWithGroundingSupports(facts, [], [])!;
    expect(mapped[0].sourceUrl).toBeUndefined();
    expect(mapped[0].verified).toBe('unconfirmed');
  });

  it('maps a fact only when groundingSupports match its claim text', () => {
    const facts = [
      { text: 'Scion replaces Git worktrees with microVM snapshots', type: 'claim' as const, verified: 'unconfirmed' as const },
      { text: 'Unrelated secondary statement without support', type: 'claim' as const, verified: 'unconfirmed' as const },
    ];
    const webSources = [{ title: 'Anthropic Engineering Blog', url: 'https://www.anthropic.com/engineering/scion' }];
    const supports = [
      {
        segment: { text: 'Scion replaces Git worktrees with microVM snapshots' },
        groundingChunkIndices: [0],
      },
    ];
    const mapped = mapFactsWithGroundingSupports(facts, webSources, supports)!;
    expect(mapped[0].sourceUrl).toBe('https://www.anthropic.com/engineering/scion');
    expect(mapped[0].verified).toBe('verified');
    expect(mapped[1].sourceUrl).toBeUndefined();
    expect(mapped[1].verified).toBe('unconfirmed');
  });
});

