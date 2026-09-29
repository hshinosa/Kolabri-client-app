## ADDED Requirements

### Requirement: Toast with action button
Toasts SHALL support an optional action button for undo, retry, or view details.

#### Scenario: Toast with retry action
- **WHEN** API call fails and shows error toast
- **THEN** toast displays with "Retry" action button that re-triggers the action

### Requirement: Toast animation
Toasts SHALL animate in from bottom-right with slide-up and fade effect.

#### Scenario: Toast entrance animation
- **WHEN** toast appears
- **THEN** it slides up from `y: 20` to `y: 0` with `opacity: 0 → 1` over 0.3s

### Requirement: Toast auto-dismiss with progress
Toasts SHALL auto-dismiss after 5 seconds with a visual progress indicator.

#### Scenario: Toast auto-dismiss
- **WHEN** success toast appears
- **THEN** a thin progress bar animates from 100% to 0% over 5s, then toast fades out

### Requirement: Toast type styling
Toasts SHALL have distinct styling per type (success, error, warning, info).

#### Scenario: Error toast styling
- **WHEN** error toast appears
- **THEN** it has red-tinted background, red icon, and red text

#### Scenario: Success toast styling
- **WHEN** success toast appears
- **THEN** it has green-tinted background, check icon, and green text

### Requirement: Toast stacking
Multiple toasts SHALL stack vertically with consistent spacing.

#### Scenario: Multiple toasts
- **WHEN** 3 toasts appear simultaneously
- **THEN** they stack with 8px gap, most recent on top
