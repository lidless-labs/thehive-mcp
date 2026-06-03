# Changelog

## [1.2.0] - 2026-05-31

### Added
- **`thehive_assign_case`** - Assign a case to a TheHive user by username or login
- **`thehive_update_case_custom_fields`** - Update case custom fields
- **`thehive_add_case_tags`** and **`thehive_remove_case_tags`** - Safely modify case tags without replacing the full tag set manually
- **`thehive_set_case_flag`** - Set or clear a case flag
- **`thehive_bulk_assign_cases`** and **`thehive_bulk_close_cases`** - Apply common case lifecycle updates to up to 50 cases
- **`thehive_case_timeline_summary`** - Summarize a case with related tasks, observables, and comments
- **`thehive_get_observable_enrichment_options`** - List Cortex analyzers that can enrich an observable
- **`thehive_run_analyzer_and_wait`** and **`thehive_wait_for_job`** - Poll Cortex jobs until terminal status
- **`thehive_summarize_job_report`** - Return compact Cortex report summaries
- `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS` to keep MCP delete tools disabled by default
- `THEHIVE_ENABLE_RAW_QUERY` to keep the raw Query DSL MCP tool disabled by default
- Live test flags for read-only, write, destructive, and custom-field compatibility passes

### Security
- Updated vulnerable transitive `qs` dependency to 6.15.2
- Hardened environment parsing for TheHive URL, timeout, SSL verification, and destructive-tool flags
- Redacted sensitive values from TheHive API error details
- Added guardrails for raw TheHive query shape, range, sort, and name inputs
- Gated raw Query DSL MCP execution behind an explicit opt-in flag
- Fixed Proxmox installer repository naming and safer `.env` generation

### Fixed
- CI now fails when tests fail
- MCP server version now follows `package.json`
- The unauthenticated status call no longer sends API headers

### Changed
- Version bumped to 1.2.0
- Total tools: 35 -> 47
- Total unit tests: 68 -> 89
- Live integration script now skips cleanly when credentials are missing and gates write/destructive checks

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
