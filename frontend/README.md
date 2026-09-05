# Smart Market Watchlist — Frontend

Phase 1 frontend foundation: authentication, instrument search, watchlist management, and price/chart display against the Phase 0 backend API. See `../docs/architecture.md` for the system-level design and `../openspec/changes/phase-1-frontend-foundation/` (or its archive, once archived) for the specs and design behind this implementation.

## Stack

React + Vite + TypeScript, TanStack Query for server state, shadcn/ui + Tailwind CSS v4 for components, React Router, `@dnd-kit` for drag-and-drop reordering, Lightweight Charts for price history.

## Prerequisites

- Node.js 20+ (developed against Node 22)
- The backend running locally — see `../backend/README.md`. This app has no server of its own; it's a pure client for that API.

## Setup

1. **Start the backend first** (Postgres + the NestJS API, per `../backend/README.md`). This app calls it directly; nothing here works without it running.

2. **Configure environment:**

   ```bash
   cp .env.example .env
   ```

   The default `VITE_API_BASE_URL=http://localhost:3000` matches the backend's default port.

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Start the dev server:**

   ```bash
   npm run dev
   ```

   Vite serves the app at `http://localhost:5173` by default. The backend's `FRONTEND_ORIGIN` (see its `.env`) must match whatever origin you actually load this app from, or the browser will block API calls via CORS — the defaults on both sides already match.

5. **Register an account** at `/register`, then log in. From there: search for an instrument, create a watchlist, add instruments to it, drag to reorder, and open an instrument's chart.

## Running tests

```bash
npm test          # unit/component tests (Vitest + React Testing Library + MSW)
npm run test:watch
```

Tests run against mocked API responses (MSW), not the real backend, so they don't require the backend or Postgres to be running. `src/test/render.tsx` provides a `renderWithProviders` helper that wraps a component in the same providers the app uses (TanStack Query, router, auth context) for consistent test setup.

## Project layout

```text
src/
├── auth/          AuthContext (session), RequireAuth route guard, login/register pages, logout
├── instruments/    instrument search (embedded in the watchlist detail page)
├── watchlists/      watchlist list/detail pages, hooks, drag-and-drop reorder
├── market-data/      current price display + Lightweight Charts wrapper, range selection
├── components/      shared LoadingState/EmptyState/ErrorState + shadcn/ui primitives (components/ui/)
├── lib/            typed API client, TanStack Query client, small utilities
└── test/           test setup, MSW server, renderWithProviders helper
```

## Notable behavior

- **No refresh token.** The backend issues a 7-day bearer JWT with no refresh mechanism (see `../docs/decisions.md`). The token is stored in `localStorage`; a 401 from any API call clears the session and redirects to login. There's no silent token renewal — after 7 days (or a server-side invalidation), the user simply logs in again.
- **Reorder is optimistic with revert-on-failure.** Dragging a watchlist item reorders it immediately in the UI and persists via `PATCH .../items/reorder`; if that request fails, the display reverts to the last known-persisted order and shows an error, per `specs/frontend-watchlists/spec.md`.
- **Freshness is a pass-through, not computed here.** The backend already classifies each quote as `current`/`delayed`/`stale` (or reports none available); the frontend only renders that classification (`market-data/PriceBadge.tsx`) rather than deriving it from timestamps itself.
- **Instrument search lives inside the watchlist detail page**, not as a standalone global search — see `design.md`'s rationale in the (archived) `phase-1-frontend-foundation` change.
