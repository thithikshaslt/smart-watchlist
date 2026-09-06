## Context

See `proposal.md` for motivation. Relevant existing state (see `openspec/changes/smart-insights/specs/*` for the behavior contract this design implements):

- `Watchlist`/`WatchlistItem`/`Instrument`/`LatestQuote`/`OhlcvCandle` already exist (`backend/prisma/schema.prisma`); `LatestQuote` holds only the current value, `OhlcvCandle` is a real time series at `intraday_5m`/`daily` resolution.
- Ingestion scope today is derived entirely from watchlist membership (`WatchlistedInstrumentsService.getIdsDueForQuoteRefresh` / `getDistinctInstrumentIds`).
- The frontend already polls `GET /watchlists/:id` via TanStack Query on an interval; this must remain a pure read.
- The instrument catalog is seeded from a static fixture (`prisma/fixtures/instruments.json`), not a live provider pass-through.

## Goals / Non-Goals

**Goals:**
- Define exactly how "significant" is computed and how the visit watermark advances, so an implementer isn't left guessing at the arithmetic the specs deliberately left out.
- Keep the entire feature reusing existing storage (`Watchlist`, `OhlcvCandle`, `LatestQuote`) — no new tables.

**Non-Goals:**
- Significance classification considers **price only** in this change. The proposal's display-lens metrics (volume, day range, etc.) affect what's *shown*; extending significance classification to volume or other lens-selected metrics is future work, not part of this change.
- No user-tunable thresholds. The ATR multiplier, market-comparison margin, and visit-gap guard are fixed constants, not settings.
- No sector-specific benchmarks — one fixed whole-market benchmark (SPY) only.
- No per-item notes/price targets, no alerting/notifications — those remain the separate, not-yet-designed `Alerts` domain.
- No visit history/audit log — a single watermark column, not a log of past visits.

## Decisions

### Module boundary: new `smart-insights` module
Introduce a new backend module (`smart-insights`) rather than folding this logic into `watchlists` or `market-data`, matching `architecture.md`'s own anticipated future module list. It depends on `PrismaService` directly and on `market-data`'s existing read paths (`LatestQuote`, `OhlcvCandle`) and `watchlists`' ownership checks, the same way `market-data` already depends on `watchlists`' `WatchlistedInstrumentsService` today.
*Alternative considered*: fold the visit/classification logic directly into `watchlists.service.ts`. Rejected — this blurs ownership as the domain grows (a future `Alerts` module would plausibly build on `smart-insights`, not on `watchlists` internals), and the significance math is a distinct, independently testable concern.

### Storage: two nullable columns on `Watchlist`, no new tables
Add `lastViewedAt DateTime?` and `viewLens Json?` to `Watchlist`. `viewLens` holds a small array of metric keys from the fixed catalog (e.g. `["price", "percentChange", "volume"]`); `null` means "use the default view."
*Alternative considered*: a separate `WatchlistViewConfig` table (1:1 with `Watchlist`). Rejected as unnecessary normalization for two optional fields on an entity the request is always already loading.

### Benchmark instrument: one fixed symbol, seeded like any other instrument
Add SPY to `prisma/fixtures/instruments.json` like any catalog instrument. Which instrument(s) count as benchmarks is an application-level constant (analogous to the existing `RANGE_WINDOWS` map in `market-data.service.ts`), not a database flag.
*Alternative considered*: an `isBenchmark` column on `Instrument`. Rejected — there is exactly one benchmark today and no product need yet to manage benchmarks dynamically; a DB flag is speculative generality for a single fixed value.

### Significance math: ATR%-based baseline, scaled by elapsed time, compared to the benchmark over the same window
This is the arithmetic the specs intentionally left unspecified (specs describe behavior, not formulas) but that an implementer needs pinned down:
1. **Own typical range**: compute a 20-trading-day Average True Range (True Range = `max(high−low, |high−prevClose|, |low−prevClose|)`, averaged over the last 20 daily candles), expressed as a percentage of the instrument's current price (`ATR%`). Requires 20 daily candles; fewer than that yields `insufficient-history`.
2. **Elapsed-time scaling**: because expected price dispersion grows with the square root of elapsed time (not linearly), scale the daily `ATR%` baseline by `sqrt(elapsed trading days since the previous watermark)` to get the *expected* move magnitude for however long it's actually been since the last visit. Without this, any visit gap longer than a day would make ordinary drift look "notable" purely because it accumulated over more days.
   *Alternative considered*: recompute a fresh baseline over the exact elapsed window instead of scaling a daily one. Rejected — it would need at least as much history as the elapsed gap (a instrument watchlisted only 25 days ago couldn't get a baseline for a 30-day-old visit), where scaling a fixed 20-day daily baseline always works once the minimum history exists.
3. **Classification**: let `move%` = the instrument's % change from its value at the previous watermark to now, and `benchmarkMove%` = the benchmark's % change over that same window.
   - `|move%| < 1.5 × scaled ATR%` → `normal`
   - `|move%| ≥ 1.5 × scaled ATR%` and `|move% − benchmarkMove%| ≤ scaled ATR%` → `broad-market` (the excess is explained by the market moving similarly)
   - `|move%| ≥ 1.5 × scaled ATR%` and `|move% − benchmarkMove%| > scaled ATR%` → `notable`
   - Fewer than 20 daily candles for the instrument → `insufficient-history`
4. **"Value at the previous watermark"**: the closing price of the nearest daily `OhlcvCandle` at or before the previous watermark (or the nearest intraday `5m` candle if the watermark is within the current trading day) — reusing existing storage, no new time-series table.

### Visit watermark: single column, read-then-advance, 20-minute minimum gap
`POST /watchlists/:id/visits` reads the current `lastViewedAt`, computes classifications against it, and — only if it is unset or at least 20 minutes old — overwrites it with the current time in the same request. Chosen because it's long enough to absorb a hard page refresh or brief tab-switch without discarding a multi-day comparison window, short enough that a genuine return visit later in the same working session still registers.
*Alternative considered*: a full visit log (append-only history of visit timestamps). Rejected — nothing in the current requirements needs more than "the last time," and a log adds a table and retention questions for no present benefit.

## Risks / Trade-offs

- **[Risk]** The elapsed-time scaling (√time) is a standard approximation, not a rigorous model of any specific instrument's actual return distribution. → **Mitigation**: the underlying price/quote numbers shown to the user are always real; only the `normal`/`notable`/`broad-market` label is heuristic, and it's deterministic and explainable if second-guessed, not a black box.
- **[Risk]** One whole-market benchmark can't explain a sector-specific move (e.g., a semiconductor-only rally isn't well captured by SPY). → **Mitigation**: explicitly deferred in the proposal; still strictly better than no market context, and the module boundary (benchmark as a small constant set) allows adding sector benchmarks later without a schema change.
- **[Risk]** A new instrument needs ~20 days of daily candles before it gets any classification. → **Mitigation**: consistent with this app's existing precedent of admitting missing data honestly (freshness states, empty chart states) rather than fabricating a baseline.
- **[Risk]** Mount-triggered visit marking can't distinguish "genuine return visit" from "hard browser refresh" at the network level. → **Mitigation**: the 20-minute guard absorbs the common case; not solved further, to avoid building session-tracking infrastructure disproportionate to the feature.
- **[Risk]** Multiple tabs/devices open on the same watchlist race on the same watermark. → **Mitigation**: accepted as last-write-wins; worst case is a shortened "since last visit" window, not incorrect market data or a security issue.
- **[Risk]** One more always-ingested instrument (SPY) adds to the shared rate-limited provider queue. → **Mitigation**: negligible given the already-shipped skip-if-fresh ingestion-eligibility fix; well within existing headroom for a single extra symbol.

## Migration Plan

- Additive Prisma migration: add nullable `lastViewedAt` and `viewLens` columns to `Watchlist`. No backfill required — both are unset for all existing watchlists, which preserves current behavior exactly (default lens, no digest until a first visit is recorded).
- Add SPY to `prisma/fixtures/instruments.json`; picked up by the existing idempotent seed process like any other catalog instrument.
- Rollback is non-destructive: drop the two new columns and remove the new module/endpoint; no existing data is altered by this change.

## Open Questions

- The exact numeric constants (1.5× ATR multiplier, the benchmark-comparison margin, the 20-minute visit gap, the 20-day ATR window) are set here as reasonable, stated defaults but aren't part of the behavior contract in the specs — they can be tuned during implementation or after seeing real demo data without requiring a spec change.
