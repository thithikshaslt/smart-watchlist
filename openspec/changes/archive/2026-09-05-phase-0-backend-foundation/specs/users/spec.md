## Purpose

Represents the user account record and exposes the authenticated user's own identity, which every other user-owned resource (starting with watchlists) uses as its ownership basis.

## ADDED Requirements

### Requirement: User Account Record
The system SHALL maintain one account record per registered user, uniquely identified by a stable internal ID and a unique email address.

#### Scenario: Account created alongside registration
- **WHEN** a new user completes registration
- **THEN** the system persists a corresponding user account record with a unique ID and the registered email

#### Scenario: Email uniqueness enforced
- **WHEN** an account already exists for a given email
- **THEN** the system does not permit a second account to be created with the same email

### Requirement: Retrieve Authenticated User
The system SHALL let an authenticated user retrieve their own account information.

#### Scenario: Returns profile for authenticated request
- **WHEN** a client with a valid authentication token requests the current user's account information
- **THEN** the system returns that user's account details

#### Scenario: Rejects unauthenticated request
- **WHEN** a client without a valid authentication token requests the current user's account information
- **THEN** the system rejects the request as unauthenticated and returns no account information

### Requirement: User Identity as Ownership Basis
The system SHALL use the authenticated user's account ID, and no other client-supplied identifier, to determine ownership of that user's resources.

#### Scenario: Ownership derived from token, not request body
- **WHEN** a request to create or modify a user-owned resource includes a different user ID in its body or query parameters
- **THEN** the system ignores the supplied identifier and uses the authenticated user's own ID as the owner
