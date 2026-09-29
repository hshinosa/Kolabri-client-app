# Proxy Hardening — Rate Limit + axios withCredentials

## Problem Statement

Two smaller hardenings:

### 1. No rate limiting on BFF proxy routes

Routes like `/student/courses/{course}/chat-spaces/{chatSpace}/close`, `/reflection`, `/api/chat/upload` have **no rate limit**. User can spam:
- Repeatedly close session (potentially spam Core API + AI Engine summary generation)
- Upload many files quickly (storage exhaustion)
- Submit multiple reflections rapidly

Laravel has `auth.jwt` middleware but no per-route throttle.

### 2. axios.defaults.withCredentials not set

`app.tsx` configures CSRF token but does NOT set `axios.defaults.withCredentials = true`. Same-origin works fine. But:
- Future subdomain split (e.g., `app.kolabri.id` + `api.kolabri.id`) would break session cookie inclusion
- Harder to debug if someone changes deployment topology

## Proposed Solution

1. Add Laravel `throttle:N,M` middleware to BFF proxy routes:
   - Upload: 30 per 5 min
   - Chat-space mutations (close/reflection): 10 per 5 min
   - Admin export: 10 per 1 min
2. Set `axios.defaults.withCredentials = true` in `app.tsx` (defensive)

## Scope

- `routes/web.php` — add throttle middleware to specific routes
- `resources/js/app.tsx` — `axios.defaults.withCredentials = true`
- Tests / manual verification

## Out of Scope

- Distributed rate limiter via Redis (Laravel default is memory; OK for single-instance)
- Per-user rate limit (vs per-IP)
