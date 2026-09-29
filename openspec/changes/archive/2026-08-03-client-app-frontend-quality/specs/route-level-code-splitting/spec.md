## ADDED Requirements

### Requirement: Halaman besar di-lazy load
Halaman dengan ukuran lebih dari 500 baris (`room.tsx`, `master-data.tsx`, `user-management.tsx`, `ai-settings.tsx`, `ai-chat/index.tsx`) HARUS di-lazy load menggunakan dynamic import. Initial bundle TIDAK BOLEH mengandung semua halaman sekaligus. The system MUST enforce: Halaman besar di-lazy load.

#### Scenario: Halaman chat room di-lazy load
- **WHEN** user pertama kali membuka aplikasi (bukan di halaman chat)
- **THEN** bundle chat room tidak di-download sampai user navigasi ke halaman chat

#### Scenario: Loading state ditampilkan saat lazy load
- **WHEN** user navigasi ke halaman yang di-lazy load dan bundle belum selesai di-download
- **THEN** loading indicator ditampilkan, bukan blank page
