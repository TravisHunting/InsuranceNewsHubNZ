import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { START_SCRAPE_SQL, SCRAPE_COOLDOWN_MS, scrapeCooldown } from '../lib/scrape-cooldown';
import { dailyScrape } from '../scripts/daily-scrape.mjs';

test('atomic trigger gate includes existing and failed runs, and opens exactly at four hours', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0000_koru_initial.sql', import.meta.url), 'utf8'));
  const insert = db.prepare(START_SCRAPE_SQL);
  const now = Date.parse('2026-09-12T18:17:00Z');
  const start = (id: string, time: number) => {
    const timestamp = new Date(time).toISOString();
    return insert.run(id, 8, timestamp, timestamp, new Date(time - SCRAPE_COOLDOWN_MS).toISOString()).changes;
  };
  assert.equal(start('first', now), 1);
  assert.equal(start('simultaneous', now), 0);
  db.exec("UPDATE scrape_runs SET status='failed'");
  assert.equal(start('early', now + SCRAPE_COOLDOWN_MS - 1), 0);
  assert.equal(start('boundary', now + SCRAPE_COOLDOWN_MS), 1);
  assert.equal(start('second-simultaneous', now + SCRAPE_COOLDOWN_MS), 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM scrape_runs').get()?.count, 2);
  db.close();
});

test('cooldown response states elapsed hours and an Auckland retry time across midnight', () => {
  const result = scrapeCooldown('2026-09-12T10:00:00Z', Date.parse('2026-09-12T11:30:00Z'));
  assert.equal(result.retryAfterSeconds, 9000);
  assert.equal(result.nextAllowedAt, '2026-09-12T14:00:00.000Z');
  assert.match(result.message, /triggered 1.5 hours ago/);
  assert.match(result.message, /13 Sept.*2:00|13 Sep.*2:00/);
  assert.match(result.message, /before triggering another/);
});

test('daily action skips cooldown without calling any source steps', async () => {
  let calls = 0;
  const result = await dailyScrape({ log: () => {}, fetchImpl: async () => {
    calls++;
    return Response.json({ error: 'scrape_cooldown', message: 'Please wait' }, { status: 429 });
  } });
  assert.equal(result, 'skipped');
  assert.equal(calls, 1);
});

test('daily action drives every bounded source step through completion despite source errors', async () => {
  let calls = 0;
  const result = await dailyScrape({ log: () => {}, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(options?.method, 'POST');
    if (calls === 1) {
      assert.match(String(url), /\/api\/refresh\/start$/);
      return Response.json({ id: 'run', status: 'running', cursor: 0, total_sources: 2 });
    }
    assert.match(String(url), /\/api\/refresh\/step$/);
    assert.deepEqual(JSON.parse(String(options?.body)), { runId: 'run' });
    return Response.json({ run: { id: 'run', cursor: calls - 1, status: calls === 3 ? 'complete' : 'running', errors: 1 } });
  } });
  assert.equal(result, 'complete');
  assert.equal(calls, 3);
});

test('daily action stops on HTTP errors and stalled progress without retrying POSTs', async () => {
  for (const response of [Response.json({ error: 'failure' }, { status: 500 }), Response.json({ run: { id: 'run', cursor: 0, status: 'running' } })]) {
    let calls = 0;
    await assert.rejects(dailyScrape({ log: () => {}, fetchImpl: async () => {
      calls++;
      return calls === 1 ? Response.json({ id: 'run', status: 'running', cursor: 0, total_sources: 1 }) : response;
    } }));
    assert.equal(calls, 2);
  }
});
