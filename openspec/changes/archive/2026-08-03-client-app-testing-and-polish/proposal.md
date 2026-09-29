## Why

Unit test React sangat minim (3 komponen saja). `console.error` tersebar di production code tanpa stripping di build. `errorHandler.ts` hanya handle Axios errors. `app-layout.tsx` tidak punya dark mode toggle untuk authenticated pages. Tidak ada visual regression testing meski Playwright sudah tersedia.

## What Changes

- Tambah unit test untuk komponen React yang penting (chat, analytics, forms)
- Tambah konfigurasi Vite untuk strip `console.*` di production build
- Perluas `errorHandler.ts` untuk handle non-Axios errors
- Tambah dark mode toggle ke `app-layout.tsx`
- Tambah visual regression tests menggunakan Playwright `toHaveScreenshot()`

## Capabilities

### New Capabilities

- `react-component-tests`: Unit tests untuk komponen chat, analytics chart, dan form
- `production-console-strip`: Build production tidak mengandung `console.*` calls
- `unified-error-handler`: `errorHandler.ts` handle semua tipe error (Axios, fetch, WebSocket, domain errors)
- `authenticated-dark-mode`: Dark mode toggle tersedia di `app-layout.tsx` untuk authenticated pages
- `visual-regression-tests`: Playwright snapshot tests untuk halaman utama

### Modified Capabilities

<!-- tidak ada existing specs -->

## Impact

- `resources/js/lib/errorHandler.ts` — perluas error handling
- `resources/js/layouts/app-layout.tsx` — tambah dark mode toggle
- `vite.config.ts` — tambah console strip untuk production
- `tests/Unit/` — tambah test files baru
- `tests/e2e/` — tambah visual regression test files
