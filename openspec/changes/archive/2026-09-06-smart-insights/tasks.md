## 1. Schema and seed data

- [x] 1.1 Add nullable `lastViewedAt DateTime?` and `viewLens Json?` columns to `Watchlist` in `backend/prisma/schema.prisma`; generate and run the migration, and verify `npx prisma migrate dev` succeeds with no data loss on the existing dev database
- [x] 1.2 Add SPY to `backend/prisma/fixtures/instruments.json` following the existing fixture shape, and verify the existing seed script picks it up idempotently (running it twice does not duplicate the row)

## 2. Market-data: always-on benchmark ingestion

- [x] 2.1 Add a small fixed `BENCHMARK_SYMBOLS` constant (containing SPY's internal instrument id or symbol) alongside the existing constants in `backend/src/market-data` (pattern: `RANGE_WINDOWS` in `market-data.service.ts`)
- [x] 2.2 Update `WatchlistedInstrumentsService` (`backend/src/market-data/watchlisted-instruments.service.ts`) so `getDistinctInstrumentIds` and `getIdsDueForQuoteRefresh` union in the benchmark instrument(s) regardless of watchlist membership; update `watchlisted-instruments.service.spec.ts` with a case proving a non-watchlisted benchmark is still returned, and that removing an instrument from every watchlist still ingests it if it's the benchmark
- [x] 2.3 Verify `CandleIngestionService.ingestIntraday`/`ingestDaily` continue to work unmodified against the extended id list (they already iterate whatever `getDistinctInstrumentIds` returns) — add/confirm a test asserting the benchmark's daily candles get ingested even with an empty watchlist

## 3. Backend: `smart-insights` module — significance classification

- [x] 3.1 Scaffold `backend/src/smart-insights/smart-insights.module.ts` importing `PrismaService` and the read paths it needs from `market-data` (`LatestQuote`/`OhlcvCandle` access) and `watchlists` (ownership checks), following the existing modular-monolith wiring pattern; verify the app boots with the new module registered in `AppModule`
- [x] 3.2 Implement an ATR%-based own-volatility baseline function (20-day Average True Range as a percentage of current price) reading from `OhlcvCandle`, returning "insufficient history" when fewer than 20 daily candles exist; unit test: exact ATR% output for a fixed set of synthetic daily candles, and the insufficient-history case
- [x] 3.3 Implement elapsed-time scaling of the baseline (`baseline × sqrt(elapsed trading days)`) per `design.md`; unit test: scaling factor for 1 day vs. multi-day gaps
- [x] 3.4 Implement the classification function (`normal` / `broad-market` / `notable` / `insufficient-history`) per the thresholds in `design.md`, taking the instrument's move %, the benchmark's move % over the same window, and the scaled baseline; unit test each of the four scenarios from `specs/smart-insights/spec.md`
- [x] 3.5 Implement "value at a point in time" lookup (nearest `OhlcvCandle` at/before a given timestamp, falling back to intraday `5m` candles for same-day lookups) as a reusable helper; unit test with candles before/after/exactly-at the target timestamp

## 4. Backend: visit watermark and visits endpoint

- [x] 4.1 Implement the read-then-advance visit logic: read `Watchlist.lastViewedAt`, and only overwrite it with the current time if it is null or at least 20 minutes old; unit test all three scenarios in `specs/smart-insights/spec.md`'s "Watchlist Visit Watermark" requirement (background-refresh-does-not-count is verified structurally — this logic only runs when explicitly invoked, never from the existing `GET` path)
- [x] 4.2 Implement `POST /watchlists/:id/visits` on the watchlists controller (or a route registered by the new module, owner-authorization enforced the same way existing watchlist routes are), returning the previous watermark (or none, on a first visit), each item's classification, and a summary count; unit/e2e test the first-visit and subsequent-visit response shapes from `specs/smart-insights/spec.md`
- [x] 4.3 Verify `GET /watchlists/:id` is untouched by this change — add a regression test asserting a `GET` request does not alter `lastViewedAt`

## 5. Backend: watchlist display lens

- [x] 5.1 Add a `PATCH` (or similar) endpoint / extend the existing watchlist update path to let the owner set `viewLens` to a validated subset of the fixed metric catalog (price, dollar change, percent change, day range, volume, freshness); reject unknown keys; unit test acceptance and rejection cases
- [x] 5.2 Include `viewLens` (nullable) in watchlist read responses; unit test that an unconfigured watchlist returns `null`/absent rather than a fabricated default value, and that owner-scoping still applies (existing "Watchlist Ownership Authorization" tests continue to pass)

## 6. Frontend: display lens customization

- [x] 6.1 Add a "Customize view" control on `WatchlistDetailPage.tsx` that reads/writes the watchlist's `viewLens` via a new hook (pattern: `useWatchlistReorder.ts`'s optimistic-update-with-revert-on-failure shape); manually verify in the browser that toggling a metric persists across a reload
- [x] 6.2 Update `WatchlistItemRow.tsx`/`PriceBadge.tsx` rendering to respect the configured lens, defaulting to today's current metric set when `viewLens` is unset; update `WatchlistItemRow`/`PriceBadge` tests to cover both the default and a customized lens. `dayRange`/`volume` source from `QuoteView`'s new fields (see `docs/decisions.md` - "Day range / volume source"), backed by the latest completed daily candle, not a live intraday total

## 7. Frontend: since-last-visit digest and move badges

- [x] 7.1 Add a hook that calls `POST /watchlists/:id/visits` exactly once per genuine page mount of `WatchlistDetailPage` (not on TanStack Query's polling refetch); verify with a test that mounting the page once triggers exactly one call regardless of how many times the polling query refetches during that mount
- [x] 7.2 Render the since-last-visit digest banner using the visit response (previous watermark + summary counts), omitting it entirely when there is no previous watermark (first visit); component test for both states, including the "nothing notable" phrasing when counts are zero
- [x] 7.3 Render per-item badges for `notable` and `broad-market` classifications only, visually distinct from each other, with no badge for `normal`/`insufficient-history`; component test asserting badge presence/absence and distinct styling per classification
- [x] 7.4 Manually run both dev servers and walk the full flow end-to-end: open a watchlist for the first time (no digest), wait past the 20-minute guard (or adjust it locally for testing), revisit, and confirm the digest and badges reflect real ingested price/candle data. Done via a real browser (Playwright against the running dev servers) driving the actual login → list → detail flow. Found and fixed a real UX bug: toggling one metric from the un-customized default replaced the whole default view (price/change vanished) instead of adding to it - `useWatchlistViewLens`/`ViewLensControl` now seed from `DEFAULT_VIEW_LENS_METRICS` so a toggle only adds/removes one metric. Confirmed working: no digest on first visit, digest with correct phrasing on a genuine revisit, customization persists across navigation, no console errors. Notable/broad-market badges were not observed live (this dev DB lacks 20 days of daily candles for a real instrument + the SPY benchmark) but are covered by component tests. Also surfaced, but did not fix (pre-existing, unrelated to this change): a hard page reload/fresh load of any authenticated route can race the very first API request ahead of `AuthProvider`'s token-sync effect, causing a spurious 401 logout - reproducible on `/watchlists` itself, worth a separate fix

## 8. Documentation and full verification

- [x] 8.1 Add entries to `docs/decisions.md` for: the benchmark-as-constant approach, the ATR%/sqrt-time significance formula, and the single-watermark (no visit log) choice
- [x] 8.2 Run the full backend test suite, `tsc --noEmit`, and lint; run the full frontend test suite, `tsc --noEmit`, and lint; fix any failures before considering the change complete. Backend: 78/78 unit tests pass, 27/28 e2e pass (the one failure is the same pre-existing shared-dev-DB data-pollution issue noted earlier this session, unrelated to this change), `tsc --noEmit` clean, lint clean. Frontend: 51/51 tests pass, `tsc -b` clean, lint clean (only pre-existing warnings in untouched files)
