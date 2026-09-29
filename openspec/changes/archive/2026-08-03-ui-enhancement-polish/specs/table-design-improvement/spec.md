## ADDED Requirements

### Requirement: Table row hover state
Table rows SHALL have a subtle hover effect using `--dm-surface-hover` background.

#### Scenario: Hover on table row
- **WHEN** user hovers over a table row
- **THEN** row background transitions to `var(--dm-surface-hover)` over 150ms

### Requirement: Table header styling
Table headers SHALL have distinct styling with `--dm-text-muted` color and `font-medium` weight.

#### Scenario: Table header rendering
- **WHEN** table renders with header row
- **THEN** headers use `text-[var(--dm-text-muted)]`, `text-xs`, `font-medium`, `uppercase`, `tracking-wider`

### Requirement: Mobile card layout for tables
Tables SHALL display as cards on mobile screens with improved typography hierarchy.

#### Scenario: User management on mobile
- **WHEN** admin views user-management on mobile (< md breakpoint)
- **THEN** each row renders as a card with user name (font-semibold), role badge, and action buttons stacked vertically

### Requirement: Table empty state
Tables SHALL show an EmptyState component when no data matches filters.

#### Scenario: Table with no results
- **WHEN** table receives empty data array
- **THEN** EmptyState component renders with search icon and "Tidak ada data ditemukan" message

### Requirement: Table loading skeleton
Tables SHALL show skeleton rows during data loading.

#### Scenario: Table loading state
- **WHEN** table data is loading
- **THEN** 5 skeleton rows render with matching column structure
