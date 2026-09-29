# Design

## Helper

```typescript
// resources/js/lib/attachment-url.ts
const FALLBACK_PLACEHOLDER = '/images/attachment-blocked.svg';

function getAllowedOrigins(): Set<string> {
    const raw = import.meta.env.VITE_ATTACHMENT_ALLOWED_ORIGINS as string | undefined;
    if (!raw) return new Set();
    return new Set(raw.split(',').map((o) => o.trim()).filter(Boolean));
}

export function isAllowedAttachmentUrl(rawUrl: string): boolean {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return false;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
        return false;
    }
    const allowed = getAllowedOrigins();
    if (allowed.size > 0 && !allowed.has(url.origin)) {
        return false;
    }
    return true;
}

export function safeAttachmentUrl(rawUrl: string): string {
    return isAllowedAttachmentUrl(rawUrl) ? rawUrl : FALLBACK_PLACEHOLDER;
}
```

## Application

```typescript
// chat/room.tsx, chat/index.tsx
import { safeAttachmentUrl } from '@/lib/attachment-url';

<img
    src={safeAttachmentUrl(attachment.url)}
    alt={attachment.name}
    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_PLACEHOLDER; }}
/>
```

## Configuration

```env
# .env.example
# Comma-separated list of allowed origins for chat attachment URLs.
# Leave empty to allow any HTTPS origin (still scheme-validated).
VITE_ATTACHMENT_ALLOWED_ORIGINS=https://core-api.example.com,https://uploads.example.com
```

## Tests

```typescript
// resources/js/lib/attachment-url.test.ts
test('rejects javascript: scheme', () => { ... });
test('rejects data: scheme', () => { ... });
test('rejects http on non-localhost', () => { ... });
test('allows https on any origin when allowlist empty', () => { ... });
test('rejects https on non-allowlisted origin when set', () => { ... });
test('returns placeholder for blocked URL', () => { ... });
```
