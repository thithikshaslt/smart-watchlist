# Instruments Specification

## Purpose

Maintains a provider-independent catalog of financial instruments and lets clients search and look them up so they can be added to a watchlist, independent of how the market data provider identifies them.

## Requirements

### Requirement: Instrument Catalog Record
The system SHALL represent each instrument with a stable internal ID that is independent of the market data provider, along with its name, trading symbol, exchange, and the provider-specific symbol used to fetch market data for it.

#### Scenario: Internal ID stable across provider representation
- **WHEN** an instrument's provider-specific symbol or provider identifier would differ from its display symbol
- **THEN** the system still identifies that instrument by its own internal ID everywhere outside the market-data integration

### Requirement: Search Instruments
The system SHALL let a client search the instrument catalog by symbol or name and receive matching instruments.

#### Scenario: Matching results returned
- **WHEN** a client searches with a query that matches one or more instrument symbols or names
- **THEN** the system returns the matching instruments, each including its internal ID, name, symbol, and exchange

#### Scenario: No results found
- **WHEN** a client searches with a query that matches no instrument
- **THEN** the system returns an empty result set rather than an error

#### Scenario: Query too short is rejected
- **WHEN** a client searches with a query shorter than the minimum allowed length
- **THEN** the system rejects the request with a validation error instead of scanning the full catalog

### Requirement: Retrieve Instrument by ID
The system SHALL let a client retrieve a single instrument's catalog details by its internal ID.

#### Scenario: Instrument found
- **WHEN** a client requests an instrument by an internal ID that exists in the catalog
- **THEN** the system returns that instrument's details

#### Scenario: Instrument not found
- **WHEN** a client requests an instrument by an internal ID that does not exist in the catalog
- **THEN** the system responds with a not-found error
