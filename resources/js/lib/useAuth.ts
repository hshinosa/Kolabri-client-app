import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { authStorage, refreshAccessToken, logout as authLogout } from './auth';

export function useAuth() {
    useEffect(() => {
        const interval = setInterval(() => {
            if (authStorage.isTokenExpiringSoon()) {
                refreshAccessToken();
            }
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    const logout = async () => {
        await authLogout();
        router.visit('/login');
    };

    return {
        logout,
        getAccessToken: authStorage.getAccessToken,
        getRefreshToken: authStorage.getRefreshToken,
    };
}
