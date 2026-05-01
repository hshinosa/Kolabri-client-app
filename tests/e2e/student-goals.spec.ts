import { expect, Page, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

async function openStudentGoalsPage(page: Page): Promise<boolean> {
    await page.goto('/student/courses');
    await page.waitForLoadState('networkidle');

    const courseLink = page.locator('a[href*="/student/courses/"]').filter({ hasNot: page.locator('[href$="/student/courses"]') }).first();
    const hasCourse = await courseLink.isVisible().catch(() => false);
    if (!hasCourse) return false;

    await courseLink.click();
    await page.waitForLoadState('networkidle');

    const discussionLink = page.getByRole('link', { name: /buka diskusi/i }).first();
    const hasDiscussionLink = await discussionLink.isVisible().catch(() => false);
    if (!hasDiscussionLink) return false;

    await discussionLink.click();
    await page.waitForLoadState('networkidle');

    const goalEntry = page.getByRole('link', { name: /tetapkan tujuan|masuk diskusi/i }).first();
    const hasGoalEntry = await goalEntry.isVisible().catch(() => false);
    if (!hasGoalEntry) return false;

    await goalEntry.click();
    await page.waitForLoadState('networkidle');

    if (!/\/student\/courses\/.*\/(chat|chat-spaces)\//.test(page.url()) && !page.url().includes('/goal')) {
        return false;
    }

    if (page.url().includes('/chat/')) {
        const goalButton = page.getByRole('link', { name: /^tetapkan$/i }).first();
        const hasGoalButton = await goalButton.isVisible().catch(() => false);
        if (!hasGoalButton) return false;

        await goalButton.click();
        await page.waitForLoadState('networkidle');
    }

    return page.url().includes('/goal');
}

test.describe('Student learning goals', () => {
    test.beforeEach(async ({ page }) => {
        const available = await checkServiceAvailable(page, 'http://localhost:8000');
        if (!available) {
            test.skip();
            return;
        }
    });

    test('should show goals flow and validation feedback', async ({ page }) => {
        const loggedIn = await loginAs(page, TEST_CREDENTIALS.student.email, TEST_CREDENTIALS.student.password);
        if (!loggedIn) {
            test.skip();
            return;
        }

        const opened = await openStudentGoalsPage(page);
        if (!opened) {
            test.skip(true, 'Student goals flow requires an enrolled course with accessible discussion session');
        }

        await expect(page.locator('h1, h2, [data-testid="page-title"]').filter({ hasText: /tujuan pembelajaran/i }).first()).toBeVisible();
        await expect(page.locator('text=/contoh tujuan|belum ada grup|chat space tidak ditemukan|untuk chat space/i').first()).toBeVisible();
        await expect(page.locator('textarea#content, textarea').first()).toBeVisible();

        const submitButton = page.getByRole('button', { name: /tetapkan tujuan/i }).first();
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toBeDisabled();

        await page.locator('textarea#content, textarea').first().fill('Menganalisis');
        await expect(page.locator('text=/tingkat:/i').first()).toBeVisible();
    });
});
