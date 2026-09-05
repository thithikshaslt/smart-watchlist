## Purpose

Lets a visitor register or log in, keeps them signed in across page reloads, and protects the rest of the app by redirecting unauthenticated visitors to login.

## ADDED Requirements

### Requirement: Registration Form
The system SHALL let a visitor register a new account with an email and password, surfacing the backend's validation and duplicate-email errors inline.

#### Scenario: Successful registration proceeds to sign-in
- **WHEN** a visitor submits registration with a valid, unused email and a password meeting the minimum policy
- **THEN** the app confirms the account was created and lets the visitor proceed to log in

#### Scenario: Duplicate email shown inline
- **WHEN** a visitor submits registration with an email that already has an account
- **THEN** the app shows an inline error indicating the email is already in use, without navigating away from the form

#### Scenario: Invalid password shown inline
- **WHEN** a visitor submits registration with a password that does not meet the minimum policy
- **THEN** the app shows an inline validation error without submitting the form

### Requirement: Login Form
The system SHALL let a visitor log in with email and password and establish an authenticated session on success.

#### Scenario: Successful login opens the watchlists view
- **WHEN** a visitor submits the correct email and password
- **THEN** the app establishes a session and navigates to the signed-in watchlists view

#### Scenario: Invalid credentials shown inline
- **WHEN** a visitor submits an email/password pair the backend rejects
- **THEN** the app shows an inline authentication error and does not navigate away from the form

### Requirement: Session Persistence Across Reload
The system SHALL keep a visitor signed in across a full page reload as long as their session token has not expired or been invalidated.

#### Scenario: Reload keeps the user signed in
- **WHEN** a signed-in user reloads the page before their token expires
- **THEN** the app restores the session without requiring them to log in again

#### Scenario: Invalid or expired session clears and redirects
- **WHEN** the app makes a request using a stored session and the backend rejects it as unauthenticated
- **THEN** the app clears the stored session and redirects the user to login

### Requirement: Route Protection
The system SHALL only allow an authenticated visitor to view pages that display user-owned data, redirecting an unauthenticated visitor to login.

#### Scenario: Unauthenticated visit redirects to login
- **WHEN** a visitor without a session navigates directly to a protected page (for example, the watchlists view)
- **THEN** the app redirects them to the login page instead of showing that page's data

#### Scenario: Post-login redirect returns to the originally requested page
- **WHEN** an unauthenticated visitor is redirected to login from a specific protected page and then logs in successfully
- **THEN** the app sends them to the page they originally tried to reach, not always the default landing page

### Requirement: Logout
The system SHALL let a signed-in user end their session.

#### Scenario: Logout clears the session
- **WHEN** a signed-in user chooses to log out
- **THEN** the app clears the stored session and returns them to the login page, and protected pages are no longer reachable without logging in again
