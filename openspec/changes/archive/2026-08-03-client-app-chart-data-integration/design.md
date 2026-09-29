## Context

`MetricsRadarChart` dan `PlanVsDiskusiChart` masuk dari branch `dev-akbar` dengan data hardcoded. Keduanya sudah dirender di `lecturer/dashboard.tsx` dan `student/dashboard.tsx`. Core API sudah punya endpoint analytics (`/api/analytics/group/{id}`, `/api/analytics/engagement`) yang bisa menjadi sumber data.

## Goals / Non-Goals

**Goals:**
- Komponen chart menerima data via props
- Dashboard fetch data dari Core API
- Loading dan empty state yang proper
- Route chart standalone dilindungi auth

**Non-Goals:**
- Tidak membuat endpoint baru di Core API kalau data sudah tersedia
- Tidak mengubah desain visual chart
- Tidak mengimplementasikan real-time chart update

## Decisions

### 1. Props interface: data opsional dengan loading state

**Keputusan**: Props `data?: number[]`, `labels?: string[]`, `isLoading?: boolean`, `error?: string`. Kalau `isLoading` true, tampilkan skeleton. Kalau `data` kosong/undefined, tampilkan empty state.

### 2. Fetch di parent (dashboard), bukan di dalam komponen

**Keputusan**: Dashboard component yang fetch data dan pass ke chart via props. Chart component tetap "dumb" — hanya render apa yang diterima.

**Rationale**: Lebih mudah di-test, lebih mudah di-reuse, dan fetch logic tidak tersebar di banyak komponen.

### 3. Student dashboard — hapus chart kalau tidak ada data per-student

**Keputusan**: Evaluasi dulu apakah Core API punya endpoint untuk data chart per-student. Kalau tidak ada, hapus chart dari student dashboard daripada tampilkan data kelas yang tidak relevan.

## Risks / Trade-offs

- **[Risk] Core API belum punya endpoint yang return data dalam format yang dibutuhkan chart** → Perlu audit endpoint analytics dulu sebelum implementasi fetch.
- **[Risk] Data chart untuk student berbeda dengan untuk lecturer** → Perlu klarifikasi requirement: apakah student perlu lihat metrik diri sendiri atau metrik kelas?

## Open Questions

- Endpoint Core API mana yang return data untuk `MetricsRadarChart` (6 metrik SRL)?
- Endpoint Core API mana yang return data untuk `PlanVsDiskusiChart` (plan vs diskusi per minggu)?
- Apakah student perlu lihat chart ini? Kalau ya, data apa yang ditampilkan?
