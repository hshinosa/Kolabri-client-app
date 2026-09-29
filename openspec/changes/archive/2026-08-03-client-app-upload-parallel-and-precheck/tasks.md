## 1. Pre-flight

- [x] 1.1 Run baseline tests
- [x] 1.2 Verify server-side limits in ChatUploadController (10MB + MIME list)

## 2. Add validateFile helper

- [x] 2.1 `validateFile(file)` returning Result<{ok}|{ok,reason}>
- [x] 2.2 Constants `MAX_FILE_SIZE`, `MAX_PARALLEL`, `ALLOWED_MIME_TYPES`
- [x] 2.3 Sync MIME list with server's mimes validator

## 3. Add concurrency pool

- [x] 3.1 `withConcurrency` helper (or use p-limit if installed)
- [x] 3.2 Extract single-file upload to `uploadOne(file, onProgress)`

## 4. Update uploadAttachments

- [x] 4.1 Run pre-check before any upload starts
- [x] 4.2 Replace `for...of` with `withConcurrency(files, 3, uploadOne)`
- [x] 4.3 Throw early with reason if pre-check fails

## 5. Surface errors in pages

- [x] 5.1 chat/room.tsx + chat/index.tsx — catch upload errors, show toast/banner
- [x] 5.2 Error message should include file name + reason

## 6. Tests

- [x] 6.1 Oversized file rejected before upload
- [x] 6.2 Empty file rejected
- [x] 6.3 Disallowed MIME type rejected
- [x] 6.4 Parallel pool: max 3 concurrent
- [x] 6.5 Progress callback fires per file

## 7. Verify

- [x] 7.1 `npx vitest run` passing
- [x] 7.2 Manual: select 5 files of varying sizes, verify upload completes in less time than sequential
- [x] 7.3 `openspec validate client-app-upload-parallel-and-precheck --strict`
