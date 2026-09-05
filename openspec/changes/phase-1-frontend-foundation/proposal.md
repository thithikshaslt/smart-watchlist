## Why

The Phase 0 backend (`auth`, `users`, `instruments`, `watchlists`, `market-data`) is fully implemented and has no client — it can only be exercised with `curl`. `docs/product.md`'s "Foundation" phase explicitly requires that a user can discover instruments, organize them into watchlists, and view current and historical market information; none of that is usable without a UI. This phase builds the React frontend against the existing, unchanged backend API.

## What Changes

- Stand up a React + Vite + TypeScript app in `frontend/`, using TanStack Query for server state, shadcn/ui + Tailwind CSS for components, and Lightweight Charts for price history (per `docs/architecture.md` § Frontend).
- Add authentication UI: registration, login, session persistence across reloads, and route protection that redirects unauthenticated users to login.
- Add instrument discovery: a search UI backed by `GET /instruments/search`.
- Add watchlist management: list/create/rename/delete watchlists; add/remove instruments; reorder items.
- Add market data display: current price with an explicit freshness indicator (current/delayed/stale/unavailable — never shown as indistinguishable from a fresh price, per `docs/product.md`'s "Reliable information" principle) and a historical price chart with selectable ranges, per instrument.
- Handle loading, empty, and error states for every data-fetching view (per `docs/architecture.md` § Frontend responsibilities).
- Out of scope for this phase: any user-configurable metrics/chart layout or "meaningful change" detection (`docs/product.md`'s later "Adaptive Watchlist" and "Meaningful Change" phases) — this phase reproduces the backend's fixed Foundation-level data, not a customizable view of it.

## Capabilities

### New Capabilities
- `frontend-auth`: registration and login forms, session (JWT) persistence across page reloads, logout, and route protection that redirects unauthenticated users to login and back.
- `frontend-instruments`: instrument search UI used to find instruments to add to a watchlist.
- `frontend-watchlists`: watchlist list and detail views — create, rename, delete, add/remove items, and reorder items — scoped to the signed-in user's own watchlists.
- `frontend-market-data`: per-instrument current price display with a visible freshness indicator, and a historical price chart with selectable time ranges.

### Modified Capabilities
None — this phase is a new client consuming the existing backend API; no backend requirement changes.

## Impact

- **New code**: entire frontend app (`frontend/`) — no backend code changes.
- **New dependencies**: React, Vite, TypeScript, TanStack Query, shadcn/ui, Tailwind CSS, Lightweight Charts, a router (choice recorded in `design.md`), and a drag-and-drop library for reordering (choice recorded in `design.md`).
- **API surface**: none changed; the frontend consumes the Phase 0 REST API exactly as specified in `openspec/specs/{auth,users,instruments,watchlists,market-data}/spec.md`. (The `frontend-*` capability names in this proposal are deliberately distinct from those existing backend capability names — they describe client-side UI behavior, not the server behavior those specs already cover.)
- **Backend CORS**: the backend does not yet configure CORS for a browser-origin frontend; this phase must add that (see `design.md`) since it's required for the browser to call the API at all, even though it isn't a behavior change to any existing capability.
