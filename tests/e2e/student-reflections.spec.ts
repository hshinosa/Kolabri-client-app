import { expect, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

test.describe('Student reflections', () => {
    test.beforeEach(async ({ page }) => {
        const available = await checkServiceAvailable(page, 'http://localhost:8000');
        if (!available) {
            test.skip();
            return;
        }
    });

    test('should show reflections list, open create form, and submit reflection', async ({ page }) => {
        const loggedIn = await loginAs(page, TEST_CREDENTIALS.student.email, TEST_CREDENTIALS.student.password);
        if (!loggedIn) {
            test.skip();
            return;
        }

        await page.goto('/student/reflections');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1, h2, [data-testid="page-title"]').filter({ hasText: /refleksi saya/i }).first()).toBeVisible();
        await expect(page.locator('text=/belum ada refleksi|refleksi sesi|refleksi mingguan|tentang refleksi/i').first()).toBeVisible();

        const openFormButton = page.getByRole('button', { name: /tulis refleksi mingguan|refleksi mingguan/i }).first();
        await expect(openFormButton).toBeVisible();
        await openFormButton.click();

        await expect(page.getByRole('heading', { name: /refleksi mingguan baru/i })).toBeVisible();
        await expect(page.locator('#course_id')).toBeVisible();
        await expect(page.locator('#content')).toBeVisible();

        const courseOptions = page.locator('#course_id option');
        const optionCount = await courseOptions.count();
        if (optionCount < 2) {
            test.skip(true, 'Student reflections submission requires at least one available course option');
        }

        await page.locator('#course_id').selectOption({ index: 1 });
        await page.locator('#content').fill('Minggu ini saya memahami materi lebih baik melalui diskusi tim dan saya ingin memperdalam konsep yang masih membingungkan pada pertemuan berikutnya.');

        const submitPromise = Promise.race([
            page.waitForResponse((response) => response.url().includes('/student/reflections') && response.request().method() === 'POST', { timeout: 5000 }).catch(() => null),
            page.waitForLoadState('networkidle').then(() => null),
        ]);

        await page.getByRole('button', { name: /simpan refleksi|menyimpan/i }).click();
        await submitPromise;
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: /refleksi mingguan baru/i })).toHaveCount(0);
        await expect(page.locator('text=/refleksi saya|refleksi mingguan|refleksi sesi/i').first()).toBeVisible();
    });
});
