# JWT Validation Hardening and Auth Controller Timeouts

## Problem Statement

Two related JWT/Auth gaps:

### 1. JWT silent-pass on malformed token

`JwtAuthMiddleware.php:46-49` decodes JWT and only clears session when `$exp !== null && $exp <= time()`. If `$exp` is missing or decode returns null, request continues. Malformed tokens pass middleware as if valid.

### 2. Auth controllers have no HTTP timeout

`AuthController.php:33` (login), `:89` (register), `:146` (logout) call Core API directly via `Http::post(...)` without `timeout()` or `connectTimeout()`. They bypass `Controller::apiRequest()` helper which sets 10s/5s defaults. Result: a slow Core API can hang Laravel auth requests indefinitely, exhausting PHP-FPM workers.

## Proposed Solution

### JWT
- Reject decode failures explicitly (null payload → clear session, redirect)
- Require `exp` claim presence; treat missing as invalid
- Add audience claim check if present (defense-in-depth, optional)

### Auth Timeouts
- Refactor `AuthController::login/register/logout` to use `$this->apiRequest()` helper
- Use same 10s timeout, 5s connectTimeout policy

## Scope

- `app/Http/Middleware/JwtAuthMiddleware.php` — strict decode validation
- `app/Http/Controllers/AuthController.php` — use apiRequest()
- Tests for malformed JWT and timeout behavior

## Out of Scope

- JWT signature verification (Core API responsibility, Laravel only checks expiry)
- Token refresh mechanism (separate change if needed)
