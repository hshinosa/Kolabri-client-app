## ADDED Requirements

### Requirement: apiUrl() dan apiRequest() tersedia di base Controller
Base `Controller.php` HARUS menyediakan method `protected apiUrl(): string` dan `protected apiRequest()` yang dapat digunakan oleh semua controller turunan. Controller turunan TIDAK BOLEH mendefinisikan ulang method ini. The system MUST enforce: apiUrl() dan apiRequest() tersedia di base Controller.

#### Scenario: Controller turunan dapat memanggil apiUrl()
- **WHEN** controller yang extend `Controller` memanggil `$this->apiUrl()`
- **THEN** method mengembalikan base URL Core API dari config

#### Scenario: Controller turunan dapat memanggil apiRequest()
- **WHEN** controller yang extend `Controller` memanggil `$this->apiRequest()`
- **THEN** method mengembalikan HTTP client dengan JWT token dari session

#### Scenario: Tidak ada duplikasi method di controller turunan
- **WHEN** codebase di-inspect
- **THEN** tidak ada controller yang mendefinisikan `apiUrl()` atau `apiRequest()` sendiri
