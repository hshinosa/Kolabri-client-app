# Fix Merge & Integration Regressions

## Problem Statement

Oracle review post-merge identified 3 regressions introduced during dev-rizky merge + chat-summary integration work:

### 1. chat/room.tsx LOST optimistic reconciliation
`onMessageReceived` callback only appends raw display message to list. When server echoes message that originated as optimistic send, user sees duplicate (optimistic pending + confirmed). chat/index.tsx handles this correctly via `reconcileIncomingMessage`.

Location: `resources/js/pages/student/chat/room.tsx:188-190`

### 2. ObjectURL leaks
Pending file previews created via `URL.createObjectURL` are revoked only when individual file removed. NOT revoked when:
- `setPendingFiles([])` after successful send
- Component unmount with pending files

Locations:
- `chat/room.tsx:341,496` — createObjectURL + missing revoke after send
- `chat/index.tsx:325,592` — same pattern

### 3. OpenSpec status drift (overstate completion)
`chat-summary-integration` tasks marked complete but Laravel proxy never added. Oracle review flagged this as Blocking severity.

## Proposed Solution

1. **room.tsx onMessageReceived** — use second `raw` arg with `reconcileIncomingMessage`
2. **revokePendingFilePreviews helper** — single helper called before clearing pending files + on unmount
3. **OpenSpec status correction** — re-mark `chat-summary-integration` tasks as `[ ]` for proxy work; will be fully checked when `client-app-summary-bff-proxy` lands

## Scope

- `chat/room.tsx:188-190` — reconciliation fix (3 LOC)
- `chat/room.tsx`, `chat/index.tsx` — revoke helper integration
- `openspec/changes/client-app-chat-summary-integration/tasks.md` — accurate status

## Out of Scope

- Replacing base64 attachments (covered by attachment-streaming spec)
- Restructuring chat files (chat-decomposition spec)
