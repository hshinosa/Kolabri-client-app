# Attachment Upload via HTTP, Not Socket.IO Base64

## Problem Statement

`pages/student/chat/room.tsx:647` reads file attachments to base64 strings and emits them inside `send_message` Socket.IO payload. Issues:

1. **Payload bloat**: 5MB image becomes ~6.7MB base64 string in JSON. Multiplied across multiple files.
2. **Memory pressure**: client and server hold full base64 in memory; no streaming.
3. **Socket.IO blocking**: large frames serialize on event loop, stalling realtime messages for other users in the room.
4. **No upload progress**: user sees nothing until full upload completes; on slow connection appears frozen.
5. **Bypass standard upload limits**: Laravel's `upload_max_filesize` (often 10MB) doesn't apply to Socket.IO frames.
6. **Cannot resume**: failed upload requires full retry.

## Proposed Solution

Use HTTP upload + reference pattern:

1. Frontend POSTs file to Laravel `/api/upload` endpoint
2. Laravel proxies to Core API or stores via S3/local
3. Returns `{ id, url, size, mime_type }` metadata
4. Frontend emits `send_message` with attachment **metadata** (not base64)
5. Other clients receive metadata, fetch file via HTTP

## Scope

- `routes/web.php` — add `/api/upload` route
- `app/Http/Controllers/UploadController.php` (new) — proxy upload
- Core API `/api/upload` handler (separate change in core-api repo if needed)
- `resources/js/pages/student/chat/room.tsx` — replace base64 with HTTP upload
- Upload progress UI

## Out of Scope

- File storage backend choice (S3 vs local — covered elsewhere)
- Image processing/resizing
- Resumable uploads (Tus protocol)
