## ADDED Requirements

### Requirement: Route chart standalone dilindungi auth middleware
Route `/plan-vs-diskusi` dan `/lecturer/radar-chart` HARUS dilindungi middleware auth. Request tanpa session yang valid HARUS di-redirect ke halaman login. The system MUST enforce: Route chart standalone dilindungi auth middleware.

#### Scenario: Akses tanpa login di-redirect ke login
- **WHEN** user yang belum login mengakses `/plan-vs-diskusi`
- **THEN** user di-redirect ke halaman login

#### Scenario: Akses dengan login berhasil
- **WHEN** user yang sudah login mengakses `/plan-vs-diskusi`
- **THEN** halaman chart ditampilkan normal

### Requirement: Komponen chart tidak mengandung console.log
`MetricsRadarChart` TIDAK BOLEH mengandung `console.log` di production code, termasuk di onClick handler. The system MUST enforce: Komponen chart tidak mengandung console.log.

#### Scenario: Klik pada chart tidak menghasilkan console output
- **WHEN** user mengklik area chart di production build
- **THEN** tidak ada output di browser console dari komponen chart
