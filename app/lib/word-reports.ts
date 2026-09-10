import { canonicalizeUrl, isAllowedUrl, stripMarkup } from './processing';
import { TypedFetchError } from './safe-fetch';
import { checkRobots } from './robots';
import type { Candidate, SourceConfig } from './types';

export const WORD_TYPES = { doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

export function wordReportCandidates(html: string, base: string, source: SourceConfig): Candidate[] {
  const items = new Map<string, Candidate>();
  for (const match of html.matchAll(/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = canonicalizeUrl(new URL(match[2].replace(/&amp;/g, '&'), base).href);
      if (!isAllowedUrl(url, source)) continue;
      const label = stripMarkup(match[4]);
      const path = decodeURIComponent(new URL(url).pathname);
      if (!/\.docx?$/i.test(path) && !/\b(?:docx?|word)\b/i.test(`${label} ${match[1]} ${match[3]}`)) continue;
      if (/\.(?:pdf|xlsx?|pptx?)$/i.test(path)) continue;
      const title = label.length > 10 ? label : (path.split('/').pop() || 'Health NZ quarterly report').replace(/[-_]/g, ' ');
      if (!items.has(url)) items.set(url, { url, title });
    } catch { /* Ignore malformed links. */ }
  }
  return [...items.values()];
}

export function wordFormat(bytes: Uint8Array): keyof typeof WORD_TYPES {
  const names = new TextDecoder('latin1').decode(bytes);
  if ([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((byte,i) => bytes[i] === byte) && names.includes('W\0o\0r\0d\0D\0o\0c\0u\0m\0e\0n\0t')) return 'doc';
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && names.includes('word/document.xml') && names.includes('[Content_Types].xml')) return 'docx';
  throw new TypedFetchError('unexpected_content_type', 'The attachment is not a Word DOC or DOCX document.');
}

export async function downloadWordReport(candidate: Candidate, source: SourceConfig) {
  if (!source.enabled) throw new TypedFetchError('licensing_disabled', 'Source is disabled.');
  let current = candidate.url;
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (!isAllowedUrl(current, source)) throw new TypedFetchError('unexpected_content_type', 'Report or redirect host is not allowlisted.');
    const robots = await checkRobots(current, source);
    if (robots.status === 'disallowed') throw new TypedFetchError('robots_disallowed', 'robots.txt disallows this attachment.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(current, { redirect: 'manual', signal: controller.signal, headers: {
        'User-Agent': process.env.SCRAPER_USER_AGENT || 'KoruHealthIntelligence/1.0',
        Accept: `${WORD_TYPES.docx}, ${WORD_TYPES.doc}, application/octet-stream`,
      } });
      if ([301,302,303,307,308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) throw new TypedFetchError('parse_failed', 'Redirect missing location', response.status);
        current = new URL(location, current).href;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        const type = [401,403].includes(response.status) ? 'blocked_403' : response.status === 429 ? 'rate_limited' : response.status >= 500 ? 'server_error' : 'not_found';
        throw new TypedFetchError(type, `Report download returned HTTP ${response.status}.`, response.status);
      }
      const limit = 25_000_000;
      if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new TypedFetchError('too_large', 'Report exceeds 25 MB.'); }
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) { await reader.cancel(); throw new TypedFetchError('too_large', 'Report exceeds 25 MB.'); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const format = wordFormat(bytes);
      const name = decodeURIComponent(new URL(current).pathname.split('/').pop() || 'quarterly-report').replace(/[^a-z0-9._-]/gi, '-').replace(/\.docx?$/i, '');
      return { bytes, filename: `${name}.${format}`, contentType: WORD_TYPES[format], finalUrl: current };
    } catch (error) {
      if (error instanceof TypedFetchError) throw error;
      throw new TypedFetchError('timeout', error instanceof Error ? error.message : 'Report download failed.');
    } finally { clearTimeout(timer); }
  }
  throw new TypedFetchError('parse_failed', 'Too many report redirects.');
}
