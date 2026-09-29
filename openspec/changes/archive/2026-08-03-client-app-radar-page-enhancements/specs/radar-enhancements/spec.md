# Radar Page Enhancements

## ADDED Requirements

### Requirement: Comparison mode MUST overlay two entities on the same radar

The radar page SHALL provide a toggle that, when enabled, allows the user to select a second entity from the sidebar. The radar MUST then render both entities' metric polygons on the same chart with distinct visual styles.

#### Scenario: User enables comparison and selects second group

- Given the user is on `/lecturer/radar-chart` with scope = group
- When the user clicks "Bandingkan" toggle
- And then clicks a second group in the sidebar
- Then the radar MUST render two overlapping polygons (primary in burgundy, secondary in slate)
- And a legend MUST appear showing both entity labels
- And the insight panel MUST display two notes (one per entity)

#### Scenario: Switching scope resets comparison

- Given comparison mode is active with two entities selected
- When the user switches scope tab (e.g., group → student)
- Then `secondaryId` MUST be reset to null
- And the radar MUST render only the new primary entity

### Requirement: Score breakdown table MUST display below radar

A table SHALL appear below the radar showing each of the six metrics with the primary entity's value, optionally the comparison entity's value, and the delta vs class average.

#### Scenario: Single entity view

- Given comparison is OFF
- When the page renders
- Then the breakdown table MUST have columns: Metric | Value | Δ vs Class
- And the delta cell MUST be color-coded (green if delta ≥ +0.5, red if ≤ -0.5, neutral otherwise)

#### Scenario: Comparison view

- Given comparison is ON with two entities selected
- When the page renders
- Then the breakdown table MUST add a "Comparison" column showing the secondary entity's value per metric
- And the delta column MUST still reference class average for the primary entity

### Requirement: Class average MUST be overlaid for non-class scopes

When the active scope is `group`, `student`, or `session`, the radar SHALL render a faint background polygon representing the class-level metrics for context.

#### Scenario: Group scope active

- Given the user selects a group
- When the radar renders
- Then a faint grey polygon MUST appear behind the group's burgundy polygon
- And the polygon's data MUST equal the active class's class-level metrics
- And the legend MUST label this dataset "Rata-rata kelas"

#### Scenario: Class scope active

- Given the user selects scope = class
- When the radar renders
- Then no class-average overlay MUST be drawn (active entity IS the class average)
- And the radar MUST render a single primary polygon
