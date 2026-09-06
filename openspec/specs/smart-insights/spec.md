# Smart Insights Specification

## Purpose

Determines whether a watchlisted instrument's price move is actually significant — relative to that instrument's own typical behavior and to the broader market's move over the same period — and tracks, per watchlist, what has changed since the owner last viewed it, so the application can surface meaningful change without inventing scores or assumptions about the user's intent.

## Requirements

### Requirement: Self-Relative and Market-Relative Move Classification
The system SHALL classify a watchlisted instrument's price move over a comparison window into exactly one of `normal`, `broad-market`, `notable`, or `insufficient-history`, using only the instrument's own historical daily price data and one designated benchmark instrument's move over the same window. The system SHALL NOT use any external scoring service, generative text, or user-configured threshold to produce this classification.

#### Scenario: Move within the instrument's typical range is normal
- **WHEN** an instrument's move over the comparison window is within its own typical daily range
- **THEN** the system classifies the move as `normal`

#### Scenario: Outsized move matched by the benchmark is a broad-market move
- **WHEN** an instrument's move over the comparison window exceeds its own typical daily range, and the benchmark instrument moved by a comparable amount over the same window
- **THEN** the system classifies the move as `broad-market`

#### Scenario: Outsized move not explained by the benchmark is notable
- **WHEN** an instrument's move over the comparison window exceeds its own typical daily range, and the benchmark instrument did not move by a comparable amount over the same window
- **THEN** the system classifies the move as `notable`

#### Scenario: Insufficient history yields no judgment
- **WHEN** an instrument does not yet have enough daily historical data to establish its own typical daily range
- **THEN** the system classifies the move as `insufficient-history` rather than guessing at a baseline

### Requirement: Watchlist Visit Watermark
The system SHALL track, per watchlist, the time the owner last viewed it, and SHALL NOT advance that time as a side effect of routine background data refresh.

#### Scenario: Background refresh does not count as a visit
- **WHEN** the client polls for updated watchlist data while the owner has not taken a distinct visit action
- **THEN** the system does not change the watchlist's recorded last-viewed time

#### Scenario: A visit action advances the watermark
- **WHEN** the owner takes a distinct visit action on a watchlist and the previously recorded last-viewed time is at least 20 minutes old (or has never been set)
- **THEN** the system updates the watchlist's recorded last-viewed time to the time of that action

#### Scenario: A near-immediate repeat visit does not reset the watermark
- **WHEN** the owner takes a distinct visit action on a watchlist within 20 minutes of the previously recorded last-viewed time
- **THEN** the system leaves the previously recorded last-viewed time unchanged

### Requirement: Visit-Triggered Change Summary
The system SHALL let the owner of a watchlist take a visit action that returns, for every item in that watchlist, its move classification computed between the watchlist's previous last-viewed time and the current time, along with the previous last-viewed time itself and a summary count of notable and broad-market items.

#### Scenario: First-ever visit has nothing to compare against
- **WHEN** the owner takes a visit action on a watchlist that has no previously recorded last-viewed time
- **THEN** the system returns current values for each item without a move classification, and does not report a previous last-viewed time

#### Scenario: Subsequent visit reports change since the prior visit
- **WHEN** the owner takes a visit action on a watchlist that has a previously recorded last-viewed time
- **THEN** the system returns each item's move classification computed against that previous time, the previous time itself, and a count of notable and broad-market items

#### Scenario: Reading a watchlist does not require taking a visit action
- **WHEN** the owner or a background refresh retrieves a watchlist's current data
- **THEN** the system returns that data without requiring a visit action and without computing a move classification as a side effect
