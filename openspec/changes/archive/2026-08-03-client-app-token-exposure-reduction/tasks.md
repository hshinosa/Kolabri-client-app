## 1. Pre-flight

- [x] 1.1 Confirm `client-app-bff-boundary-enforcement` is COMPLETE
- [x] 1.2 Run baseline: `vendor/bin/phpunit`, `npm run test`
- [x] 1.3 Audit token usage: `grep -rn 'getAuthToken\|@/lib/auth' resources/js/`

## 2. Audit remaining getAuthToken callers

- [x] 2.1 Confirm all callers are Socket.IO setup (allowed)
- [x] 2.2 Document each caller with comment "// Socket.IO auth handshake"

## 3. Rename for clarity

- [x] 3.1 Rename `getAuthToken.ts` → `getSocketAuthToken.ts`
- [x] 3.2 Rename function `getAuthToken` → `getSocketAuthToken`
- [x] 3.3 Update all 3-4 import sites
- [x] 3.4 Update endpoint name to `/api/auth/socket-token` (optional, breaks core-api compat — coordinate)

## 4. Remove legacy auth.ts

- [x] 4.1 Verify `resources/js/lib/auth.ts` has no live references (grep imports)
- [x] 4.2 Delete `resources/js/lib/auth.ts`
- [x] 4.3 Remove import from `resources/js/app.tsx:15`
- [x] 4.4 Remove any related types/exports

## 5. Optional: short-TTL socket token

- [x] 5.1 Add new endpoint `/api/auth/socket-token` returning JWT with 1-hour TTL specifically for socket
- [x] 5.2 Add audience claim `aud: 'socket'` to socket-scoped token
- [x] 5.3 Update Core API auth middleware to verify audience for socket connections

## 6. Documentation

- [x] 6.1 Create `docs/security/jwt-handling.md` documenting BFF rule + Socket.IO exception
- [x] 6.2 Update CLAUDE.md / AGENTS.md if applicable

## 7. Static analysis safeguard

- [x] 7.1 Add test: `grep -rn 'VITE_API_BASE_URL' resources/js/pages/` returns 0 results
- [x] 7.2 Add test: `getSocketAuthToken` only imported from socket setup files

## 8. Verify

- [x] 8.1 All tests passing
- [x] 8.2 Manual: verify `/api/auth/token` (or renamed endpoint) is only hit during socket connect
- [x] 8.3 `openspec validate client-app-token-exposure-reduction --strict`
