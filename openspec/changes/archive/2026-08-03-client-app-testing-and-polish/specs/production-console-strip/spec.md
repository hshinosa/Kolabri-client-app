## ADDED Requirements

### Requirement: Production build tidak mengandung console calls
Build production (`npm run build`) HARUS menghasilkan bundle yang tidak mengandung `console.log`, `console.error`, `console.warn`, atau `console.debug` calls. The system MUST enforce: Production build tidak mengandung console calls.

#### Scenario: console.log tidak ada di production bundle
- **WHEN** production bundle di-inspect
- **THEN** tidak ada string `console.log` di output bundle

### Requirement: errorHandler menangani semua tipe error
`getErrorMessage()` di `errorHandler.ts` HARUS mengembalikan pesan yang informatif untuk semua tipe error: Axios error, native Error, TypeError, dan domain error dari Core API. The system MUST enforce: errorHandler menangani semua tipe error.

#### Scenario: Native Error ditangani
- **WHEN** `getErrorMessage(new Error('something failed'))` dipanggil
- **THEN** mengembalikan string pesan yang tidak generic

#### Scenario: Domain error dari Core API ditangani
- **WHEN** `getErrorMessage({ code: 'VALIDATION_ERROR', message: 'Email sudah digunakan' })` dipanggil
- **THEN** mengembalikan pesan yang relevan

### Requirement: Dark mode toggle tersedia di authenticated pages
`app-layout.tsx` HARUS menyediakan toggle untuk dark mode yang dapat diakses oleh semua authenticated users. The system MUST enforce: Dark mode toggle tersedia di authenticated pages.

#### Scenario: Toggle dark mode di authenticated page
- **WHEN** user mengklik dark mode toggle di header
- **THEN** tema berubah dan preferensi tersimpan ke `kolabri_theme`

### Requirement: Visual regression tests untuk halaman utama
Playwright HARUS memiliki snapshot tests untuk: halaman login, dashboard dosen, dashboard mahasiswa, dan chat room. The system MUST enforce: Visual regression tests untuk halaman utama.

#### Scenario: Snapshot test halaman login
- **WHEN** Playwright mengakses halaman login
- **THEN** screenshot match dengan snapshot yang tersimpan (dalam toleransi yang ditentukan)
