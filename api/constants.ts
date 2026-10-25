/**
 * Shared API Constants, Media Catalogs, and Log Sanitization Utilities
 */

import { TECH_ICONS_LIST, KNOWN_TECH_LOGOS, type TechIconItem } from '../src/lib/techLogos.ts';

export { TECH_ICONS_LIST, KNOWN_TECH_LOGOS, type TechIconItem };

export const ALLOWED_INPUT_MODES = new Set(['upload', 'text', 'youtube', 'presets']);
export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Redacts any occurrence of x-gemini-key, API keys, and authorization secrets from log strings.
 * Guarantees sensitive client headers are never logged.
 */
export function sanitizeLogText(input: unknown, activeKey?: string): string {
  let str = input instanceof Error ? input.stack || input.message : typeof input === 'string' ? input : JSON.stringify(input);
  if (!str) return '';
  if (activeKey && activeKey.length > 4) {
    str = str.split(activeKey).join('[REDACTED_API_KEY]');
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 4) {
    str = str.split(process.env.GEMINI_API_KEY).join('[REDACTED_API_KEY]');
  }
  str = str
    .replace(/x-gemini-key[:=\s]+[a-zA-Z0-9_\-]+/gi, 'x-gemini-key: [REDACTED]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
  return str;
}
