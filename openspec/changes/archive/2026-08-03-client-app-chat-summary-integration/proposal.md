# Chat Summary Component Integration (KOL-44 Task 3+)

## Problem Statement

Commit `e650dae` (dev-rizky merge) added 4 chat-summary files:
- `resources/js/features/chat/summary/types.ts` (13 LOC)
- `resources/js/features/chat/summary/chat-summary-card.tsx` (54 LOC)
- `resources/js/features/chat/summary/chat-summary-detail.tsx` (18 LOC)
- `resources/js/features/chat/summary/chat-summary.test.tsx` (43 LOC, 4 tests)

The components and tests work in isolation but **are never imported by any page or layout**. Verified via grep:
```
grep -rn "ChatSummaryCard|ChatSummaryDetail" resources/js app | grep -v "summary/"
→ 0 results
```

This is dead code post-merge. The dev-rizky commit message mentioned "KOL-44 Task 1-2" suggesting integration (Task 3+) was planned but not delivered.

## Proposed Solution

Integrate `ChatSummaryCard` into the chat experience:

### Trigger
Show summary when chat session is closed (`session_closed` event already handled in `useSocketRoom`).

### Placement
- `chat/room.tsx` — when `sessionClosed === true`, render `<ChatSummaryCard summary={...} />` above the closed-state message
- Optional: `chat/index.tsx` for closed sessions in list view

### Data Source
Core API endpoint that returns `ChatSummary` for a closed chatSpace:
- Endpoint: `GET /api/chatspaces/{id}/summary`
- Already exists per `core-api-chatspace-summary` change

### Loading/Empty/Error States
`ChatSummaryCard` already has these states (per existing tests). Wire up via fetch hook:
```typescript
const { state } = useChatSummary(chatSpace?.id, sessionClosed);
```

## Scope

- `resources/js/features/chat/summary/use-chat-summary.ts` (new) — fetch hook
- `resources/js/pages/student/chat/room.tsx` — render `ChatSummaryCard` when sessionClosed
- Laravel proxy route for `/api/chatspaces/{id}/summary` if not already present
- Tests for fetch hook + integration

## Out of Scope

- AI summary generation (in core-api / ai-engine)
- Summary editing / regeneration
- Summary sharing / export
