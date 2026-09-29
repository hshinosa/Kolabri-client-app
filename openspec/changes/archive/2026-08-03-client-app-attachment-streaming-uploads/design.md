# Design

## Upload Flow

```
Browser
  ├── 1. Select files
  ├── 2. POST /api/upload (multipart/form-data)
  │      └─→ Laravel forwards to Core API
  ├── 3. Receive [{id, url, size, mime_type}, ...]
  ├── 4. Emit send_message with attachments=[{id, url, ...}] (metadata only)
  └── 5. Render optimistic message with attachment

Other clients
  ├── 6. Receive new_message event with attachments metadata
  └── 7. Render <img src={attachment.url} /> — browser fetches independently
```

## Frontend Helper

```typescript
// resources/js/lib/uploadAttachments.ts
export async function uploadAttachments(
    files: File[],
    onProgress?: (file: File, percent: number) => void,
): Promise<ChatAttachment[]> {
    const results: ChatAttachment[] = [];
    for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const xhr = new XMLHttpRequest();
        const result = await new Promise<ChatAttachment>((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress(file, (e.loaded / e.total) * 100);
                }
            });
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });
            xhr.addEventListener('error', () => reject(new Error('Upload error')));
            xhr.open('POST', '/api/upload');
            xhr.setRequestHeader('X-CSRF-TOKEN', csrf());
            xhr.send(fd);
        });
        results.push(result);
    }
    return results;
}
```

## Laravel Controller

```php
// app/Http/Controllers/UploadController.php
public function store(Request $request)
{
    $request->validate([
        'file' => ['required', 'file', 'max:10240'], // 10MB
    ]);

    $response = $this->apiRequest()
        ->attach('file', file_get_contents($request->file('file')->path()), $request->file('file')->getClientOriginalName())
        ->post('/api/upload');

    if ($response->failed()) {
        return response()->json(['error' => 'upload_failed'], 502);
    }

    return $response->json();
}
```

## Migration of room.tsx

```typescript
// BEFORE (room.tsx:647)
const reader = new FileReader();
reader.onload = () => {
    const base64 = reader.result as string;
    socket.emit('send_message', {
        ...,
        attachments: [{ name: file.name, data: base64 }],
    });
};
reader.readAsDataURL(file);

// AFTER
const handleSend = async () => {
    setUploading(true);
    try {
        const attachments = await uploadAttachments(pendingFiles, (file, pct) => {
            setUploadProgress(prev => ({ ...prev, [file.name]: pct }));
        });
        // Revoke object URLs first
        pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
        socket.emit('send_message', {
            roomId,
            content,
            attachments, // metadata only
        });
        setPendingFiles([]);
    } finally {
        setUploading(false);
    }
};
```

## Defense in Depth

- File size limit at Laravel (10MB) AND Core API (matching)
- MIME type whitelist
- Antivirus scanning hook (future)
- Signed URLs with expiry for private files

## ObjectURL Cleanup

Bug fix while we're here: `room.tsx:681` doesn't revoke ObjectURLs when `setPendingFiles([])` clears all. Add cleanup before reset.
