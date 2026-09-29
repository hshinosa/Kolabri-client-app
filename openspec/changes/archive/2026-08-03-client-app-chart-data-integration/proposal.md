## Why

`MetricsRadarChart` dan `PlanVsDiskusiChart` yang baru masuk dari branch `dev-akbar` menampilkan data hardcoded dummy ke user nyata di dashboard dosen dan mahasiswa. Selain itu, route `/plan-vs-diskusi` tidak dilindungi auth middleware. Komponen chart juga tidak punya props interface sehingga tidak bisa di-reuse dengan data berbeda per course/group. Ini perlu diperbaiki sebelum dashboard digunakan.

## What Changes

- Tambah props interface ke `MetricsRadarChart` dan `PlanVsDiskusiChart` — terima `data`, `isLoading`, `error`
- Fetch data chart dari Core API di parent component (dashboard dosen dan mahasiswa)
- Hapus semua hardcoded dummy values dari kedua komponen
- Tampilkan loading skeleton saat fetch dan empty state kalau data belum ada
- Evaluasi apakah chart relevan untuk dashboard mahasiswa — kalau tidak, hapus dari student dashboard
- Tambah auth middleware ke route `/plan-vs-diskusi`
- Hapus `console.log` debug dari `MetricsRadarChart` onClick handler

## Capabilities

### New Capabilities

- `chart-data-props`: Komponen chart menerima data via props, tidak hardcoded
- `chart-api-integration`: Dashboard dosen dan mahasiswa fetch data chart dari Core API
- `chart-loading-states`: Chart menampilkan loading skeleton dan empty state yang proper

### Modified Capabilities

<!-- tidak ada existing specs -->

## Impact

- `resources/js/components/MetricsRadarChart.tsx` — tambah props interface, hapus hardcoded data
- `resources/js/components/PlanVsDiskusiChart.tsx` — tambah props interface, hapus hardcoded data
- `resources/js/pages/lecturer/dashboard.tsx` — tambah fetch data untuk chart
- `resources/js/pages/student/dashboard.tsx` — evaluasi relevansi chart, tambah fetch atau hapus
- `routes/web.php` — tambah auth middleware ke `/plan-vs-diskusi` route
- Mungkin perlu endpoint baru di Core API kalau data chart belum tersedia
