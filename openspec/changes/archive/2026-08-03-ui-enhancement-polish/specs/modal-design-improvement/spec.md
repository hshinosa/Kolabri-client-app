## ADDED Requirements

### Requirement: Modal header section divider
Modal headers SHALL have a subtle bottom border to separate header from content.

#### Scenario: Modal with header
- **WHEN** FormModal renders with title and description
- **THEN** header section has `border-bottom: 1px solid var(--dm-border)` and `pb-4` padding

### Requirement: Modal footer section divider
Modal footers SHALL have a subtle top border to separate actions from content.

#### Scenario: Modal with action buttons
- **WHEN** FormModal renders with footer actions
- **THEN** footer section has `border-top: 1px solid var(--dm-border)` and `pt-4` padding

### Requirement: Modal content spacing
Modal content SHALL use consistent 16px (space-y-4) spacing between form fields.

#### Scenario: Modal form rendering
- **WHEN** FormModal renders with multiple form fields
- **THEN** fields are spaced with `space-y-4` (16px gaps)

### Requirement: Modal close button styling
Modal close buttons SHALL use consistent icon-only styling with hover state.

#### Scenario: Modal close button hover
- **WHEN** user hovers over modal close button
- **THEN** button background transitions to `var(--dm-surface-hover)` with 150ms transition

### Requirement: Modal backdrop blur
Modal backdrop SHALL use blur effect for depth perception.

#### Scenario: Modal open state
- **WHEN** modal opens
- **THEN** backdrop has `backdrop-filter: blur(4px)` with semi-transparent dark overlay
