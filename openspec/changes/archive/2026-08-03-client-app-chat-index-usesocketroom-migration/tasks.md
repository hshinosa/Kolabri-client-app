## 1. Pre-flight

- [x] 1.1 Run baseline: `npm run test:unit`, e2e `npx playwright test`
- [x] 1.2 Read full `chat/index.tsx` socket setup (lines 200-350)
- [x] 1.3 Read `useSocketRoom.ts` callback signature
- [x] 1.4 List events handled in chat/index.tsx vs supported by hook

## 2. Audit event differences

- [x] 2.1 Grep `socketRef.current.on` in chat/index.tsx → list all event names
- [x] 2.2 Compare with useSocketRoom internal listeners
- [x] 2.3 Identify gaps (events in chat/index.tsx not in hook)

## 3. Extend useSocketRoom if needed

- [x] 3.1 Add new callback props for chat/index.tsx-specific events (if any)
- [x] 3.2 OR: create variant hook `useStudentChatList` that composes useSocketRoom
- [x] 3.3 Keep existing tests passing

## 4. Migrate chat/index.tsx

- [x] 4.1 Remove `import { io, Socket } from 'socket.io-client'`
- [x] 4.2 Remove `socketRef = useRef<Socket | null>(null)` + setup useEffect
- [x] 4.3 Replace with `useSocketRoom({...})` call
- [x] 4.4 Wire callbacks to existing handlers
- [x] 4.5 Verify `socketRef.current.emit(...)` still accessible from hook return

## 5. Cleanup unused code

- [x] 5.1 Remove unused state (`jwtToken` if hook handles it)
- [x] 5.2 Remove dead imports
- [x] 5.3 Run ESLint to confirm no unused warnings

## 6. Verify

- [x] 6.1 `npm run test:unit` — all passing
- [x] 6.2 `npx tsc --noEmit` — 0 errors
- [x] 6.3 `npx eslint resources/js` — 0 errors
- [x] 6.4 Manual: open student chat list page, send message, verify optimistic flow
- [x] 6.5 Manual: connection error scenario (kill backend), verify error UI surfaces
- [x] 6.6 `openspec validate client-app-chat-index-usesocketroom-migration --strict`

## 7. Verify single-pattern enforcement

- [x] 7.1 `grep -rn "io(apiUrl\|io(import.meta.env" resources/js/pages/student/chat/` returns 0 (only useSocketRoom usage remains in pages)
