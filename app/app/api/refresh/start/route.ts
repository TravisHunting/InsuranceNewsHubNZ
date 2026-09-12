import { NextResponse } from 'next/server';
import { d1, ensureDb } from '@/lib/database';
import { sourceRegistry } from '@/lib/sources';
import { SCRAPE_COOLDOWN_MS, START_SCRAPE_SQL, scrapeCooldown } from '@/lib/scrape-cooldown';

export async function POST() {
  await ensureDb();
  const db = d1();
  const id = crypto.randomUUID();
  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const total = sourceRegistry.filter((source) => source.enabled).length;
  const inserted = await db.prepare(START_SCRAPE_SQL)
    .bind(id, total, timestamp, timestamp, new Date(now - SCRAPE_COOLDOWN_MS).toISOString()).run();
  if (!inserted.meta.changes) {
    const last = await db.prepare('SELECT created_at FROM scrape_runs ORDER BY created_at DESC LIMIT 1')
      .first<{ created_at: string }>();
    if (!last) throw new Error('Could not read scrape cooldown');
    const cooldown = scrapeCooldown(last.created_at, now);
    return NextResponse.json(cooldown, {
      status: 429, headers: { 'Retry-After': String(cooldown.retryAfterSeconds), 'Cache-Control': 'no-store' },
    });
  }
  return NextResponse.json({ id, status: 'running', cursor: 0, total_sources: total, created_at: timestamp });
}
