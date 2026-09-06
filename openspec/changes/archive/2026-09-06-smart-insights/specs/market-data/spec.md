## MODIFIED Requirements

### Requirement: Scheduled Ingestion for Watchlist-Relevant Instruments
The system SHALL periodically ingest quotes and historical candles for instruments that appear in at least one user's watchlist, plus a small fixed set of benchmark instruments that are always in scope regardless of watchlist membership, rather than ingesting the entire market.

#### Scenario: Watchlisted instrument is ingested
- **WHEN** an instrument is added to any user's watchlist
- **THEN** the system includes that instrument in subsequent scheduled ingestion runs

#### Scenario: Non-watchlisted instrument is not ingested
- **WHEN** an instrument exists in the catalog but is neither present in any user's watchlist nor a designated benchmark instrument
- **THEN** the system does not spend ingestion capacity fetching market data for it

#### Scenario: Benchmark instrument is always ingested
- **WHEN** a scheduled ingestion run occurs
- **THEN** the system includes each designated benchmark instrument in that run's ingestion scope, even if no user has added it to any watchlist
