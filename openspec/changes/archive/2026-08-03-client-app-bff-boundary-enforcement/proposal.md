# Client-App BFF Boundary Enforcement

## Problem Statement

The client-app uses a Backend-for-Frontend (BFF) pattern: Laravel handles auth/session, React calls Laravel routes, Laravel forwards to Core API. This pattern was claimed implemented in `client-app-security-hardening`.

Reality: 5+ React components call Core API directly using raw JWT, bypassing Laravel entirely:
- `resources/js/pages/admin/user-management.tsx:712` — admin user export
- `resources/js/pages/admin/master-data.tsx:1140` — master data export
- `resources/js/pages/lecturer/analytics/index.tsx:225` — analytics refresh
- `resources/js/pages/student/ai-chat/index.tsx:259` — AI chat stream
- `resources/js/pages/student/chat/room.tsx:751` — reflection submit

Issues:
- Core API URL exposed in browser network tab (topology leak)
- Frontend grabs raw JWT via `/api/auth/token` to attach `Authorization` header
- BFF promise broken: error handling, logging, rate limiting bypass Laravel
- CSRF protection (Laravel) doesn't apply to direct Core calls
- Inconsistent timeout/retry behavior across two paths

## Proposed Solution

Create Laravel proxy controllers/routes for each direct-Core call site, then update frontend to call Laravel routes instead.

For each of the 5 sites:
1. Identify Core API endpoint(s) being called
2. Add Laravel route + controller method that proxies via `Controller::apiRequest()`
3. Update frontend to fetch from Laravel route (no `Authorization` header needed — Laravel uses session JWT)

Streaming endpoints (AI chat) need streaming proxy support — Laravel's `Http::send()` or chunked response.

## Scope

- New Laravel routes + controllers to proxy:
  - User export (admin)
  - Master data export (admin)
  - Analytics refresh (lecturer)
  - AI chat stream (student) — streaming proxy
  - Reflection submit (student)
- Update 5 React components to call Laravel routes instead of Core directly
- Tests: feature tests for new Laravel routes, e2e test for at least one critical path

## Out of Scope

- Removing `/api/auth/token` (separate change: token-exposure-reduction)
- Socket.IO refactor (Socket.IO needs JWT for auth handshake — different concern)
- Removing legacy `auth.ts` module (separate change)
