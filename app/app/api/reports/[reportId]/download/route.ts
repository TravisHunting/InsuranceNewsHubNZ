import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { d1, ensureDb } from '../../../../../lib/database';

type ReportFile = {
  file_key: string;
  filename: string;
};

function downloadName(filename: string) {
  const cleaned = filename.replace(/[\r\n"\\/]/g, '-').trim();
  return cleaned || 'health-nz-report.pdf';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  await ensureDb();
  const { reportId } = await params;
  const report = await d1()
    .prepare('SELECT file_key, filename FROM reports WHERE id = ?')
    .bind(reportId)
    .first<ReportFile>();

  if (!report) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }

  if (!env.FILES) {
    return NextResponse.json({ error: 'Report storage is unavailable.' }, { status: 503 });
  }

  const file = await env.FILES.get(report.file_key);
  if (!file) {
    return NextResponse.json({ error: 'The uploaded report file could not be found.' }, { status: 404 });
  }

  const filename = downloadName(report.filename);
  return new Response(file.body, {
    headers: {
      'Content-Type': file.httpMetadata?.contentType || 'application/pdf',
      'Content-Length': String(file.size),
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
