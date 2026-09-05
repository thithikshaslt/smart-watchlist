## Why

Every later phase (adaptive watchlist views, meaningful-change detection) depends on a reliable, persisted watchlist experience. Before any of that can be built, the application needs its backend foundation: authenticated user accounts, a queryable instrument catalog, persisted watchlists, and market data the frontend can render. This is Phase 0 — the "Foundation" scope described in `docs/product.md`, implemented per the domains and decisions already recorded in `docs/architecture.md` and `docs/decisions.md`. There is currently no backend code in the repository.

## What Changes

- Stand up the NestJS + Fastify backend as a modular monolith with domain modules: Auth, Users, Instruments, Watchlists, Market Data (per `docs/architecture.md`).
- Add the PostgreSQL schema via Prisma: `User`, `Watchlist`, `WatchlistItem`, `Instrument`, `latest_quotes`, `ohlcv_candles`, matching the data model in `docs/architecture.md`.
- Add email/password registration and login issuing JWTs (per `docs/decisions.md`); protect user-owned resources with a JWT auth guard.
- Add an instrument catalog with search/lookup, keyed by an internal provider-independent ID (`docs/architecture.md` § Instrument).
- Add watchlist management: create/rename/delete watchlists, add/remove instruments, and transactional, position-based reordering (`docs/decisions.md` § Watchlist ordering).
- Add a `MarketDataProvider` abstraction with scheduled ingestion of watchlist-relevant instruments, storing latest quotes and OHLCV history with provider timestamp, ingestion timestamp, and freshness status (`docs/architecture.md` § Market Data, § Data Freshness).
- Expose all of the above as REST endpoints organized by domain resource, matching the shapes illustrated in `docs/architecture.md` § API.
- Out of scope for this phase: any frontend work, and any "smart"/adaptive functionality (customizable metrics, meaningful-change detection) described in `docs/product.md` § Product Evolution.

## Capabilities

### New Capabilities
- `auth`: user registration, login, password hashing, JWT issuance and validation, and enforcement that protected endpoints require a valid token.
- `users`: the user account record and retrieval of the authenticated user's own identity, used as the ownership basis for watchlists.
- `instruments`: the internal instrument catalog (id, name, symbol, exchange, provider symbol) and search/lookup used to add instruments to a watchlist.
- `watchlists`: watchlist CRUD, item add/remove, transactional reorder with persisted position, and ownership-based authorization so a user can only access their own watchlists.
- `market-data`: the `MarketDataProvider` abstraction, scheduled ingestion for watchlist-relevant instruments, latest-quote and OHLCV storage, freshness status, and the read APIs (`/instruments/:id/quote`, `/instruments/:id/history`) the frontend will consume.

### Modified Capabilities
None — this is the first backend change; no existing specs exist yet.

## Impact

- **New code**: entire backend service (NestJS project, Prisma schema/migrations, all domain modules and REST controllers).
- **New dependency**: an external market data provider integration (concrete provider to be confirmed in `design.md`), including credential/config management and scheduled-job infrastructure for ingestion.
- **Database**: new PostgreSQL database and Prisma migration history.
- **API surface**: new REST API consumed by the (not-yet-built) frontend; no existing API to break.
- **Docs**: `docs/decisions.md` will gain the concrete decisions made in `design.md` (e.g., named market data provider, JWT/session details) once finalized.
