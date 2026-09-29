## 1. Pindahkan apiUrl() dan apiRequest() ke Base Controller

- [x] 1.1 Buka `app/Http/Controllers/Controller.php` — tambah `use Illuminate\Support\Facades\Http;`
- [x] 1.2 Tambah method `protected function apiUrl(): string` yang return `config('services.api.base_url', 'http://localhost:3000')`
- [x] 1.3 Tambah method `protected function apiRequest()` yang return `Http::withToken(session('jwt'))`
- [x] 1.4 Hapus method `apiUrl()` dari: `AuditLogController`, `GoalController`, `AiChatController`, `DashboardController`, `UserManagementController`, `GroupController`, `AnalyticsController`, `AISettingsController`, `MasterDataController`, `ReflectionController`, `CourseController`
- [x] 1.5 Hapus method `apiRequest()` dari controller yang sama (kecuali `AuthController` yang tidak punya `apiRequest`)
- [x] 1.6 Jalankan `php artisan test` — pastikan semua test masih passing setelah penghapusan

## 2. Refactor MasterDataController

- [x] 2.1 Extract logic fetch courses ke private method `fetchCourses(Request $request): array`
- [x] 2.2 Extract logic fetch lecturers ke private method `fetchLecturers(): array`
- [x] 2.3 Extract logic fetch templates ke private method `fetchTemplates(): array` (kalau ada)
- [x] 2.4 Update method `index()` untuk memanggil helper methods tersebut
- [x] 2.5 Pastikan behavior identik — jalankan test `MasterDataControllerTest`

## 3. Pisahkan StudentCourseController dari CourseController

- [x] 3.1 Buat file baru `app/Http/Controllers/StudentCourseController.php`
- [x] 3.2 Pindahkan method `studentShow()`, `studentGroups()`, `studentChatSpace()` (atau nama yang setara) dari `CourseController` ke `StudentCourseController`
- [x] 3.3 Update `routes/web.php` — ganti referensi ke method student-facing di `CourseController` ke `StudentCourseController`
- [x] 3.4 Hapus method yang sudah dipindahkan dari `CourseController`
- [x] 3.5 Jalankan `php artisan test --filter CourseControllerTest` — pastikan test masih passing
- [x] 3.6 Jalankan `php artisan route:list` — pastikan semua routes masih terdaftar dengan benar

## 4. Verifikasi Final

- [x] 4.1 Jalankan `php artisan test` — semua test harus passing
- [x] 4.2 Cek tidak ada controller yang masih punya `apiUrl()` atau `apiRequest()` sendiri: `grep -r "protected function apiUrl\|protected function apiRequest" app/Http/Controllers/`
- [x] 4.3 Test manual: akses beberapa halaman sebagai lecturer dan student — pastikan semua berfungsi normal
