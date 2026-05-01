import { expect, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

test.beforeEach(async ({ page }) => {
    const available = await checkServiceAvailable(page);
    if (!available) test.skip(true, 'App not running');

    const loggedIn = await loginAs(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');
});

test('AI settings page loads', async ({ page }) => {
    await page.goto('/admin/ai-settings');

    await expect(page).toHaveURL(/\/admin\/ai-settings$/);
    await expect(page.getByRole('heading', { name: /ai settings/i })).toBeVisible();
});

test('Provider list displayed', async ({ page }) => {
    await page.goto('/admin/ai-settings');

    await expect(page.getByText(/provider list/i)).toBeVisible();
    await expect(page.locator('text=/total providers|active provider|model:/i').first()).toBeVisible();
});

test('Add provider button exists', async ({ page }) => {
    await page.goto('/admin/ai-settings');

    await expect(page.getByRole('button', { name: /add provider/i })).toBeVisible();
});

test('AI comparison page accessible', async ({ page }) => {
    await page.goto('/admin/ai-comparison');

    await expect(page).toHaveURL(/\/admin\/ai-comparison$/);
    await expect(page.getByRole('heading', { name: /ai comparison tool/i })).toBeVisible();
});
