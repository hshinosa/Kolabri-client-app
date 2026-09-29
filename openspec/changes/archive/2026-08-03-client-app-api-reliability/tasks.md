## 1. Tambah HTTP Timeout ke Semua Controller

- [x] 1.1 Di `AuthController.php`, tambah `.timeout(10)->connectTimeout(5)` ke semua `Http::post()` dan `Http::withToken()` calls
- [x] 1.2 Di `CourseController.php`, tambah timeout ke semua `$this->apiRequest()->get/post/put/delete()` — update `apiRequest()` helper untuk include timeout
- [x] 1.3 Di `GroupController.php`, tambah timeout ke semua API calls
- [x] 1.4 Di `GoalController.php`, tambah timeout ke semua API calls
- [x] 1.5 Di `ReflectionController.php`, tambah timeout ke semua API calls
- [x] 1.6 Di `AiChatController.php`, tambah timeout ke semua API calls
- [x] 1.7 Di `AnalyticsController.php`, tambah timeout ke semua API calls — pertimbangkan timeout lebih panjang (30 detik) untuk endpoint analytics export
- [x] 1.8 Di `DashboardController.php`, tambah timeout ke semua API calls
- [x] 1.9 Di `UserManagementController.php`, tambah timeout ke semua API calls
- [x] 1.10 Di `MasterDataController.php`, tambah timeout ke semua API calls
- [x] 1.11 Di `AuditLogController.php`, tambah timeout ke semua API calls
- [x] 1.12 Di `AISettingsController.php`, tambah timeout ke semua API calls

## 2. Standarisasi Error Response

- [x] 2.1 Audit semua controller — buat daftar mana yang return JSON error dengan format tidak standar
- [x] 2.2 Update semua JSON error response ke format `{"message": "...", "code": "..."}` dengan HTTP status yang tepat
- [x] 2.3 Pastikan timeout/connection error mengembalikan 503 dengan `code: "SERVICE_TIMEOUT"`
- [x] 2.4 Pastikan page requests (Inertia render) tetap pakai `abort()` bukan `response()->json()`
- [x] 2.5 Pastikan `expectsJson()` check ada di semua controller yang bisa menerima kedua tipe request

## 3. Tambah Logging ke Semua Catch Block

- [x] 3.1 Di `AuditLogController.php`, tambah `Log::error('Failed to fetch audit logs', ['error' => $e->getMessage()])` di kedua catch block
- [x] 3.2 Audit semua controller lain — cek catch block yang tidak punya `Log::error()` atau `Log::warning()`
- [x] 3.3 Tambah logging ke catch block yang belum punya, dengan context: nama operasi + `error` message
- [x] 3.4 Pastikan tidak ada JWT token atau password yang masuk ke log context

## 4. Verifikasi

- [x] 4.1 Jalankan `php artisan test` — pastikan semua PHPUnit test masih passing
- [x] 4.2 Test manual: matikan Core API, akses halaman — pastikan dapat error yang proper bukan blank page atau hang
- [x] 4.3 Cek Laravel log (`storage/logs/laravel.log`) — pastikan error tercatat dengan format yang benar
