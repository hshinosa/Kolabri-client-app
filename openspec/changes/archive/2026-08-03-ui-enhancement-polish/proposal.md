## Why

Kolabri's UI is functional but lacks polish across several areas. Auth pages (first impression) have inconsistent color usage, dashboards show raw 0 values during loading instead of skeletons, empty states are generic or missing, and tables/modals feel basic. These gaps make the app feel unfinished despite having a solid design system foundation.

## What Changes

- **Auth pages**: Unify color tokens, add entrance animations, improve error/success presentation
- **Loading skeletons**: Consistent skeleton pattern across all data-heavy pages (dashboards, tables, analytics)
- **Empty states**: Custom contextual empty states with illustrations and action buttons for courses, chat-spaces, dashboard activity
- **Stat cards**: Hover micro-interactions, subtle gradient borders, improved visual hierarchy
- **Table design**: Better row hover states, improved mobile card layouts, consistent header styling
- **Modal design**: Better section dividers, improved spacing, consistent header/footer patterns
- **Toast notifications**: Richer content, action buttons, smoother animations

## Capabilities

### New Capabilities

- `auth-pages-polish`: Unified auth page design with consistent tokens, animations, and error handling
- `loading-skeletons`: Consistent skeleton loading pattern across all data pages
- `empty-states`: Contextual empty states with illustrations and action CTAs
- `stat-cards-enhancement`: Polished stat cards with hover interactions and visual hierarchy
- `table-design-improvement`: Enhanced table design with better hover states and mobile cards
- `modal-design-improvement`: Refined modal design with better spacing and section dividers
- `toast-notification-polish`: Richer toast notifications with actions and animations

### Modified Capabilities

(none - all changes are polish/enhancement, no spec-level behavior changes)

## Impact

- Files: ~30-40 TSX files across pages/, components/, layouts/
- No API changes
- No dependency changes
- No breaking changes
- All changes are visual/polish only
