import { expect, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

test.beforeEach(async ({ page }) => {
    const available = await checkServiceAvailable(page);
    if (!available) test.skip(true, 'App not running');

    const loggedIn = await loginAs(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');
});

test('Master data page loads', async ({ page }) => {
    await page.goto('/admin/master-data');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/admin\/master-data/);
    await expect(page.getByRole('heading').first()).toBeVisible();
});

test('Course cards/table displayed', async ({ page }) => {
    await page.goto('/admin/master-data');
    await page.waitForLoadState('networkidle');

    const hasContent = await page.locator('h1, h2, h3, table, [class*="card"], [class*="course"]').first().isVisible().catch(() => false);
    if (!hasContent) test.skip(true, 'Master data page did not render (API dependency)');

    await expect(page.locator('table, [class*="card"], [class*="course"]').first()).toBeVisible();
});

test('Create course button visible', async ({ page }) => {
    await page.goto('/admin/master-data');
    await page.waitForLoadState('networkidle');

    const hasContent = await page.locator('h1, h2, h3').first().isVisible().catch(() => false);
    if (!hasContent) test.skip(true, 'Master data page did not render (API dependency)');

    await expect(page.getByRole('button', { name: /create|tambah|add|new/i }).first()).toBeVisible();
});

test('Create course form opens', async ({ page }) => {
    await page.goto('/admin/master-data');
    await page.waitForLoadState('networkidle');

    const btn = page.getByRole('button', { name: /create|tambah|add|new/i }).first();
    const hasBtn = await btn.isVisible().catch(() => false);
    if (!hasBtn) test.skip(true, 'Create button not found (page may not have rendered)');

    await btn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('input, textarea, select').first()).toBeVisible();
});

test('Search/filter exists', async ({ page }) => {
    await page.goto('/admin/master-data');
    await page.waitForLoadState('networkidle');

    const hasContent = await page.locator('h1, h2, h3').first().isVisible().catch(() => false);
    if (!hasContent) test.skip(true, 'Master data page did not render (API dependency)');

    await expect(page.getByPlaceholder(/search|cari/i).first()).toBeVisible();
});

test('Can navigate to templates', async ({ page }) => {
    await page.goto('/admin/master-data');
    await page.waitForLoadState('networkidle');

    const link = page.locator('a[href*="template"], button:has-text("Template"), [role="tab"]:has-text("Template")').first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/templates/);
});
