import { io } from 'socket.io-client';
import { getAuthToken } from '@/lib/getAuthToken';
import { resolveSocketUrl } from '@/lib/socket-url';

export type AdminWebSocketEvent<T = unknown> = {
    event: string;
    data: T;
};

export type AdminSocketOptions = {
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (event: Event | Error) => void;
    onMessage?: <T>(message: AdminWebSocketEvent<T>) => void;
};

/**
 * Handle for an established admin socket. The concrete transport is either the
 * native admin WebSocket (/ws) or Socket.IO — callers only ever close it.
 */
export interface AdminSocketHandle {
    close: () => void;
}

/** Give up on the native /ws handshake after this long and fall back to Socket.IO. */
const NATIVE_OPEN_TIMEOUT_MS = 4000;

function resolveWebSocketUrl(token: string): string {
    const baseUrl = resolveSocketUrl(
        (import.meta.env.VITE_WS_URL as string | undefined) ||
            (import.meta.env.VITE_API_BASE_URL as string | undefined),
    );

    const normalizedUrl = baseUrl.startsWith('http')
        ? new URL(baseUrl)
        : new URL(`http://${baseUrl}`);

    normalizedUrl.protocol = normalizedUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    normalizedUrl.pathname = '/ws';
    // core-api authenticates the native admin WS at handshake time via ?token=
    // (src/websocket/server.ts) — messages sent after open are not used for auth.
    normalizedUrl.searchParams.set('token', token);

    return normalizedUrl.toString();
}

/**
 * Attempt the native /ws connection. Resolves with an open socket, or null when
 * the endpoint is unreachable (e.g. production nginx only proxies /socket.io/,
 * so /ws answers with 404 and the handshake never completes).
 */
function openNativeWebSocket(token: string): Promise<WebSocket | null> {
    let socket: WebSocket;

    try {
        socket = new WebSocket(resolveWebSocketUrl(token));
    } catch {
        return Promise.resolve(null);
    }

    const { promise, resolve } = Promise.withResolvers<WebSocket | null>();
    let settled = false;

    const settle = (opened: WebSocket | null) => {
        if (settled) {
            return;
        }
        settled = true;
        clearTimeout(timer);
        socket.removeEventListener('open', handleOpen);
        socket.removeEventListener('error', handleUnavailable);
        socket.removeEventListener('close', handleUnavailable);
        resolve(opened);
    };

    const handleOpen = () => settle(socket);
    const handleUnavailable = () => settle(null);
    const timer = setTimeout(() => {
        socket.close();
        settle(null);
    }, NATIVE_OPEN_TIMEOUT_MS);

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('error', handleUnavailable);
    socket.addEventListener('close', handleUnavailable);

    return promise;
}

function attachNativeHandlers(socket: WebSocket, options?: AdminSocketOptions): AdminSocketHandle {
    socket.addEventListener('close', () => options?.onClose?.());
    socket.addEventListener('error', (event) => options?.onError?.(event));
    socket.addEventListener('message', (event) => {
        try {
            const payload = JSON.parse(event.data as string) as AdminWebSocketEvent;
            options?.onMessage?.(payload);
        } catch {
            // Silently ignore malformed payloads — admin WS broadcasts are best-effort
        }
    });

    options?.onOpen?.();

    return { close: () => socket.close() };
}

function connectSocketIo(token: string, options?: AdminSocketOptions): AdminSocketHandle {
    const socket = io(resolveSocketUrl(), {
        auth: { token },
        // VPS nginx mishandles Socket.IO websocket upgrades — poll instead
        // (same transport choice as useSocketRoom and the lecturer pages).
        transports: ['polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
    });

    socket.on('connect', () => options?.onOpen?.());
    socket.on('disconnect', () => options?.onClose?.());
    socket.on('connect_error', (error) => options?.onError?.(error));
    socket.onAny((event, data) => {
        options?.onMessage?.({ event, data });
    });

    return { close: () => socket.close() };
}

export async function connectWebSocket(options?: AdminSocketOptions): Promise<AdminSocketHandle> {
    const token = await getAuthToken();

    const native = await openNativeWebSocket(token);
    if (native) {
        return attachNativeHandlers(native, options);
    }

    // /ws unreachable here — go through the proxied Socket.IO endpoint instead.
    return connectSocketIo(token, options);
}
