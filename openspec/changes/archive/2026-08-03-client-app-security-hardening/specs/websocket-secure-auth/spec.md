## ADDED Requirements

### Requirement: WebSocket token dikirim via auth object
Socket.IO connection HARUS mengirim JWT via `auth` option (`{ auth: { token } }`), bukan via URL query parameter. Token TIDAK BOLEH muncul di URL WebSocket. The system MUST enforce: WebSocket token dikirim via auth object.

#### Scenario: Socket.IO connect tanpa token di URL
- **WHEN** Socket.IO connection dibuat
- **THEN** URL WebSocket tidak mengandung query parameter `token`

#### Scenario: Token tersedia di server via handshake auth
- **WHEN** Socket.IO connection dibuat dengan `auth: { token }`
- **THEN** Core API dapat membaca token via `socket.handshake.auth.token`

#### Scenario: Connection gagal kalau token tidak tersedia
- **WHEN** `getAuthToken()` gagal dan token tidak tersedia
- **THEN** Socket.IO connection tidak dibuat, dan error ditampilkan ke user
