# Design

## Test 1: No Direct Core Calls

```typescript
// tests/static/no-direct-core-calls.test.ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

const FORBIDDEN_PATTERNS = [
    'Authorization: `Bearer \${jwtToken}`',
    'Authorization: `Bearer \${authToken}`',
    'fetch(`\${baseUrl}/api',
    'fetch(`\${apiBaseUrl}/api',
    'import.meta.env.VITE_API_URL',
    'import.meta.env.VITE_API_BASE_URL',
];

const ALLOWED_FILES = [
    'resources/js/lib/getAuthToken.ts', // socket auth exception
    'resources/js/hooks/useSocketRoom.ts', // socket connection
    'resources/js/lib/websocket.ts', // admin WS
];

describe('BFF boundary enforcement', () => {
    for (const pattern of FORBIDDEN_PATTERNS) {
        it(`forbids '${pattern}' in resources/js/pages/`, () => {
            const result = execSync(
                `grep -rn '${pattern}' resources/js/pages || true`,
                { encoding: 'utf8' }
            );
            const lines = result.split('\n').filter(Boolean);
            expect(lines, `Direct Core call found in pages:\n${lines.join('\n')}`).toEqual([]);
        });
    }
});
```

## Test 2: No Legacy Auth

```typescript
// tests/static/no-legacy-auth.test.ts
describe('legacy auth.ts is not used', () => {
    it('app.tsx does not import setupAxiosInterceptors from auth.ts', () => {
        const result = execSync(
            `grep -n 'setupAxiosInterceptors\|@/lib/auth' resources/js/app.tsx || true`,
            { encoding: 'utf8' }
        );
        expect(result, `Legacy auth still imported in app.tsx:\n${result}`).toBe('');
    });
});
```

## Test 3: Test Discovery Coverage

```typescript
// tests/static/test-discovery-coverage.test.ts
import { describe, it, expect } from 'vitest';
import { globSync } from 'glob';

describe('test discovery', () => {
    it('discovers React component tests in tests/Unit', () => {
        const files = globSync('tests/Unit/**/*.test.{ts,tsx}');
        expect(files.length).toBeGreaterThanOrEqual(5);
    });

    it('discovers feature tests in resources/js/features', () => {
        const files = globSync('resources/js/features/**/*.test.{ts,tsx}');
        expect(files.length).toBeGreaterThanOrEqual(2);
    });
});
```

## CI Integration

Add to `package.json`:
```json
"test:unit": "vitest run",
"test:static": "vitest run tests/static",
"test:all": "npm run test:unit && npm run test:e2e"
```

CI workflow runs `test:unit` which includes static tests via include pattern.

## Trade-offs

- **False positives**: regex-based, may flag legitimate code. Mitigate via ALLOWED_FILES list.
- **Maintenance**: as architecture evolves, patterns need updates. Less frequent than full code review.
- **Performance**: ~1s per static test, negligible.
