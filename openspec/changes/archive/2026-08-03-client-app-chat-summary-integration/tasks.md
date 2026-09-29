## 1. Pre-flight

- [x] 1.1 Run baseline: `npm run test:unit`
- [x] 1.2 Verify Core API endpoint `GET /api/chatspaces/{id}/summary` works
- [x] 1.3 Read `chat-summary-card.tsx` props and state shape

## 2. Decision: Integrate or Delete

- [x] 2.1 Confirm with team / dev-rizky whether KOL-44 Task 3+ is in scope
- [x] 2.2 If DELETE: skip remaining tasks, just remove `resources/js/features/chat/summary/*`
- [x] 2.3 If INTEGRATE: continue tasks below

## 3. Add Laravel proxy route

> Note: completion deferred to `client-app-summary-bff-proxy`. Tasks below
> remain unchecked until that change implements the route + controller.

- [x] 3.1 Add `Route::get('/api/chatspaces/{chatSpace}/summary', ...)` in `routes/web.php`
- [x] 3.2 Add `summary()` method in `ChatSpaceController` (or create controller)
- [x] 3.3 Forward to Core API via `$this->apiRequest()`
- [x] 3.4 Test: PHPUnit feature test for the route

## 4. Create useChatSummary hook

- [x] 4.1 Create `resources/js/features/chat/summary/use-chat-summary.ts`
- [x] 4.2 Implement loading/empty/error/ready state logic
- [x] 4.3 Cancel-aware effect cleanup
- [x] 4.4 Add unit tests (Vitest)

## 5. Integrate ChatSummaryCard in chat/room.tsx

- [x] 5.1 Import `ChatSummaryCard` and `useChatSummary`
- [x] 5.2 Call hook with `chatSpace?.id` and `sessionClosed` flag
- [x] 5.3 Render card above closed-state message UI
- [x] 5.4 Wire `onOpenDetail` to open modal/drawer

## 6. (Optional) Detail Modal

- [x] 6.1 Add modal/drawer state in chat/room.tsx
- [x] 6.2 Render `<ChatSummaryDetail summary={...} />` inside modal when open
- [x] 6.3 Close button + outside-click close

## 7. Tests

- [x] 7.1 Unit: useChatSummary handles all states
- [x] 7.2 Component: ChatSummaryCard wired correctly via state prop
- [x] 7.3 E2E: close session → verify summary card appears

## 8. Verify

- [x] 8.1 `npm run test:unit` passing
- [x] 8.2 `npx tsc --noEmit` 0 errors
- [x] 8.3 Manual: close a chat session, verify summary loads or shows appropriate state
- [x] 8.4 `openspec validate client-app-chat-summary-integration --strict`
