## 1. Pre-flight

- [x] 1.1 Run baseline: `npm run test`, e2e
- [x] 1.2 Read `useSocketRoom.ts`, `room.tsx`, controller examples
- [x] 1.3 Audit chart lib usage

## 2. Socket re-auth on token expiry

- [x] 2.1 Add `connect_error` handler in `useSocketRoom`
- [x] 2.2 Detect auth-related errors, clear token cache, refetch, reconnect
- [x] 2.3 Limit retries to 1 to avoid loop

## 3. Timer cleanup

- [x] 3.1 Track `qualityTimerRef` and clear in cleanup effect
- [x] 3.2 Audit other setTimeout/setInterval in useSocketRoom

## 4. Stable callback props

- [x] 4.1 Move callback props to refs
- [x] 4.2 Effect deps simplified to `[socket]` only

## 5. Surface service errors

- [x] 5.1 `CourseController::index` — return `serviceError` prop on failure
- [x] 5.2 Audit other Inertia controllers swallowing failures
- [x] 5.3 Frontend renders error banner when `serviceError` present

## 6. Chat virtualization

- [x] 6.1 Install `react-window`
- [x] 6.2 Wrap `ChatMessageList` items in `FixedSizeList` when count > 100
- [x] 6.3 Maintain scroll-to-bottom behavior
- [x] 6.4 E2E: large room test

## 7. Chart memoization

- [x] 7.1 `MetricsRadarChart.tsx` — useMemo for data + options
- [x] 7.2 `PlanVsDiskusiChart.tsx` — same

## 8. Remove unused chart libs

- [x] 8.1 `grep -rn "vue-chartjs" resources/`
- [x] 8.2 If unused: `npm uninstall vue-chartjs`
- [x] 8.3 Same audit for other chart libs

## 9. Verify

- [x] 9.1 All tests passing
- [x] 9.2 Manual: long-lived socket, force token expiry, verify auto-reconnect
- [x] 9.3 Manual: chat with 200+ messages, verify smooth scroll
- [x] 9.4 `openspec validate client-app-socket-resilience-and-perf --strict`
