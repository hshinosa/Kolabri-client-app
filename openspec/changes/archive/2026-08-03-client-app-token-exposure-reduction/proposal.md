# Token Exposure Reduction

## Problem Statement

Two artifacts expose JWT to JavaScript:

1. **`/api/auth/token` endpoint** (`AuthController.php:165`) — returns raw JWT to JS, used by `getAuthToken()` and direct-Core calls
2. **Legacy `auth.ts` module** (`resources/js/lib/auth.ts:23,88`) — models access/refresh tokens in browser memory, contradicts BFF design

These exist because:
- WebSocket/Socket.IO needs token for handshake auth
- 5 components call Core API directly (covered by `client-app-bff-boundary-enforcement`)

After BFF enforcement is complete, only Socket.IO retains a legitimate need for the token. The `auth.ts` module is dead code that should be removed.

## Proposed Solution

After `client-app-bff-boundary-enforcement` lands:

1. **Restrict `/api/auth/token`** to Socket.IO use cases only:
   - Add audience claim or short TTL specifically for socket connection
   - Document in code comment that this endpoint is "Socket.IO ONLY"
2. **Remove legacy `auth.ts` module** entirely:
   - Delete `resources/js/lib/auth.ts`
   - Remove import from `app.tsx:15`
   - Replace any remaining usages
3. **Make `getAuthToken()` socket-scoped**:
   - Only called from `useSocketRoom`, `analytics show.tsx`, `chat/index.tsx` socket setup
   - Rename to `getSocketAuthToken()` for clarity
4. **Document the contract**:
   - Add `docs/security/jwt-handling.md` explaining: JWT is server-side only except for Socket.IO

## Scope

- `app/Http/Controllers/AuthController.php` — narrow token endpoint scope (optional: short-lived socket token)
- `resources/js/lib/auth.ts` — DELETE
- `resources/js/lib/getAuthToken.ts` — rename to `getSocketAuthToken.ts`, document scope
- `resources/js/app.tsx` — remove `auth.ts` import
- `resources/js/hooks/useSocketRoom.ts` — update import
- `resources/js/pages/student/chat/index.tsx`, `analytics/show.tsx` — update import
- Audit: `grep -rn 'getAuthToken\|@/lib/auth' resources/js/`

## Out of Scope

- Replacing Socket.IO with another transport
- Changing JWT claims structure
- This change DEPENDS on `client-app-bff-boundary-enforcement` being complete (otherwise direct-Core calls still need `getAuthToken`)
