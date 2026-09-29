# Architecture Guards

## ADDED Requirements

### Requirement: CI MUST fail on direct Core API calls in React pages

The test suite SHALL include static checks that fail if `resources/js/pages/**/*.tsx` contains direct Core API calls (e.g., `Authorization: Bearer ${jwtToken}`, `fetch(${VITE_API_URL}/api...)`).

#### Scenario: Developer adds direct Core fetch

- Given a developer adds `fetch(\`\${import.meta.env.VITE_API_URL}/api/foo\`)` in a page component
- When CI runs `npm run test:unit`
- Then the static test MUST fail
- And the failure MUST point to the violating file and line

### Requirement: CI MUST fail on legacy auth imports

The test suite SHALL include a static check that fails if `app.tsx` (or any non-whitelisted file) imports from `@/lib/auth`.

#### Scenario: Developer reintroduces legacy auth

- Given `app.tsx` imports `setupAxiosInterceptors` from `@/lib/auth`
- When CI runs the static suite
- Then the test MUST fail
- And `app.tsx` MUST be flagged as the violating file

### Requirement: CI MUST verify test discovery picks up component tests

The test suite SHALL include a check that fails if `tests/Unit/**/*.test.{ts,tsx}` glob returns fewer than 5 files.

#### Scenario: Folder rename breaks discovery

- Given a developer renames `tests/Unit` to a different case (e.g., `tests/unit`)
- When CI runs static check
- Then either the new path MUST be included in `vitest.config.ts` AND find tests, OR the test MUST fail to alert the developer
