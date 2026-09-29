## 1. Fix Trivial Issues Dulu

- [x] 1.1 Di `RadarChartPage.tsx`, ganti `import MetricsRadarChart from '../../components/MetricsRadarChart'` ke `import MetricsRadarChart from '@/components/MetricsRadarChart'`
- [x] 1.2 Di `PlanVsDiskusiPage.tsx`, ganti `import PlanVsDiskusiChart from '../components/PlanVsDiskusiChart'` ke `import PlanVsDiskusiChart from '@/components/PlanVsDiskusiChart'`
- [x] 1.3 Jalankan `npx tsc --noEmit` — pastikan tidak ada type error

## 2. Standarisasi Dark Mode Key

- [x] 2.1 Di `app.tsx`, update initial dark mode check: baca dari `kolabri_theme` dulu, fallback ke `kolabri-dark` untuk backward compat
- [x] 2.2 Di `guest-layout.tsx`, update toggle: tulis hanya ke `kolabri_theme`, hapus `localStorage.setItem('kolabri-dark', ...)`
- [x] 2.3 Di `welcome.tsx`, update toggle: tulis hanya ke `kolabri_theme`, hapus `localStorage.setItem('kolabri-dark', ...)`
- [x] 2.4 Pastikan semua file yang baca dark mode preference hanya baca dari `kolabri_theme` (dengan fallback `kolabri-dark` untuk backward compat satu kali)
- [x] 2.5 Test: toggle dark mode di halaman welcome, login, dan authenticated — pastikan preference tersimpan dan konsisten

## 3. Ekstrak Custom Hooks dari room.tsx

- [x] 3.1 Buat file `resources/js/hooks/useSocketRoom.ts` — pindahkan semua Socket.IO logic dari `room.tsx` (connect, join_room, event handlers, disconnect cleanup)
- [x] 3.2 Buat file `resources/js/hooks/useRoomMessages.ts` — pindahkan state management pesan (messages array, add message, delete message, update message)
- [x] 3.3 Update `room.tsx` untuk menggunakan kedua hooks tersebut — hapus logic yang sudah dipindahkan
- [x] 3.4 Jalankan `npx tsc --noEmit` — pastikan tidak ada type error
- [x] 3.5 Test manual: buka chat room, kirim pesan, pastikan semua berfungsi normal

## 4. Ekstrak Komponen dari room.tsx

- [x] 4.1 Buat `resources/js/components/chat/ChatMessageList.tsx` — pindahkan rendering daftar pesan dari `room.tsx`
- [x] 4.2 Buat `resources/js/components/chat/ChatInput.tsx` — pindahkan input area + file upload dari `room.tsx`
- [x] 4.3 Buat `resources/js/components/chat/ChatHeader.tsx` — pindahkan header room + status dari `room.tsx`
- [x] 4.4 Update `room.tsx` untuk menggunakan komponen-komponen tersebut
- [x] 4.5 Jalankan `npx tsc --noEmit` — pastikan tidak ada type error
- [x] 4.6 Test manual: full chat flow — join room, kirim pesan, terima pesan, file upload

## 5. Tambah Route-Level Code Splitting

- [x] 5.1 Baca dokumentasi Inertia.js untuk lazy loading — cek apakah versi yang dipakai support `defineAsyncComponent` atau dynamic import
- [x] 5.2 Di `app.tsx`, update resolve function untuk menggunakan dynamic import: `const pages = import.meta.glob('./pages/**/*.tsx')` dan return `pages[name]()`
- [x] 5.3 Tambah `<Suspense fallback={<LoadingSpinner />}>` di app wrapper
- [x] 5.4 Jalankan `npm run build` — cek output chunks, pastikan ada pemisahan per halaman
- [x] 5.5 Test navigasi antar halaman — pastikan tidak ada blank page saat lazy load

## 6. Verifikasi Final

- [x] 6.1 Jalankan `npm run build` — pastikan build berhasil tanpa error
- [x] 6.2 Jalankan `npx tsc --noEmit` — tidak ada type error
- [x] 6.3 Cek bundle size sebelum dan sesudah code splitting — dokumentasikan perbedaannya
- [x] 6.4 Test full flow: login sebagai student, buka chat room, kirim pesan, logout
