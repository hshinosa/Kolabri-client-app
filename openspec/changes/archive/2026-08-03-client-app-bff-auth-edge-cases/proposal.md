# BFF Auth Edge Cases — 401 Propagation + Strict JWT

## Problem Statement

Two auth edge cases:

### 1. Core API 401 mid-session does not invalidate Laravel session

Laravel session JWT cache TTL is 30s (per `client-app-jwt-and-auth-timeout-fix`). If Core API revokes the token mid-cache (admin deactivate user, JWT rotation, security incident):
- Laravel local exp check passes (token cache valid)
- Laravel forwards request to Core
- Core returns 401
- Laravel proxies 401 back to frontend
- User sees error 401 but Laravel session is NOT cleared
- User stuck in "authenticated" UI state with dead token until session expires

### 2. JWT decode accepts malformed 2-part tokens

`JwtAuthMiddleware::decodeJwtPayload` checks `count($parts) < 2`. JWT MUST be 3 parts (`header.payload.signature`). 2-part tokens (header.payload, signature stripped) are accepted as long as payload base64 decodes.

Spec `client-app-jwt-and-auth-timeout-fix` requires reject malformed; current impl is too lenient.

## Proposed Solution

1. Add Core API 401 detection in `apiRequest()` proxy responses → if 401, `session()->forget(['jwt', 'refresh_token', 'user'])` + return redirect/401 to frontend
2. Tighten JWT decoder: `count($parts) !== 3` instead of `< 2`

## Scope

- `app/Http/Controllers/Controller.php` — add helper `proxyResponse(Response $response)` that handles 401
- All controllers using `$this->apiRequest()` — call through proxy helper or apply via middleware
- `app/Http/Middleware/JwtAuthMiddleware.php` — strict 3-part check
- Tests
