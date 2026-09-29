# Test and Build Pipeline

## ADDED Requirements

### Requirement: Vitest config MUST discover all React component tests

The `vitest.config.ts` `include` pattern SHALL match every `.test.tsx` and `.test.ts` file under the project's unit-test directories regardless of OS filesystem case-sensitivity.

#### Scenario: Linux CI run

- Given the project is checked out on a case-sensitive Linux filesystem
- When `npx vitest run` is executed
- Then Vitest MUST discover ≥5 React component test files
- And report >0 tests run

#### Scenario: New test file added

- Given a developer adds `tests/unit/components/Foo.test.tsx`
- When CI runs Vitest
- Then the new test MUST be discovered without manual config update

### Requirement: Production build MUST strip console statements

The `npm run build` script SHALL produce a bundle with `console.*` calls removed via the configured esbuild `drop` option.

#### Scenario: Production bundle

- Given `npm run build` runs
- When the resulting bundle is grepped for `console\.`
- Then no `console.error`, `console.warn`, `console.log` calls MUST appear in the production output
- And `debugger` statements MUST be removed
