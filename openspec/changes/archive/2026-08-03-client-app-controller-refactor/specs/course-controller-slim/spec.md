## ADDED Requirements

### Requirement: MasterDataController dipecah menjadi method yang lebih kecil
Method `index()` di `MasterDataController` HARUS dipecah menjadi private helper methods yang masing-masing menangani satu concern (fetch courses, fetch lecturers, fetch templates). Method `index()` hanya mengkoordinasikan pemanggilan helper methods. The system MUST enforce: MasterDataController dipecah menjadi method yang lebih kecil.

#### Scenario: index() tetap berfungsi sama setelah refactor
- **WHEN** request ke halaman master data dikirim
- **THEN** response yang dikembalikan identik dengan sebelum refactor

### Requirement: CourseController student-facing logic dipisahkan
Method-method student-facing di `CourseController` (`studentShow`, `studentGroups`, `studentChatSpace`) HARUS dipindahkan ke `StudentCourseController` yang terpisah. Routes HARUS diupdate untuk point ke controller yang tepat. The system MUST enforce: CourseController student-facing logic dipisahkan.

#### Scenario: Student dapat mengakses course detail
- **WHEN** student mengakses halaman detail course
- **THEN** `StudentCourseController` menangani request dan mengembalikan Inertia page yang benar

#### Scenario: Lecturer routes tidak terpengaruh
- **WHEN** lecturer mengakses halaman course management
- **THEN** `CourseController` tetap menangani request dengan behavior yang sama
