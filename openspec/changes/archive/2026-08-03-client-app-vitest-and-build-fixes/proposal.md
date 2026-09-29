# Vitest Discovery and Build Pipeline Fixes

## Problem Statement

### 1. Vitest config broken on Linux CI

`vitest.config.ts:11` uses include pattern `tests/unit/**/*.test.{ts,tsx}`. Actual test files are at `tests/Unit/components/*.test.tsx` (capital `U`). On macOS (case-insensitive filesystem) tests run; on Linux CI (case-sensitive ext4) Vitest finds zero tests. Tests labeled "client-app-testing-and-polish" appear to pass locally but never execute in CI.

### 2. Test directory naming inconsistency

`tests/Unit/` (PHPUnit convention) vs `tests/unit/` (Vitest convention) clash. Choose one or use both.

### 3. Production console strip relies on NODE_ENV

`vite.config.ts:29` drops console only when `process.env.NODE_ENV === 'production'`. Source contains many `console.error` calls. If CI build doesn't set `NODE_ENV=production`, console statements ship.

## Proposed Solution

### Vitest
Update include pattern to be case-sensitive correct AND match both directories:
```typescript
include: ['tests/{Unit,unit}/**/*.test.{ts,tsx}']
```

OR rename `tests/Unit/components/*.test.tsx` to `tests/unit/components/*.test.tsx` (lowercase) and remove case ambiguity. Recommended: lowercase `tests/unit/` for Vitest, keep `tests/Unit/` for PHPUnit (Laravel convention).

### Build
Verify CI sets `NODE_ENV=production` for production builds. Add explicit check in `package.json` build script.

## Scope

- `vitest.config.ts` — fix include pattern
- `package.json` — verify build script sets NODE_ENV
- CI workflow — verify env var
- Optional: rename test files for consistency

## Out of Scope

- PHPUnit config (separate)
- E2E test (Playwright) config
