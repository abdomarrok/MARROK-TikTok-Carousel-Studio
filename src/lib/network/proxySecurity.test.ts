import { describe, expect, it } from 'vitest';
import { isPrivateOrLoopbackIp, isBlockedHostname } from '../../../api/controllers/proxyController';

describe('SSRF Protection in Image Proxy', () => {
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
});
