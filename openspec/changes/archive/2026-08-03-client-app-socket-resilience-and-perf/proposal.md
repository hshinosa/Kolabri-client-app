# Socket Resilience and Chat Rendering Performance

## Problem Statement

Multiple smaller socket/chat issues:

### Socket Resilience
1. **Token fetched once on mount** — `room.tsx:200` calls `getAuthToken().then(setJwtToken)` once. Long-lived sockets fail after JWT expires (~24h) with no auto-reauth.
2. **`quality_update` timer leak** — `useSocketRoom.ts:223` sets timeout but doesn't clear on unmount. Timer fires on unmounted component, may set state on dead component.
3. **Callback deps stale closure risk** — `useSocketRoom.ts:238` effect uses callback props but excludes them from deps. Current usage with setters is OK, but future changes risk stale closure.
4. **Silent empty-array degradation** — `CourseController.php:17` and similar return empty array on Core failure. User sees empty UI instead of "service unavailable" message.

### Performance
5. **Unvirtualized chat with AnimatePresence** — `room.tsx:1054` animates every message; large rooms (200+ messages) degrade rendering.
6. **Chart data/options recreated each render** — `MetricsRadarChart.tsx:42`, `PlanVsDiskusiChart.tsx:44` rebuild objects every render. Currently fine but bad pattern.
7. **Multiple chart libs in package.json** — `chart.js`, `react-chartjs-2`, `recharts`, `vue-chartjs` (last is leftover). Bundle bloat.

## Proposed Solution

### Resilience
1. Listen for `connect_error` with auth code → refresh token, reconnect
2. Track and clear `quality_update` timer in `useSocketRoom` cleanup
3. Use `useRef` for callback props OR include in deps with `useCallback`
4. Surface service errors instead of empty arrays for critical pages

### Performance
5. Virtualize chat message list with `react-window` for >100 messages
6. `useMemo` chart data and `options`
7. Remove unused chart libs (audit + remove `vue-chartjs`)

## Scope

- `resources/js/hooks/useSocketRoom.ts` — timer cleanup, token re-auth
- `resources/js/pages/student/chat/room.tsx` — react-window for large message lists
- `app/Http/Controllers/CourseController.php` and similar — surface errors
- `resources/js/components/MetricsRadarChart.tsx`, `PlanVsDiskusiChart.tsx` — useMemo
- `package.json` — remove `vue-chartjs` (verify not used first)

## Out of Scope

- Service worker for offline chat
- Predictive prefetch
- Replace chart library entirely
