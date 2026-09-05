## Purpose

Lets a signed-in user search the instrument catalog so they can find instruments to add to one of their watchlists.

## ADDED Requirements

### Requirement: Instrument Search
The system SHALL let a signed-in user search the instrument catalog by symbol or name and see the matching results.

#### Scenario: Results displayed for a matching query
- **WHEN** a user enters a search query that matches one or more instruments
- **THEN** the app displays the matching instruments' symbol, name, and exchange

#### Scenario: Empty state for no matches
- **WHEN** a user enters a search query that matches no instrument
- **THEN** the app shows an explicit no-results state rather than an empty or ambiguous list

#### Scenario: Below-minimum-length query does not error the user
- **WHEN** a user has entered fewer characters than the search's minimum query length
- **THEN** the app does not submit the search or show a raw API validation error, and instead indicates more input is needed

### Requirement: Add Search Result to a Watchlist
The system SHALL let a signed-in user add an instrument from search results directly to one of their watchlists.

#### Scenario: Add succeeds and is reflected in the watchlist
- **WHEN** a user adds a search result to one of their watchlists
- **THEN** the app confirms the add, and the instrument subsequently appears in that watchlist's view

#### Scenario: Already-added instrument is visibly marked
- **WHEN** a user views search results while one of their watchlists already contains a matching instrument
- **THEN** the app marks that instrument as already in the watchlist and does not let the user submit a duplicate add for it
