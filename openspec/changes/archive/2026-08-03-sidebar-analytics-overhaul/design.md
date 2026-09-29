## Context

Sidebar dosen saat ini menggunakan `useLecturerNav(activePage, context?)` di `lecturer-nav.tsx` yang menghasilkan sub-items secara conditional berdasarkan `courseId` dan `activePage`. Ini menyebabkan:
- Sub-items muncul/hilang tergantung halaman yang sedang dibuka
- Menu Analytics tidak bisa diakses langsung — fallback ke Kelas Saya kalau tidak ada `courseId`
- Tidak ada halaman overview analytics yang merangkum semua kelas

Stack: Laravel + React/Inertia (frontend), Node.js/Express (Core-API), PostgreSQL + MongoDB.

## Goals / Non-Goals

**Goals:**
- Sidebar flat dan konsisten di semua halaman dosen (tidak ada sub-items)
- Menu Analytics selalu bisa diklik dan mengarah ke halaman overview
- Halaman Analytics Overview baru: card grid semua kelas dengan quality score rata-rata, jumlah mahasiswa & grup, badge perlu perhatian
- Backend endpoint baru `GET /api/analytics/overview` di Core-API

**Non-Goals:**
- Perubahan pada halaman analytics detail per kelas (`analytics/index.tsx`, `analytics/show.tsx`)
- Perubahan navigasi mahasiswa (`student-nav.tsx`)
- Redesign visual sidebar (warna, font, spacing tetap)
- Pagination atau filter di halaman overview

## Decisions

### 1. Hapus sub-items dari `lecturer-nav.tsx` sepenuhnya

**Keputusan**: Hapus logika conditional sub-items. `useLecturerNav` hanya return 3 item flat: Dasbor, Kelas Saya, Analytics.

**Alasan**: Sub-items conditional membingungkan — muncul/hilang tergantung konteks. Navigasi kontekstual (Detail Kelas, Kelola Grup) lebih natural dilakukan dari dalam halaman via breadcrumb atau tombol, bukan dari sidebar.

**Alternatif ditolak**: Selalu tampilkan sub-items tapi disabled → menambah visual noise tanpa manfaat.

### 2. Analytics Overview sebagai halaman baru di `analytics/overview.tsx`

**Keputusan**: Buat halaman baru `resources/js/pages/lecturer/analytics/overview.tsx`, bukan modifikasi `analytics/index.tsx` yang sudah ada.

**Alasan**: `analytics/index.tsx` sudah berisi analytics per kelas tertentu (butuh `courseId`). Overview adalah konsep berbeda — lintas semua kelas. Memisahkan keduanya menghindari prop drilling dan logika yang bercampur.

**Route baru**: `GET /lecturer/analytics` → `AnalyticsController@overview` (Laravel)

### 3. Endpoint baru `GET /api/analytics/overview` di Core-API

**Keputusan**: Tambah endpoint terpisah di Core-API, bukan reuse endpoint yang ada.

**Alasan**: Data yang dibutuhkan (quality score rata-rata per kelas, jumlah mahasiswa & grup, flag perlu perhatian) membutuhkan agregasi lintas semua kelas milik dosen — berbeda dari endpoint per-kelas yang sudah ada.

**Response shape**:
```json
{
  "courses": [
    {
      "courseId": "...",
      "courseName": "...",
      "studentsCount": 10,
      "groupsCount": 3,
      "avgQualityScore": 72,
      "needsAttention": true,
      "lastActivity": "2026-05-20T10:00:00Z"
    }
  ]
}
```

**`needsAttention`**: `true` jika ada grup dengan `qualityScore < 50` atau tidak ada aktivitas dalam 7 hari.

### 4. Laravel controller fetch data dari Core-API

**Keputusan**: `DashboardController` atau controller baru di Laravel fetch dari `GET /api/analytics/overview` lalu pass ke Inertia page.

**Alasan**: Konsisten dengan pola yang sudah ada di `DashboardController.php` — Laravel sebagai BFF (Backend for Frontend) yang proxy ke Core-API.

## Risks / Trade-offs

- **Performance**: Overview endpoint agregasi semua kelas bisa lambat kalau dosen punya banyak kelas. → Mitigasi: query dioptimasi dengan single aggregation query di MongoDB, bukan N+1.
- **Route conflict**: Route `/lecturer/analytics` mungkin sudah ada di Laravel. → Mitigasi: cek `routes/web.php` sebelum menambah route baru.
- **`activePage` baru**: Halaman overview butuh nilai `activePage` baru di `useLecturerNav`. → Tambah `'analytics-overview'` ke type `ActivePage`.

## Migration Plan

1. Update `lecturer-nav.tsx` — hapus sub-items, update href Analytics
2. Tambah endpoint Core-API (`analytics.service.ts`, `analytics.controller.ts`, `analytics.routes.ts`)
3. Tambah Laravel route + controller method
4. Buat halaman `analytics/overview.tsx`
5. Restart Core-API, refresh frontend

Rollback: revert `lecturer-nav.tsx` dan hapus route/halaman baru — tidak ada perubahan destructive.

## Open Questions

- (tidak ada — semua keputusan sudah dikonfirmasi dengan user)
