# Chat Component Decomposition and Type Centralization

## Problem Statement

### 1. Chat decomposition incomplete (spec drift)

`client-app-frontend-quality / chat-room-decomposition` requires `room.tsx` to use `ChatMessageList`. Implementation still inline-renders messages at `room.tsx:1054` (`processedMessages.map(...)`). The extracted `ChatMessageList` exists but is unused at the room.

### 2. Duplicate Socket.IO setup

`pages/student/chat/index.tsx:255` re-implements full Socket.IO connection logic despite `useSocketRoom` hook existing. Two sources of truth for connection lifecycle, message receive, error handling.

### 3. Type duplication

Same chat DTOs repeated across:
- `useSocketRoom.ts`
- `chat/index.tsx`
- `chat/room.tsx`
- `ChatMessageList.tsx`

Drift risk when one file updates but others don't.

### 4. Unstable list keys

`room.tsx:1059` uses `key={message.id || index}`. If a message arrives without ID, React reuses the index key, animation state corrupts and list reordering breaks.

## Proposed Solution

1. Refactor `room.tsx` to use `ChatMessageList`
2. Refactor `chat/index.tsx` to use `useSocketRoom` hook
3. Extract chat types to `resources/js/types/chat.ts`
4. Require message IDs (generate client-side ID before send if needed); drop index fallback

## Scope

- `resources/js/pages/student/chat/room.tsx` — replace inline rendering with `ChatMessageList`
- `resources/js/pages/student/chat/index.tsx` — adopt `useSocketRoom`
- `resources/js/types/chat.ts` (new) — DisplayMessage, IncomingMessage, etc.
- `resources/js/components/chat/ChatMessageList.tsx` — import shared types
- `resources/js/hooks/useSocketRoom.ts` — same

## Out of Scope

- New socket events
- Backend changes
