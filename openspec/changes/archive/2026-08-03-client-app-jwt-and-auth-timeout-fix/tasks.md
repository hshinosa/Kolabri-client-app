## 1. Pre-flight

- [x] 1.1 Run baseline: `vendor/bin/phpunit`
- [x] 1.2 Read `app/Http/Middleware/JwtAuthMiddleware.php`, `app/Http/Controllers/AuthController.php`
- [x] 1.3 Audit other `Http::post`/`Http::get` calls without timeout

## 2. Harden JWT middleware

- [x] 2.1 Reject decode failures (null payload)
- [x] 2.2 Require `exp` claim presence
- [x] 2.3 Extract `reject()` helper for consistency
- [x] 2.4 Update tests

## 3. Refactor auth controllers

- [x] 3.1 `login` → use `$this->apiRequest()`
- [x] 3.2 `register` → same
- [x] 3.3 `logout` → same
- [x] 3.4 Audit any other Auth controller methods

## 4. Make timeouts configurable

- [x] 4.1 Add `API_TIMEOUT` and `API_CONNECT_TIMEOUT` to `config/services.php`
- [x] 4.2 Add to `.env.example`
- [x] 4.3 Update `apiRequest()` to read from config
- [x] 4.4 Verify defaults still 10s / 5s

## 5. Tests

- [x] 5.1 Test malformed JWT (not 3 segments)
- [x] 5.2 Test JWT without exp claim
- [x] 5.3 Test JWT with non-numeric exp
- [x] 5.4 Test login slow Core API → timeout
- [x] 5.5 Test config override changes timeout

## 6. Verify

- [x] 6.1 `vendor/bin/phpunit` passing
- [x] 6.2 `npm run test` passing (if applicable)
- [x] 6.3 `openspec validate client-app-jwt-and-auth-timeout-fix --strict`
