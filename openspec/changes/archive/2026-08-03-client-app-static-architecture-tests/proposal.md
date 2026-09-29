# Static Architecture Guard Tests

## Problem Statement

Multiple architectural rules have been violated in past commits despite explicit OpenSpec coverage:
- BFF boundary broken (5+ direct Core fetches in React pages)
- Legacy `auth.ts` still imported globally
- New summary hook violated BFF design

Code review (Oracle) catches these but is expensive (10-20 minutes per run). Architectural drift continues between reviews. Need automated enforcement at CI level.

## Proposed Solution

Add Vitest "static" test files that grep the codebase and fail when architectural rules are violated:

1. **No direct Core fetches in pages** — fail if `Authorization: Bearer ${jwtToken}` appears in `resources/js/pages/`
2. **No `VITE_API_URL` direct fetches in pages** — same
3. **No legacy auth imports** — fail if `import.*from '@/lib/auth'` outside whitelisted files
4. **Vitest discovers all test files** — fail if `tests/Unit/` and `tests/unit/` mismatch causes test miss

Each test runs as part of `npm run test:unit` so CI fails fast on drift.

## Scope

- `tests/static/no-direct-core-calls.test.ts` (new)
- `tests/static/no-legacy-auth.test.ts` (new)
- `tests/static/test-discovery-coverage.test.ts` (new) — count tests/Unit/*.test.* > 0
- `vitest.config.ts` — include `tests/static/**`

## Out of Scope

- ESLint custom rule (heavier; tests are fine)
- TypeScript-level enforcement
- Replacement for code review (these are tripwires, not full review)
