import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
const mockAxiosCall = vi.hoisted(() => vi.fn());
const requestUse = vi.hoisted(() => vi.fn());
const responseUse = vi.hoisted(() => vi.fn());
const isAxiosError = vi.hoisted(() => vi.fn());

vi.mock('axios', () => {
    const axios = Object.assign(mockAxiosCall, {
        post: mockPost,
        isAxiosError,
        interceptors: {
            request: { use: requestUse },
            response: { use: responseUse },
        },
    });

    return { default: axios };
});

import { authStorage, logout, refreshAccessToken, setupAxiosInterceptors } from '@/lib/auth';

function createStorageMock() {
    let store = new Map<string, string>();

    return {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
            store.delete(key);
        }),
        clear: vi.fn(() => {
            store = new Map<string, string>();
        }),
    };
}

const storageMock = createStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
    value: storageMock,
    configurable: true,
});

describe('authStorage', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('stores access token, refresh token, and expiry time', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1_000);

        authStorage.setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });

        expect(localStorage.getItem('kolabri_access_token')).toBe('access-1');
        expect(localStorage.getItem('kolabri_refresh_token')).toBe('refresh-1');
        expect(localStorage.getItem('kolabri_token_expiry')).toBe(String(1_000 + 14 * 60 * 1000));
    });

    it('reads back stored tokens and expiry', () => {
        localStorage.setItem('kolabri_access_token', 'access-2');
        localStorage.setItem('kolabri_refresh_token', 'refresh-2');
        localStorage.setItem('kolabri_token_expiry', '12345');

        expect(authStorage.getAccessToken()).toBe('access-2');
        expect(authStorage.getRefreshToken()).toBe('refresh-2');
        expect(authStorage.getTokenExpiry()).toBe(12345);
    });

    it('clears all auth tokens', () => {
        authStorage.setTokens({ accessToken: 'access-3', refreshToken: 'refresh-3' });

        authStorage.clearTokens();

        expect(authStorage.getAccessToken()).toBeNull();
        expect(authStorage.getRefreshToken()).toBeNull();
        expect(authStorage.getTokenExpiry()).toBeNull();
    });

    it('treats a missing expiry as expiring soon', () => {
        expect(authStorage.isTokenExpiringSoon()).toBe(true);
    });

    it('returns true when less than two minutes remain', () => {
        vi.spyOn(Date, 'now').mockReturnValue(10_000);
        localStorage.setItem('kolabri_token_expiry', String(10_000 + 119_000));

        expect(authStorage.isTokenExpiringSoon()).toBe(true);
    });

    it('returns false when more than two minutes remain', () => {
        vi.spyOn(Date, 'now').mockReturnValue(10_000);
        localStorage.setItem('kolabri_token_expiry', String(10_000 + 121_000));

        expect(authStorage.isTokenExpiringSoon()).toBe(false);
    });
});

describe('refreshAccessToken', () => {
    beforeEach(() => {
        localStorage.clear();
        mockPost.mockReset();
        mockAxiosCall.mockReset();
        requestUse.mockReset();
        responseUse.mockReset();
    });

    it('refreshes the token and stores the new access token', async () => {
        localStorage.setItem('kolabri_refresh_token', 'refresh-abc');
        mockPost.mockResolvedValue({
            data: {
                data: {
                    accessToken: 'new-access',
                    refreshToken: 'server-refresh-token-is-ignored',
                    user: { id: '1', name: 'Test', email: 'a@b.c', role: 'student' },
                },
            },
        });

        await expect(refreshAccessToken()).resolves.toBe('new-access');

        expect(mockPost).toHaveBeenCalledWith(
            'http://127.0.0.1:3000/api/auth/refresh',
            { refreshToken: 'refresh-abc' },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
        expect(authStorage.getAccessToken()).toBe('new-access');
        expect(authStorage.getRefreshToken()).toBe('refresh-abc');
    });

    it('returns the same token to concurrent callers while a refresh is already in progress', async () => {
        localStorage.setItem('kolabri_refresh_token', 'refresh-xyz');

        let resolveRefresh: ((value: unknown) => void) | undefined;
        mockPost.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveRefresh = resolve;
                }),
        );

        const firstCall = refreshAccessToken();
        const secondCall = refreshAccessToken();

        resolveRefresh?.({
            data: {
                data: {
                    accessToken: 'shared-token',
                    refreshToken: 'unused',
                    user: { id: '1', name: 'Test', email: 'a@b.c', role: 'student' },
                },
            },
        });

        await expect(firstCall).resolves.toBe('shared-token');
        await expect(secondCall).resolves.toBe('shared-token');
        expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('clears tokens and redirects to login when refresh fails', async () => {
        localStorage.setItem('kolabri_access_token', 'old-access');
        localStorage.setItem('kolabri_refresh_token', 'refresh-fail');
        localStorage.setItem('kolabri_token_expiry', '123');
        mockPost.mockRejectedValue(new Error('refresh failed'));

        await expect(refreshAccessToken()).resolves.toBeNull();

        expect(authStorage.getAccessToken()).toBeNull();
        expect(authStorage.getRefreshToken()).toBeNull();
    });
});

describe('logout', () => {
    beforeEach(() => {
        localStorage.clear();
        mockPost.mockReset();
    });

    it('calls the logout endpoint when a refresh token exists and clears storage', async () => {
        authStorage.setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
        mockPost.mockResolvedValue({});

        await logout();

        expect(mockPost).toHaveBeenCalledWith(
            'http://127.0.0.1:3000/api/auth/logout',
            { refreshToken: 'refresh-1' },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
        expect(authStorage.getAccessToken()).toBeNull();
        expect(authStorage.getRefreshToken()).toBeNull();
    });

    it('still clears storage when the logout request fails', async () => {
        authStorage.setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' });
        mockPost.mockRejectedValue(new Error('logout failed'));
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await logout();

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(authStorage.getAccessToken()).toBeNull();
        expect(authStorage.getRefreshToken()).toBeNull();
    });
});

describe('setupAxiosInterceptors', () => {
    beforeEach(() => {
        localStorage.clear();
        mockPost.mockReset();
        mockAxiosCall.mockReset();
        requestUse.mockReset();
        responseUse.mockReset();
    });

    it('registers request and response interceptors', () => {
        setupAxiosInterceptors();

        expect(requestUse).toHaveBeenCalledTimes(1);
        expect(responseUse).toHaveBeenCalledTimes(1);
    });

    it('adds the current token to outgoing requests', async () => {
        authStorage.setTokens({ accessToken: 'bearer-token', refreshToken: 'refresh' });
        vi.spyOn(authStorage, 'isTokenExpiringSoon').mockReturnValue(false);

        setupAxiosInterceptors();
        const requestHandler = requestUse.mock.calls[0]?.[0] as (config: { headers: Record<string, string> }) => Promise<{ headers: Record<string, string> }>;
        const config = await requestHandler({ headers: {} });

        expect(config.headers.Authorization).toBe('Bearer bearer-token');
    });

    it('refreshes the token before a request when the current one is expiring soon', async () => {
        authStorage.setTokens({ accessToken: 'old-token', refreshToken: 'refresh' });
        vi.spyOn(authStorage, 'isTokenExpiringSoon').mockReturnValue(true);
        mockPost.mockResolvedValue({
            data: {
                data: {
                    accessToken: 'fresh-token',
                    refreshToken: 'ignored',
                    user: { id: '1', name: 'Test', email: 'a@b.c', role: 'student' },
                },
            },
        });

        setupAxiosInterceptors();
        const requestHandler = requestUse.mock.calls[0]?.[0] as (config: { headers: Record<string, string> }) => Promise<{ headers: Record<string, string> }>;
        const config = await requestHandler({ headers: {} });

        expect(config.headers.Authorization).toBe('Bearer fresh-token');
    });

    it('retries a 401 response once with a refreshed token', async () => {
        authStorage.setTokens({ accessToken: 'old-token', refreshToken: 'refresh-401' });
        mockPost.mockResolvedValue({
            data: {
                data: {
                    accessToken: 'retry-token',
                    refreshToken: 'ignored',
                    user: { id: '1', name: 'Test', email: 'a@b.c', role: 'student' },
                },
            },
        });
        mockAxiosCall.mockResolvedValue({ data: 'ok' });

        setupAxiosInterceptors();
        const responseErrorHandler = responseUse.mock.calls[0]?.[1] as (error: {
            response?: { status: number };
            config: { _retry?: boolean; headers: Record<string, string> };
        }) => Promise<unknown>;

        const originalRequest: { _retry?: boolean; headers: Record<string, string> } = { headers: {} };
        const result = await responseErrorHandler({ response: { status: 401 }, config: originalRequest });

        expect(originalRequest._retry).toBe(true);
        expect(originalRequest.headers.Authorization).toBe('Bearer retry-token');
        expect(mockAxiosCall).toHaveBeenCalledWith(originalRequest);
        expect(result).toEqual({ data: 'ok' });
    });

    it('rejects response errors that are not retryable', async () => {
        setupAxiosInterceptors();
        const responseErrorHandler = responseUse.mock.calls[0]?.[1] as (error: { response?: { status: number }; config: { headers: Record<string, string> } }) => Promise<unknown>;
        const error = { response: { status: 500 }, config: { headers: {} } };

        await expect(responseErrorHandler(error)).rejects.toBe(error);
    });
});
