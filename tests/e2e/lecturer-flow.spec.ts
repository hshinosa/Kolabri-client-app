import { expect, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

test.beforeEach(async ({ page }) => {
    const available = await checkServiceAvailable(page);
    if (!available) test.skip(true, 'App not running');
});

test('Lecturer lands on /lecturer/courses after login', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.lecturer.email, TEST_CREDENTIALS.lecturer.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await expect(page).toHaveURL(/\/lecturer\/courses$/);
});

test('Courses page shows list', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.lecturer.email, TEST_CREDENTIALS.lecturer.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await page.goto('/lecturer/courses');
    await expect(page.getByRole('heading', { name: /kelas saya/i })).toBeVisible();
    await expect(page.locator('text=/belum ada kelas|lihat detail|grup|siswa/i').first()).toBeVisible();
});

test('Create course button visible', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.lecturer.email, TEST_CREDENTIALS.lecturer.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await page.goto('/lecturer/courses');
    await expect(page.getByRole('link', { name: /buat kelas/i }).first()).toBeVisible();
});

test('Create course page loads', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.lecturer.email, TEST_CREDENTIALS.lecturer.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await page.goto('/lecturer/courses/create');
    await expect(page).toHaveURL(/\/lecturer\/courses\/create$/);
    await expect(page.getByRole('heading', { name: /buat kelas baru/i })).toBeVisible();
    await expect(page.locator('#code')).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
});
