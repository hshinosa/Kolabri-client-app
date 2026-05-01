import { expect, test } from '@playwright/test';

import { checkServiceAvailable } from './helpers';

test.beforeEach(async ({ page }) => {
    const available = await checkServiceAvailable(page);
    if (!available) test.skip(true, 'App not running');
});

test('Login page renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /selamat datang kembali/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
});

test('Login page renders on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /selamat datang kembali/i })).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
});

test('Welcome page renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page).toHaveTitle(/Kolabri/i);
    await expect(page.getByRole('link', { name: /masuk/i }).first()).toBeVisible();
});

test('Register page renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: /^buat akun$/i })).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
});
