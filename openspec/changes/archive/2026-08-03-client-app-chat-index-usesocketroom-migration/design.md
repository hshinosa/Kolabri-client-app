# Design

## Current State Audit

### chat/index.tsx socket setup (~150 LOC, lines 200-350)

```typescript
const socketRef = useRef<Socket | null>(null);
const [isConnected, setIsConnected] = useState(false);
const [connectionError, setConnectionError] = useState<string | null>(null);
const [jwtToken, setJwtToken] = useState<string | null>(null);

useEffect(() => {
    getAuthToken().then(setJwtToken).catch(...);
}, []);

useEffect(() => {
    if (!jwtToken) return;
    const apiUrl = ...;
    socketRef.current = io(apiUrl, { auth: { token: jwtToken }, transports: [...], reconnection: true, ... });
    socketRef.current.on('connect', () => { setIsConnected(true); });
    socketRef.current.on('connect_error', (err) => { setConnectionError(err.message); });
    socketRef.current.on('chat_history', (data) => { setMessages(data.messages.map(...)); });
    socketRef.current.on('new_message', (msg) => { setMessages(prev => reconcileIncomingMessage(prev, msg)); });
    socketRef.current.on('disconnect', () => { setIsConnected(false); });
    socketRef.current.on('error', (data) => { setConnectionError(data.message); });
    socketRef.current.on('session_closed', ...);
    socketRef.current.on('session_reopened', ...);
    return () => {
        socketRef.current?.off(...);
        socketRef.current?.disconnect();
    };
}, [jwtToken, ...]);
```

### chat/room.tsx pattern (target)

```typescript
const { socketRef, isConnected, connectionError, typingUsers, onlineUsers, ... } = useSocketRoom({
    courseId: course?.id,
    groupId: group?.id,
    chatSpaceId: chatSpace?.id,
    socketUrl,
    onMessagesLoaded: (msgs) => setMessages(msgs),
    onMessageReceived: (msg) => setMessages(prev => reconcileIncomingMessage(prev, msg)),
    onMessageDeleted: (id) => setMessages(prev => prev.filter(m => m.id !== id)),
    onSessionClosed: handleSessionClosed,
    onSessionReopened: handleSessionReopened,
});
```

## Migration Steps

### Step 1: Audit chat/index.tsx event handlers
Identify all `socketRef.current.on('...')` events. Compare with `useSocketRoom` callback props.

Likely matches:
- `connect/disconnect/connect_error/error` → handled internally by hook (state via `isConnected`, `connectionError`)
- `chat_history` → `onMessagesLoaded`
- `new_message` → `onMessageReceived`
- `session_closed` → `onSessionClosed`
- `session_reopened` → `onSessionReopened`

Likely chat/index.tsx-specific (need to verify):
- `personal_chat_history`?
- `personal_message_received`?
- `chatspace_list_updated`?

### Step 2: Extend useSocketRoom if needed

If chat/index.tsx events not in current hook signature:
```typescript
interface UseSocketRoomOptions {
    // existing...
    onPersonalMessage?: (msg: PersonalMessage) => void;
    onChatSpaceListUpdated?: (list: ChatSpace[]) => void;
}
```

OR if events are too index-specific, create separate hook `useStudentChatList` that wraps `useSocketRoom` + adds list-page events.

### Step 3: Replace inline setup

```diff
- import { io, Socket } from 'socket.io-client';
+ import { useSocketRoom } from '@/hooks/useSocketRoom';

- const socketRef = useRef<Socket | null>(null);
- const [isConnected, setIsConnected] = useState(false);
- const [connectionError, setConnectionError] = useState<string | null>(null);
- const [jwtToken, setJwtToken] = useState<string | null>(null);
- useEffect(() => { getAuthToken().then(setJwtToken)... }, []);
- useEffect(() => { /* 80 lines */ }, [jwtToken, ...]);

+ const { socketRef, isConnected, connectionError } = useSocketRoom({
+     courseId: activeChatSpace?.courseId,
+     groupId: activeChatSpace?.groupId,
+     chatSpaceId: activeChatSpace?.id,
+     onMessagesLoaded: (msgs) => setMessages(msgs),
+     onMessageReceived: (msg) => setMessages(prev => reconcileIncomingMessage(prev, msg)),
+     onSessionClosed: handleSessionClosed,
+ });
```

### Step 4: Verify socketRef usage still works

Send/typing/delete handlers continue using `socketRef.current.emit(...)`. No change needed.

## Risk

- chat/index.tsx may emit `join_room` for different `chatSpaceId` than chat/room.tsx (multi-room subscription). Verify hook supports switching rooms without disconnect.
- If chat/index.tsx subscribes to multiple chatSpaces (broadcast list), hook (single-room) won't fit — need multi-room hook variant.

Audit before refactor.

## Test Strategy

- E2E: navigate to chat list page, send message, verify optimistic + server reconciliation
- E2E: navigate between rooms, verify connection persists or reconnects cleanly
- Unit: existing useSocketRoom tests cover hook; manually verify chat/index page behavior
