## 1. Verifikasi Core API Socket.IO

- [x] 1.1 Baca `Kolabri-core-api/src/socket/index.ts` — verifikasi apakah sudah baca `socket.handshake.auth.token` atau masih pakai query param
- [x] 1.2 Kalau Core API belum baca `auth.token`, update `socket/index.ts` untuk baca dari `socket.handshake.auth.token` sebagai fallback di samping query param yang lama

## 2. Fix JwtAuthMiddleware — tambah expiry check

- [x] 2.1 Di `app/Http/Middleware/JwtAuthMiddleware.php`, tambah fungsi helper private `decodeJwtPayload(string $token): ?array` yang base64url-decode bagian payload JWT (index 1 setelah split `.`)
- [x] 2.2 Setelah cek `session('jwt')` ada, panggil `decodeJwtPayload` dan cek field `exp` vs `time()`
- [x] 2.3 Kalau expired: panggil `session()->forget(['jwt', 'refresh_token', 'user'])`, lalu return redirect ke login (atau 401 JSON kalau `expectsJson()`)
- [x] 2.4 Jalankan `php artisan test --filter JwtAuthMiddlewareTest` — pastikan test yang ada masih passing

## 3. Fix getAuthToken.ts — tambah TTL cache

- [x] 3.1 Di `resources/js/lib/getAuthToken.ts`, tambah variabel `cachedAt: number | null = null`
- [x] 3.2 Tambah konstanta `CACHE_TTL_MS = 4 * 60 * 1000` (4 menit)
- [x] 3.3 Saat set `cachedToken`, set juga `cachedAt = Date.now()`
- [x] 3.4 Di awal `getAuthToken()`, tambah kondisi: kalau `cachedToken` ada tapi `Date.now() - cachedAt > CACHE_TTL_MS`, reset `cachedToken = null` dan `cachedAt = null` sebelum fetch ulang
- [x] 3.5 Di `clearAuthToken()`, reset juga `cachedAt = null`

## 4. Hapus localStorage dari auth.ts

- [x] 4.1 Di `resources/js/lib/auth.ts`, hapus `localStorage.setItem(TOKEN_KEY, ...)`, `localStorage.setItem(REFRESH_TOKEN_KEY, ...)`, `localStorage.setItem(TOKEN_EXPIRY_KEY, ...)` dari `setTokens()`
- [x] 4.2 Hapus `localStorage.getItem(TOKEN_KEY)` dari `getAccessToken()` — return null atau kosong
- [x] 4.3 Hapus `localStorage.getItem(REFRESH_TOKEN_KEY)` dari `getRefreshToken()` — return null
- [x] 4.4 Hapus `localStorage.removeItem(...)` dari `clearTokens()`
- [x] 4.5 Hapus `localStorage.getItem(TOKEN_EXPIRY_KEY)` dari `isTokenExpiringSoon()`
- [x] 4.6 Cek semua file yang import dari `auth.ts` — pastikan tidak ada yang bergantung pada `authStorage.getAccessToken()` untuk logic kritis (search: `authStorage.getAccessToken`)
- [x] 4.7 Jalankan TypeScript check: `npx tsc --noEmit` — pastikan tidak ada type error baru

## 5. Fix WebSocket — ganti URL query param ke auth object

- [x] 5.1 Di `resources/js/lib/websocket.ts`, hapus `normalizedUrl.searchParams.set('token', token)`
- [x] 5.2 Ganti `new WebSocket(resolveWebSocketUrl(token))` — karena ini native WebSocket bukan Socket.IO, perlu evaluasi: kalau admin WebSocket ini tidak pakai Socket.IO, kirim token via first message setelah `open` event
- [x] 5.3 Di `resources/js/pages/student/chat/room.tsx`, cari inisialisasi `io(apiUrl, {...})` — tambah `auth: { token: jwtToken }` ke options object
- [x] 5.4 Di `resources/js/pages/student/chat/index.tsx`, lakukan hal yang sama untuk socket init
- [x] 5.5 Pastikan `jwtToken` state sudah terisi sebelum socket init dipanggil (cek `useEffect` dependency array)

## 6. Verifikasi end-to-end

- [x] 6.1 Build frontend: `npm run build` — pastikan tidak ada error
- [x] 6.2 Buka browser DevTools → Application → Local Storage — pastikan tidak ada key `kolabri_access_token` setelah login
- [x] 6.3 Buka Network tab — pastikan WebSocket URL tidak mengandung `?token=`
- [x] 6.4 Simulasikan token expired: set `exp` ke masa lalu di session, akses halaman protected — pastikan redirect ke login
- [x] 6.5 Jalankan PHPUnit: `php artisan test` — pastikan semua test passing
