export const SCRAPE_COOLDOWN_MS = 4 * 60 * 60 * 1000;

// Eligibility and trigger recording are a single atomic SQLite write.
export const START_SCRAPE_SQL = `INSERT INTO scrape_runs
  (id,status,cursor,total_sources,created_at,updated_at)
  SELECT ?,'running',0,?,?,?
  WHERE NOT EXISTS (SELECT 1 FROM scrape_runs WHERE created_at > ?)`;

export function scrapeCooldown(lastTriggeredAt: string, now = Date.now()) {
  const elapsed = Math.max(0, now - Date.parse(lastTriggeredAt));
  const nextAllowedAt = new Date(Date.parse(lastTriggeredAt) + SCRAPE_COOLDOWN_MS).toISOString();
  const hours = Math.floor(elapsed / 3_600_000 * 10) / 10;
  const clock = new Intl.DateTimeFormat('en-NZ', {
    hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short',
    timeZone: 'Pacific/Auckland', timeZoneName: 'short',
  }).format(new Date(nextAllowedAt));
  return {
    error: 'scrape_cooldown', lastTriggeredAt, nextAllowedAt,
    retryAfterSeconds: Math.max(0, Math.ceil((Date.parse(nextAllowedAt) - now) / 1000)),
    message: `Scrape was triggered ${hours} ${hours === 1 ? 'hour' : 'hours'} ago, please wait until ${clock} before triggering another.`,
  };
}
