## 1. Project Setup

- [x] 1.1 Scaffold `frontend/` with Vite's `react-ts` template and verify `npm run dev` boots a bare app
- [x] 1.2 Add and configure Tailwind CSS + shadcn/ui (base config, a couple of primitives: Button, Input, Dialog, Badge); verify a shadcn `Button` renders styled on the bare app
- [x] 1.3 Add `react-router-dom`, set up the router with placeholder routes (`/login`, `/register`, `/watchlists`, `/watchlists/:id`); verify navigating between them works
- [x] 1.4 Add TanStack Query, set up `QueryClientProvider`; add the typed `apiClient` (fetch wrapper reading `VITE_API_BASE_URL`, attaching the bearer token, throwing `ApiError{statusCode,message,error}` on non-2xx); verify a smoke query against `GET /health` renders "ok"
- [x] 1.5 Add `.env`/`.env.example` with `VITE_API_BASE_URL` (default `http://localhost:3000`)
- [x] 1.6 Add Vitest + React Testing Library + MSW; verify a trivial component test passes

## 2. Backend CORS (small, additive backend change)

- [x] 2.1 Add `@fastify/cors`, call `app.enableCors({ origin: FRONTEND_ORIGIN, credentials: false })` in `backend/src/main.ts`, add `FRONTEND_ORIGIN` to `backend/.env`/`.env.example` (default `http://localhost:5173`); verify a browser fetch from the Vite dev server to `GET /health` succeeds (no CORS error in the console) and the backend's existing test suite still passes

## 3. Auth Capability (frontend-auth)

- [x] 3.1 Implement `AuthContext` (session state from `localStorage`, `login`, `register`, `logout`) and wire the API client to read the current token from it; verify unit tests for context state transitions (login sets session, logout clears it)
- [x] 3.2 Implement the registration page/form calling `POST /auth/register`; verify component tests (MSW) for successful registration, duplicate-email inline error, and invalid-password inline error per `specs/frontend-auth/spec.md`
- [x] 3.3 Implement the login page/form calling `POST /auth/login`, storing the returned token on success; verify component tests for successful login navigating to `/watchlists` and invalid-credentials inline error
- [x] 3.4 Implement `RequireAuth` route guard (redirect to `/login?redirect=<path>` when unauthenticated; honor `redirect` after login) and apply it to the watchlist routes; verify component tests for both redirect scenarios
- [x] 3.5 Implement session restore on app load (read token from `localStorage` into context) and 401-triggered session clear-and-redirect in the API client's response handling; verify component tests for reload-keeps-session and invalid-token-clears-and-redirects
- [x] 3.6 Implement logout (clears context/`localStorage`, navigates to `/login`); verify a component test for logout

## 4. Instruments Capability (frontend-instruments)

- [x] 4.1 Implement `useInstrumentSearch(q)` (debounced, calls `GET /instruments/search`) and the search box/results list, embedded in the watchlist detail page (per `design.md`); verify component tests for matching results, empty state, and below-minimum-length query not erroring
- [x] 4.2 Implement "add to watchlist" from a search result (`POST /watchlists/:id/items`, invalidating the watchlist query) with already-in-watchlist results visibly marked and not re-addable; verify component tests for both scenarios in `specs/frontend-instruments/spec.md`

## 5. Watchlists Capability (frontend-watchlists)

- [x] 5.1 Implement `useWatchlists`/`useCreateWatchlist` and the watchlist list page (list + create form); verify component tests for the populated list, the empty state, and inline validation on an invalid name
- [x] 5.2 Implement rename and delete (with a confirmation step before delete); verify component tests for both, including that delete requires confirming
- [x] 5.3 Implement `useWatchlist(id)` and the watchlist detail page shell (items with symbol/name, wired to the market-data price display from section 6); verify component tests for the populated and empty-items states
- [x] 5.4 Implement remove-item (`DELETE /watchlists/:id/items/:instrumentId`, invalidating the watchlist query); verify a component test that the item disappears from the view without a manual reload
- [x] 5.5 Implement drag-and-drop reorder with `@dnd-kit` (optimistic reorder, `PATCH .../items/reorder`, revert to last-persisted order on failure); verify component tests for a successful reorder persisting and a failed reorder reverting with an error shown
- [x] 5.6 Implement the not-found state for a watchlist the user doesn't own or that doesn't exist (the API's 404 surfaces this naturally); verify a component test

## 6. Market Data Capability (frontend-market-data)

- [x] 6.1 Implement `useQuote(id)` and `PriceBadge` (current price display, delayed/stale visible marking, "no data yet" state); verify component tests for all three states per `specs/frontend-market-data/spec.md`
- [x] 6.2 Implement `useHistory(id, range)`, the range selector (`1d`/`5d`/`1m`/`3m`/`6m`/`1y`/`5y`, default `1m`), and `PriceChart` wrapping Lightweight Charts; verify component tests that changing the range triggers a new query and that a no-data range shows an explicit empty state

## 7. Cross-Cutting Verification

- [x] 7.1 Add shared `LoadingState`/`EmptyState`/`ErrorState` presentational components and confirm every data-fetching view from sections 3-6 uses them consistently (loading, empty, and error rendered, not just the happy path)
- [x] 7.2 Run the full frontend test suite and verify every scenario in `specs/frontend-*/spec.md` is covered and passing
- [ ] 7.3 Manually run both apps together (`backend` + `frontend` dev servers) and walk the full flow once end-to-end: register, log in, search an instrument, create a watchlist, add/remove/reorder items, view price and chart, log out
- [x] 7.4 Document frontend setup instructions (env vars, running both dev servers, running tests) in `frontend/README.md`; verify a clean checkout can follow it to a running app
