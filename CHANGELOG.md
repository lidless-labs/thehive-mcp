# Changelog

## [1.1.0] - 2026-03-21

### Added
- **`thehive_close_case`** - Dedicated tool for closing cases with proper resolution status
- **`thehive_delete_case`** - Delete cases (with optional force flag)
- **`thehive_delete_alert`** - Delete alerts
- **`thehive_create_observable_bulk`** - Add multiple observables of the same type in one request
- **`thehive_query`** - Raw TheHive Query DSL for complex searches, date ranges, counting
- **`thehive_list_case_templates`** - List available case templates
- GitHub Actions CI workflow (Node 20 + 22, typecheck + test + build)
- `files` field in package.json for clean npm publishing
- CHANGELOG.md

### Fixed
- Case status values updated for TheHive 5 (TruePositive/FalsePositive/etc. instead of Resolved)
- Tool descriptions now reference correct TheHive 5 status enums

### Changed
- Version bumped to 1.1.0
- Total tools: 29 -> 35
- Total unit tests: 66 -> 68
- Total live integration tests: 29 -> 36

## [1.0.0] - 2026-03-19

### Added
- Initial release with 29 tools
- Case management (create, list, get, update, search, merge)
- Alert management (create, list, get, update, promote)
- Task management (create, list, get, update)
- Observable management (create, list, get, search)
- Task logs and comments
- User management
- Cortex integration (list analyzers, run jobs, get results)
- Server status/health check
- 3 prompt templates (case-summary, alert-triage, incident-response)
- 3 resources (open-cases, new-alerts, current-user)
- TheHive 5 compatibility fixes (204 PATCH, array observables, connector paths)
- Live integration test script
- 66 unit tests
