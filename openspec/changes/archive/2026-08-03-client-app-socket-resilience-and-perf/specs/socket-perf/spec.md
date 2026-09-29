# Socket Performance and Resilience

## ADDED Requirements

### Requirement: Socket MUST attempt re-auth on token expiry

The socket connection SHALL listen for `connect_error` events with auth-related causes and attempt one reconnection with a fresh token before giving up.

#### Scenario: JWT expires during long session

- Given a Socket.IO connection has been open for 25 hours
- When JWT expires and Core API rejects the next event with auth error
- Then `connect_error` MUST trigger `getSocketAuthToken()` after cache invalidation
- And the socket MUST reconnect with the new token
- And the user MUST NOT lose their place in the chat

### Requirement: Socket effects MUST clean up timers

`useSocketRoom` SHALL clear all `setTimeout` / `setInterval` handles in its cleanup function. Timers MUST NOT fire after component unmount.

#### Scenario: User navigates away during quality_update timer

- Given a `quality_update` event scheduled a 5-second feedback display
- When the user navigates away before the 5 seconds elapse
- Then the cleanup function MUST clear the timer
- And no `setState` MUST be called on the unmounted component

### Requirement: Chat message list MUST virtualize for large rooms

When `messages.length > 100`, the chat message list SHALL use a virtualization library (e.g., `react-window`) so only visible messages are rendered.

#### Scenario: Room with 500 messages

- Given a chat room contains 500 messages
- When the user opens the room
- Then only ~10-20 visible messages MUST be in the DOM at any time
- And initial render MUST complete within reasonable time
- And scroll performance MUST remain smooth

### Requirement: Chart components MUST memoize data and options

`MetricsRadarChart` and `PlanVsDiskusiChart` SHALL wrap their `data` and `options` objects in `useMemo` so React's reference equality skips unnecessary re-renders.

#### Scenario: Parent re-renders without metric change

- Given `MetricsRadarChart` is mounted with metrics prop
- When the parent re-renders but `metrics` reference is unchanged
- Then `chart.update()` MUST NOT be called (memoized data identity)

## MODIFIED Requirements

### Requirement: Inertia controllers MUST surface service failures

Inertia-rendering controllers SHALL include a `serviceError` prop when Core API calls fail, instead of silently returning empty arrays.

#### Scenario: Core API down during course list

- Given Core API returns 503 for `/api/courses`
- When `CourseController::index` handles the failure
- Then the response MUST include `serviceError: "Course service is temporarily unavailable."`
- And the frontend MUST render an error banner
- And MUST NOT render an empty list as if no courses exist
