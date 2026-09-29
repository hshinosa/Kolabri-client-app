# Design

## Type Centralization

```typescript
// resources/js/types/chat.ts (NEW)
export interface DisplayMessage {
    id: string;
    sender_id: string;
    sender_name: string;
    sender_role: 'student' | 'lecturer' | 'admin';
    content: string;
    attachments?: ChatAttachment[];
    reply_to?: ReplyContext;
    created_at: string;
    is_optimistic?: boolean;
}

export interface ChatAttachment {
    id: string;
    name: string;
    url: string;
    size: number;
    mime_type: string;
}

export interface ReplyContext {
    id: string;
    sender_name: string;
    content_preview: string;
}

export interface SocketMessageEvent {
    roomId: string;
    message: DisplayMessage;
}
```

## ChatMessageList Adoption

```typescript
// pages/student/chat/room.tsx (BEFORE)
{processedMessages.map((message, index) => (
    <motion.div key={message.id || index}>
        {/* 50 lines of inline JSX */}
    </motion.div>
))}

// AFTER
<ChatMessageList
    messages={processedMessages}
    currentUserId={auth.user.id}
    onReply={handleReply}
    onDelete={handleDelete}
/>
```

`ChatMessageList` already exists; ensure props cover all features used inline.

## useSocketRoom Adoption in chat/index.tsx

```typescript
// pages/student/chat/index.tsx (BEFORE)
useEffect(() => {
    const token = await getAuthToken();
    socketRef.current = io(apiUrl, { auth: { token: jwtToken } });
    socketRef.current.on('new_message', ...);
    // 80 lines of socket setup
}, []);

// AFTER
const { socket, isConnected, error } = useSocketRoom({
    roomId,
    onNewMessage: handleNewMessage,
    onMessageDeleted: handleMessageDeleted,
    onError: handleError,
});
```

## Stable Message IDs

```typescript
// When sending optimistic message
const tempId = `optim-${nanoid()}`;
addMessage({ id: tempId, is_optimistic: true, ... });

// On socket ACK, replace with server ID
socket.on('message_ack', ({ tempId, serverId }) => {
    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: serverId, is_optimistic: false } : m));
});
```

Always have an ID. `key={message.id}` only — drop index fallback.
