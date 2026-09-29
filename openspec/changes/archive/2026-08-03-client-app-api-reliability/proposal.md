## Why

Semua controller Laravel melakukan HTTP request ke Core API tanpa timeout, tanpa standar error response, dan beberapa tanpa logging. Kalau Core API lambat atau down, request Laravel hang indefinitely dan bisa exhaust PHP-FPM worker pool. Error yang dikembalikan ke frontend tidak konsisten sehingga sulit di-handle secara predictable. Ini perlu diperbaiki sebelum sistem digunakan di lingkungan dengan traffic nyata.

## What Changes

- Tambah `.timeout(10)` dan `.connectTimeout(5)` ke semua HTTP request di 11 controller
- Standarisasi error response: page requests pakai `abort()`, JSON/AJAX requests pakai format `{"message": ..., "code": ...}` yang konsisten
- Tambah `Log::error()` di semua catch block yang belum punya logging (terutama `AuditLogController`)

## Capabilities

### New Capabilities

- `http-timeout-policy`: Semua HTTP request dari Laravel ke Core API memiliki timeout yang terdefinisi
- `error-response-standard`: Semua controller menggunakan format error response yang konsisten berdasarkan tipe request (page vs JSON)
- `controller-error-logging`: Semua catch block di controller mencatat error ke Laravel log

### Modified Capabilities

<!-- tidak ada existing specs -->

## Impact

- Semua 11 controller di `app/Http/Controllers/` yang pakai `Http::withToken()`
- `AuditLogController.php` — tambah logging
- Tidak ada perubahan database, Core API, atau AI Engine
- Tidak ada perubahan frontend
