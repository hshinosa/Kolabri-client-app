# Design

## Constants

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB matches server
const MAX_PARALLEL = 3;
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
]);
```

## Pre-check Helper

```typescript
export function validateFile(file: File): { ok: true } | { ok: false; reason: string } {
    if (file.size > MAX_FILE_SIZE) {
        return { ok: false, reason: `${file.name}: file size exceeds 10MB` };
    }
    if (file.size === 0) {
        return { ok: false, reason: `${file.name}: file is empty` };
    }
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
        return { ok: false, reason: `${file.name}: file type ${file.type} not allowed` };
    }
    return { ok: true };
}
```

## Parallel Pool

```typescript
async function withConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    worker: (item: T) => Promise<R>,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;
    
    async function runner() {
        while (true) {
            const idx = nextIndex++;
            if (idx >= items.length) return;
            results[idx] = await worker(items[idx]);
        }
    }
    
    const workers = Array.from(
        { length: Math.min(limit, items.length) },
        () => runner()
    );
    await Promise.all(workers);
    return results;
}
```

## Updated uploadAttachments

```typescript
export async function uploadAttachments(
    files: readonly File[],
    onProgress?: (progress: UploadProgress) => void,
): Promise<UploadedAttachment[]> {
    // Pre-check all files first
    for (const file of files) {
        const validation = validateFile(file);
        if (!validation.ok) {
            throw new Error(validation.reason);
        }
    }
    
    return withConcurrency(files, MAX_PARALLEL, (file) => uploadOne(file, onProgress));
}
```

## Tests

```typescript
test('rejects oversized file before upload', async () => {
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await expect(uploadAttachments([big])).rejects.toThrow(/exceeds 10MB/);
});

test('rejects disallowed MIME type', async () => {
    const exe = new File([new Uint8Array(100)], 'malware.exe', { type: 'application/x-msdownload' });
    await expect(uploadAttachments([exe])).rejects.toThrow(/not allowed/);
});

test('uploads in parallel batches', async () => {
    // Mock XHR, verify 3 concurrent open() calls before any complete
});
```
