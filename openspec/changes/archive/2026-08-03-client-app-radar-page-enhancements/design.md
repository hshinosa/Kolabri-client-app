# Design

## State Additions

```typescript
const [comparisonMode, setComparisonMode] = useState(false);
const [secondaryId, setSecondaryId] = useState<string | null>(null);
```

When `comparisonMode === true`, sidebar items show checkbox; selecting another item sets `secondaryId`. Selecting a third item replaces `secondaryId` (FIFO with primary stable).

Primary entity stays driven by existing scope-specific active id (`activeGroupId`, `activeStudentId`, etc).

## MetricsRadarChart Props Extension

```typescript
interface MetricsRadarChartProps {
    data?: number[];
    labels?: string[];
    isLoading?: boolean;
    error?: string;
    // NEW
    comparisonData?: number[];
    comparisonLabel?: string;
    primaryLabel?: string;
    classAverageData?: number[];
    classAverageLabel?: string;
}
```

Datasets order (when all present):
1. Class average (faint, behind all)
2. Comparison entity (semi-transparent slate)
3. Primary entity (burgundy, on top)

Chart.js handles overlapping radars natively; just push to `datasets[]`.

## MetricBreakdownTable

```typescript
interface MetricBreakdownTableProps {
    metrics: number[];
    labels: string[];
    classAverage: number[];
    primaryLabel: string;
    comparisonMetrics?: number[];
    comparisonLabel?: string;
}
```

Renders:
| Metric | Primary | (Comparison) | Δ vs Class |
|---|---|---|---|
| Hot | 7.8 | 8.4 | +1.0 (green) |
| ... | ... | ... | ... |

## Class Average Calculation

Compute once per active class:
```typescript
const classAverage = useMemo(() => {
    return METRIC_LABELS.map((_, idx) =>
        activeClass.metrics[idx]
    );
}, [activeClass]);
```

Currently the class metrics in mock data already represent the class avg. So `classAverage = activeClass.metrics`. When real API lands, the endpoint returns class-level + entity-level separately.

## Comparison Toggle UX

Tab area gets one extra control after scope tabs:

```
[ Kelas ] [ Kelompok ] [ Mahasiswa ] [ Sesi ]    [ ⊕ Bandingkan ]
```

When `comparisonMode === true`:
- Toggle becomes filled burgundy with text "Berhenti Bandingkan"
- Sidebar items render with checkbox indicator
- If only primary selected, show subtle hint: "Pilih item kedua untuk perbandingan"

## Insight Panel in Comparison Mode

Single-entity mode keeps current insight UI.

Comparison mode renders 2-column note panel:
```
Lightbulb icon — {primaryLabel}: {primary.note}
Lightbulb icon — {comparisonLabel}: {comparison.note}
```

## Color Palette

- Primary entity: `rgba(136, 22, 28, 0.25)` fill, `#88161c` stroke (existing)
- Comparison entity: `rgba(71, 85, 105, 0.20)` fill, `#475569` stroke (slate, neutral, no AI vibe)
- Class average: `rgba(74, 74, 74, 0.08)` fill, `rgba(74, 74, 74, 0.30)` stroke (very faint background)

## Trade-offs

- Comparison limited to 2 entities (avoid radar clutter; >2 polygons hard to read)
- Class average always shown for non-class scopes (no toggle); rationale: it's faint enough not to distract, always-helpful
- Score breakdown table uses class avg as comparison base (not comparison entity); simpler mental model

## Test Strategy

- Unit: `MetricsRadarChart` renders 1, 2, or 3 datasets correctly
- Manual: toggle comparison, switch entities, verify polygons + insight panel
- Manual: switch scope to student → see class avg faint polygon behind
