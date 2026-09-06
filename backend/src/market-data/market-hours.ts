// Minimal closed-market check so scheduled ingestion doesn't burn provider
// quota re-fetching data that can't have changed. Weekends only for now -
// US equity markets are also closed on federal holidays, but that's out of
// scope for this pass.
const CLOSED_WEEKDAYS = new Set([0, 6]); // Sunday, Saturday (UTC)

export function isMarketClosed(now: Date = new Date()): boolean {
  return CLOSED_WEEKDAYS.has(now.getUTCDay());
}
