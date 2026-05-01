import axios from 'axios';

const TOKEN_KEY = 'kolabri_access_token';
const REFRESH_TOKEN_KEY = 'kolabri_refresh_token';
const TOKEN_EXPIRY_KEY = 'kolabri_token_expiry';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000';

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    data: {
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
    };
}

export const authStorage = {
    setTokens(tokens: AuthTokens) {
        localStorage.setItem(TOKEN_KEY, tokens.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
        
        const expiryTime = Date.now() + 14 * 60 * 1000;
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    },

    getAccessToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    },

    getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },

    getTokenExpiry(): number | null {
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        return expiry ? parseInt(expiry, 10) : null;
    },

    clearTokens() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
    },

    isTokenExpiringSoon(): boolean {
        const expiry = this.getTokenExpiry();
        if (!expiry) return true;
        
        const timeUntilExpiry = expiry - Date.now();
        return timeUntilExpiry < 2 * 60 * 1000;
    },
};

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
    refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
}

export async function refreshAccessToken(): Promise<string | null> {
    if (isRefreshing) {
        return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
                resolve(token);
            });
        });
    }

    isRefreshing = true;

    try {
        const refreshToken = authStorage.getRefreshToken();
        
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await axios.post<AuthResponse>(
            `${API_BASE_URL}/api/auth/refresh`,
            { refreshToken },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const { accessToken } = response.data.data;
        
        authStorage.setTokens({
            accessToken,
            refreshToken,
        });

        onTokenRefreshed(accessToken);
        
        return accessToken;
    } catch {
        authStorage.clearTokens();
        window.location.href = '/login';
        return null;
    } finally {
        isRefreshing = false;
    }
}

export async function logout(): Promise<void> {
    const refreshToken = authStorage.getRefreshToken();
    
    if (refreshToken) {
        try {
            await axios.post(
                `${API_BASE_URL}/api/auth/logout`,
                { refreshToken },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    authStorage.clearTokens();
}

export function setupAxiosInterceptors() {
    axios.interceptors.request.use(
        async (config) => {
            let token = authStorage.getAccessToken();
            
            if (token && authStorage.isTokenExpiringSoon()) {
                token = await refreshAccessToken();
            }
            
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            
            return config;
        },
        (error) => Promise.reject(error)
    );

    axios.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;
            
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                
                const newToken = await refreshAccessToken();
                
                if (newToken) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return axios(originalRequest);
                }
            }
            
            return Promise.reject(error);
        }
    );
}
