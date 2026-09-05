## Purpose

Shows a signed-in user each watchlisted instrument's current price and historical trend, always making clear how fresh the displayed price is rather than presenting stale or missing data as current.

## ADDED Requirements

### Requirement: Current Price Display
The system SHALL display an instrument's current price together with a visible indicator of how fresh that price is, and SHALL NOT present stale or missing data as if it were current.

#### Scenario: Fresh quote displayed as current
- **WHEN** an instrument's latest quote is marked current
- **THEN** the app displays its price, change, and change percent without a staleness warning

#### Scenario: Delayed or stale quote visibly marked
- **WHEN** an instrument's latest quote is marked delayed or stale
- **THEN** the app still displays the last known price but with a visible indicator that it is not current

#### Scenario: No data yet shown explicitly
- **WHEN** an instrument has never been ingested and has no quote available
- **THEN** the app shows an explicit "no data yet" state rather than a blank, zero, or otherwise misleading price

### Requirement: Historical Price Chart
The system SHALL display a historical price chart for an instrument over a user-selectable time range.

#### Scenario: Chart renders for the selected range
- **WHEN** a user views an instrument with historical data available for the currently selected range
- **THEN** the app renders a chart of that historical data

#### Scenario: Changing the range updates the chart
- **WHEN** a user selects a different time range
- **THEN** the app requests and renders historical data for the newly selected range

#### Scenario: No data yet shown explicitly
- **WHEN** no historical data is available for an instrument at the selected range
- **THEN** the app shows an explicit empty state for the chart rather than an empty or broken chart render
