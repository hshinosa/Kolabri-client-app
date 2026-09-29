## 1. Pre-flight

- [x] 1.1 Inventory `<img src=` uses with attachment.url: `grep -rn "attachment.url" resources/js/pages`
- [x] 1.2 Decide allowlist policy with team (or leave empty by default)

## 2. Helper module

- [x] 2.1 Create `resources/js/lib/attachment-url.ts`
- [x] 2.2 `isAllowedAttachmentUrl(url)` and `safeAttachmentUrl(url)` exports
- [x] 2.3 Read `VITE_ATTACHMENT_ALLOWED_ORIGINS` env var

## 3. Apply to chat pages

- [x] 3.1 chat/room.tsx — replace `attachment.url` with `safeAttachmentUrl(attachment.url)` in `<img src>` and `<a href>` for downloads
- [x] 3.2 chat/index.tsx — same
- [x] 3.3 Add `onError` fallback to placeholder

## 4. Placeholder asset

- [x] 4.1 Add `public/images/attachment-blocked.svg` (simple "blocked" icon)
- [x] 4.2 Verify Vite serves from public/

## 5. Tests

- [x] 5.1 Unit tests for helper (6+ scenarios)
- [x] 5.2 Component test verifying blocked URL renders placeholder

## 6. Documentation

- [x] 6.1 Document `VITE_ATTACHMENT_ALLOWED_ORIGINS` in `.env.example`
- [x] 6.2 Add note in security docs

## 7. Verify

- [x] 7.1 All tests passing
- [x] 7.2 Manual: attachment with `javascript:` URL → placeholder
- [x] 7.3 `openspec validate client-app-attachment-url-allowlist --strict`
