## Purpose

Handles account registration and credential verification, and issues JSON Web Tokens so that every other capability can identify a caller and protect user-owned resources.

## ADDED Requirements

### Requirement: User Registration
The system SHALL allow a new user to register with an email address and password, creating a user account.

#### Scenario: Successful registration
- **WHEN** a client submits registration with a valid, unused email and a password meeting the minimum policy
- **THEN** the system creates a user account and responds with a success result

#### Scenario: Duplicate email rejected
- **WHEN** a client submits registration with an email that already has an account
- **THEN** the system rejects the request with an error indicating the email is already in use, and does not create a second account

#### Scenario: Invalid password rejected
- **WHEN** a client submits registration with a password that does not meet the minimum password policy
- **THEN** the system rejects the request with a validation error and does not create an account

### Requirement: Password Storage
The system SHALL hash passwords before persisting them and SHALL NOT store or log plaintext passwords.

#### Scenario: Password hashed at rest
- **WHEN** a user registers or changes their password
- **THEN** the stored credential record contains only a salted hash, never the plaintext password

### Requirement: Login Issues JWT
The system SHALL authenticate a user by email and password and, on success, issue a JWT that identifies that user for subsequent requests.

#### Scenario: Successful login
- **WHEN** a client submits the correct email and password for an existing account
- **THEN** the system responds with a JWT that can be used to authenticate later requests

#### Scenario: Invalid credentials rejected
- **WHEN** a client submits an email/password pair that does not match any account, or a wrong password for an existing account
- **THEN** the system rejects the request with an authentication error and does not issue a token

### Requirement: Protected Endpoint Enforcement
The system SHALL require a valid, unexpired JWT on every endpoint that reads or modifies user-owned resources.

#### Scenario: Missing token rejected
- **WHEN** a request to a protected endpoint is made without an authentication token
- **THEN** the system rejects the request as unauthenticated

#### Scenario: Invalid or expired token rejected
- **WHEN** a request to a protected endpoint is made with a malformed, tampered, or expired token
- **THEN** the system rejects the request as unauthenticated

#### Scenario: Valid token allows access
- **WHEN** a request to a protected endpoint is made with a valid, unexpired token
- **THEN** the system identifies the requesting user from the token and processes the request
