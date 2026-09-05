# Architecture Decisions

| Decision | Choice |
|---|---|
| Market data provider | One provider behind `MarketDataProvider` abstraction |
| Instrument identity | Internal provider-independent ID + exchange + provider symbol |
| Persistence | PostgreSQL relational model |
| Authentication | Email/password + JWT |
| Market data | Periodic backend ingestion |
| Ingestion scope | Watchlist-relevant instruments |
| Data granularity | Latest quotes + intraday + daily OHLCV |
| Storage | Separate latest quotes and OHLCV tables |
| Freshness | Provider timestamp + ingestion timestamp + freshness status |
| API | REST |
| Chart API | Client requests range; backend chooses resolution |
| Frontend updates | TanStack Query polling |
| Watchlist ordering | Persisted position, transactional reorder |
| Market data provider (concrete) | Twelve Data, behind `MarketDataProvider` |
| Quote ingestion strategy | Rate-limited priority queue (stalest watchlisted instrument first), not a fixed per-instrument refresh interval, to fit Twelve Data's free-tier 8 req/min cap |
| Freshness computation | Computed at read time from `ingestedAt` (current ≤10min, delayed ≤2h, stale beyond); not a persisted column |
| Instrument catalog population | Seeded from a static reference list (`prisma/fixtures/instruments.json`), not a live pass-through to the provider's symbol search |
| JWT expiry | 7-day access token, no refresh token (Phase 0 has no sensitive/trading actions) |
| Non-owner resource access | 404, not 403, to avoid revealing whether a resource exists |
| Quote ingestion eligibility | Skip an instrument already within the "current" freshness window (≤10min) rather than re-fetching every watchlisted instrument every tick; discovered during Phase 1 testing that unconditional refresh burns a free-tier daily quota (800 req/day) in hours even for a handful of watchlisted instruments |
| Provider request timeout | 10s timeout (`AbortSignal`) on every Twelve Data request; without one, a single hung request permanently starves the whole ingestion queue behind it, since the stalest instrument is always retried first |