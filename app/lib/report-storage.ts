import { env } from 'cloudflare:workers';
import { d1 } from './database';
import { canonicalizeUrl, sha256 } from './processing';
import { downloadWordReport, WORD_TYPES, wordFormat } from './word-reports';
import type { Candidate, SourceConfig } from './types';

export async function storeWordReport(id: string, title: string, filename: string, bytes: Uint8Array, sourceUrl?: string) {
  if (!env.FILES) throw new Error('Report storage is unavailable.');
  const format = wordFormat(bytes);
  const safeName = filename.replace(/[^a-z0-9._-]/gi, '-').replace(/\.[^.]+$/, '') + '.' + format;
  const fileKey = `health-nz/${id}/${safeName}`;
  await env.FILES.put(fileKey, bytes, { httpMetadata: { contentType: WORD_TYPES[format] } });
  const period = title.match(/(?:quarter|q)\s*[1-4][\s,/-]*(?:20\d{2})[/-](?:20)?\d{2}/i)?.[0] || null;
  const summary = `Word report saved for download. Text, page references and metrics require manual review.${sourceUrl ? ` Source: ${sourceUrl}` : ''}`;
  const result = await d1().prepare(`INSERT OR IGNORE INTO reports (id,file_key,filename,title,period,publication_date,page_count,extraction_status,summary,pages_json,metrics_json,created_at) VALUES (?,?,?,?,?,NULL,0,'needs_manual_review',?,'[]','[]',?)`)
    .bind(id,fileKey,safeName,title,period,summary,new Date().toISOString()).run();
  return { id, title, period, pageCount: 0, extractionStatus: 'needs_manual_review', summary, metrics: [], inserted: Boolean(result.meta.changes) };
}

export async function acquireWordReport(candidate: Candidate, source: SourceConfig) {
  const id = `health-nz-word-${await sha256(canonicalizeUrl(candidate.url))}`;
  if (await d1().prepare('SELECT id FROM reports WHERE id = ?').bind(id).first()) return false;
  const file = await downloadWordReport(candidate, source);
  return (await storeWordReport(id, candidate.title, file.filename, file.bytes, candidate.url)).inserted;
}
