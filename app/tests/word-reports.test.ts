import test from 'node:test';
import assert from 'node:assert/strict';
import { wordReportCandidates, wordFormat, downloadWordReport } from '../lib/word-reports';
import { sourceRegistry } from '../lib/sources';
const source = sourceRegistry.find((s) => s.id === 'health-nz')!;
const base = source.seedUrls[0];

test('quarterly collection selects Word versions, decodes links and skips navigation and PDF alternatives', () => {
  const html = `<a href="/publications/report">Performance reports</a>
    <a href="/assets/q3.pdf">Quarter 3 PDF</a>
    <a href="/assets/q3.docx?download=1&amp;x=2">Quarter 3, 2025/26 Accessible format doc</a>
    <a href="/assets/q3.docx?download=1&amp;x=2#download">Duplicate</a>
    <a href="/download/42">Quarter 2, 2025/26 Accessible format doc</a>
    <a href="https://evil.example/q1.doc">Quarter 1 Word</a>
    <a href="/assets/q1.DOC">Quarter 1, 2025/26</a>`;
  const items = wordReportCandidates(html, base, source);
  assert.equal(items.length, 3);
  assert.equal(items[0].url, 'https://www.healthnz.govt.nz/assets/q3.docx?download=1&x=2');
  assert.match(items[0].title, /Quarter 3/);
  assert.ok(items.some((item) => item.url.endsWith('/download/42')));
});

test('Word signature validation rejects HTML, PDF and unrelated ZIP files', () => {
  for (const text of ['<html>Access denied</html>', '%PDF-1.7', 'PK unrelated.zip']) {
    assert.throws(() => wordFormat(new TextEncoder().encode(text)), /not a Word/);
  }
  assert.equal(wordFormat(new TextEncoder().encode('PK\x03\x04[Content_Types].xml word/document.xml')), 'docx');
  const doc = new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1,...new TextEncoder().encode('W\0o\0r\0d\0D\0o\0c\0u\0m\0e\0n\0t')]);
  assert.equal(wordFormat(doc), 'doc');
});

test('Word downloader allows reports above 5 MB, enforces 25 MB and rejects off-host redirects', async () => {
  const original = globalThis.fetch;
  let mode = 'success';
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/robots.txt')) return new Response('User-agent: *\nAllow: /');
    if (mode === 'redirect') return new Response(null, { status: 302, headers: { location: 'https://evil.example/file.doc' } });
    if (mode === 'large') return new Response('x', { headers: { 'content-length': '25000001' } });
    const bytes = new Uint8Array(7_500_000);
    bytes.set(new TextEncoder().encode('PK\x03\x04[Content_Types].xml word/document.xml'));
    return new Response(bytes);
  };
  try {
    const candidate = { title: 'Quarter 3', url: 'https://www.healthnz.govt.nz/assets/q3.docx' };
    assert.equal((await downloadWordReport(candidate, source)).bytes.length, 7_500_000);
    mode = 'large';
    await assert.rejects(downloadWordReport(candidate, source), /25 MB/);
    mode = 'redirect';
    await assert.rejects(downloadWordReport(candidate, source), /allowlisted/);
  } finally { globalThis.fetch = original; }
});
