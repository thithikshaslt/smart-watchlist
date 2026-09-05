# Architecture

## Overview

The application uses a modular monolithic architecture with a React frontend, NestJS backend, PostgreSQL database, and an external market-data provider.

```text
                         ┌─────────────────────┐
                         │   Market Data       │
                         │      Provider       │
                         └──────────┬──────────┘
                                    │
                              Market Data
                              Ingestion
                                    │
                                    ▼
┌──────────────┐          ┌─────────────────────┐
│              │          │                     │
│    React     │ ◄──────► │      NestJS API     │
│  TypeScript  │   REST   │      + Fastify      │
│              │          │                     │
└──────────────┘          └──────────┬──────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │   PostgreSQL    │
                            └─────────────────┘
```

The backend is the central boundary for application logic, user state, and market-data access.

## Frontend

Technology:

* React
* Vite
* TypeScript
* TanStack Query
* shadcn/ui
* Tailwind CSS
* Lightweight Charts

Responsibilities:

* Render the user interface
* Manage local UI state
* Request and cache server state through TanStack Query
* Display market data and historical charts
* Provide watchlist management and customization controls
* Handle loading, empty, error, and stale-data states

The frontend communicates with the application through the NestJS REST API.

## Backend

Technology:

* NestJS
* Fastify

The backend is organized as a modular monolith.

Initial domains:

```text
backend/
├── Auth
├── Users
├── Watchlists
├── Instruments
└── Market Data
```

Future functionality can be introduced as additional modules without requiring the application to become distributed.

Examples include:

```text
Smart Insights
User Preferences
Alerts
```

The backend is responsible for:

* Authentication
* Authorization
* Business rules
* Watchlist management
* Instrument management
* Market-data access
* Market-data ingestion
* Validation and normalization
* Data freshness handling
* API responses

## Database

PostgreSQL is the primary persistent datastore.

Initial domain relationship:

```text
User
  │
  └── Watchlist
        │
        └── WatchlistItem
                    │
                    ▼
                Instrument
```

### User

Stores user account information.

### Watchlist

Represents a user-owned watchlist.

### WatchlistItem

Associates an instrument with a watchlist and stores its ordering.

### Instrument

Represents a financial instrument independently of the external market-data provider.

Conceptually:

```text
Instrument
├── id
├── name
├── symbol
├── exchange
└── provider_symbol
```

Watchlists reference the internal `instrument.id` rather than provider-specific identifiers.

## Market Data

Market data is periodically ingested by the backend rather than fetched directly by the frontend.

```text
Market Data Provider
        │
        ▼
Scheduled Ingestion
        │
        ▼
Validate / Normalize
        │
        ▼
PostgreSQL
        │
        ▼
NestJS API
        │
        ▼
React
```

The application initially maintains data for instruments relevant to user watchlists rather than ingesting the entire market.

## Market Data Provider Abstraction

External market data is accessed through a backend abstraction:

```text
MarketDataService
        │
        ▼
MarketDataProvider
        │
        ▼
External Provider
```

The application begins with one provider.

Provider-specific identifiers and integration logic remain behind the abstraction so that the provider can be replaced or supplemented later without coupling the rest of the application to its API.

## Market Data Storage

Current and historical market data use separate representations.

```text
latest_quotes
├── instrument_id
├── price
├── change
├── change_percent
├── provider_timestamp
├── ingested_at
└── freshness_status

ohlcv_candles
├── instrument_id
├── timestamp
├── interval
├── open
├── high
├── low
├── close
└── volume
```

Historical data supports intraday and daily resolutions.

Queries should use the appropriate indexed instrument, interval, and timestamp fields.

## Data Freshness

Market-data records distinguish between:

* Provider timestamp — when the market data represents a price
* Ingestion timestamp — when the application received the data
* Freshness status — whether the stored value is considered current, delayed, or stale

If ingestion temporarily fails, the most recent valid data remains available with an appropriate freshness state.

The application should never represent missing or stale data as a current zero value or silently imply that it is up to date.

## API

The frontend communicates with the backend through REST APIs.

The API is organized around domain resources.

Examples:

```text
GET    /watchlists
POST   /watchlists
PATCH  /watchlists/:id
DELETE /watchlists/:id

POST   /watchlists/:id/items
DELETE /watchlists/:id/items/:instrumentId
PATCH  /watchlists/:id/items/reorder

GET    /instruments/search?q=...
GET    /instruments/:id/quote
GET    /instruments/:id/history?range=6m
```

The API exposes domain concepts rather than database implementation details.

For historical charts, the client specifies the desired time range. The backend determines the appropriate data resolution and returns the required historical data.

## Authentication and Authorization

Authentication uses email/password credentials with JWT-based authentication.

The backend is responsible for:

* Password hashing
* Credential verification
* Token issuance
* Authentication of protected requests
* Authorization of user-owned resources

A user's watchlist and related resources must only be accessible or modifiable by that user.

## Updating Market Data

Market data follows two independent cycles:

### Backend ingestion

Periodically retrieves and stores market data from the provider.

### Frontend refresh

The frontend periodically requests updated data through the API using TanStack Query.

This keeps provider communication and market-data ingestion under backend control while providing sufficiently fresh information to the user.

## Ordering

Watchlist items store an explicit position.

Reordering is persisted through the backend and performed transactionally so that a failed request does not leave the watchlist partially reordered.

## Extensibility

The architecture should provide clear extension points for the adaptive functionality that follows the initial watchlist foundation.

The expected evolution is:

```text
Reliable Watchlist
       ↓
User-defined Watchlist Views
       ↓
Meaningful Change Detection
       ↓
Adaptive Market Experience
```

Future functionality should build on existing instruments, market data, historical data, and user preferences rather than introducing an independent parallel data model.
