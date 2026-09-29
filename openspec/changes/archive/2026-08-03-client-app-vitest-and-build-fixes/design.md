# Design

## Vitest Path Fix

Option A: Make include pattern case-aware

```typescript
// vitest.config.ts
export default defineConfig({
    test: {
        include: ['tests/{Unit,unit}/**/*.test.{ts,tsx}'],
        // ...
    },
});
```

Glob `{Unit,unit}` matches either capitalization.

Option B: Rename React tests to lowercase (recommended)

```bash
git mv tests/Unit/components/PlanVsDiskusiChart.test.tsx tests/unit/components/PlanVsDiskusiChart.test.tsx
git mv tests/Unit/components/error-boundary.test.tsx tests/unit/components/error-boundary.test.tsx
git mv tests/Unit/components/MetricsRadarChart.test.tsx tests/unit/components/MetricsRadarChart.test.tsx
git mv tests/Unit/components/ui/ToastNotification.test.tsx tests/unit/components/ui/ToastNotification.test.tsx
git mv tests/Unit/components/ui/PasswordStrengthMeter.test.tsx tests/unit/components/ui/PasswordStrengthMeter.test.tsx
git mv tests/Unit/components/chat/ChatMessageList.test.tsx tests/unit/components/chat/ChatMessageList.test.tsx
git mv tests/Unit/utils/*.test.ts tests/unit/utils/
```

Then `vitest.config.ts` stays simple:
```typescript
include: ['tests/unit/**/*.test.{ts,tsx}']
```

## Build Pipeline

```json
// package.json
{
    "scripts": {
        "build": "NODE_ENV=production vite build",
        "build:dev": "vite build --mode development",
        "test:unit": "vitest run",
        "test:e2e": "playwright test"
    }
}
```

## CI Workflow Update

```yaml
# .github/workflows/ci.yml
test-frontend:
    runs-on: ubuntu-latest
    steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
        - run: npm ci
        - run: npm run test:unit
        - run: NODE_ENV=production npm run build
```

## Static Test (Bonus)

```typescript
// tests/unit/static/test-discovery.test.ts
test("Vitest discovers all React component tests", () => {
    const files = globSync('tests/unit/components/**/*.test.{ts,tsx}');
    expect(files.length).toBeGreaterThan(5);
});
```
