## Context

Laravel bertindak sebagai BFF yang mem-proxy semua request ke Core API via Guzzle HTTP client (`Http::withToken(...)`). Ada 11 controller yang melakukan ini. Saat ini tidak ada timeout, error response tidak konsisten (campuran `abort()`, `response()->json()`, `back()->withErrors()`), dan beberapa controller tidak log error.

## Goals / Non-Goals

**Goals:**
- Semua HTTP request ke Core API punya timeout (10 detik) dan connect timeout (5 detik)
- Error response konsisten: page requests → `abort()` dengan kode HTTP yang tepat, JSON requests → `{"message": ..., "code": ...}`
- Semua catch block log error ke Laravel log

**Non-Goals:**
- Tidak mengimplementasikan retry logic
- Tidak mengubah Core API
- Tidak mengubah frontend error handling (itu di openspec lain)

## Decisions

### 1. Timeout 10 detik untuk semua request

**Keputusan**: `.timeout(10)->connectTimeout(5)` untuk semua request.

**Rationale**: 10 detik cukup untuk operasi normal Core API. Connect timeout 5 detik untuk deteksi Core API down lebih cepat. Nilai ini bisa dikonfigurasi via env kalau perlu.

### 2. Format error JSON: `{"message": ..., "code": ...}`

**Keputusan**: Semua JSON error response menggunakan format `{"message": "...", "code": "ERROR_CODE"}`.

**Rationale**: Frontend bisa switch berdasarkan `code` untuk pesan yang lebih spesifik. `message` untuk fallback display.

### 3. Page requests tetap pakai `abort()`

**Keputusan**: Untuk request yang render Inertia page, tetap pakai `abort(404)` atau `abort(500)` — Laravel akan render error page yang sesuai.

**Rationale**: Konsisten dengan Laravel convention. Inertia sudah handle abort dengan baik.

## Risks / Trade-offs

- **[Risk] Timeout 10 detik terlalu pendek untuk operasi berat (bulk ingest, analytics)** → Untuk endpoint yang diketahui lambat, bisa override dengan timeout lebih panjang secara per-request.
- **[Risk] Perubahan format error response bisa break frontend yang sudah expect format lama** → Audit dulu format yang dipakai frontend sebelum ubah. Untuk field `message` yang sudah ada, tidak ada breaking change.

## Open Questions

- Apakah ada endpoint Core API yang secara normal butuh lebih dari 10 detik? (kandidat: bulk ingest, analytics export)
