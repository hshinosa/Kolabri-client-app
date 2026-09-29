# Upload Edge Cases — Parallel + Client-Side Pre-Check

## Problem Statement

`upload-attachments.ts:24` uses `for (const file of files)` blocking loop:

```typescript
for (const file of files) {
    const result = await new Promise(...); // blocks
    results.push(result);
}
```

Issues:
1. **Sequential**: 5 files × 2s = 10s wait. Browser easily handles 3+ parallel uploads
2. **No client-side size pre-check**: 50MB file uploaded fully before server returns 422 → wasted bandwidth + bad UX
3. **No early bail on first failure**: if file 1 fails, files 2-5 still attempt sequentially

## Proposed Solution

1. Pre-check file sizes client-side (10MB limit matching server)
2. Pre-check MIME types against server whitelist
3. Parallel upload with concurrency limit (3 at a time) using promise pool
4. Fail fast on first error, but allow user retry of failed file

## Scope

- `resources/js/lib/upload-attachments.ts` — replace blocking loop with parallel pool
- Add pre-check helper `validateFile(file)` — size + MIME
- Update tests
- chat/room.tsx + chat/index.tsx — surface pre-check errors before upload

## Out of Scope

- Resumable uploads
- Drag-drop progress UI overhaul
