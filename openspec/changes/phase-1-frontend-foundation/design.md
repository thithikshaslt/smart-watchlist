## Context

The backend (archived as `phase-0-backend-foundation`, specs now at `openspec/specs/{auth,users,instruments,watchlists,market-data}/spec.md`) is a working, tested REST API with no consumer. `docs/architecture.md` already fixes the frontend stack (React, Vite, TypeScript, TanStack Query, shadcn/ui, Tailwind, Lightweight Charts) and the shape of the API this frontend calls. This design covers the remaining concrete choices: how the frontend is scaffolded and structured, how it authenticates against the backend's bearer-JWT API, how server state and UI state are organized per `specs/frontend-*/spec.md`, and the one small backend change (CORS) needed for a browser to reach the API at all. See `proposal.md` for motivation and `specs/frontend-*/spec.md` for the behavior contract.

## Goals / Non-Goals

**Goals:**
- A working React + Vite + TypeScript app in `frontend/` implementing all four `frontend-*` capabilities against the real backend API.
- A typed API client and TanStack Query setup that surfaces the backend's `{statusCode, message, error}` error shape usably in the UI.
- Session handling that matches the backend's bearer-JWT, no-refresh-token design (per `docs/decisions.md`).
- Loading/empty/error states for every data-fetching view, and an explicit freshness indicator wherever a price is shown, per `docs/product.md`'s "Reliable information" principle.

**Non-Goals:**
- Any user-configurable metrics, chart layout, or "meaningful change" detection — later phases per `docs/product.md`.
- A full browser end-to-end test suite (e.g., Playwright) — see Risks/Trade-offs.
- Any backend behavior change beyond enabling CORS; no new/modified REST endpoints.

## Decisions

### Project scaffold and structure
Scaffold with Vite's `react-ts` template in `frontend/`, structured by capability rather than by technical layer (mirrors the backend's per-domain module layout):

```text
frontend/src/
├── lib/           api client, TanStack Query client
├── auth/          AuthContext, RequireAuth route guard, login/register pages
├── instruments/   search hook + component (embedded in the watchlist detail page)
├── watchlists/    list/detail pages, hooks, reorder UI
├── market-data/   price display + Lightweight Charts wrapper
└── components/    shared presentational pieces (loading/empty/error states) + shadcn/ui output
```

### Instrument search lives inside the watchlist detail page
`frontend-instruments` is specified as its own capability (it's a distinct, independently testable behavior), but its only entry point in this phase is a "find instruments to add" search box on a watchlist's detail page — there's no standalone global search page. Alternative considered: a separate search page with a watchlist picker — rejected as an extra step for no benefit yet, since Foundation-phase users are always adding to a specific watchlist; revisit if a cross-watchlist search use case emerges.

### Server state: TanStack Query + a thin typed API client
A single `apiClient` (fetch wrapper) builds requests against `VITE_API_BASE_URL`, attaches `Authorization: Bearer <token>` when a session exists, and throws a typed `ApiError { statusCode, message, error }` on non-2xx responses so `onError` handlers can render the backend's actual message. Each capability's hooks (`useWatchlists`, `useWatchlist(id)`, `useInstrumentSearch(q)`, `useQuote(id)`, `useHistory(id, range)`, and the corresponding mutations) wrap this client with TanStack Query, using query-key invalidation (e.g., invalidate `['watchlist', id]` after add/remove/reorder) instead of manual cache surgery, since the API is cheap enough at this scale (per `CLAUDE.md`'s "appropriate for current scale" guidance) not to need optimistic updates yet.

### Routing: React Router
`react-router-dom` provides the router. Alternative considered: TanStack Router — rejected only because React Router is the more established default for a Vite + React app and the app's routing needs here are simple (login, register, watchlist list, watchlist detail); nothing here depends on TanStack Router's stricter typed-route features.

### Session storage and route protection
The backend issues only a bearer JWT with no refresh token and no cookie/session mechanism (`docs/decisions.md`), so the token is stored in `localStorage` and read once into an `AuthContext` on app load. A `RequireAuth` wrapper component checks the context and redirects to `/login?redirect=<original path>` when there's no session; login reads that `redirect` param to send the user back. The API client's response handling treats any 401 as "session invalid," clearing the stored token and context state, which `RequireAuth` then routes to login on the next render — this covers both expired tokens and a token the backend otherwise rejects, satisfying `frontend-auth`'s session-persistence requirement without duplicating JWT expiry logic on the client.

### Reordering: drag-and-drop via `@dnd-kit`
Watchlist item reorder uses `@dnd-kit/core` + `@dnd-kit/sortable`, which provides pointer- and keyboard-accessible drag-and-drop out of the box. Alternative considered: plain up/down move buttons — simpler to build, but a materially worse interaction for a list a user may reorder often; `@dnd-kit`'s sortable list pattern is well-documented enough that the complexity cost is low. On drop, the new order is optimistically rendered, sent via `PATCH .../items/reorder`, and reverted to the last known-persisted order if the request fails (per `specs/frontend-watchlists/spec.md`'s failed-reorder scenario).

### Price freshness display
The backend already computes `current | delayed | stale` (or no quote at all) — the frontend only renders it, with no client-side freshness logic: a small `PriceBadge` component maps `current` → plain price display, `delayed`/`stale` → price plus a visible "as of ..." / staleness label, and no quote → an explicit "no data yet" state. This directly implements `frontend-market-data`'s current-price-display requirement.

### Charts
`PriceChart` wraps Lightweight Charts (imperative canvas API) in a component that re-renders series data on prop change; range selection (`1d`, `5d`, `1m`, `3m`, `6m`, `1y`, `5y` — matching the backend's supported ranges exactly) drives `useHistory(id, range)`, defaulting to `1m`.

### Backend change: CORS
`main.ts` does not currently enable CORS (confirmed: no `enableCors`/`@fastify/cors` usage), so a browser origin can't call it at all. Add `@fastify/cors` and call `app.enableCors({ origin: <FRONTEND_ORIGIN>, credentials: false })`, where `FRONTEND_ORIGIN` is a new backend env var defaulting to `http://localhost:5173` (Vite's default dev port). `credentials: false` because the app sends the JWT via an `Authorization` header, not cookies, so no credentialed-CORS mode is needed. This is additive configuration, not a behavior change to any existing capability — no delta spec.

### Testing
Vitest + React Testing Library for component tests, with MSW (Mock Service Worker) mocking the backend per `specs/frontend-*/spec.md`'s scenarios (mirrors how the backend's own unit tests mock `PrismaService`). Full browser end-to-end coverage (Playwright) is deferred — see Risks/Trade-offs.

## Risks / Trade-offs

- [No browser e2e suite this phase] → Mitigation: the backend already has real e2e coverage against its actual API; frontend component tests against MSW-mocked responses (matching the specs' scenarios) give strong confidence in UI behavior without the added CI/tooling cost of a browser e2e suite at this stage. Revisit if integration bugs (frontend/backend contract drift) show up in practice.
- [JWT in `localStorage` is readable by any script on the page (XSS exposure)] → Mitigation: accepted for Phase 0/1 scope — the backend itself already chose a non-cookie bearer token (`docs/decisions.md`), so this is inherent to the existing auth design, not a new risk introduced here; standard React/JSX escaping limits XSS surface, and there's no more sensitive action in this phase than viewing/organizing a watchlist.
- [`@dnd-kit` adds a new runtime dependency for one interaction] → Mitigation: it's a small, focused, actively maintained library; if reorder turns out to be rarely used in practice, this is easy to swap for simpler buttons later without touching the spec (the spec only requires reordering persists and failures revert, not a specific interaction).

## Migration Plan

- Scaffold `frontend/` fresh (`npm create vite@latest frontend -- --template react-ts`); no existing frontend code to migrate.
- Add the backend's CORS change in the same PR/session as the frontend scaffold, since the frontend cannot call the API at all without it, but it's a one-line, additive, backward-compatible change to `backend/src/main.ts` plus one new env var.
- Both apps run independently in dev (`npm run start:dev` in `backend/`, `npm run dev` in `frontend/`); no shared build step.
