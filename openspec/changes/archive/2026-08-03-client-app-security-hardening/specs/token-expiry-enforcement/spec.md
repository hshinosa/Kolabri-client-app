## ADDED Requirements

### Requirement: Token cache memiliki TTL
`getAuthToken()` HARUS meng-cache token dengan TTL maksimal 4 menit. Setelah TTL habis, token di-fetch ulang dari `/api/auth/token` pada pemanggilan berikutnya. The system MUST enforce: Token cache memiliki TTL.

#### Scenario: Token di-cache dan dikembalikan dalam TTL
- **WHEN** `getAuthToken()` dipanggil dan cache masih valid (belum 4 menit)
- **THEN** token dikembalikan dari cache tanpa HTTP request ke `/api/auth/token`

#### Scenario: Cache diinvalidasi setelah TTL habis
- **WHEN** `getAuthToken()` dipanggil dan cache sudah lebih dari 4 menit
- **THEN** sistem melakukan HTTP request ke `/api/auth/token` untuk mendapatkan token baru

#### Scenario: Request concurrent tidak flood endpoint
- **WHEN** dua atau lebih komponen memanggil `getAuthToken()` secara bersamaan saat cache expired
- **THEN** hanya satu HTTP request yang dikirim ke `/api/auth/token`, dan semua pemanggil mendapat token yang sama

### Requirement: JwtAuthMiddleware memverifikasi expiry token
`JwtAuthMiddleware` HARUS mendecode payload JWT dan memverifikasi field `exp` sebelum meneruskan request. Request dengan token expired HARUS diblokir dan session HARUS dihapus. The system MUST enforce: JwtAuthMiddleware memverifikasi expiry token.

#### Scenario: Request dengan token valid diteruskan
- **WHEN** request masuk dengan JWT yang belum expired di session
- **THEN** request diteruskan ke controller berikutnya

#### Scenario: Request dengan token expired diblokir
- **WHEN** request masuk dengan JWT yang sudah expired di session
- **THEN** session dihapus (jwt, refresh_token, user), dan user di-redirect ke halaman login

#### Scenario: Request JSON dengan token expired mendapat 401
- **WHEN** AJAX/JSON request masuk dengan JWT yang sudah expired
- **THEN** response JSON `{"message": "Session expired"}` dengan status 401 dikembalikan
