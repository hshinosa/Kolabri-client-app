## ADDED Requirements

### Requirement: Error response JSON menggunakan format standar
Semua controller yang mengembalikan JSON error response HARUS menggunakan format `{"message": "<pesan>", "code": "<ERROR_CODE>"}` dengan HTTP status code yang tepat. The system MUST enforce: Error response JSON menggunakan format standar.

#### Scenario: Core API error dikembalikan dengan format standar
- **WHEN** Core API mengembalikan error (4xx atau 5xx)
- **THEN** Laravel controller mengembalikan JSON `{"message": "...", "code": "..."}` dengan status code yang sama

#### Scenario: Timeout error dikembalikan dengan format standar
- **WHEN** request ke Core API timeout
- **THEN** Laravel controller mengembalikan JSON `{"message": "Service unavailable", "code": "SERVICE_TIMEOUT"}` dengan status 503

### Requirement: Page requests menggunakan abort() untuk error
Controller yang merender Inertia page HARUS menggunakan `abort(404)` untuk resource not found dan `abort(500)` untuk server error — bukan `response()->json()`. The system MUST enforce: Page requests menggunakan abort() untuk error.

#### Scenario: Resource tidak ditemukan pada page request
- **WHEN** Core API mengembalikan 404 untuk page request
- **THEN** Laravel memanggil `abort(404)` yang merender halaman 404 yang sesuai

#### Scenario: JSON request mendapat JSON error
- **WHEN** AJAX request (`expectsJson()` true) mendapat error dari Core API
- **THEN** response JSON dengan format standar dikembalikan, bukan redirect atau abort
