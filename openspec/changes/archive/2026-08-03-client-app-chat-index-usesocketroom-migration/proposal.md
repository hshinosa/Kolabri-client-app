# Migrate chat/index.tsx to useSocketRoom Hook

## Problem Statement

After merging dev-rizky branch, chat pages have **inconsistent Socket.IO patterns**:

- `resources/js/pages/student/chat/room.tsx` uses `useSocketRoom` hook (line 167)
- `resources/js/pages/student/chat/index.tsx` still uses inline `io()` setup
  - Line 4: `import { io, Socket } from 'socket.io-client'`
  - Line 203: `const socketRef = useRef<Socket | null>(null)`
  - Line 258: `socketRef.current = io(apiUrl, ...)`
  - 15 occurrences of `socketRef.current.on/emit`

This is spec drift from `client-app-frontend-quality / chat-room-decomposition` which mandated single hook usage. Two pages now duplicate connection lifecycle, error handling, room joining, and event listener setup. Changes to socket behavior require touching both files.

## Proposed Solution

Refactor `chat/index.tsx` to use `useSocketRoom` hook the same way `chat/room.tsx` does:

1. Remove `import { io, Socket } from 'socket.io-client'`
2. Replace `socketRef = useRef<Socket | null>(null)` + `useEffect(() => io(...))` block with `const { socketRef, isConnected, ... } = useSocketRoom({...})`
3. Map existing inline event handlers to hook's callback props (`onMessageReceived`, `onSessionClosed`, etc.)
4. Keep page-specific state management; only socket lifecycle moves into hook

## Scope

- `resources/js/pages/student/chat/index.tsx` — migrate to `useSocketRoom`
- Possibly extend `useSocketRoom` if `chat/index.tsx` has events `chat/room.tsx` doesn't (e.g., `personal_message_received`, presence events specific to index page)
- Tests if any cover socket lifecycle directly

## Out of Scope

- New socket events
- Backend Socket.IO changes
- Renaming hook
