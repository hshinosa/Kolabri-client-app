## 1. Pre-flight

- [x] 1.1 Verify Vitest config includes test pattern that picks up `tests/static/**`
- [x] 1.2 Decide ALLOWED_FILES whitelist for socket-related JWT exceptions

## 2. No-direct-Core test

- [x] 2.1 Create `tests/static/no-direct-core-calls.test.ts`
- [x] 2.2 List forbidden patterns (Authorization Bearer, VITE_API_URL fetch, etc.)
- [x] 2.3 Whitelist socket auth files
- [x] 2.4 Verify test FAILS on current code (proves it works)
- [x] 2.5 After BFF enforcement implemented, test should PASS

## 3. No-legacy-auth test

- [x] 3.1 Create `tests/static/no-legacy-auth.test.ts`
- [x] 3.2 Check `app.tsx` does not import `setupAxiosInterceptors`
- [x] 3.3 Check no other files import from `@/lib/auth`
- [x] 3.4 Verify FAILS on current code

## 4. Test discovery coverage test

- [x] 4.1 Create `tests/static/test-discovery-coverage.test.ts`
- [x] 4.2 Glob `tests/Unit/**/*.test.{ts,tsx}` — assert count > 5
- [x] 4.3 Glob `resources/js/features/**/*.test.{ts,tsx}` — assert count > 2

## 5. Vitest config

- [x] 5.1 Verify `tests/static/**` matches existing include pattern
- [x] 5.2 Optionally add `test:static` script in `package.json`

## 6. Verify

- [x] 6.1 `npx vitest run tests/static` runs all static tests
- [x] 6.2 Tests fail in current state (proves coverage), green only after BFF fixes
- [x] 6.3 `openspec validate client-app-static-architecture-tests --strict`
