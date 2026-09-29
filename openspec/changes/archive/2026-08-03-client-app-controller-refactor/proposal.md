## Why

`apiUrl()` dan `apiRequest()` di-copy-paste di 11 dari 13 controller. `MasterDataController` (405 baris) dan `CourseController` (344 baris) terlalu tebal — business logic, data transformation, dan error handling campur dalam satu file. Ini menyulitkan testing, debugging, dan perubahan di masa depan.

## What Changes

- Pindahkan `apiUrl()` dan `apiRequest()` ke base `Controller.php` — hapus duplikasi dari 11 controller
- Pecah `MasterDataController` menjadi lebih fokus — pisahkan operasi courses, lecturers, dan templates
- Pecah `CourseController` — pisahkan lecturer view, student view, dan enrollment logic ke service atau method yang lebih kecil

## Capabilities

### New Capabilities

- `base-controller-api-helpers`: `apiUrl()` dan `apiRequest()` tersedia di base `Controller.php` untuk semua controller
- `master-data-service`: Logic `MasterDataController` yang tebal dipecah ke service class atau method yang lebih kecil dan fokus
- `course-controller-slim`: `CourseController` dipecah — student-facing logic dipisahkan dari lecturer-facing logic

### Modified Capabilities

<!-- tidak ada existing specs -->

## Impact

- `app/Http/Controllers/Controller.php` — tambah `apiUrl()` dan `apiRequest()`
- Semua 11 controller yang punya duplikasi — hapus method duplikat
- `app/Http/Controllers/MasterDataController.php` — refactor
- `app/Http/Controllers/CourseController.php` — refactor
- Tidak ada perubahan routes, database, atau frontend
