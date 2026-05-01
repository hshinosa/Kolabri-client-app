import { expect, Page, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

async function openStudentGroupChat(page: Page): Promise<boolean> {
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

    const sessionLink = page.getByRole('link', { name: /masuk diskusi|tetapkan tujuan/i }).first();
    const hasSessionLink = await sessionLink.isVisible().catch(() => false);
    if (!hasSessionLink) return false;

    await sessionLink.click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/goal')) {
        await page.locator('textarea#content, textarea').first().fill('Menganalisis alur diskusi kelompok untuk menyusun solusi yang lebih terarah pada sesi ini.');
        await page.getByRole('button', { name: /tetapkan tujuan/i }).click();
        await page.waitForLoadState('networkidle');
    }

    return page.url().includes('/chat/');
}

test.describe('Student group chat', () => {
    test.beforeEach(async ({ page }) => {
        const available = await checkServiceAvailable(page, 'http://localhost:8000');
        if (!available) {
            test.skip();
            return;
        }
    });

    test('should show group chat and allow message form submission', async ({ page }) => {
        const loggedIn = await loginAs(page, TEST_CREDENTIALS.student.email, TEST_CREDENTIALS.student.password);
        if (!loggedIn) {
            test.skip();
            return;
        }

        const opened = await openStudentGroupChat(page);
        if (!opened) {
            test.skip(true, 'Student group chat requires an enrolled course with a discussion session');
        }

        await expect(page.locator('h1, h2, [data-testid="page-title"]').filter({ hasText: /diskusi|tujuan pembelajaran/i }).first()).toBeVisible();
        await expect(page.locator('text=/kirim|membalas|tetapkan tujuan pembelajaran anda|sesi ini telah ditutup/i').first()).toBeVisible();

        const messageInput = page.locator('input[type="text"]').filter({ hasNot: page.locator('[placeholder*="Search"]') }).last();
        await expect(messageInput).toBeVisible();

        const sendButton = page.getByRole('button', { name: /kirim/i }).last();
        await expect(sendButton).toBeVisible();

        const isClosed = await page.locator('text=/sesi ini telah ditutup|isi refleksi/i').first().isVisible().catch(() => false);
        if (isClosed) {
            await expect(sendButton).toBeDisabled();
            test.skip(true, 'Current chat session is closed, message submission is not available');
        }

        await messageInput.fill('Pesan e2e mahasiswa untuk memastikan form diskusi grup dapat digunakan.');
        await expect(sendButton).toBeEnabled();
        await sendButton.click();
        await page.waitForTimeout(1000);

        await expect(messageInput).toHaveValue('');
    });
});
