## ADDED Requirements

### Requirement: Unit test untuk komponen chat
Komponen `ChatMessageList`, `ChatInput`, dan `ChatHeader` (setelah decomposition dari openspec frontend-quality) HARUS memiliki unit test yang mencakup rendering normal, loading state, dan error state. The system MUST enforce: Unit test untuk komponen chat.

#### Scenario: ChatMessageList merender daftar pesan
- **WHEN** `ChatMessageList` dirender dengan array messages yang valid
- **THEN** setiap pesan ditampilkan dengan konten yang benar

#### Scenario: ChatInput disabled saat session closed
- **WHEN** `ChatInput` dirender dengan prop `disabled={true}`
- **THEN** input field dan tombol submit tidak bisa diinteraksi

### Requirement: Unit test untuk komponen chart
`MetricsRadarChart` dan `PlanVsDiskusiChart` HARUS memiliki unit test yang mencakup rendering dengan data, loading state, dan empty state. The system MUST enforce: Unit test untuk komponen chart.

#### Scenario: Chart merender dengan data valid
- **WHEN** komponen dirender dengan `data` prop yang valid
- **THEN** komponen merender tanpa error

#### Scenario: Chart menampilkan loading state
- **WHEN** komponen dirender dengan `isLoading={true}`
- **THEN** skeleton loader ditampilkan
