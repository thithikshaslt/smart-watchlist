## Purpose

Abstracts access to an external market data provider, ingests quotes and historical candles on a schedule for watchlist-relevant instruments, and exposes freshness-aware read APIs that the frontend uses for pricing and charts.

## ADDED Requirements

### Requirement: Provider Abstraction
The system SHALL access external market data only through a provider-agnostic abstraction, isolating provider-specific request formats, symbols, and error handling behind it.

#### Scenario: Provider details isolated
- **WHEN** market data is retrieved for an instrument
- **THEN** callers outside the market-data integration receive normalized data keyed by the instrument's internal ID, with no provider-specific identifiers or formats exposed

### Requirement: Scheduled Ingestion for Watchlist-Relevant Instruments
The system SHALL periodically ingest quotes and historical candles for instruments that appear in at least one user's watchlist, rather than ingesting the entire market.

#### Scenario: Watchlisted instrument is ingested
- **WHEN** an instrument is added to any user's watchlist
- **THEN** the system includes that instrument in subsequent scheduled ingestion runs

#### Scenario: Non-watchlisted instrument is not ingested
- **WHEN** an instrument exists in the catalog but is not present in any user's watchlist
- **THEN** the system does not spend ingestion capacity fetching market data for it

### Requirement: Latest Quote Storage
The system SHALL store, per instrument, the most recently ingested quote including price, change, change percent, the provider's timestamp for that price, and the system's ingestion timestamp.

#### Scenario: New quote replaces prior latest quote
- **WHEN** a newer quote is successfully ingested for an instrument
- **THEN** the system updates that instrument's latest quote record with the new price, change, change percent, provider timestamp, and ingestion timestamp

### Requirement: Historical OHLCV Storage
The system SHALL store historical open/high/low/close/volume candles per instrument at both intraday and daily resolutions.

#### Scenario: Candle ingested at requested resolution
- **WHEN** historical data is ingested for an instrument at a given interval
- **THEN** the system stores the resulting candles tagged with that instrument, interval, and timestamp

### Requirement: Freshness Status
The system SHALL classify every stored quote as current, delayed, or stale, and SHALL NOT represent stale or missing data as a current value.

#### Scenario: Fresh data marked current
- **WHEN** the most recent successful ingestion for an instrument is within the expected update interval
- **THEN** the system marks that instrument's latest quote as current

#### Scenario: Ingestion failure preserves last known data with updated freshness
- **WHEN** a scheduled ingestion run fails to retrieve new data for an instrument
- **THEN** the system continues to serve the most recent successfully ingested quote, with its freshness status downgraded to reflect its age, rather than showing an error or a fabricated current value

### Requirement: Latest Quote Read API
The system SHALL let a client retrieve the latest quote for an instrument by its internal ID, including its freshness status.

#### Scenario: Quote available
- **WHEN** a client requests the latest quote for an instrument that has been ingested at least once
- **THEN** the system returns the stored quote along with its freshness status

#### Scenario: No quote ingested yet
- **WHEN** a client requests the latest quote for an instrument that has not yet been ingested
- **THEN** the system responds indicating no quote is available rather than returning fabricated data

### Requirement: Historical Data Read API
The system SHALL let a client request historical data for an instrument over a specified time range, and SHALL select an appropriate stored resolution to satisfy that range.

#### Scenario: Range determines resolution
- **WHEN** a client requests historical data for an instrument specifying a time range
- **THEN** the system returns candles at a resolution appropriate to that range, without requiring the client to specify the resolution directly
