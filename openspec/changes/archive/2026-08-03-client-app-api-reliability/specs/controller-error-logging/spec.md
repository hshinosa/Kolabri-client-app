## ADDED Requirements

### Requirement: Semua catch block di controller mencatat error ke log
Setiap `catch` block di controller HARUS memanggil `Log::error()` dengan context yang cukup untuk debugging: nama operasi, pesan error, dan data relevan (user ID, resource ID, dll). The system MUST enforce: Semua catch block di controller mencatat error ke log.

#### Scenario: Error tercatat saat Core API request gagal
- **WHEN** HTTP request ke Core API melempar exception
- **THEN** `Log::error()` dipanggil dengan message yang deskriptif dan array context yang mengandung `error` (message exception) dan data relevan

#### Scenario: AuditLogController mencatat error
- **WHEN** request ke `/api/admin/audit-logs` gagal
- **THEN** error tercatat di Laravel log dengan context yang cukup untuk debugging

#### Scenario: Log tidak mengekspos data sensitif
- **WHEN** error di-log
- **THEN** log tidak mengandung JWT token, password, atau data PII user
