import { expect, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

test.beforeEach(async ({ page }) => {
    const available = await checkServiceAvailable(page);
    if (!available) test.skip(true, 'App not running');

    const loggedIn = await loginAs(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');
});

test('Dashboard loads with stats/charts', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
});

test('Navigation sidebar visible', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await expect(page.getByRole('link', { name: /dashboard/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /master data/i }).first()).toBeVisible();
});

test('Can navigate to user management', async ({ page }) => {
    await page.goto('/admin/dashboard');
    const link = page.locator('a[href*="/admin/users"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/users/);
});

test('Can navigate to master data', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.getByRole('link', { name: /master data/i }).first().click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/admin\/master-data/);
});

test('Can navigate to audit log', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.getByRole('link', { name: /audit/i }).first().click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/admin\/audit/);
});

test('Can navigate to AI settings', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.getByRole('link', { name: /ai setting/i }).first().click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/admin\/ai-settings/);
});
