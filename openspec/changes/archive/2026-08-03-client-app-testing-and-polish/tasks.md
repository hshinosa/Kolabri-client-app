## 1. Strip Console di Production Build

- [x] 1.1 Di `vite.config.ts`, tambah ke config object: `esbuild: { drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [] }`
- [x] 1.2 Jalankan `npm run build` — pastikan build berhasil
- [x] 1.3 Cek output bundle: `grep -r "console\.log" dist/` — pastikan tidak ada

## 2. Perluas errorHandler.ts

- [x] 2.1 Di `resources/js/lib/errorHandler.ts`, tambah handling untuk native `Error` instance: `if (error instanceof Error) return error.message`
- [x] 2.2 Tambah handling untuk domain error object dari Core API: cek apakah `error` adalah object dengan field `message` dan `code`
- [x] 2.3 Tambah handling untuk WebSocket error (Event object dengan `type: 'error'`)
- [x] 2.4 Update test di `tests/Unit/lib/errorHandler.test.ts` untuk cover kasus-kasus baru
- [x] 2.5 Jalankan `npx vitest run tests/Unit/lib/errorHandler.test.ts` — pastikan semua test passing

## 3. Tambah Dark Mode Toggle ke app-layout.tsx

- [x] 3.1 Di `resources/js/layouts/app-layout.tsx`, tambah state `isDark` yang baca dari `localStorage.getItem('kolabri_theme') === 'dark'`
- [x] 3.2 Tambah toggle button di header (pakai icon `Sun`/`Moon` dari lucide-react)
- [x] 3.3 Toggle handler: update state, update `document.documentElement.classList`, simpan ke `localStorage.setItem('kolabri_theme', ...)`
- [x] 3.4 Test: login sebagai student/lecturer, toggle dark mode — pastikan preference tersimpan dan konsisten dengan halaman lain

## 4. Tambah Unit Test Komponen Chat

- [x] 4.1 Buat `tests/Unit/components/chat/ChatMessageList.test.tsx` — test rendering dengan messages, empty state
- [x] 4.2 Buat `tests/Unit/components/chat/ChatInput.test.tsx` — test disabled state, submit behavior
- [x] 4.3 Buat `tests/Unit/components/chat/ChatHeader.test.tsx` — test rendering dengan berbagai props
- [x] 4.4 Jalankan `npx vitest run tests/Unit/components/chat/` — pastikan semua passing

## 5. Tambah Unit Test Komponen Chart

- [x] 5.1 Buat `tests/Unit/components/MetricsRadarChart.test.tsx` — test rendering dengan data, loading state, empty state
- [x] 5.2 Buat `tests/Unit/components/PlanVsDiskusiChart.test.tsx` — test rendering dengan data, loading state
- [x] 5.3 Jalankan `npx vitest run tests/Unit/components/` — pastikan semua passing

## 6. Tambah Visual Regression Tests

- [x] 6.1 Buat `tests/e2e/visual-regression.spec.ts`
- [x] 6.2 Tambah snapshot test untuk halaman login: `await expect(page).toHaveScreenshot('login.png')`
- [x] 6.3 Tambah snapshot test untuk dashboard dosen (setelah login sebagai lecturer)
- [x] 6.4 Tambah snapshot test untuk dashboard mahasiswa (setelah login sebagai student)
- [x] 6.5 Jalankan `npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots` untuk generate baseline snapshots
- [x] 6.6 Jalankan sekali lagi tanpa `--update-snapshots` — pastikan test passing

## 7. Verifikasi Final

- [x] 7.1 Jalankan `npx vitest run` — semua unit test harus passing
- [x] 7.2 Jalankan `npx playwright test` — semua e2e test harus passing
- [x] 7.3 Jalankan `npm run build` — build berhasil, tidak ada console di bundle
