import { expect, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

test.describe('Admin audit log', () => {
    test.beforeEach(async ({ page }) => {
        const available = await checkServiceAvailable(page, 'http://localhost:8000');
        if (!available) {
            test.skip();
            return;
        }
    });

    test('should show audit log table, filter, and pagination controls', async ({ page }) => {
        const loggedIn = await loginAs(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
        if (!loggedIn) {
            test.skip();
            return;
        }

        await page.goto('/admin/audit-log');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1, h2, [data-testid="page-title"]').filter({ hasText: /audit log/i }).first()).toBeVisible();
        await expect(page.locator('table').first()).toBeVisible();
        await expect(page.locator('tbody tr, text=/no audit logs found/i').first()).toBeVisible();

        const actionFilter = page.locator('select').first();
        await expect(actionFilter).toBeVisible();
        await actionFilter.selectOption('CREATE');
        await page.getByRole('button', { name: /apply filters/i }).click();
        await page.waitForLoadState('networkidle');

        await expect(actionFilter).toHaveValue('CREATE');
        await expect(page.locator('text=/showing .* of .* logs/i').first()).toBeVisible();

        const nextButton = page.getByRole('button', { name: /^next$/i });
        const previousButton = page.getByRole('button', { name: /^previous$/i });
        await expect(nextButton).toBeVisible();
        await expect(previousButton).toBeVisible();

        if (await nextButton.isEnabled()) {
            const beforeSummary = await page.locator('text=/showing .* of .* logs/i').first().textContent();
            await nextButton.click();
            await page.waitForLoadState('networkidle');
            await expect(page.locator('text=/showing .* of .* logs/i').first()).not.toHaveText(beforeSummary || '');
        }
    });
});
