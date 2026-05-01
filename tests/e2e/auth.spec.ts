import { expect, test } from '@playwright/test';

import { checkServiceAvailable, loginAs, TEST_CREDENTIALS } from './helpers';

test.beforeEach(async ({ page }) => {
    const available = await checkServiceAvailable(page);
    if (!available) test.skip(true, 'App not running');
});

test('Landing page loads', async ({ page }) => {
    await page.goto('/', { timeout: 10000 });

    const url = page.url();
    if (url.includes('/login')) {
        await expect(page).toHaveTitle(/Kolabri/i);
        await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible();
    } else {
        await expect(page).toHaveURL(/\/$/);
        await expect(page).toHaveTitle(/Kolabri/i);
        await expect(page.getByRole('link', { name: /masuk/i }).first()).toBeVisible();
    }
});

test('Login page renders with email/password fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /selamat datang kembali/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /^masuk$/i })).toBeVisible();
});

test('Login with empty fields shows validation', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /^masuk$/i }).click();

    await expect(page.locator('text=/email|required|wajib/i').first()).toBeVisible();
});

test('Login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill('invalid@example.com');
    await page.locator('#password').fill('wrong-password');
    await page.getByRole('button', { name: /^masuk$/i }).click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('text=/invalid|salah|gagal|error|incorrect|credentials/i').first()).toBeVisible();
});

test('Register page renders', async ({ page }) => {
    await page.goto('/register');

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: /^buat akun$/i })).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#password_confirmation')).toBeVisible();
});

test('Login/register pages link to each other', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /daftar sekarang/i }).click();
    await expect(page).toHaveURL(/\/register$/);

    await page.getByRole('link', { name: /^masuk$/i }).click();
    await expect(page).toHaveURL(/\/login$/);
});

test('Unauthenticated users redirected to /login from protected pages', async ({ page }) => {
    for (const route of ['/dashboard', '/admin/dashboard']) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/login$/);
    }
});

test('Admin login flow reaches /admin/dashboard', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
});

test('Admin logout flow', async ({ page }) => {
    const loggedIn = await loginAs(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
    if (!loggedIn) test.skip(true, 'Auth service not available');

    await page.getByTitle(/keluar/i).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /selamat datang kembali/i })).toBeVisible();
});
