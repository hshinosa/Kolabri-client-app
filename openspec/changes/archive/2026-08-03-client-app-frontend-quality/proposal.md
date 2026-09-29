## Why

`room.tsx` (2464 baris, 54 hooks) adalah god component yang sulit di-test dan di-maintain. Dark mode menggunakan dua localStorage key berbeda yang bisa menyebabkan inconsistency. Tidak ada code splitting sehingga semua halaman di-bundle sekaligus. Import path di dua file baru tidak konsisten dengan konvensi project. Ada `console.log` debug yang masuk production.

## What Changes

- Pecah `room.tsx` menjadi komponen dan custom hooks yang lebih kecil
- Standarisasi dark mode ke satu localStorage key (`kolabri_theme`)
- Tambah `React.lazy` untuk route-level code splitting di halaman-halaman besar
- Fix import path di `RadarChartPage.tsx` dan `PlanVsDiskusiPage.tsx` ke alias `@/`
- Hapus `console.log` debug dari `MetricsRadarChart.tsx`

## Capabilities

### New Capabilities

- `chat-room-decomposition`: `room.tsx` dipecah menjadi komponen dan hooks yang focused
- `dark-mode-single-key`: Dark mode menggunakan satu key `kolabri_theme` secara konsisten
- `route-level-code-splitting`: Halaman-halaman besar di-lazy load untuk mengurangi initial bundle

### Modified Capabilities

<!-- tidak ada existing specs -->

## Impact

- `resources/js/pages/student/chat/room.tsx` — dipecah menjadi beberapa file
- `resources/js/app.tsx`, `layouts/guest-layout.tsx`, `pages/welcome.tsx` — standarisasi dark mode key
- `resources/js/pages/lecturer/RadarChartPage.tsx`, `pages/PlanVsDiskusiPage.tsx` — fix import path
- `resources/js/components/MetricsRadarChart.tsx` — hapus console.log
- `vite.config.ts` atau entry point — tambah lazy loading config
