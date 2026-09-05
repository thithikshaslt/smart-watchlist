## Context

This is a greenfield backend — no code exists yet. `docs/architecture.md` and `docs/decisions.md` already fix the high-level shape (NestJS + Fastify modular monolith, PostgreSQL via Prisma, REST, email/password + JWT, one market-data provider behind an abstraction, separate latest-quote/OHLCV storage with freshness tracking, transactional reorder). This design fills in the concrete choices needed to implement the five capability specs (`auth`, `users`, `instruments`, `watchlists`, `market-data`): module layout, schema, the chosen provider (Twelve Data), ingestion scheduling under its rate limits, freshness thresholds, and how the instrument catalog gets populated. See `proposal.md` for motivation and `specs/*/spec.md` for the behavior contract.

## Goals / Non-Goals

**Goals:**
- Concrete NestJS module/folder layout matching the domains in `docs/architecture.md`.
- Concrete Prisma schema (tables, fields, relations, indexes) for `User`, `Watchlist`, `WatchlistItem`, `Instrument`, `latest_quotes`, `ohlcv_candles`.
- A working JWT auth flow (hashing, issuance, guard) sized for a single-service, hobby-scale app.
- A concrete integration with Twelve Data that respects its free-tier rate limits while keeping watchlisted instruments reasonably fresh.
- A way for the instrument catalog to be searchable before any ingestion has happened.
- Concrete freshness thresholds implementing the current/delayed/stale states from `docs/architecture.md`.

**Non-Goals:**
- Frontend implementation of any kind.
- Any adaptive/"smart" functionality from `docs/product.md`'s later phases (customizable metrics, meaningful-change detection).
- Multi-provider support or provider failover — `docs/decisions.md` fixes one provider.
- Refresh-token rotation, OAuth, or social login.
- A caching layer (e.g., Redis) in front of Postgres — not justified at current scale per `CLAUDE.md`.
- Full-market instrument discovery — the catalog covers a seeded reference set, not every tradable symbol.

## Decisions

### Module layout
NestJS modules mirror the five domains 1:1: `AuthModule`, `UsersModule`, `InstrumentsModule`, `WatchlistsModule`, `MarketDataModule`, plus a shared `PrismaModule` (global, wraps `PrismaClient`) and a `ConfigModule` (via `@nestjs/config`) for env-driven settings. `WatchlistsModule` depends on `InstrumentsModule` (to validate instrument IDs) and `MarketDataModule` depends on `InstrumentsModule` (to know what to ingest). Alternative considered: a single flat module — rejected, contradicts the modular-monolith mandate in `docs/architecture.md` and makes future domains (Smart Insights, Alerts) harder to slot in.

### Data model (Prisma)
- `User { id (uuid, pk), email (unique), passwordHash, createdAt, updatedAt }`
- `Watchlist { id (uuid, pk), userId (fk -> User, indexed), name, createdAt, updatedAt }`
- `WatchlistItem { id (uuid, pk), watchlistId (fk -> Watchlist, indexed), instrumentId (fk -> Instrument), position (int), createdAt }`, unique constraint on `(watchlistId, instrumentId)` to enforce no-duplicate-add at the DB layer, and index on `(watchlistId, position)` for ordered reads.
- `Instrument { id (uuid, pk), symbol, name, exchange, providerSymbol, createdAt }`, unique constraint on `(symbol, exchange)`; index on `symbol`/`name` (case-insensitive) to back search.
- `LatestQuote { instrumentId (fk -> Instrument, pk), price, change, changePercent, providerTimestamp, ingestedAt }` — one row per instrument, upserted on each successful ingestion. `freshness` is not a stored column: it is computed at read time from `ingestedAt` (see Freshness thresholds below) and exists only as an application/API-level enum (`current | delayed | stale`) attached to responses.
- `OhlcvCandle { id (uuid, pk), instrumentId (fk -> Instrument, indexed), interval (enum: intraday_5m | daily), timestamp, open, high, low, close, volume }`, unique constraint on `(instrumentId, interval, timestamp)`, index on `(instrumentId, interval, timestamp)` for range queries.

Kept `latest_quotes` and `ohlcv_candles` as separate tables (per `docs/decisions.md`) rather than deriving "latest" from the candle table, since per-quote timestamp bookkeeping (provider timestamp vs. ingestion timestamp) doesn't apply to historical candles.

### Auth: hashing, tokens, guard
- Passwords hashed with bcrypt (cost factor 12); minimum password policy: 8+ characters.
- JWT issued via `@nestjs/jwt`, signed with a server-side secret (`JWT_SECRET` env var), 7-day expiry. Alternative considered: short-lived access token + refresh token — rejected for Phase 0 as unnecessary complexity for a hobby-scale app with no sensitive financial actions (watchlists are read/organize only, not trading); revisit if the product later adds account-sensitive actions.
- A global `JwtAuthGuard` (Passport `passport-jwt` strategy) protects all `users`, `watchlists`, and any instrument/market-data endpoints that reflect user-specific state; `auth` (register/login) and instrument catalog reads (`search`, `get by id`) remain public since browsing instruments doesn't require ownership.
- Ownership checks (`watchlists`) live in the service layer: a watchlist lookup is always scoped by `WHERE id = :id AND userId = :callerId`. A watchlist that exists but isn't owned by the caller returns the same 404 as one that doesn't exist, avoiding resource-existence leakage.

### Market data provider: Twelve Data integration
- `MarketDataProvider` is an interface (`getQuote(providerSymbol)`, `getCandles(providerSymbol, interval, range)`); `TwelveDataProvider` is its only implementation, isolating Twelve Data's request/response shape and its `symbol` (not our internal ID) as the lookup key.
- Twelve Data free tier: 8 requests/minute, 800 requests/day. All ingestion — quotes and candles — is scoped to the distinct set of instruments that appear in at least one watchlist (query: `SELECT DISTINCT instrumentId FROM WatchlistItem`), not the full catalog.
- Quote ingestion uses a rate-limited priority queue rather than a fixed refresh interval: the distinct watchlisted instruments are ordered by time since each one's last successful ingestion (staler instruments first), and the queue is drained at up to 8 provider requests per minute. The system does not guarantee any particular refresh cadence per instrument — actual refresh frequency depends on how many distinct instruments are watchlisted relative to the rate limit — but the stalest instrument is always served next. Alternative considered: a fixed periodic batch refresh (e.g., every 5 minutes) of every watchlisted instrument — rejected because it either exceeds the rate limit once the watchlisted-instrument count passes what 8/min can cover in that window, or wastes headroom when the count is small; a priority queue degrades gracefully in both directions.
- Daily OHLCV candles are ingested once/day (off-peak) for the same watchlisted-instrument set. Intraday candles (5-minute interval) are ingested on their own fixed 5-minute schedule, independent of the quote queue, sharing the same 8-requests/minute ceiling. Alternative considered: fetch history on-demand per user request — rejected because it couples read latency to a third-party API and makes rate-limit exhaustion user-facing; scheduled ingestion keeps reads fast and provider calls predictable.
- Ingestion failures (network error, rate-limit response) for a given instrument leave its `LatestQuote` row untouched. Because freshness is computed at read time from `ingestedAt` rather than stored, a failed ingestion is reflected automatically as the existing quote ages — no separate step is needed to mark it stale.

### Freshness thresholds
`freshness` is derived from `now - ingestedAt` at read time — it is not a stored column, so it can never itself go stale relative to what the database actually holds. Thresholds: `current` if ingested within the last 10 minutes, `delayed` if within the last 2 hours, `stale` beyond that. These are Phase-0 defaults chosen to tolerate the priority queue's best-effort cadence — an instrument can wait longer than 10 minutes between successful ingestions once enough instruments are watchlisted — without being so loose that genuinely stale data reads as current; they are not a market-hours-aware calendar. Documented here so they're easy to find and adjust later.

### Instrument catalog seeding
Twelve Data's own `symbol_search` endpoint could back live search, but `docs/architecture.md` models `Instrument` as an internally-owned table that watchlists reference by internal ID — not a live pass-through to the provider. Decision: seed the `Instrument` table from a small static reference list (JSON fixture checked into the repo, ~100-500 common, liquid US equities) via a Prisma seed script run after migration. Search (`instruments` capability) queries only this local catalog. Alternative considered: call Twelve Data's `symbol_search` live and upsert results into `Instrument` on the fly — rejected for Phase 0 to keep instrument identity and ingestion scope deterministic and avoid an extra external call on every keystroke of a search box; revisit if catalog coverage becomes a real limitation.

### API conventions
- Standard Nest `HttpException` JSON error shape: `{ statusCode, message, error }`.
- Route shapes follow `docs/architecture.md` § API exactly (e.g., `POST /watchlists`, `POST /watchlists/:id/items`, `PATCH /watchlists/:id/items/reorder`, `GET /instruments/:id/quote`, `GET /instruments/:id/history?range=...`).
- Config via `@nestjs/config` reading a `.env`: `DATABASE_URL`, `JWT_SECRET`, `TWELVE_DATA_API_KEY`, `TWELVE_DATA_BASE_URL`.

## Risks / Trade-offs

- [Twelve Data free-tier rate limits are shared across all users] → Mitigation: dedupe by distinct watchlisted instrument (not per-user), batch within the per-minute cap; documented as a scaling limit to revisit (paid tier or caching) if the user base grows materially.
- [Priority queue gives no guaranteed per-instrument refresh cadence for quotes] → Mitigation: staler instruments are always served next, so no instrument is starved indefinitely; acceptable at Phase-0 scale where the watchlisted set comfortably cycles through within a few minutes.
- [Static seed catalog limits what instruments users can find] → Mitigation: documented Phase-0 limitation; extending the seed list or adding live provider search is a small, isolated follow-up change.
- [7-day JWT with no revocation means a leaked token stays valid for up to a week] → Mitigation: acceptable for Phase 0's low-sensitivity, read/organize-only scope; revisit if the product adds sensitive actions.
- [Freshness computed at read time rather than a background sweep] → Mitigation: keeps ingestion failures simple (no separate "mark stale" job to fail), at the cost of a cheap timestamp comparison per read — negligible at current scale.

## Migration Plan

- Single initial Prisma migration creates all tables listed above; no existing data to migrate (greenfield).
- Prisma seed script populates the `Instrument` reference list after migration.
- Rollback: since there is no production data yet, rollback is `prisma migrate reset` in any non-production environment; no data-preserving rollback is needed for this first migration.

## Open Questions

- Whether the 5-minute ingestion cadence and freshness thresholds need adjustment once real usage patterns (number of users, watchlist sizes, market hours vs. after-hours) are observed. This can be tuned later via config without changing the specs or approach.
