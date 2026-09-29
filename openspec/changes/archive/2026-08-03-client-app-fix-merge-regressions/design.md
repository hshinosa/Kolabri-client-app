# Design

## Reconciliation Fix

### Before
```typescript
onMessageReceived: (message) => {
    setMessages((prev) => [...prev, message]);
},
```

### After
```typescript
onMessageReceived: (_display, raw) => {
    setMessages((prev) => reconcileIncomingMessage(prev, raw));
},
```

`useSocketRoom` already passes `(display, raw)` since callback ref refactor. `chat/index.tsx` uses this correctly. Pattern: when server echo arrives with `clientId`, `reconcileIncomingMessage` finds optimistic by clientId and replaces with confirmed; otherwise appends.

## ObjectURL Revoke Helper

```typescript
// resources/js/features/chat/file-preview-cleanup.ts (NEW, or inline)
export function revokePendingFilePreviews(files: PendingFile[]) {
    for (const file of files) {
        if (file.preview) {
            URL.revokeObjectURL(file.preview);
        }
    }
}
```

Use sites:

```typescript
// Before clearing
revokePendingFilePreviews(pendingFiles);
setPendingFiles([]);

// On unmount
useEffect(() => {
    return () => {
        revokePendingFilePreviews(pendingFiles);
    };
}, []); // run once on unmount; pendingFiles read from closure (stale OK for cleanup)
```

Better: use ref to track current pendingFiles for accurate cleanup:

```typescript
const pendingFilesRef = useRef<PendingFile[]>([]);
useEffect(() => {
    pendingFilesRef.current = pendingFiles;
}, [pendingFiles]);

useEffect(() => {
    return () => {
        revokePendingFilePreviews(pendingFilesRef.current);
    };
}, []);
```

## OpenSpec Tasks Re-Marking

Update `client-app-chat-summary-integration/tasks.md`:
- Re-mark task 3 (Laravel proxy route) as `[ ]`
- Add note: completed in `client-app-summary-bff-proxy`

This restores OpenSpec truthfulness.
