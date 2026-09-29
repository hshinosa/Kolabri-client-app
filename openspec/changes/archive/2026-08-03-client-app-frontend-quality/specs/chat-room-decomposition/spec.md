## ADDED Requirements

### Requirement: Socket logic di room.tsx diekstrak ke custom hook
Semua Socket.IO event handling, room join/leave, dan reconnection logic di `room.tsx` HARUS diekstrak ke custom hook `useSocketRoom`. Komponen `room.tsx` HARUS menggunakan hook ini, bukan mengimplementasikan socket logic langsung. The system MUST enforce: Socket logic di room.tsx diekstrak ke custom hook.

#### Scenario: Socket terhubung saat komponen mount
- **WHEN** `StudentChatRoom` component mount
- **THEN** `useSocketRoom` menginisialisasi koneksi Socket.IO dan join room yang sesuai

#### Scenario: Socket disconnect saat komponen unmount
- **WHEN** `StudentChatRoom` component unmount
- **THEN** `useSocketRoom` cleanup function memutus koneksi Socket.IO

### Requirement: Message list logic diekstrak ke komponen terpisah
Rendering daftar pesan HARUS diekstrak ke komponen `ChatMessageList` yang terpisah. Komponen ini HARUS menerima `messages` via props. The system MUST enforce: Message list logic diekstrak ke komponen terpisah.

#### Scenario: Pesan baru ditampilkan
- **WHEN** pesan baru diterima via Socket.IO
- **THEN** `ChatMessageList` merender pesan baru di bagian bawah list

### Requirement: Dark mode menggunakan satu localStorage key
Semua operasi baca/tulis dark mode preference HARUS menggunakan key `kolabri_theme` dengan nilai `'dark'` atau `'light'`. Key `kolabri-dark` TIDAK BOLEH digunakan untuk operasi tulis baru. The system MUST enforce: Dark mode menggunakan satu localStorage key.

#### Scenario: Toggle dark mode menyimpan ke key yang benar
- **WHEN** user toggle dark mode
- **THEN** `localStorage.setItem('kolabri_theme', 'dark'|'light')` dipanggil, bukan `kolabri-dark`

#### Scenario: Preferensi lama dari kolabri-dark tetap terbaca
- **WHEN** user pertama kali load setelah migration dan hanya punya `kolabri-dark` di localStorage
- **THEN** preferensi dark mode tetap terbaca dengan benar (backward compat)

### Requirement: Semua import path menggunakan alias @/
File `RadarChartPage.tsx` dan `PlanVsDiskusiPage.tsx` HARUS menggunakan alias `@/` untuk import komponen, bukan relative path. The system MUST enforce: Semua import path menggunakan alias @/.

#### Scenario: Import path konsisten
- **WHEN** codebase di-inspect
- **THEN** tidak ada file di `resources/js/pages/` yang menggunakan relative path `../../` atau `../` untuk import dari `components/`
