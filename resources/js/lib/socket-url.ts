/**
 * Resolve Socket.IO base URL for browser clients.
 * Production builds must not use baked localhost (common when VITE_* is set from local .env).
 */
export function resolveSocketUrl(preferred?: string): string {
    const browserOrigin =
        typeof window !== 'undefined' ? window.location.origin : undefined;
    const browserHost =
        typeof window !== 'undefined' ? window.location.hostname : undefined;
    const isBrowserLocal =
        !browserHost ||
        browserHost === 'localhost' ||
        browserHost === '127.0.0.1';

    const candidates = [
        preferred,
        import.meta.env.VITE_SOCKET_URL as string | undefined,
        import.meta.env.VITE_API_URL as string | undefined,
        browserOrigin,
    ].filter((value): value is string => Boolean(value && value.trim()));

    for (const candidate of candidates) {
        try {
            const url = new URL(candidate, browserOrigin || 'http://localhost');
            const host = url.hostname;
            const isLocalhost = host === 'localhost' || host === '127.0.0.1';
            if (isLocalhost && !isBrowserLocal) {
                continue;
            }
            return `${url.protocol}//${url.host}`;
        } catch {
            // try next candidate
        }
    }

    return browserOrigin || 'http://localhost:3000';
}
