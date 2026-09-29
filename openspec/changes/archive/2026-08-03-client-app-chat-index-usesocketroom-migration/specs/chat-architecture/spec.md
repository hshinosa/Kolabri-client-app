# Chat Page Socket Pattern Consistency

## ADDED Requirements

### Requirement: Student chat pages MUST use useSocketRoom hook

All Socket.IO connection lifecycle in `resources/js/pages/student/chat/*.tsx` SHALL be managed via `useSocketRoom` hook. Inline `io()` setup with `useRef<Socket>` MUST NOT exist in these page components.

#### Scenario: chat/index.tsx socket setup

- Given `resources/js/pages/student/chat/index.tsx` is rendered
- When the component initializes its Socket.IO connection
- Then it MUST call `const { socketRef, isConnected, connectionError, ... } = useSocketRoom({ ... })`
- And it MUST NOT contain `useRef<Socket | null>(null)` declaration
- And it MUST NOT contain `io(apiUrl, { auth: ... })` call

#### Scenario: New chat page added

- Given a developer adds a new student chat page
- When they need socket connection
- Then they MUST use `useSocketRoom` hook (or composed wrapper hook)
- And the codebase MUST NOT have multiple inline `io()` patterns

### Requirement: useSocketRoom MUST cover chat/index.tsx events

The `useSocketRoom` hook (or composed wrapper) SHALL support all event types previously handled inline in `chat/index.tsx`. If events are page-specific, additional callback props MUST be added.

#### Scenario: Index-specific event

- Given `chat/index.tsx` previously handled `personal_message_received` event
- When migrated to use `useSocketRoom`
- Then either:
  - `useSocketRoom` accepts `onPersonalMessage` callback prop, OR
  - A new wrapper hook `useStudentChatList` exists that adds this event on top of `useSocketRoom`
- And no page-component MAY register socket listeners directly
