# Watchlists Specification

## Purpose

Lets an authenticated user create and organize one or more personal watchlists of instruments, with ownership strictly enforced so only the owning user can view or modify a given watchlist.

## Requirements

### Requirement: Create Watchlist
The system SHALL let an authenticated user create a new, empty watchlist owned by them, identified by a name.

#### Scenario: Successful creation
- **WHEN** an authenticated user submits a name for a new watchlist
- **THEN** the system creates a watchlist owned by that user and returns its details, including a stable ID

### Requirement: List Own Watchlists
The system SHALL let an authenticated user retrieve the list of watchlists they own.

#### Scenario: Returns only the caller's watchlists
- **WHEN** an authenticated user requests their watchlists
- **THEN** the system returns only watchlists owned by that user, never watchlists owned by other users

### Requirement: Rename Watchlist
The system SHALL let the owner of a watchlist update its name.

#### Scenario: Successful rename
- **WHEN** the owner of a watchlist submits a new name for it
- **THEN** the system updates the watchlist's name and returns the updated details

### Requirement: Delete Watchlist
The system SHALL let the owner of a watchlist delete it, along with its items.

#### Scenario: Successful deletion
- **WHEN** the owner of a watchlist requests its deletion
- **THEN** the system removes the watchlist and all of its items, and subsequent requests for that watchlist return not-found

### Requirement: Add Instrument to Watchlist
The system SHALL let the owner of a watchlist add an instrument from the instrument catalog to it.

#### Scenario: Successful add
- **WHEN** the owner of a watchlist adds an instrument that exists in the catalog and is not already in the watchlist
- **THEN** the system adds the instrument as a watchlist item with a position after the existing items

#### Scenario: Duplicate add rejected
- **WHEN** the owner of a watchlist attempts to add an instrument that is already in that watchlist
- **THEN** the system rejects the request without creating a duplicate item

#### Scenario: Unknown instrument rejected
- **WHEN** the owner of a watchlist attempts to add an instrument ID that does not exist in the catalog
- **THEN** the system rejects the request with a not-found error

### Requirement: Remove Instrument from Watchlist
The system SHALL let the owner of a watchlist remove an instrument from it.

#### Scenario: Successful removal
- **WHEN** the owner of a watchlist removes an instrument that is currently in that watchlist
- **THEN** the system removes the corresponding watchlist item

### Requirement: Reorder Watchlist Items
The system SHALL let the owner of a watchlist persist a new explicit ordering of its items, applying the reorder transactionally.

#### Scenario: Successful reorder
- **WHEN** the owner of a watchlist submits a new order for all of its current items
- **THEN** the system persists each item's new position and subsequent reads reflect the new order

#### Scenario: Failed reorder leaves prior order intact
- **WHEN** a reorder request fails partway through processing (for example, due to invalid item references)
- **THEN** the system applies none of the position changes, leaving the watchlist's existing order unchanged

### Requirement: Watchlist Ownership Authorization
The system SHALL only allow the owner of a watchlist to view or modify it, or its items.

#### Scenario: Other user cannot view
- **WHEN** an authenticated user requests a watchlist owned by a different user
- **THEN** the system does not return that watchlist's details

#### Scenario: Other user cannot modify
- **WHEN** an authenticated user attempts to rename, delete, or modify the items of a watchlist owned by a different user
- **THEN** the system rejects the request and makes no change to the watchlist
