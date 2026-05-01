import axios from 'axios';

let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

export async function getAuthToken(): Promise<string> {
    if (cachedToken) {
        return cachedToken;
    }

    if (tokenPromise) {
        return tokenPromise;
    }

    tokenPromise = (async () => {
        try {
            const response = await axios.get<{ data: { token: string } }>('/api/auth/token');
            cachedToken = response.data.data.token;
            return cachedToken;
        } catch (error) {
            console.error('Failed to fetch auth token:', error);
            throw new Error('Authentication failed');
        } finally {
            tokenPromise = null;
        }
    })();

    return tokenPromise;
}

export function clearCachedToken() {
    cachedToken = null;
}
