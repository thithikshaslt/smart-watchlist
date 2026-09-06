## Why

Phase 0 (backend) and Phase 1 (frontend) deliver a reliable, brokerage-style watchlist, but every user sees the same fixed columns and has no way to tell whether a price move is actually significant or just normal noise for that instrument. `docs/product.md` names the next two stages explicitly — **Adaptive Watchlist** (users configure what they see) and **Meaningful Change** (use that configuration to surface what changed since their last visit) — and this is the point in the roadmap to build them. The foundation is stable and tested, so this change can build directly on existing data (`OhlcvCandle`, `LatestQuote`, `Watchlist`) rather than a new parallel model.

## What Changes

- Watchlists gain an optional, per-watchlist display configuration (a "lens") selecting which metrics render — price, $ change, % change, day range, volume, freshness — from a small fixed catalog (not a general column builder). Default is the current fixed view; nothing changes for a watchlist until its owner customizes it.
- Market-data ingestion scope is extended to always include one fixed broad-market benchmark instrument (SPY), independent of any watchlist membership, so instrument moves can be judged against the same day's overall market move.
- New: a deterministic **significance classification** per watchlisted instrument, computed from (a) the instrument's own recent daily volatility (a 20-trading-day average-true-range-style baseline) and (b) the benchmark's move over the same window — classified as `normal`, `broad-market`, `notable`, or `insufficient-history` (fewer than 20 daily candles). No AI/ML — plain arithmetic over data already collected.
- New: watchlist **visit tracking** via a single `lastViewedAt` watermark column on `Watchlist`. It is advanced only by an explicit visit action, never by the existing TanStack Query polling `GET`, and only advances when the previous watermark is at least 20 minutes old (guards against a page remount/refresh silently resetting a multi-day window).
- New: `POST /watchlists/:id/visits` — reads the current watermark, computes each lens-visible item's classification between that watermark and now (current value from `LatestQuote`, prior value from the nearest `OhlcvCandle` at/before the watermark), advances the watermark, and returns the previous watermark plus per-item results and a summary count. The existing `GET /watchlists/:id` is unchanged.
- Frontend: a "Customize view" control per watchlist for the display lens; a one-line "since your last visit" digest banner (shown only when a prior watermark exists); per-item badges for `notable`/`broad-market` moves only (`normal`/`insufficient-history` stay unbadged to avoid noise); the visit call fires once per genuine page mount, decoupled from polling.

## Capabilities

### New Capabilities
- `smart-insights`: significance classification of watchlist item price moves (self-relative + market-relative), the watchlist visit watermark, and the `POST /watchlists/:id/visits` contract.
- `frontend-smart-insights`: UI for per-watchlist display customization, the since-last-visit digest, and notable/broad-market badges, triggered on genuine page visits rather than background polling.

### Modified Capabilities
- `watchlists`: a watchlist gains an optional display configuration (view lens) that is included in watchlist responses; absence of a configured lens preserves today's default rendering.
- `market-data`: ingestion scope changes from "watchlist-relevant instruments only" to "watchlist-relevant instruments plus a small fixed benchmark set," so a benchmark stays fresh even when no user has watchlisted it.

## Impact

- **Backend schema**: `Watchlist` gains `lastViewedAt` (nullable timestamp) and a lens/view-configuration field; no new tables. A benchmark instrument (SPY) is added to the seeded instrument catalog (`prisma/fixtures/instruments.json`).
- **Backend modules**: `watchlisted-instruments.service.ts`'s ingestion-scope query is extended to union in the fixed benchmark set; a new `smart-insights` capability owns the significance computation and the visits endpoint (exact module boundary — new Nest module vs. extension of `market-data`/`watchlists` — is a design.md decision).
- **API**: one new endpoint (`POST /watchlists/:id/visits`); no changes to existing endpoint contracts or breaking changes.
- **Frontend**: `WatchlistDetailPage` gains a mount-time visit call and a digest banner; `WatchlistItemRow`/`PriceBadge` gain an optional significance badge; a new "Customize view" control writes the lens configuration.
- **Quota/ingestion**: adds exactly one more always-ingested instrument (SPY) to the shared Twelve Data rate-limited queue; negligible given the existing skip-if-fresh eligibility fix.
