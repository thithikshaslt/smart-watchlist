## Purpose

Lets a signed-in user create and organize one or more personal watchlists, seeing and managing only the watchlists they own.

## ADDED Requirements

### Requirement: Watchlist List View
The system SHALL show a signed-in user the list of watchlists they own.

#### Scenario: Shows the user's watchlists
- **WHEN** a signed-in user with one or more watchlists opens the watchlists view
- **THEN** the app displays each of their watchlists by name

#### Scenario: Empty state prompts creation
- **WHEN** a signed-in user with no watchlists opens the watchlists view
- **THEN** the app shows an empty state that lets them create their first watchlist

### Requirement: Create Watchlist
The system SHALL let a signed-in user create a new watchlist by name.

#### Scenario: Successful creation
- **WHEN** a user submits a valid name for a new watchlist
- **THEN** the app creates the watchlist and shows it in the watchlist list

#### Scenario: Invalid name shown inline
- **WHEN** a user submits an empty or otherwise invalid watchlist name
- **THEN** the app shows an inline validation error without creating a watchlist

### Requirement: Rename and Delete Watchlist
The system SHALL let the owner of a watchlist rename or delete it.

#### Scenario: Rename updates the displayed name
- **WHEN** the owner submits a new name for one of their watchlists
- **THEN** the app updates the displayed name for that watchlist

#### Scenario: Delete requires confirmation and removes the watchlist
- **WHEN** the owner chooses to delete one of their watchlists
- **THEN** the app asks for confirmation before deleting, and on confirmation removes it from the watchlist list

### Requirement: Watchlist Detail View
The system SHALL show the owner of a watchlist its items, each with the instrument's symbol, name, and current price/freshness.

#### Scenario: Shows items with price information
- **WHEN** the owner opens a watchlist that has items
- **THEN** the app displays each item's instrument symbol, name, and current price with its freshness

#### Scenario: Empty state prompts adding instruments
- **WHEN** the owner opens a watchlist with no items
- **THEN** the app shows an empty state with a way to search for and add an instrument

### Requirement: Remove Item from Watchlist
The system SHALL let the owner of a watchlist remove one of its items.

#### Scenario: Removal updates the view immediately
- **WHEN** the owner removes an item from a watchlist
- **THEN** the app updates the displayed items to no longer include it, without requiring a manual page reload

### Requirement: Reorder Watchlist Items
The system SHALL let the owner of a watchlist reorder its items, persisting the new order.

#### Scenario: Reorder persists across a reload
- **WHEN** the owner reorders the items in a watchlist
- **THEN** the app persists the new order, and reloading the page shows the same order

#### Scenario: Failed reorder leaves the displayed order unchanged
- **WHEN** a reorder action is rejected by the backend
- **THEN** the app reverts the displayed order to match what is actually persisted and surfaces an error to the user

### Requirement: Ownership Boundary Respected
The system SHALL only display a watchlist's data to its owner.

#### Scenario: Non-owned or unknown watchlist shows not-found
- **WHEN** a signed-in user navigates to a watchlist they do not own, or that does not exist
- **THEN** the app shows a not-found state rather than any watchlist data
