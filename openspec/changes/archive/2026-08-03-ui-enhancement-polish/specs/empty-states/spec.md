## ADDED Requirements

### Requirement: Reusable EmptyState component
A reusable `EmptyState` component SHALL be created with slots for icon, title, description, and action button.

#### Scenario: EmptyState component structure
- **WHEN** EmptyState component is rendered
- **THEN** it displays centered icon (48px), title (text-lg font-semibold), description (text-sm text-muted), and optional CTA button

### Requirement: Empty state for student courses
Student courses page SHALL show a contextual empty state when no courses are enrolled.

#### Scenario: No courses enrolled
- **WHEN** student visits courses page with 0 enrollments
- **THEN** EmptyState shows book icon, "Belum ada kursus", description about browsing available courses, and "Jelajahi Kursus" button

### Requirement: Empty state for dashboard activity feed
Dashboard activity feeds SHALL show an empty state when no recent activity exists.

#### Scenario: No recent activity
- **WHEN** dashboard loads with empty recentActivity array
- **THEN** EmptyState shows activity icon, "Belum ada aktivitas", and description about activity appearing here

### Requirement: Empty state for chat spaces
Chat spaces page SHALL show an empty state when no chat spaces exist.

#### Scenario: No chat spaces
- **WHEN** student visits chat-spaces with 0 spaces
- **THEN** EmptyState shows message icon, "Belum ada sesi chat", description, and "Buat Sesi" button

### Requirement: Empty state for reflections
Reflections page SHALL show an empty state when no reflections exist.

#### Scenario: No reflections written
- **WHEN** student visits reflections page with 0 reflections
- **THEN** EmptyState shows pencil icon, "Belum ada refleksi", description about starting first reflection, and "Tulis Refleksi" button

### Requirement: Empty state for admin audit log
Admin audit log SHALL show an empty state when no logs exist for the selected filters.

#### Scenario: No audit logs matching filter
- **WHEN** admin applies filters that match 0 logs
- **THEN** EmptyState shows filter icon, "Tidak ada log ditemukan", and "Reset Filter" button
