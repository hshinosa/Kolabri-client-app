# Design

## Dependency Order

This change DEPENDS on `client-app-bff-boundary-enforcement`. Don't remove `getAuthToken` while pages still need it for direct-Core calls.

Order:
1. `client-app-bff-boundary-enforcement` — BFF proxies for 5 sites
2. THIS change — narrow token scope, remove legacy module

## Audit Findings

```bash
grep -rn 'getAuthToken\|@/lib/auth' resources/js/
```

Expected after BFF enforcement:
- `useSocketRoom.ts:110-111` — Socket.IO auth (KEEP)
- `pages/student/chat/index.tsx:268-269` — Socket.IO auth (KEEP)
- `pages/student/chat/index.tsx:257` — token check (KEEP)
- `pages/lecturer/analytics/show.tsx:270-271` — Socket.IO auth (KEEP)
- `app.tsx:15` — legacy import (REMOVE)
- `lib/auth.ts:23,88` — module body (REMOVE entire file)

## Rename Strategy

Old: `lib/getAuthToken.ts` exporting `getAuthToken()`
New: `lib/getSocketAuthToken.ts` exporting `getSocketAuthToken()`

Sed-style migration:
```bash
git mv resources/js/lib/getAuthToken.ts resources/js/lib/getSocketAuthToken.ts
grep -rln 'getAuthToken\|@/lib/getAuthToken' resources/js/ | xargs sed -i '' \
    -e 's/getAuthToken/getSocketAuthToken/g' \
    -e 's|@/lib/getAuthToken|@/lib/getSocketAuthToken|g'
```

## Optional Hardening: Audience Claim

If we want defense in depth:

```php
// AuthController::token() (new behavior)
public function socketToken(Request $request)
{
    $jwt = JWT::encode([
        'sub' => $user->id,
        'aud' => 'socket', // ← audience claim
        'iat' => time(),
        'exp' => time() + 3600, // shorter TTL than HTTP JWT
    ], $secret);

    return ['token' => $jwt];
}
```

Core API middleware:
```typescript
// HTTP routes: require aud != 'socket' OR no aud (backward compat)
if (decoded.aud === 'socket') return res.status(401).json({ error: 'wrong_audience' });

// Socket.IO middleware: require aud === 'socket' OR no aud
if (decoded.aud && decoded.aud !== 'socket') return next(new Error('wrong_audience'));
```

This prevents stolen socket tokens from being used as HTTP credentials.

## Doc Update

Create `docs/security/jwt-handling.md`:

```markdown
# JWT Handling

## Rule
JWT lives in Laravel session (httpOnly cookie). Frontend NEVER stores JWT.

## Exception: Socket.IO
Socket.IO requires JWT for handshake auth. Frontend retrieves a short-lived,
audience-scoped token via /api/auth/socket-token only at connection time.

## Forbidden
- Storing JWT in localStorage or sessionStorage
- Calling Core API directly from React (use Laravel proxy)
- Including JWT in browser-visible request URLs
```
