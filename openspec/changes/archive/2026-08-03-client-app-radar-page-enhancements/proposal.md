# Radar Page Enhancements — Comparison + Breakdown + Class Avg Overlay

## Problem Statement

Current `RadarChartPage` (mock preview) shows a single entity's metrics. Several actionable insights are absent:

1. **No comparison**: lecturers can't visualize Kelompok A vs B side-by-side without manually toggling tabs and remembering numbers
2. **No precise values**: radar is visual only. Lecturers need exact scores for evaluation reports / parent meetings
3. **No context**: when viewing a single student or group, there's no indication how they compare to class average

These are the three highest-value enhancements per the saved roadmap (`docs/lecturer/radar-enhancement-roadmap.md`).

## Proposed Solution

### 1. Comparison mode
- Toggle "Bandingkan" button in scope tabs area
- When enabled, sidebar items become checkboxes (max 2 selected)
- Radar shows two overlapping polygons with distinct fill colors
- Insight panel splits to show both entities

### 2. Score breakdown table
- Below the radar: 6-row table (one per metric) × 3 columns (Metric | Value | Δ vs Class Avg)
- Color-coded delta (green for above-avg, red for below)

### 3. Class average overlay
- When scope is `group` / `student` / `session`, render faint background polygon showing class average
- Active entity polygon on top in burgundy
- Legend: "{entity} vs Rata-rata kelas"

## Scope

- `resources/js/pages/lecturer/RadarChartPage.tsx` — UI changes, state management
- `resources/js/components/MetricsRadarChart.tsx` — accept optional `comparisonData` + `comparisonLabel` props for second polygon
- New helper component: `MetricBreakdownTable` (or inline)

## Out of Scope

- Real API integration (still mock)
- Time-series view (separate enhancement #6)
- Export PDF/PNG (separate enhancement #7)
