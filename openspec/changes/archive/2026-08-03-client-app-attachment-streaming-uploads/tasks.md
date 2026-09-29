## 1. Pre-flight

- [x] 1.1 Run baseline: `npm run test`, e2e
- [x] 1.2 Read `pages/student/chat/room.tsx:647` upload logic
- [x] 1.3 Verify Core API has `/api/upload` endpoint or coordinate to add

## 2. Add Laravel upload route

- [x] 2.1 `routes/web.php` — add `POST /api/upload` (auth.jwt group)
- [x] 2.2 `app/Http/Controllers/UploadController.php` (new)
- [x] 2.3 Validate file size (max 10MB) + MIME type whitelist
- [x] 2.4 Forward to Core API via apiRequest

## 3. Frontend upload helper

- [x] 3.1 Create `resources/js/lib/uploadAttachments.ts`
- [x] 3.2 Use XMLHttpRequest for progress events
- [x] 3.3 Handle errors with retry option

## 4. Refactor chat/room.tsx

- [x] 4.1 Replace FileReader/base64 with `uploadAttachments(...)`
- [x] 4.2 Show progress UI per file
- [x] 4.3 Disable send button during upload
- [x] 4.4 Emit `send_message` with metadata-only attachments

## 5. Fix ObjectURL leak

- [x] 5.1 Before `setPendingFiles([])`, iterate and `URL.revokeObjectURL(f.previewUrl)`
- [x] 5.2 Same on component unmount

## 6. Tests

- [x] 6.1 Unit: uploadAttachments handles success/error
- [x] 6.2 E2E: send file in chat, verify <10MB constraint, verify file appears for other user

## 7. Verify

- [x] 7.1 `npm run test`, `vendor/bin/phpunit`, e2e passing
- [x] 7.2 Manual: send 5MB image, verify Socket.IO frame stays small
- [x] 7.3 `openspec validate client-app-attachment-streaming-uploads --strict`
