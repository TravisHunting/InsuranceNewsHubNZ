import { pathToFileURL } from 'node:url';

export async function dailyScrape({ fetchImpl = fetch, log = console.log } = {}) {
  const origin = 'https://koru.travishunting.com';
  async function post(path, body) {
    const response = await fetchImpl(`${origin}${path}`, {
      method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(180_000),
    });
    const payload = await response.json();
    return { response, payload };
  }
  const { response, payload } = await post('/api/refresh/start');
  if (response.status === 429 && payload.error === 'scrape_cooldown') {
    log(`Skipped: ${payload.message}`);
    return 'skipped';
  }
  if (!response.ok || !payload.id || !Number.isInteger(payload.total_sources)) {
    throw new Error(`Could not start scrape (HTTP ${response.status})`);
  }
  let run = payload;
  // Never retry ambiguous POST failures: the server may have processed them.
  // Interrupted runs remain visible in the UI for manual resumption.
  for (let step = 0; step <= Math.max(1, payload.total_sources); step++) {
    if (run.status === 'complete') {
      log(`Scrape complete: ${run.new_articles || 0} new records, ${run.errors || 0} source errors.`);
      return 'complete';
    }
    const result = await post('/api/refresh/step', { runId: payload.id });
    if (!result.response.ok || !result.payload.run || result.payload.run.id !== payload.id) {
      throw new Error(`Scrape step failed (HTTP ${result.response.status}); resume the run in the UI.`);
    }
    const next = result.payload.run;
    if (next.status !== 'complete' && Number(next.cursor) <= Number(run.cursor)) {
      throw new Error('Scrape did not advance; resume the run in the UI.');
    }
    run = next;
    if (result.payload.source) log(`${result.payload.source.name}: ${result.payload.source.message}`);
  }
  throw new Error('Scrape exceeded its bounded source count.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  dailyScrape().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
