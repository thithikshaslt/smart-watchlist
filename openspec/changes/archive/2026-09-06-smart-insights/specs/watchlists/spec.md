## ADDED Requirements

### Requirement: Configurable Display Lens
The system SHALL let the owner of a watchlist configure which metrics render for its items, chosen from a fixed catalog (price, dollar change, percent change, day range, volume, freshness), and SHALL apply a default lens equivalent to today's fixed view when no lens has been configured.

#### Scenario: Default lens preserves current behavior
- **WHEN** a watchlist has no configured display lens
- **THEN** the system renders it using the same default metric set the application showed before this capability existed

#### Scenario: Owner customizes the lens
- **WHEN** the owner of a watchlist selects a subset of the fixed metric catalog for that watchlist
- **THEN** the system persists the selection and subsequent reads of that watchlist include the configured lens

#### Scenario: Lens is scoped to one watchlist
- **WHEN** the owner of a watchlist configures a lens for one of their watchlists
- **THEN** the system does not apply that lens to the same owner's other watchlists
