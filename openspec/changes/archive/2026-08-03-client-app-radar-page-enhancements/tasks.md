## 1. Pre-flight

- [x] 1.1 Run baseline `npx tsc --noEmit && npx eslint resources/js && npx vitest run`
- [x] 1.2 Confirm mock data shape supports class average lookup

## 2. Extend MetricsRadarChart props

- [x] 2.1 Add optional `comparisonData`, `comparisonLabel`, `primaryLabel`, `classAverageData`, `classAverageLabel` props
- [x] 2.2 Compute datasets array conditionally (1-3 polygons)
- [x] 2.3 Distinct colors: primary burgundy, comparison slate, class avg ghost-grey
- [x] 2.4 Show legend when >1 dataset
- [x] 2.5 Update existing tests if any

## 3. Build MetricBreakdownTable

- [x] 3.1 Create as inline component or standalone in `resources/js/components/MetricBreakdownTable.tsx`
- [x] 3.2 Render rows: Metric | Primary | Comparison? | Δ vs Class
- [x] 3.3 Color delta cells (green ≥+0.5, red ≤-0.5, neutral else)
- [x] 3.4 Compact spacing, glass card aesthetic

## 4. RadarChartPage state

- [x] 4.1 Add `comparisonMode` (boolean) + `secondaryId` (string|null) state
- [x] 4.2 Toggle button after scope tabs
- [x] 4.3 Sidebar items show checkbox indicator when comparisonMode true
- [x] 4.4 Click item: if comparisonMode and primary not equal → set as secondary
- [x] 4.5 Reset secondaryId when scope or class changes

## 5. Wire data flow

- [x] 5.1 Compute primaryEntity (existing)
- [x] 5.2 Compute secondaryEntity from secondaryId
- [x] 5.3 Pass classAverage = activeClass.metrics to MetricsRadarChart + MetricBreakdownTable
- [x] 5.4 Render insight panel split when comparison active

## 6. UX polish

- [x] 6.1 Hint text when comparisonMode but only primary selected
- [x] 6.2 Toggle button label: "Bandingkan" ↔ "Selesai Bandingkan"
- [x] 6.3 Toggle button visual state (outlined → filled burgundy)

## 7. Verify

- [x] 7.1 `npx tsc --noEmit` clean
- [x] 7.2 `npx eslint resources/js` clean
- [x] 7.3 `npx vitest run` passing (existing tests still pass)
- [x] 7.4 Manual: visit `/lecturer/radar-chart`, verify 4 scopes still work
- [x] 7.5 Manual: enable comparison, pick 2 groups, verify overlay
- [x] 7.6 Manual: switch scope to student, verify class avg faint polygon
- [x] 7.7 `openspec validate client-app-radar-page-enhancements --strict`
