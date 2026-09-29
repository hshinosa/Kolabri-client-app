## 1. Pre-flight

- [x] 1.1 Run baseline: `npm run test`, `vendor/bin/phpunit`, e2e
- [x] 1.2 Read `chat/room.tsx`, `chat/index.tsx`, `useSocketRoom.ts`, `ChatMessageList.tsx`

## 2. Centralize types

- [x] 2.1 Create `resources/js/types/chat.ts` with shared interfaces
- [x] 2.2 Update `useSocketRoom.ts` to import from shared
- [x] 2.3 Update `ChatMessageList.tsx` to import from shared
- [x] 2.4 Update `chat/index.tsx`, `chat/room.tsx` imports

## 3. Replace inline rendering with ChatMessageList

- [x] 3.1 Audit features used inline in `room.tsx:1054`
- [x] 3.2 Verify `ChatMessageList` props cover all features
- [x] 3.3 Replace `room.tsx` rendering
- [x] 3.4 Run e2e student-group-chat test

## 4. Adopt useSocketRoom in chat/index.tsx

- [x] 4.1 Replace `socketRef` setup with `useSocketRoom` hook
- [x] 4.2 Map hook callbacks to existing handlers
- [x] 4.3 Remove duplicate type definitions

## 5. Stable message keys

- [x] 5.1 Generate `optim-${nanoid()}` for optimistic messages
- [x] 5.2 Listen for `message_ack` and update ID
- [x] 5.3 `key={message.id}` only — remove `|| index` fallback

## 6. Tests

- [x] 6.1 Update `ChatMessageList.test.tsx` if props changed
- [x] 6.2 E2E: send message, verify rendering via ChatMessageList
- [x] 6.3 E2E: delete message, verify list updates correctly

## 7. Verify

- [x] 7.1 No duplicate `interface DisplayMessage` across files
- [x] 7.2 `room.tsx` no longer has `processedMessages.map(...)` rendering JSX
- [x] 7.3 `chat/index.tsx` no longer creates raw `io(...)` socket
- [x] 7.4 `openspec validate client-app-chat-decomposition-and-types --strict`
