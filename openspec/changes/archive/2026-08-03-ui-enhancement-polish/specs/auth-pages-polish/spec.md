## ADDED Requirements

### Requirement: Consistent color tokens across auth pages
All auth pages (login, register, forgot-password, reset-password, verify-email) SHALL use `text-brand-dark` and `text-brand-muted-dark` for text colors instead of hardcoded hex values like `#4A4A4A` or `#6B7280`.

#### Scenario: Auth page text colors in light mode
- **WHEN** user views any auth page in light mode
- **THEN** all text uses `text-brand-dark` (heading) and `text-brand-muted-dark` (body) tokens

#### Scenario: Auth page text colors in dark mode
- **WHEN** user views any auth page in dark mode
- **THEN** all text auto-switches to light colors via CSS variable override in `.dark` scope

### Requirement: Entrance animations on auth pages
Auth page content SHALL animate in with a subtle fade-up effect using Framer Motion.

#### Scenario: Page load animation
- **WHEN** user navigates to any auth page
- **THEN** the form card fades in with `opacity: 0 → 1` and `y: 20 → 0` over 0.4s

### Requirement: Unified error message presentation
Error messages on auth pages SHALL use the `InputError` component consistently with red text and icon.

#### Scenario: Form validation error display
- **WHEN** user submits form with validation errors
- **THEN** each error appears below its field with `InputError` component, red text, and consistent spacing

### Requirement: Success message styling
Success messages (e.g., "Email sent", "Password reset") SHALL use a green-tinted card with check icon.

#### Scenario: Password reset email sent
- **WHEN** user successfully requests password reset
- **THEN** a green-tinted success card appears with check icon and confirmation text
