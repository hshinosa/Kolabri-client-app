## Why

Token JWT disimpan di `localStorage` dan dikirim via URL query param WebSocket — keduanya rentan XSS dan log exposure. Selain itu `JwtAuthMiddleware` tidak memverifikasi expiry token, dan `getAuthToken.ts` meng-cache token tanpa TTL, sehingga token expired masih dipakai sampai page reload. Masalah ini perlu diselesaikan sebelum sistem digunakan di lingkungan produksi nyata.

## What Changes

- Hapus penyimpanan JWT dari `localStorage` di `auth.ts` — token cukup dikelola oleh Laravel session (httpOnly cookie) karena arsitektur sudah BFF
- Tambah TTL check di `getAuthToken.ts` agar token yang mendekati expiry di-refresh sebelum dipakai
- Tambah expiry verification di `JwtAuthMiddleware.php` — decode JWT payload, cek field `exp`, redirect ke login kalau expired
- Ganti mekanisme pengiriman token di `websocket.ts` dari URL query param ke handshake auth object (Socket.IO native support)

## Capabilities

### New Capabilities

- `jwt-session-management`: Pengelolaan JWT sepenuhnya di sisi Laravel session — frontend tidak menyimpan token di localStorage, token diambil via endpoint `/api/auth/token` yang sudah ada
- `token-expiry-enforcement`: Middleware Laravel memverifikasi expiry JWT sebelum request diteruskan, dan client-side cache token memiliki TTL yang align dengan expiry
- `websocket-secure-auth`: Token dikirim via Socket.IO `auth` object pada saat handshake, bukan via URL query param

### Modified Capabilities

<!-- tidak ada existing specs -->

## Impact

- `resources/js/lib/auth.ts` — `authStorage` (localStorage operations) dihapus atau dijadikan no-op
- `resources/js/lib/getAuthToken.ts` — tambah TTL/expiry check sebelum return cached token
- `app/Http/Middleware/JwtAuthMiddleware.php` — tambah JWT payload decode + expiry check
- `resources/js/lib/websocket.ts` — ganti `searchParams.set('token', ...)` ke Socket.IO `auth` object
- `resources/js/pages/student/chat/room.tsx` — update socket init untuk pakai auth object
- `resources/js/pages/student/chat/index.tsx` — update socket init untuk pakai auth object
- Tidak ada perubahan database schema
- Tidak ada perubahan Core API atau AI Engine
