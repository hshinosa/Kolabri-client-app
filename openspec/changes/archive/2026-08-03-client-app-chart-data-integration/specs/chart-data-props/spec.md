## ADDED Requirements

### Requirement: Chart menerima data via props
`MetricsRadarChart` dan `PlanVsDiskusiChart` HARUS menerima data via props. Komponen TIDAK BOLEH mengandung hardcoded data values. Props HARUS mencakup: `data` (array angka), `labels` (array string, opsional), `isLoading` (boolean, opsional), `error` (string, opsional). The system MUST enforce: Chart menerima data via props.

#### Scenario: Chart render dengan data dari props
- **WHEN** komponen menerima `data` yang valid via props
- **THEN** chart merender data tersebut, bukan hardcoded values

#### Scenario: Chart tampilkan loading state
- **WHEN** `isLoading` prop bernilai `true`
- **THEN** komponen menampilkan skeleton loader, bukan chart kosong atau data lama

#### Scenario: Chart tampilkan empty state
- **WHEN** `data` prop kosong atau undefined dan `isLoading` false
- **THEN** komponen menampilkan pesan "Data belum tersedia" atau empty state yang informatif

### Requirement: Dashboard fetch data chart dari Core API
`lecturer/dashboard.tsx` HARUS fetch data untuk kedua chart dari Core API saat komponen mount. Data HARUS di-pass ke komponen chart via props. The system MUST enforce: Dashboard fetch data chart dari Core API.

#### Scenario: Data berhasil di-fetch dan ditampilkan
- **WHEN** dashboard mount dan Core API mengembalikan data chart
- **THEN** kedua chart menampilkan data yang di-fetch, bukan hardcoded values

#### Scenario: Fetch gagal ditangani dengan graceful
- **WHEN** fetch data chart gagal (network error atau Core API error)
- **THEN** chart menampilkan error state yang informatif, bukan crash atau data dummy
