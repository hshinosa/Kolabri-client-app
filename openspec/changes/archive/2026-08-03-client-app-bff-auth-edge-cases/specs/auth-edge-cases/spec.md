# Auth Edge Cases

## ADDED Requirements

### Requirement: Core API 401 MUST invalidate Laravel session

When the BFF proxies a request to Core API and receives 401 Unauthorized, the Laravel session JWT/refresh_token/user keys SHALL be cleared so that subsequent requests force re-authentication.

#### Scenario: Token revoked by Core mid-session

- Given a user's Laravel session has cached JWT (exp not yet reached)
- And Core API has revoked or expired the token (e.g., admin deactivate)
- When the user issues a request to a BFF proxy route
- Then Laravel forwards the request to Core
- And Core returns 401
- And Laravel MUST `session()->forget(['jwt', 'refresh_token', 'user'])`
- And Laravel MUST return 401 to the frontend
- And the next request MUST be rejected by `JwtAuthMiddleware` (no session)

#### Scenario: Core 200 preserves session

- Given a user has valid Laravel session
- When BFF proxy gets 200 from Core
- Then session MUST remain intact

## MODIFIED Requirements

### Requirement: JWT MUST have exactly 3 parts

`JwtAuthMiddleware::decodeJwtPayload` SHALL accept JWTs only when `count(parts) === 3` AND signature segment is non-empty. Malformed 2-part tokens MUST be rejected.

#### Scenario: 2-part malformed JWT

- Given session contains JWT with format `header.payload` (no signature)
- When middleware decodes
- Then `decodeJwtPayload` MUST return null
- And middleware MUST clear session and respond 401
