## Context

Kolabri is an academic collaboration platform with 3 user roles (admin, lecturer, student). The app has a solid design system foundation with Tailwind v4 `@theme` tokens, CSS variable-based dark mode (`--dm-*`), and consistent component patterns. However, several UI areas lack polish: auth pages use inconsistent tokens, dashboards show raw values during loading, empty states are generic, and tables/modals feel basic.

Current state:
- Design system: `--color-brand-dark`, `--color-brand-primary`, `--dm-*` variables
- Dark mode: `.dark` scope overrides in `app.css`, `useDarkMode` hook
- Components: `LiquidGlassCard`, `PrimaryButton`, `SecondaryButton`, `InputError`, `SkeletonCard`
- Animations: Framer Motion available, used sparingly

## Goals / Non-Goals

**Goals:**
- Consistent visual polish across all pages
- Better perceived performance with skeleton loading states
- Contextual empty states that guide user action
- Refined stat cards, tables, and modals
- Unified auth page design

**Non-Goals:**
- No new features or functionality changes
- No API changes
- No new dependencies (use existing Framer Motion, Lucide icons)
- No redesign of page layouts or navigation structure
- No changes to business logic

## Decisions

### 1. CSS Variable Approach for Dark Mode
**Decision**: Use `--dm-*` CSS variables consistently instead of Tailwind `dark:` variants.
**Rationale**: Already established pattern in codebase. Variables auto-switch in `.dark` scope, reducing class bloat. One change in `app.css` fixes 100+ files.
**Alternative considered**: Tailwind `dark:` variants — rejected because it requires touching every element individually.

### 2. Skeleton Loading Pattern
**Decision**: Extend existing `SkeletonCard` component with role-specific variants (dashboard stats, table rows, chart placeholders).
**Rationale**: Reuses established pattern, consistent animation timing.
**Alternative considered**: React Loading Skeleton library — already imported but underutilized.

### 3. Empty State Design Pattern
**Decision**: Create reusable `EmptyState` component with icon, title, description, action button slots.
**Rationale**: Currently 2 different empty state implementations (courses, chat-spaces). Unifying reduces duplication.
**Alternative considered**: Per-page custom empty states — rejected as too much duplication.

### 4. Animation Strategy
**Decision**: Use Framer Motion `motion.div` with staggered children for list/card entrance animations. Keep duration 0.3-0.5s, ease `easeOut`.
**Rationale**: Already available, consistent with existing patterns in dashboard pages.
**Alternative considered**: CSS-only animations — rejected for less control over stagger timing.

### 5. Table Enhancement Approach
**Decision**: Add hover state via `--dm-surface-hover`, improve mobile card layout with better typography hierarchy.
**Rationale**: Minimal changes, no new components needed.
**Alternative considered**: Full table component refactor — rejected as over-scope.

## Risks / Trade-offs

- [Risk] Animation performance on low-end devices → Mitigation: Use `transform` and `opacity` only (GPU-accelerated), keep durations short
- [Risk] Skeleton flash on fast connections → Mitigation: Minimum 300ms display time before showing content
- [Risk] Inconsistent implementation across files → Mitigation: Reusable components (`EmptyState`, `SkeletonDashboard`), not per-page copies

## Migration Plan

1. Create reusable components first (`EmptyState`, enhanced skeletons)
2. Update auth pages (isolated, low risk)
3. Update dashboards (stat cards, skeletons)
4. Update tables and modals
5. Update toast notifications
6. Final verification pass

No rollback needed — all changes are visual/polish, no data or API changes.
