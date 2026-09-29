## Why

Sidebar dosen saat ini tidak konsisten — sub-items muncul secara conditional tergantung konteks halaman, menu Analytics tidak bisa diakses langsung dari sidebar, dan tidak ada halaman overview analytics yang merangkum semua kelas. Ini membuat navigasi membingungkan dan tidak intuitif untuk dosen.

## What Changes

- Hapus semua sub-items conditional dari sidebar (Kelas Saya dan Analytics tidak lagi punya sub-items)
- Menu Analytics di sidebar selalu mengarah ke halaman Analytics Overview baru (bukan ke Kelas Saya)
- **New**: Halaman Analytics Overview — card grid semua kelas dengan quality score rata-rata, jumlah mahasiswa & grup, dan status perlu perhatian
- **New**: Backend endpoint `GET /api/analytics/overview` yang mengembalikan ringkasan analytics semua kelas milik dosen

## Capabilities

### New Capabilities

- `analytics-overview`: Halaman overview analytics semua kelas dosen — card grid dengan quality score rata-rata grup, jumlah mahasiswa & grup, dan badge status perlu perhatian. Klik card → drill-down ke analytics kelas tertentu.

### Modified Capabilities

- (tidak ada perubahan spec-level pada capability yang sudah ada)

## Impact

- `resources/js/components/navigation/lecturer-nav.tsx` — hapus sub-items, ubah href Analytics ke route overview baru
- `resources/js/pages/lecturer/analytics/` — tambah halaman `overview.tsx`
- `app/Http/Controllers/AnalyticsController.php` (atau `DashboardController.php`) — tambah method untuk fetch overview data
- `Kolabri-core-api/src/services/analytics.service.ts` — tambah method `getAnalyticsOverview`
- `Kolabri-core-api/src/controllers/analytics.controller.ts` — tambah endpoint handler
- `Kolabri-core-api/src/routes/analytics.routes.ts` — tambah route `GET /api/analytics/overview`
- Route definition di Laravel untuk halaman overview baru
