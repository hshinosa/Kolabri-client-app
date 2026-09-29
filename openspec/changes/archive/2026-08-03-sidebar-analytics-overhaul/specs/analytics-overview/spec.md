## ADDED Requirements

### Requirement: Sidebar navigation is flat with no sub-items
The sidebar for lecturer role SHALL display exactly 3 top-level items (Dasbor, Kelas Saya, Analytics) with no conditional sub-items. The Analytics menu item SHALL always link to the Analytics Overview page.

#### Scenario: Sidebar shows 3 flat items on dashboard
- **WHEN** lecturer is on the dashboard page
- **THEN** sidebar shows Dasbor, Kelas Saya, Analytics with no sub-items under any item

#### Scenario: Sidebar shows 3 flat items on course detail page
- **WHEN** lecturer is on a course detail page
- **THEN** sidebar shows Dasbor, Kelas Saya, Analytics with no sub-items under any item

#### Scenario: Analytics menu always navigates to overview
- **WHEN** lecturer clicks Analytics in the sidebar from any page
- **THEN** browser navigates to the Analytics Overview page

### Requirement: Analytics Overview page lists all lecturer courses
The Analytics Overview page SHALL display a card grid of all courses owned by the authenticated lecturer, each card showing summary analytics data.

#### Scenario: Overview page loads with course cards
- **WHEN** lecturer navigates to Analytics Overview
- **THEN** page displays one card per course the lecturer owns

#### Scenario: Course card shows quality score
- **WHEN** a course card is displayed
- **THEN** it shows the average quality score across all groups in that course (0-100 scale)

#### Scenario: Course card shows student and group counts
- **WHEN** a course card is displayed
- **THEN** it shows the number of enrolled students and number of groups

#### Scenario: Course card shows needs-attention badge
- **WHEN** a course has at least one group with quality score below 50 OR no activity in the last 7 days
- **THEN** the card displays a "Perlu Perhatian" badge

#### Scenario: Clicking a course card navigates to course analytics
- **WHEN** lecturer clicks a course card on the overview page
- **THEN** browser navigates to the analytics detail page for that course

#### Scenario: Empty state when no courses exist
- **WHEN** lecturer has no courses
- **THEN** page displays an empty state message

### Requirement: Analytics Overview API endpoint
The Core-API SHALL expose `GET /api/analytics/overview` that returns aggregated analytics data for all courses owned by the authenticated lecturer.

#### Scenario: Endpoint returns course list with analytics
- **WHEN** authenticated lecturer calls `GET /api/analytics/overview`
- **THEN** response contains array of courses with `courseId`, `courseName`, `studentsCount`, `groupsCount`, `avgQualityScore`, `needsAttention`, `lastActivity`

#### Scenario: needsAttention is true for low quality courses
- **WHEN** a course has at least one group with quality score below 50
- **THEN** `needsAttention` is `true` for that course

#### Scenario: needsAttention is true for inactive courses
- **WHEN** a course has no chat activity in the last 7 days
- **THEN** `needsAttention` is `true` for that course

#### Scenario: Endpoint requires authentication
- **WHEN** request is made without valid JWT token
- **THEN** response is 401 Unauthorized
