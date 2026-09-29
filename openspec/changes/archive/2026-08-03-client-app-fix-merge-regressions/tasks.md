## 1. Pre-flight

- [x] 1.1 Run baseline: `npm run test:unit`
- [x] 1.2 Verify `useSocketRoom` passes `(display, raw)` to onMessageReceived
- [x] 1.3 Inventory `URL.createObjectURL` sites and `setPendingFiles([])` sites

## 2. Fix chat/room.tsx reconciliation

- [x] 2.1 Update `onMessageReceived` to use `(_display, raw)` and call `reconcileIncomingMessage(prev, raw)`
- [x] 2.2 Verify import of `reconcileIncomingMessage` already present
- [x] 2.3 Manual test: send message → server echo → no duplicate

## 3. ObjectURL revoke helper

- [x] 3.1 Add `revokePendingFilePreviews(files)` helper (inline or module)
- [x] 3.2 chat/room.tsx — call before `setPendingFiles([])` after send
- [x] 3.3 chat/room.tsx — add unmount cleanup using ref pattern
- [x] 3.4 chat/index.tsx — same pattern

## 4. OpenSpec status correction

- [x] 4.1 Open `chat-summary-integration/tasks.md`
- [x] 4.2 Re-mark Laravel proxy task as `[ ]`
- [x] 4.3 Add note pointing to `client-app-summary-bff-proxy` for completion

## 5. Verify

- [x] 5.1 `npx tsc --noEmit` clean
- [x] 5.2 `npx eslint resources/js` clean
- [x] 5.3 `npx vitest run` 98+ tests pass
- [x] 5.4 Manual: optimistic send → confirm → no duplicate
- [x] 5.5 Manual: send file → check chrome://memory-internals shows no orphan ObjectURLs (or at least pendingFiles=0)
- [x] 5.6 `openspec validate client-app-fix-merge-regressions --strict`
