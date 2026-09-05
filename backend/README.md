# Smart Market Watchlist — Backend

Phase 0 backend foundation: authentication, users, instruments, watchlists, and market data (Twelve Data). See `../docs/architecture.md` and `../docs/decisions.md` for the system-level design, and `../openspec/changes/phase-0-backend-foundation/` for the specs and design behind this implementation.

## Stack

NestJS + Fastify, PostgreSQL via Prisma, JWT auth, Twelve Data for market data.

## Prerequisites

- Node.js 20+ (developed against Node 22)
- Docker (for local Postgres via `docker-compose.yml`)
- A [Twelve Data](https://twelvedata.com/) API key (free tier works) — only required for live market data ingestion; everything else works without one

## Setup

1. **Start Postgres:**

   ```bash
   docker compose up -d
   ```

   This starts Postgres on `localhost:5433` (not 5432, to avoid clashing with any other local Postgres). See `docker-compose.yml` if you need to change the port.

2. **Configure environment:**

   ```bash
   cp .env.example .env
   ```

   Fill in `TWELVE_DATA_API_KEY` with your own key. The other defaults match `docker-compose.yml` and work out of the box for local development.

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Run migrations and seed the instrument catalog:**

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

   The seed loads ~110 common US equities from `prisma/fixtures/instruments.json` into the `Instrument` table so search/watchlist endpoints have data to work with immediately. Re-running the seed is safe — it upserts by `(symbol, exchange)`.

5. **Start the server:**

   ```bash
   npm run start:dev
   ```

   The API listens on `http://localhost:3000` (configurable via `PORT`). Check `GET /health` for a liveness check.

## Running tests

```bash
npm test          # unit tests
npm run test:e2e  # end-to-end tests (requires Postgres running, per step 1 above)
npm run test:cov  # unit tests with coverage
```

The e2e suite runs against the real database configured by `DATABASE_URL` and cleans up the users (and their cascade-deleted watchlists) it creates afterward; it leaves the seeded instrument catalog alone.

## Project layout

```text
src/
├── auth/          registration, login, JWT issuance and guard
├── users/          user account record, /users/me
├── instruments/     instrument catalog (search, lookup) + quote/history read endpoints
├── watchlists/       watchlist CRUD, items, reorder, ownership enforcement
├── market-data/      MarketDataProvider abstraction, Twelve Data integration,
│                     rate-limited ingestion, freshness computation
├── prisma/          PrismaService/PrismaModule (global)
└── common/          shared decorators (@Public, @CurrentUser) and the global exception filter

prisma/
├── schema.prisma    data model
├── seed.ts          seeds prisma/fixtures/instruments.json
└── migrations/
```

## Notable behavior

- **Market data ingestion is best-effort, not on a fixed cadence.** Quotes for watchlisted instruments are pulled through a rate-limited priority queue (stalest instrument first, capped at Twelve Data's free-tier 8 requests/minute) rather than a guaranteed per-instrument refresh interval. See `design.md`'s "Market data provider: Twelve Data integration" section for the reasoning.
- **Freshness (`current` / `delayed` / `stale`) is computed at read time**, not stored, from how long ago a quote was ingested — see `src/market-data/freshness.ts`.
- **A non-owner gets a 404, not a 403,** for another user's watchlist, to avoid revealing whether the resource exists.
- **The instrument catalog is a static seeded reference set**, not a live pass-through to Twelve Data — see `design.md`'s "Instrument catalog seeding" section.
