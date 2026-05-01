import { Page, test } from '@playwright/test';

export async function checkServiceAvailable(page: Page, url?: string): Promise<boolean> {
    try {
        const checkUrl = url || '/login';
        const response = await page.request.get(checkUrl);
        return response.status() !== 502 && response.status() !== 503;
    } catch {
        return false;
    }
}

export const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8001';
export const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:3000';
export const AI_ENGINE_SECRET = process.env.AI_ENGINE_SECRET || 'shared-secret-key';

export async function loginAs(
    page: Page,
    email: string,
    password: string,
): Promise<boolean> {
    try {
        await page.goto('/login', { timeout: 5000 });
    } catch {
        return false;
    }

    await page.fill('#email', email);
    await page.fill('#password', password);

    const [response] = await Promise.all([
        page.waitForResponse((resp) => resp.url().includes('/login') && resp.request().method() === 'POST'),
        page.getByRole('button', { name: /^masuk$/i }).click(),
    ]);

    await page.waitForLoadState('networkidle');

    const status = response.status();
    const location = response.headers()['location'] || '';
    const loginSucceeded = (status === 302 || status === 303) && !location.endsWith('/login');

    if (loginSucceeded && page.url().includes('/login')) {
        const targetPath = location.replace(/https?:\/\/[^/]+/, '');
        await page.goto(targetPath || '/dashboard');
        await page.waitForLoadState('networkidle');
    }

    return !page.url().includes('/login');
}

export function skipIfNotRunning(condition: boolean) {
    if (!condition) {
        test.skip(true, 'Backend services not running - skipping');
    }
}

export const TEST_CREDENTIALS = {
    admin: {
        email: process.env.TEST_ADMIN_EMAIL || 'admin@kolabri.test',
        password: process.env.TEST_ADMIN_PASSWORD || 'password123',
    },
    lecturer: {
        email: process.env.TEST_LECTURER_EMAIL || 'lecturer@kolabri.test',
        password: process.env.TEST_LECTURER_PASSWORD || 'password123',
    },
    student: {
        email: process.env.TEST_STUDENT_EMAIL || 'student@kolabri.test',
        password: process.env.TEST_STUDENT_PASSWORD || 'password123',
    },
};
