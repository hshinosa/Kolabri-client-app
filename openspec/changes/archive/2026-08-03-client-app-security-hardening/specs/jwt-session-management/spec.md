## ADDED Requirements

### Requirement: JWT tidak disimpan di localStorage
Frontend TIDAK BOLEH menyimpan JWT access token atau refresh token di `localStorage`. Token dikelola sepenuhnya oleh Laravel session (httpOnly cookie). Frontend mengambil token saat dibutuhkan via endpoint `/api/auth/token`. The system MUST enforce: JWT tidak disimpan di localStorage.

#### Scenario: Token tidak tersimpan di localStorage setelah login
- **WHEN** user berhasil login
- **THEN** `localStorage` tidak mengandung key `kolabri_access_token`, `kolabri_refresh_token`, atau `kolabri_token_expiry`

#### Scenario: Frontend dapat mengambil token dari endpoint
- **WHEN** komponen membutuhkan JWT untuk request langsung ke Core API
- **THEN** `getAuthToken()` mengambil token dari `/api/auth/token` dan mengembalikan string token yang valid

#### Scenario: Token tidak tersedia saat session tidak ada
- **WHEN** user belum login dan `getAuthToken()` dipanggil
- **THEN** fungsi melempar error atau mengembalikan null, dan komponen menangani kondisi ini dengan redirect ke login
