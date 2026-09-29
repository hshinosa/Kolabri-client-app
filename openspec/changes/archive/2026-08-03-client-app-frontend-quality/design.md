## Context

`room.tsx` adalah 2464 baris dengan 54 hooks — semua logic chat dalam satu komponen. Dark mode menggunakan dua key localStorage berbeda (`kolabri_theme` dan `kolabri-dark`) yang ditulis bersamaan tapi dibaca dengan OR logic. Import path di dua file baru tidak konsisten. `console.log` debug masuk production.

## Goals / Non-Goals

**Goals:**
- `room.tsx` dipecah menjadi komponen dan hooks yang focused dan testable
- Dark mode menggunakan satu key yang konsisten
- Semua import path pakai alias `@/`
- Tidak ada `console.log` di production code

**Non-Goals:**
- Tidak mengubah visual/behavior chat room
- Tidak mengubah dark mode logic (hanya standarisasi key)
- Tidak mengimplementasikan code splitting (itu di tasks terpisah dalam openspec ini)

## Decisions

### 1. Pecah room.tsx — custom hooks dulu, komponen kemudian

**Keputusan**: Ekstrak logic ke custom hooks terlebih dahulu (`useSocketRoom`, `useRoomMessages`, `useRoomState`), baru pecah JSX ke komponen terpisah.

**Rationale**: Hooks lebih mudah dites secara unit. Memisahkan logic dari rendering adalah langkah pertama yang paling impactful.

### 2. Dark mode — pertahankan `kolabri_theme`, hapus `kolabri-dark`

**Keputusan**: Gunakan `kolabri_theme` sebagai satu-satunya key. Hapus semua referensi ke `kolabri-dark`.

**Rationale**: `kolabri_theme` lebih deskriptif. Nilai `'dark'`/`'light'` lebih eksplisit dari `'true'`/`'false'`.

**Migration**: User yang punya `kolabri-dark` di localStorage tidak akan kehilangan preferensi — saat pertama kali load, baca dari kedua key (backward compat), lalu tulis hanya ke `kolabri_theme`. Setelah itu, hanya baca dari `kolabri_theme`.

### 3. Code splitting — React.lazy di app.tsx

**Keputusan**: Wrap semua Inertia page imports dengan `React.lazy` di `app.tsx` atau di resolve function Inertia.

**Rationale**: Inertia mendukung lazy loading via dynamic import. Ini mengurangi initial bundle secara signifikan.

## Risks / Trade-offs

- **[Risk] Memecah room.tsx bisa introduce regresi** → Lakukan secara incremental — extract satu hook dulu, test, baru lanjut.
- **[Risk] Dark mode migration bisa flash saat pertama load** → Baca dari kedua key di initial load untuk backward compat.
