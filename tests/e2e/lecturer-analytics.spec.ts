import { expect, Page, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

async function openLecturerAnalytics(page: Page): Promise<boolean> {
    await page.goto('/lecturer/courses');
    await page.waitForLoadState('networkidle');

    const courseLink = page.locator('a[href*="/lecturer/courses/"]').filter({ hasNot: page.locator('[href$="/lecturer/courses"]') }).first();
    const hasCourse = await courseLink.isVisible().catch(() => false);
    if (!hasCourse) return false;

    await courseLink.click();
    await page.waitForLoadState('networkidle');

    const analyticsLink = page.getByRole('link', { name: /^analytics$/i }).first();
    const hasAnalyticsLink = await analyticsLink.isVisible().catch(() => false);
    if (!hasAnalyticsLink) return false;

    await analyticsLink.click();
    await page.waitForLoadState('networkidle');
    return /\/lecturer\/courses\/.*\/analytics$/.test(page.url());
}

test.describe('Lecturer analytics detail', () => {
    test.beforeEach(async ({ page }) => {
        const available = await checkServiceAvailable(page, 'http://localhost:8000');
        if (!available) {
            test.skip();
            return;
        }
    });

    test('should open analytics page, group detail, and show metrics', async ({ page }) => {
        const loggedIn = await loginAs(page, TEST_CREDENTIALS.lecturer.email, TEST_CREDENTIALS.lecturer.password);
        if (!loggedIn) {
            test.skip();
            return;
        }

        const opened = await openLecturerAnalytics(page);
        if (!opened) {
            test.skip(true, 'Lecturer analytics requires at least one accessible course');
        }

        await expect(page.locator('h1, h2, [data-testid="page-title"]').filter({ hasText: /monitoring kualitas diskusi|analisis grup per tim/i }).first()).toBeVisible();
        await expect(page.locator('table, text=/belum ada data analytics grup|grup|skor kualitas/i').first()).toBeVisible();

        const detailLink = page.getByRole('link', { name: /detail|buka detail/i }).first();
        const hasDetail = await detailLink.isVisible().catch(() => false);
        if (!hasDetail) {
            test.skip(true, 'Analytics detail requires at least one group row');
        }

        await detailLink.click();
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1, h2, [data-testid="page-title"]').filter({ hasText: /detail kualitas diskusi/i }).first()).toBeVisible();
        await expect(page.locator('text=/skor kualitas diskusi|hot thinking|lexical variety|distribusi engagement|total pesan/i').first()).toBeVisible();
    });
});
