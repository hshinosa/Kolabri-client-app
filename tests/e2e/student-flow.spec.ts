import { expect, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

test.beforeEach(async ({ page }) => {
    const available = await checkServiceAvailable(page);
    if (!available) test.skip(true, 'App not running');
});

test('Student lands on /student/courses after login', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.student.email, TEST_CREDENTIALS.student.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await expect(page).toHaveURL(/\/student\/courses$/);
});

test('Courses page shows content', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.student.email, TEST_CREDENTIALS.student.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await page.goto('/student/courses');
    await expect(page.getByRole('heading', { name: /mata kuliah saya/i })).toBeVisible();
    await expect(page.locator('text=/gabung mata kuliah|belum ada mata kuliah|lihat mata kuliah/i').first()).toBeVisible();
});

test('AI chat page loads', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.student.email, TEST_CREDENTIALS.student.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await page.goto('/student/ai-chat');
    await expect(page).toHaveURL(/\/student\/ai-chat/);
    await expect(page.locator('text=/mulai cepat|kolaborasi ai|perencanaan|chat dengan ai/i').first()).toBeVisible();
});

test('AI chat has message input', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.student.email, TEST_CREDENTIALS.student.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await page.goto('/student/ai-chat');
    await expect(page.locator('textarea').first()).toBeVisible();
});

test('Reflections page loads', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.student.email, TEST_CREDENTIALS.student.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await page.goto('/student/reflections');
    await expect(page).toHaveURL(/\/student\/reflections$/);
    await expect(page.getByRole('heading', { name: /refleksi saya/i })).toBeVisible();
});
