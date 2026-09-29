## 1. Audit Endpoint Core API

- [x] 1.1 Baca `Kolabri-core-api/src/routes/analytics.routes.ts` — identifikasi endpoint yang return data untuk MetricsRadarChart (6 metrik SRL: HOT, Lexical Variety, Forethought, Performance, Collaboration, Reflection)
- [x] 1.2 Identifikasi endpoint yang return data untuk PlanVsDiskusiChart (plan vs diskusi per minggu)
- [x] 1.3 Tentukan apakah student dashboard perlu chart — kalau tidak ada endpoint per-student, hapus chart dari student dashboard

## 2. Tambah Props Interface ke Komponen Chart

- [x] 2.1 Di `MetricsRadarChart.tsx`, definisikan interface `MetricsRadarChartProps` dengan fields: `data?: number[]`, `labels?: string[]`, `isLoading?: boolean`, `error?: string`
- [x] 2.2 Update komponen untuk terima props dan render data dari props (bukan hardcoded)
- [x] 2.3 Tambah loading skeleton kalau `isLoading` true (bisa pakai `<div className="animate-pulse">` sederhana)
- [x] 2.4 Tambah empty state kalau `data` kosong/undefined dan tidak loading
- [x] 2.5 Hapus `console.log('Klik pada metrik:', metricName)` dari onClick handler
- [x] 2.6 Lakukan hal yang sama untuk `PlanVsDiskusiChart.tsx`

## 3. Fetch Data di Lecturer Dashboard

- [x] 3.1 Di `lecturer/dashboard.tsx`, tambah state: `chartData`, `chartLoading`, `chartError`
- [x] 3.2 Tambah `useEffect` untuk fetch data chart dari endpoint yang ditemukan di step 1
- [x] 3.3 Pass data ke `MetricsRadarChart` dan `PlanVsDiskusiChart` via props
- [x] 3.4 Handle error state — tampilkan pesan error kalau fetch gagal

## 4. Evaluasi dan Update Student Dashboard

- [x] 4.1 Berdasarkan hasil audit step 1.3: kalau tidak ada data per-student, hapus `MetricsRadarChart` dan `PlanVsDiskusiChart` dari `student/dashboard.tsx`
- [x] 4.2 Kalau ada data per-student, tambah fetch yang sesuai di student dashboard

## 5. Fix Auth Middleware di Routes

- [x] 5.1 Di `routes/web.php`, tambah middleware `auth` (atau group middleware yang sesuai) ke route `/plan-vs-diskusi`
- [x] 5.2 Cek route `/lecturer/radar-chart` — pastikan sudah dalam middleware group yang benar

## 6. Fix Import Path

- [x] 6.1 Di `RadarChartPage.tsx`, ganti `../../components/MetricsRadarChart` ke `@/components/MetricsRadarChart`
- [x] 6.2 Di `PlanVsDiskusiPage.tsx`, ganti `../components/PlanVsDiskusiChart` ke `@/components/PlanVsDiskusiChart`

## 7. Verifikasi

- [x] 7.1 Jalankan `npx tsc --noEmit` — pastikan tidak ada type error
- [x] 7.2 Jalankan `npm run build` — pastikan build berhasil
- [x] 7.3 Buka dashboard dosen — pastikan chart menampilkan data dari API (atau loading state), bukan hardcoded values
- [x] 7.4 Akses `/plan-vs-diskusi` tanpa login — pastikan di-redirect ke login
