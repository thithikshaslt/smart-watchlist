## 1. Project Setup

- [x] 1.1 Scaffold the NestJS + Fastify backend project (`backend/`) with TypeScript, ESLint/Prettier, and verify `npm run start:dev` boots a bare server
- [x] 1.2 Add `@nestjs/config` and `.env`/`.env.example` with `DATABASE_URL`, `JWT_SECRET`, `TWELVE_DATA_API_KEY`, `TWELVE_DATA_BASE_URL`; verify config values are readable via `ConfigService`
- [x] 1.3 Add Prisma, initialize `schema.prisma` pointed at `DATABASE_URL`, and add a global `PrismaModule`/`PrismaService`; verify `prisma db pull`/connection succeeds against a local Postgres instance
- [x] 1.4 Set up module skeletons for `AuthModule`, `UsersModule`, `InstrumentsModule`, `WatchlistsModule`, `MarketDataModule` (empty controllers/services) and wire them into `AppModule`; verify the app still boots with all modules registered

## 2. Database Schema

- [x] 2.1 Define `User` model in `schema.prisma` (id, unique email, passwordHash, timestamps) and generate the migration; verify `prisma migrate dev` applies cleanly
- [x] 2.2 Define `Instrument` model (id, symbol, name, exchange, providerSymbol, unique `(symbol, exchange)`, search-friendly index) and migrate
- [x] 2.3 Define `Watchlist` and `WatchlistItem` models (per design.md's field list, unique `(watchlistId, instrumentId)`, index on `(watchlistId, position)`) and migrate
- [x] 2.4 Define `LatestQuote` and `OhlcvCandle` models (per design.md, including the `interval` enum and the `(instrumentId, interval, timestamp)` unique constraint; `freshness` is not a persisted column) and migrate
- [x] 2.5 Write a Prisma seed script that loads a static reference list of ~100-500 common US equities into `Instrument`; verify `prisma db seed` populates the table and re-running it does not create duplicates

## 3. Auth Capability

- [x] 3.1 Implement registration (`POST /auth/register`): validate email/password, hash password with bcrypt (cost 12), create `User`; verify tests for success, duplicate email, and weak password from `specs/auth/spec.md`
- [x] 3.2 Implement login (`POST /auth/login`): verify credentials, issue a 7-day JWT; verify tests for success and invalid-credentials scenarios
- [x] 3.3 Implement `JwtAuthGuard` (Passport `passport-jwt` strategy) and apply it to protected controllers; verify tests for missing-token, invalid/expired-token, and valid-token scenarios

## 4. Users Capability

- [x] 4.1 Implement `GET /users/me` returning the authenticated user's account info, using the guard from 3.3; verify tests for authenticated and unauthenticated requests
- [x] 4.2 Verify service-layer helper used by Watchlists/Instruments always derives the owner ID from the authenticated request, never from the request body (per `specs/users/spec.md`)

## 5. Instruments Capability

- [x] 5.1 Implement `GET /instruments/search?q=` against the local catalog (case-insensitive symbol/name match), including minimum-query-length validation; verify tests for matches, no-results, and too-short-query scenarios
- [x] 5.2 Implement `GET /instruments/:id` returning catalog details or 404; verify tests for found and not-found scenarios

## 6. Watchlists Capability

- [x] 6.1 Implement `POST /watchlists` and `GET /watchlists` (create + list-own, owner-scoped); verify tests for creation and that listing never returns another user's watchlists
- [x] 6.2 Implement `PATCH /watchlists/:id` (rename) and `DELETE /watchlists/:id`, both owner-scoped; verify tests for successful rename/delete and that a non-owner gets 404
- [x] 6.3 Implement `POST /watchlists/:id/items` (add instrument): validate instrument exists, reject duplicates, assign next position; verify tests for success, duplicate-add, and unknown-instrument scenarios
- [x] 6.4 Implement `DELETE /watchlists/:id/items/:instrumentId` (remove instrument); verify test for successful removal
- [x] 6.5 Implement `PATCH /watchlists/:id/items/reorder` using a Prisma `$transaction` so a failed reorder leaves prior positions intact; verify tests for successful reorder and for a failed/partial request leaving order unchanged
- [x] 6.6 Verify ownership authorization end-to-end across all watchlist and watchlist-item endpoints (a second test user cannot view or mutate the first user's watchlist)

## 7. Market Data Capability

- [x] 7.1 Implement `MarketDataProvider` interface and `TwelveDataProvider` implementation (`getQuote`, `getCandles`) using `TWELVE_DATA_API_KEY`/`TWELVE_DATA_BASE_URL`; verify unit tests with a mocked HTTP client cover success and provider-error responses
- [x] 7.2 Implement the scheduled/rate-limited quote ingestion queue that selects distinct watchlisted instruments, prioritizes instruments by time since last successful ingestion, and processes at most 8 provider requests/minute; verify that the rate limit is respected and failed fetches leave the prior quote untouched.
- [x] 7.3 Implement scheduled intraday (5-minute) and daily candle ingestion into `OhlcvCandle`, keyed by `(instrumentId, interval, timestamp)`; verify test for upsert-without-duplication on repeated ingestion of the same candle
- [x] 7.4 Implement read-time freshness computation (current/delayed/stale from `now - ingestedAt` per design.md's thresholds); verify unit tests for all three freshness bands
- [x] 7.5 Implement `GET /instruments/:id/quote` returning the latest quote with freshness, or an explicit no-quote-yet response if never ingested; verify tests for both cases
- [x] 7.6 Implement `GET /instruments/:id/history?range=...` selecting an appropriate stored resolution (intraday vs. daily) for the requested range; verify tests for at least one short-range (intraday) and one long-range (daily) request

## 8. Cross-Cutting Verification

- [x] 8.1 Add a standard Nest `HttpException`/exception-filter convention so all error responses share the `{ statusCode, message, error }` shape; verify with a sample failing request per capability
- [x] 8.2 Run the full test suite (unit + e2e against a test database) and verify all capability scenarios in `specs/*/spec.md` are covered and passing
- [x] 8.3 Document setup instructions (env vars, running Postgres, migrations, seeding, starting the server) in `backend/README.md`; verify a clean checkout can follow it to a running server
