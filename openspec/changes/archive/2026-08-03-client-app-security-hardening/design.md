## Context

Kolabri-client-app adalah BFF (Backend-for-Frontend) berbasis Laravel + React. Laravel mengelola session dan proxy ke Core API. React menangani UI dan real-time chat via Socket.IO.

Saat ini ada 4 masalah keamanan:
1. `auth.ts` menyimpan JWT di `localStorage` — rentan XSS karena script apapun bisa baca token
2. `getAuthToken.ts` meng-cache token tanpa TTL — token expired masih dipakai sampai page reload
3. `JwtAuthMiddleware.php` hanya cek keberadaan session, tidak verifikasi expiry JWT
4. `websocket.ts` mengirim JWT via URL query param — token masuk browser history, server log, proxy log

Arsitektur BFF sudah menyediakan solusi alami: Laravel session sudah httpOnly, dan endpoint `/api/auth/token` sudah ada untuk frontend mengambil token saat dibutuhkan.

## Goals / Non-Goals

**Goals:**
- Frontend tidak menyimpan JWT di localStorage
- Token cache di frontend memiliki TTL yang align dengan expiry
- Laravel middleware memblokir request dengan token expired sebelum sampai ke Core API
- WebSocket handshake tidak mengekspos token di URL

**Non-Goals:**
- Tidak mengubah Core API atau AI Engine
- Tidak mengubah mekanisme JWT generation/signing (tetap di Core API)
- Tidak mengimplementasikan refresh token rotation (sudah ada di Core API)
- Tidak mengubah database schema

## Decisions

### 1. Hapus localStorage di `auth.ts`, andalkan Laravel session

**Keputusan**: Hapus `authStorage.setTokens()`, `authStorage.getAccessToken()`, `authStorage.getRefreshToken()` dari localStorage. Token hanya hidup di Laravel session (httpOnly cookie).

**Alternatif yang dipertimbangkan**:
- *sessionStorage*: Lebih baik dari localStorage tapi masih accessible via JS — tidak cukup
- *Memory-only (module variable)*: Hilang saat page refresh, perlu fetch ulang — acceptable tapi perlu endpoint
- *httpOnly cookie langsung dari Core API*: Butuh perubahan Core API dan CORS config — out of scope

**Rationale**: Laravel session sudah httpOnly. Endpoint `/api/auth/token` sudah ada untuk frontend ambil token saat dibutuhkan. Tidak perlu duplikasi storage.

### 2. TTL cache di `getAuthToken.ts` — 4 menit

**Keputusan**: Cache token maksimal 4 menit (JWT access token biasanya 15 menit). Setelah 4 menit, fetch ulang dari `/api/auth/token`.

**Rationale**: 4 menit memberikan buffer 11 menit sebelum expiry. Tidak terlalu agresif (tidak flood endpoint) tapi tidak terlalu longgar (tidak pakai token yang hampir expired).

### 3. JWT expiry check di middleware — base64 decode, tidak verify signature

**Keputusan**: Di `JwtAuthMiddleware.php`, decode bagian payload JWT (base64url decode, tidak perlu verify signature — itu tugas Core API). Cek field `exp`. Kalau expired, clear session dan redirect ke login.

**Rationale**: Middleware tidak perlu verify signature karena Core API yang akan reject kalau token invalid. Tujuan middleware hanya early-exit untuk UX — jangan biarkan user stuck dengan session expired yang tidak terdeteksi.

### 4. WebSocket auth via Socket.IO `auth` object

**Keputusan**: Ganti `searchParams.set('token', token)` dengan Socket.IO `auth` option: `io(url, { auth: { token } })`.

**Alternatif yang dipertimbangkan**:
- *extraHeaders*: Tidak support di browser WebSocket native
- *First message handshake*: Lebih kompleks, butuh perubahan server-side
- *Cookie*: Ideal tapi butuh koordinasi dengan Core API CORS config

**Rationale**: Socket.IO `auth` object adalah cara standar untuk pass credentials di Socket.IO v4. Core API sudah pakai Socket.IO — tinggal baca `socket.handshake.auth.token` di server side.

## Risks / Trade-offs

- **[Risk] Core API Socket.IO belum baca `auth` object** → Verifikasi dulu di `src/socket/index.ts` Core API. Kalau belum, perlu update Core API juga (minor change).
- **[Risk] User yang sudah login dengan token di localStorage** → Saat deploy, user existing akan kehilangan cached token. Mereka perlu re-fetch dari `/api/auth/token`. Ini acceptable — tidak perlu logout paksa.
- **[Risk] `getAuthToken.ts` TTL 4 menit bisa menyebabkan race condition** → Kalau dua komponen fetch bersamaan saat cache expired, keduanya akan hit endpoint. Mitigasi: promise deduplication sudah ada di `getAuthToken.ts` (via `tokenPromise`).

## Migration Plan

1. Update `JwtAuthMiddleware.php` — tidak ada breaking change, hanya tambah early-exit
2. Update `getAuthToken.ts` — tambah TTL, backward compatible
3. Update `auth.ts` — hapus localStorage writes, keep interface untuk backward compat sementara
4. Update `websocket.ts` — ganti URL param ke auth object
5. Update `room.tsx` dan `index.tsx` — pakai auth object di socket init
6. Rollback: revert file-file di atas, tidak ada database migration

## Open Questions

- Apakah Core API `socket/index.ts` sudah baca `socket.handshake.auth.token`? Perlu dicek sebelum implementasi item #4.
