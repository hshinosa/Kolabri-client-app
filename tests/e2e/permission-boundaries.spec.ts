import { expect, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

test.describe('Permission boundaries', () => {
    test.beforeEach(async ({ page }) => {
        const available = await checkServiceAvailable(page, 'http://localhost:8000');
        if (!available) {
            test.skip();
            return;
        }
    });

    test('student should be redirected away from admin routes', async ({ page }) => {
        const loggedIn = await loginAs(page, TEST_CREDENTIALS.student.email, TEST_CREDENTIALS.student.password);
        if (!loggedIn) {
            test.skip();
            return;
        }

        await page.goto('/admin/dashboard');
        await page.waitForLoadState('networkidle');

        await expect(page).not.toHaveURL(/\/admin\//);
        await expect(page).toHaveURL(/\/student\/courses$/);
    });

    test('student should be redirected away from lecturer routes', async ({ page }) => {
        const loggedIn = await loginAs(page, TEST_CREDENTIALS.student.email, TEST_CREDENTIALS.student.password);
        if (!loggedIn) {
            test.skip();
            return;
        }

        await page.goto('/lecturer/courses');
        await page.waitForLoadState('networkidle');

        await expect(page).not.toHaveURL(/\/lecturer\//);
        await expect(page).toHaveURL(/\/student\/courses$/);
    });

    test('lecturer should be redirected away from admin routes', async ({ page }) => {
        const loggedIn = await loginAs(page, TEST_CREDENTIALS.lecturer.email, TEST_CREDENTIALS.lecturer.password);
        if (!loggedIn) {
            test.skip();
            return;
        }

        await page.goto('/admin/dashboard');
        await page.waitForLoadState('networkidle');

        await expect(page).not.toHaveURL(/\/admin\//);
        await expect(page).toHaveURL(/\/lecturer\/courses$/);
    });

    test('unauthenticated user should be redirected to login', async ({ page }) => {
        await page.goto('/admin/dashboard');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('button', { name: /^masuk$/i })).toBeVisible();
    });
});
