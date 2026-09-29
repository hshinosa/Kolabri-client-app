## ADDED Requirements

### Requirement: Stat card hover micro-interaction
Stat cards SHALL have a subtle hover effect that elevates the card and changes border color.

#### Scenario: Hover on stat card
- **WHEN** user hovers over a stat card
- **THEN** card translates up 2px, shadow increases, and border transitions to brand-primary/20

### Requirement: Stat card gradient border on active state
Stat cards with primary metrics SHALL have a subtle gradient border accent.

#### Scenario: Primary stat card rendering
- **WHEN** stat card is marked as primary (e.g., total users on admin dashboard)
- **THEN** card has a subtle gradient border from brand-primary to transparent

### Requirement: Stat card number animation
Stat card numbers SHALL animate from 0 to final value on first render.

#### Scenario: Dashboard initial load
- **WHEN** dashboard loads and stat card receives its value
- **THEN** number counts up from 0 to final value over 0.8s with easeOut

### Requirement: Stat card icon background consistency
Stat card icons SHALL have consistent background treatment with brand-tinted colors.

#### Scenario: Icon rendering across roles
- **WHEN** any dashboard stat card renders
- **THEN** icon has rounded-lg background with brand-primary/10 and brand-primary icon color

### Requirement: Stat card loading skeleton
Stat cards SHALL show a skeleton placeholder while data loads.

#### Scenario: Stat card loading state
- **WHEN** dashboard data is loading
- **THEN** stat card shows skeleton bars for number (w-20) and label (w-24)
