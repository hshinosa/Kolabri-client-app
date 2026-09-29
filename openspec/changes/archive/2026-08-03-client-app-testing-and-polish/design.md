## Context

Vitest sudah dikonfigurasi (dari `dev-akbar`). Playwright sudah ada dengan 16 e2e test files. `vite.config.ts` belum punya console strip untuk production. `errorHandler.ts` hanya handle Axios. `app-layout.tsx` tidak punya dark mode toggle.

## Goals / Non-Goals

**Goals:**
- Unit test untuk komponen chat, analytics chart, dan form
- Production build tidak mengandung `console.*`
- `errorHandler.ts` handle semua tipe error
- Dark mode toggle di authenticated pages
- Visual regression tests untuk halaman utama

**Non-Goals:**
- Tidak mencapai 100% coverage
- Tidak mengubah behavior yang sudah ada

## Decisions

### 1. Console strip via Vite `esbuild.drop`

**Keputusan**: Tambah `esbuild: { drop: ['console', 'debugger'] }` ke `vite.config.ts` untuk production build.

**Rationale**: Zero config, built-in Vite/esbuild. Tidak perlu plugin tambahan.

### 2. errorHandler.ts — tambah type guards untuk error types lain

**Keputusan**: Tambah handling untuk `Error` native, `TypeError`, dan custom domain error object dari Core API.

### 3. Dark mode toggle di app-layout — pakai state dari localStorage

**Keputusan**: Tambah toggle button di header `app-layout.tsx` yang baca/tulis ke `kolabri_theme` (setelah standarisasi di openspec frontend-quality).

## Risks / Trade-offs

- **[Risk] Console strip di production bisa menyulitkan debugging** → Acceptable trade-off. Error reporting yang proper (error boundary, logging) lebih baik dari console.
- **[Risk] Visual regression tests bisa flaky** → Gunakan `--update-snapshots` saat ada perubahan visual yang disengaja.
