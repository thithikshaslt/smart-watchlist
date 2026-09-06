// Fixed set of instruments always kept in the ingestion scope, independent of
// watchlist membership, so smart-insights always has a broad-market reference
// to compare a watchlisted instrument's move against. One instrument today;
// an application-level constant rather than a database flag, since there's no
// product need yet to manage benchmarks dynamically (see docs/decisions.md).
export const BENCHMARK_SYMBOLS = ['SPY'];
