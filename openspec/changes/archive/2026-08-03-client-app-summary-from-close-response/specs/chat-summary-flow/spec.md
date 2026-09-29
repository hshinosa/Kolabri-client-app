# Chat Summary Flow

## ADDED Requirements

### Requirement: Summary MUST be captured from close response

The chat summary SHALL be captured from the response body of `POST /chat-spaces/{id}/close` and passed directly to `ChatSummaryCard`. The frontend MUST NOT rely solely on a separate GET endpoint that Core API does not provide.

#### Scenario: User closes session

- Given a user closes a chat session
- When the close request returns successfully
- Then the response MUST be parsed for `data.summary`
- And if `summary` is present, it MUST be passed as `initialSummary` to `useChatSummary`
- And `ChatSummaryCard` MUST render in `ready` state with the summary content
- And no separate GET request to summary endpoint MUST be issued

#### Scenario: Close response has no summary

- Given Core API failed to generate summary (AI Engine down, no messages)
- When close response returns `{ summary: null }`
- Then `ChatSummaryCard` MUST render in `empty` state
- And no error MUST be shown

### Requirement: useChatSummary hook MUST accept initial summary

The `useChatSummary` hook SHALL accept an optional `initialSummary` parameter. When provided, the hook MUST initialize its state to `ready` with that summary and MUST NOT issue a fetch.

#### Scenario: Hook initialized with summary

- Given `useChatSummary({ initialSummary, ... })` is called with non-null `initialSummary`
- When the hook initializes
- Then the returned state MUST be `{ status: 'ready', summary: initialSummary }`
- And no `fetch` MUST be called
