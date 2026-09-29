## ADDED Requirements

### Requirement: Semua HTTP request ke Core API memiliki timeout
Setiap `Http::withToken(...)` call di controller HARUS diikuti `.timeout(10)->connectTimeout(5)` sebelum method HTTP (`.get()`, `.post()`, dll). Nilai timeout DAPAT dikonfigurasi via environment variable `API_TIMEOUT` (default 10) dan `API_CONNECT_TIMEOUT` (default 5). The system MUST enforce: Semua HTTP request ke Core API memiliki timeout.

#### Scenario: Request normal selesai dalam timeout
- **WHEN** Core API merespons dalam 10 detik
- **THEN** response diproses normal

#### Scenario: Request timeout karena Core API lambat
- **WHEN** Core API tidak merespons dalam 10 detik
- **THEN** `ConnectionException` ditangkap, error di-log, dan response error yang sesuai dikembalikan ke client

#### Scenario: Connect timeout karena Core API down
- **WHEN** koneksi ke Core API tidak bisa dibuat dalam 5 detik
- **THEN** `ConnectionException` ditangkap, error di-log, dan response error yang sesuai dikembalikan ke client
