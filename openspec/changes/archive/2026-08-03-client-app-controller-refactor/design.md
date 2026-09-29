## Context

Base `Controller.php` saat ini kosong (8 baris). `apiUrl()` dan `apiRequest()` di-copy-paste di 11 controller. `MasterDataController` (405 baris) dan `CourseController` (344 baris) menangani terlalu banyak concern dalam satu file.

## Goals / Non-Goals

**Goals:**
- `apiUrl()` dan `apiRequest()` hanya ada di satu tempat
- Controller lebih tipis dan focused
- Tidak ada perubahan behavior yang terlihat dari luar

**Non-Goals:**
- Tidak mengubah routes
- Tidak mengubah frontend
- Tidak mengubah Core API
- Tidak mengimplementasikan full service layer (terlalu besar scope-nya)

## Decisions

### 1. Pindahkan ke base Controller, bukan service class

**Keputusan**: Tambah `apiUrl()` dan `apiRequest()` ke `app/Http/Controllers/Controller.php`.

**Alternatif**: Buat `ApiService` class yang di-inject — lebih proper tapi overkill untuk scope ini.

**Rationale**: Semua controller sudah extend `Controller`. Perubahan minimal, dampak langsung.

### 2. MasterDataController — extract ke method private yang lebih kecil

**Keputusan**: Tidak buat service class baru. Pecah method `index()` yang panjang menjadi private helper methods (`fetchCourses()`, `fetchLecturers()`, `fetchTemplates()`).

**Rationale**: Mengurangi kompleksitas tanpa menambah file baru. Sesuai prinsip smallest correct change.

### 3. CourseController — pisahkan student routes ke StudentCourseController

**Keputusan**: Extract method-method student-facing (`studentShow`, `studentGroups`, `studentChatSpace`) ke `StudentCourseController` baru.

**Rationale**: Lecturer dan student punya concern yang berbeda. Memisahkan keduanya membuat masing-masing controller lebih mudah dipahami dan dites.

## Risks / Trade-offs

- **[Risk] Memindahkan method ke base Controller bisa conflict kalau ada controller yang override** → Cek dulu apakah ada controller yang punya method `apiUrl` atau `apiRequest` dengan signature berbeda.
- **[Risk] Membuat `StudentCourseController` butuh update routes** → Routes perlu diupdate untuk point ke controller baru.

## Open Questions

- Apakah `AuthController` perlu `apiRequest()` helper? (Saat ini pakai `Http::post()` langsung tanpa token untuk login/register)
