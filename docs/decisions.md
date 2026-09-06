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
| Intraday candle ingestion eligibility | Skip the entire 5-minute tick when the market is closed (weekends, at minimum), and per instrument skip the provider call when the latest stored 5-minute candle is still within that 5-minute interval; discovered the sibling scheduler to quote ingestion had the same unconditional-refetch problem - it was still calling every watchlisted instrument every 5 minutes regardless of whether a new bar could exist, which on a closed-market day is pure wasted quota |
| Day range / volume source | Sourced from the most recently completed daily `OhlcvCandle` rather than a new live-intraday field on `LatestQuote`; reuses existing storage with no schema/provider change, at the cost of showing the last completed trading day's range during market hours rather than today's still-forming one |
| Benchmark instrument representation | A fixed `BENCHMARK_SYMBOLS` application constant (one symbol, SPY), not a database flag on `Instrument`; there's exactly one benchmark today and no product need yet to manage benchmarks dynamically |
| Move-significance formula | A 20-day ATR-based baseline (as a % of price), scaled by the square root of elapsed time since the watchlist's previous visit, compared against a single whole-market benchmark's move over the same window; classifies into `normal`/`broad-market`/`notable`/`insufficient-history` with fixed, disclosed constants rather than user-tunable thresholds - deliberately plain arithmetic over existing OHLCV history, not a scoring model |
| Watchlist visit tracking | A single nullable `lastViewedAt` watermark column on `Watchlist`, advanced only by an explicit `POST /watchlists/:id/visits` action (never by the existing polling `GET`) and only when at least 20 minutes have passed since the prior watermark; no visit history/log table, since nothing today needs more than "the last time" |