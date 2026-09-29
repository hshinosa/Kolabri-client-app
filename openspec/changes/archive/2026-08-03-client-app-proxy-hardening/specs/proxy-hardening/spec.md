# Proxy Hardening

## ADDED Requirements

### Requirement: BFF proxy mutation routes MUST be rate-limited

Routes that mutate state via Core API or perform expensive operations SHALL have Laravel `throttle` middleware applied with sensible per-user limits.

#### Scenario: User spams chat-space close

- Given a user has closed sessions repeatedly
- When the user attempts an 11th close within 5 minutes
- Then the response MUST be 429 Too Many Requests
- And `Retry-After` header MUST be present

#### Scenario: User spams file upload

- Given a user has uploaded many files
- When the user exceeds 30 uploads in 5 minutes
- Then the response MUST be 429
- And no file storage write MUST occur

### Requirement: axios MUST default to including credentials

`resources/js/app.tsx` SHALL set `axios.defaults.withCredentials = true` so session cookies are included in cross-origin scenarios (defensive against future subdomain splits).

#### Scenario: axios call

- Given any axios.get/post/put/delete is invoked
- When the request is sent
- Then it MUST include credentials (cookies/auth headers) per same-origin or CORS rules
