# Auth Resilience

## MODIFIED Requirements

### Requirement: JWT middleware MUST reject undecodable or missing-exp tokens

`JwtAuthMiddleware` SHALL reject any JWT whose payload cannot be decoded or lacks an `exp` claim. Malformed tokens MUST clear session and respond with 401 / redirect.

#### Scenario: Malformed JWT segments

- Given session contains a JWT with fewer than 3 segments
- When the middleware decodes the payload
- Then `decodeJwtPayload` MUST return null
- And the middleware MUST clear `jwt`, `refresh_token`, `user` from session
- And respond 401 (JSON) or redirect to login (HTML)

#### Scenario: JWT without exp claim

- Given a JWT with valid base64 payload but no `exp` field
- When the middleware checks expiry
- Then it MUST treat the token as invalid (not skip the check)
- And clear session + reject

### Requirement: Auth controllers MUST use apiRequest helper

`AuthController::login`, `register`, and `logout` SHALL call Core API via `$this->apiRequest()` so timeouts are applied uniformly.

#### Scenario: Login when Core API is slow

- Given Core API takes 15 seconds to respond
- When user submits login
- Then `apiRequest()` MUST enforce 10s timeout (configurable)
- And the response MUST come back within timeout + small overhead
- And PHP-FPM worker MUST NOT hang indefinitely

## ADDED Requirements

### Requirement: HTTP timeout MUST be configurable via env

Timeout values for `apiRequest()` SHALL be readable from `API_TIMEOUT` and `API_CONNECT_TIMEOUT` env vars, with sensible defaults.

#### Scenario: Production override

- Given `API_TIMEOUT=30` is set in production env
- When `apiRequest()` is called without explicit timeout argument
- Then the HTTP timeout MUST be 30 seconds
- And `config('services.core_api.timeout')` MUST return 30
