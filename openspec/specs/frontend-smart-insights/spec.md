# Frontend Smart Insights Specification

## Purpose

Presents the adaptive display lens and the "since your last visit" change summary from the smart-insights capability, keeping the default view unchanged for users who don't customize it and keeping visual noise low by surfacing only moves worth a human's attention.

## Requirements

### Requirement: Per-Watchlist View Customization Control
The system SHALL let the owner of a watchlist choose which metrics render for its items from the fixed catalog exposed by the watchlist's display lens, and SHALL render the current default view when no customization has been made.

#### Scenario: Uncustomized watchlist looks unchanged
- **WHEN** a user opens a watchlist that has no configured display lens
- **THEN** the application renders the same default metrics it showed before this capability existed

#### Scenario: User customizes and sees the change persist
- **WHEN** a user selects a different set of metrics for a watchlist through the customization control
- **THEN** the application renders that watchlist's items using the selected metrics on this and subsequent visits

### Requirement: Since-Last-Visit Digest
The system SHALL display a one-line summary of notable and broad-market moves since the owner's previous visit to a watchlist, and SHALL NOT display this summary on a watchlist's first-ever visit.

#### Scenario: Digest shown on a returning visit
- **WHEN** a user opens a watchlist that has a previous last-viewed time
- **THEN** the application displays a summary stating the previous visit time and the count of notable and broad-market moves since then

#### Scenario: No digest on first visit
- **WHEN** a user opens a watchlist for the first time
- **THEN** the application does not display a since-last-visit summary

#### Scenario: Nothing notable is stated explicitly
- **WHEN** a user opens a watchlist that has a previous last-viewed time and no item classified as notable or broad-market
- **THEN** the application states that nothing notable changed, rather than showing no digest at all

### Requirement: Move Badges Limited to Notable and Broad-Market
The system SHALL display a per-item badge only for items classified as `notable` or `broad-market`, visually distinguishing the two, and SHALL NOT display a badge for items classified as `normal` or `insufficient-history`.

#### Scenario: Notable move is badged distinctly from a broad-market move
- **WHEN** a watchlist item is classified as `notable`
- **THEN** the application displays a badge visually distinct from the badge used for a `broad-market` classification

#### Scenario: Normal and insufficient-history items are not badged
- **WHEN** a watchlist item is classified as `normal` or `insufficient-history`
- **THEN** the application does not display a move badge for that item

### Requirement: Visit Marking Is Decoupled From Background Refresh
The system SHALL mark a watchlist visit only when the user opens or returns to that watchlist, and SHALL NOT mark a visit as a result of the periodic background refresh that keeps displayed prices current.

#### Scenario: Staying on an open watchlist does not repeatedly mark visits
- **WHEN** a user leaves a watchlist page open and its prices refresh automatically in the background
- **THEN** the application does not mark an additional visit for each background refresh

#### Scenario: Returning to a watchlist marks a visit
- **WHEN** a user navigates to a watchlist they previously navigated away from
- **THEN** the application marks a visit for that watchlist
