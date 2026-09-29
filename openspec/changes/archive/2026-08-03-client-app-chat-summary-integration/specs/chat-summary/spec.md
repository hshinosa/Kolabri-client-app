# Chat Summary Integration

## ADDED Requirements

### Requirement: Closed chat sessions MUST display summary card

When a chat session is closed (sessionClosed=true), the chat room SHALL render `ChatSummaryCard` above the closed-state message UI to show users the AI-generated summary of the discussion.

#### Scenario: Session closes during user view

- Given a user is in a chat room
- When the lecturer closes the session via socket event `session_closed`
- Then `chat/room.tsx` MUST set `sessionClosed=true`
- And `ChatSummaryCard` MUST be rendered with state from `useChatSummary` hook
- And the user MUST see one of: loading spinner, empty placeholder, error message, or summary content

### Requirement: useChatSummary hook MUST handle all states

The `useChatSummary(chatSpaceId, enabled)` hook SHALL return a discriminated union state covering loading, empty, error, and ready cases. The hook MUST cancel in-flight fetches on unmount or chatSpaceId change.

#### Scenario: Component unmounts during fetch

- Given `useChatSummary` is fetching summary data
- When the component unmounts before fetch completes
- Then the hook MUST NOT call setState after unmount
- And there MUST NOT be a "setState on unmounted component" warning

#### Scenario: Disabled flag prevents fetch

- Given `useChatSummary(chatSpaceId, enabled=false)` is called
- When the hook runs
- Then no HTTP request MUST be issued
- And the returned state MUST be `{ status: 'empty' }`

### Requirement: Summary endpoint MUST proxy via Laravel

The frontend SHALL fetch chat summary via Laravel route, NOT via direct Core API call. JWT MUST stay server-side.

#### Scenario: Summary fetch path

- Given the user views a closed chat session
- When `useChatSummary` issues the HTTP request
- Then the request URL MUST be a Laravel route (e.g., `/api/chatspaces/{id}/summary`)
- And MUST NOT include `Authorization: Bearer ...` header from frontend
- And the Laravel controller MUST forward the request to Core API with session JWT
