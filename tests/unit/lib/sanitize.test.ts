import { describe, expect, it } from 'vitest';

import { sanitizeHtml } from '@/lib/sanitize';

describe('sanitizeHtml', () => {
    it('keeps allowed formatting tags', () => {
        expect(sanitizeHtml('<p><strong>Halo</strong> <em>dunia</em></p>')).toBe('<p><strong>Halo</strong> <em>dunia</em></p>');
    });

    it('removes disallowed tags such as script', () => {
        expect(sanitizeHtml('<p>Aman</p><script>alert("xss")</script>')).toBe('<p>Aman</p>');
    });

    it('removes inline event handler attributes', () => {
        expect(sanitizeHtml('<a href="https://example.com" onclick="alert(1)">Link</a>')).toBe(
            '<a href="https://example.com">Link</a>',
        );
    });

    it('keeps allowed anchor attributes', () => {
        expect(
            sanitizeHtml('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Buka</a>'),
        ).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Buka</a>');
    });

    it('removes unsupported attributes from allowed tags', () => {
        expect(sanitizeHtml('<p class="x" style="color:red">Teks</p>')).toBe('<p>Teks</p>');
    });
});
