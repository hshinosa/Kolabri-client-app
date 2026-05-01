# Changelog

## [1.1.0] - 2026-05-01

### Added
- Dashboard charts with real-time data visualization
- Course cloning UI for admin
- Mobile responsiveness across all admin pages
- Bulk operations (users, courses)
- CSV import/export functionality
- Audit log page with filtering
- Real-time updates via WebSocket
- AI provider settings page
- Course templates management
- Course archiving
- Playwright e2e test suite (51 tests, 9 files)
- PHPUnit feature tests for controllers (8 tests)
- GitHub Actions CI (linter + PHPUnit)

### Changed
- DashboardController renders with fallback data on API errors
- UserManagementController renders Inertia page on API failure
- MasterDataController renders with empty arrays on failure
- Session driver changed to file for reliability
- README rewritten for clarity

### Fixed
- 7 ESLint errors resolved (unused vars, useless escape, empty catch)
- 2 PHPUnit test failures fixed (AiChatController timestamps + flash message)
- TypeScript errors in fetchChatMessages calls
- All Playwright tests pass (51/51, 0 skipped)
- Login flow with proper button selector and retry logic

### Integration
- Laravel controllers proxy all requests to Core API via `Http::withToken()`
- Wayfinder auto-generates TypeScript route helpers
- Admin pages: dashboard, users, master-data, templates, ai-settings, ai-comparison, audit-log
