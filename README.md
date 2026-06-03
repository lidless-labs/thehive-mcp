<p align="center">
  <img src="docs/assets/thehive-mcp-banner.jpg" alt="Watercolor incident response honeycomb workflow for thehive-mcp" width="100%" />
</p>

<h1 align="center">thehive-mcp</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/thehive-mcp"><img src="https://img.shields.io/npm/v/thehive-mcp?style=flat-square&logo=npm&color=cb3837" alt="npm version" /></a>
  <a href="https://github.com/solomonneas/thehive-mcp/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/solomonneas/thehive-mcp/ci.yml?branch=main&style=flat-square&label=CI&logo=github" alt="CI status" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 6.0" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 20+" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP%20SDK-1.29-6f42c1?style=flat-square" alt="MCP SDK 1.29" /></a>
  <a href="https://thehive-project.org/"><img src="https://img.shields.io/badge/TheHive-5.4.11-f6c343?style=flat-square" alt="Tested with TheHive 5.4.11" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT license" /></a>
</p>

MCP (Model Context Protocol) server for [TheHive](https://thehive-project.org/) security incident response platform. Lets AI agents create cases, manage alerts, track observables, run Cortex analyzers, and orchestrate incident response workflows.

Tested against **TheHive 5.4.11** with live integration coverage for read, write, and destructive workflows.

## Features

- **47 tools** covering the full TheHive 5 API surface
- **Case management** - create, list, get, update, assign, close, delete, search, merge, tag, flag, bulk update, summarize cases, update custom fields
- **Alert management** - create, list, get, update, promote to case, delete alerts
- **Task management** - create, list, get, update tasks within cases
- **Observable management** - add (single + bulk), list, get, search observables
- **Task logs** - add and list log entries on tasks
- **Comments** - add and list comments on cases
- **User management** - list users, get current user info
- **Cortex integration** - list analyzers, run and poll jobs, summarize reports, find observable enrichment options
- **Raw query API** - execute guarded TheHive Query DSL for complex searches
- **Case templates** - list available templates for case creation
- **Status** - health check, version info, capabilities
- **3 prompt templates** - case summary, alert triage, incident response workflow
- **3 resources** - open cases, new alerts, current user

## Installation

```bash
npm install -g thehive-mcp
```

Or run directly:

```bash
npx thehive-mcp
```

## Configuration

Set environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `THEHIVE_URL` | Yes | - | TheHive instance URL using `http` or `https` (e.g. `http://thehive:9000`) |
| `THEHIVE_API_KEY` | Yes | - | API key for authentication |
| `THEHIVE_VERIFY_SSL` | No | `true` | Set to `false` only for trusted lab systems with self-signed TLS |
| `THEHIVE_TIMEOUT` | No | `30` | Request timeout in seconds (1-300) |
| `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS` | No | `false` | Set to `true` to enable MCP delete tools |
| `THEHIVE_ENABLE_RAW_QUERY` | No | `false` | Set to `true` to enable the raw Query DSL MCP tool |

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "thehive": {
      "command": "thehive-mcp",
      "env": {
        "THEHIVE_URL": "http://your-thehive:9000",
        "THEHIVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add thehive \
  --env THEHIVE_URL=http://your-thehive:9000 \
  --env THEHIVE_API_KEY=your-api-key \
  -- thehive-mcp
```

Add `--scope user` to make it available from any directory instead of only the current project.

### OpenClaw

If you're running from a source checkout instead of the npm-installed binary, point `command`/`args` at the built `dist/index.js`:

```bash
openclaw mcp set thehive '{
  "command": "node",
  "args": ["/absolute/path/to/thehive-mcp/dist/index.js"],
  "env": {
    "THEHIVE_URL": "http://your-thehive:9000",
    "THEHIVE_API_KEY": "your-api-key"
  }
}'
```

Or, with the global npm install:

```bash
openclaw mcp set thehive '{
  "command": "thehive-mcp",
  "env": {
    "THEHIVE_URL": "http://your-thehive:9000",
    "THEHIVE_API_KEY": "your-api-key"
  }
}'
```

Then restart the OpenClaw gateway so the new server is picked up:

```bash
systemctl --user restart openclaw-gateway
openclaw mcp list   # confirm "thehive" is registered
```

### Hermes Agent

[Hermes Agent](https://github.com/NousResearch/hermes-agent) reads MCP config from `~/.hermes/config.yaml` under the `mcp_servers` key. Add an entry:

```yaml
mcp_servers:
  thehive:
    command: "thehive-mcp"
    env:
      THEHIVE_URL: "http://your-thehive:9000"
      THEHIVE_API_KEY: "your-api-key"
```

Or, when running from a source checkout instead of the global npm install:

```yaml
mcp_servers:
  thehive:
    command: "node"
    args: ["/absolute/path/to/thehive-mcp/dist/index.js"]
    env:
      THEHIVE_URL: "http://your-thehive:9000"
      THEHIVE_API_KEY: "your-api-key"
```

Then reload MCP from inside a Hermes session:

```
/reload-mcp
```

### Codex CLI

[Codex CLI](https://github.com/openai/codex) registers MCP servers via `codex mcp add`:

```bash
codex mcp add thehive \
  --env THEHIVE_URL=http://your-thehive:9000 \
  --env THEHIVE_API_KEY=your-api-key \
  -- thehive-mcp
```

Or, when running from a source checkout:

```bash
codex mcp add thehive \
  --env THEHIVE_URL=http://your-thehive:9000 \
  --env THEHIVE_API_KEY=your-api-key \
  -- node /absolute/path/to/thehive-mcp/dist/index.js
```

Codex writes the entry to `~/.codex/config.toml` under `[mcp_servers.thehive]`. Verify with:

```bash
codex mcp list
```

## Tools

### Cases (16 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_cases` | List cases with filters (status, severity, tags, owner) |
| `thehive_get_case` | Get a specific case by ID |
| `thehive_create_case` | Create a new case |
| `thehive_update_case` | Update case fields (severity, status, tags, etc.) |
| `thehive_search_cases` | Search cases by title keyword |
| `thehive_close_case` | Close a case with resolution status and summary |
| `thehive_assign_case` | Assign a case to a user |
| `thehive_update_case_custom_fields` | Update case custom fields |
| `thehive_add_case_tags` | Add tags without replacing existing tags |
| `thehive_remove_case_tags` | Remove selected tags |
| `thehive_set_case_flag` | Set or clear the case flag |
| `thehive_bulk_assign_cases` | Assign multiple cases to a user |
| `thehive_bulk_close_cases` | Close multiple cases with the same resolution |
| `thehive_case_timeline_summary` | Summarize case details, tasks, observables, and comments |
| `thehive_delete_case` | Permanently delete a case (with optional force) |
| `thehive_merge_cases` | Merge multiple cases into one |

### Alerts (6 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_alerts` | List alerts with filters (status, severity, source, type) |
| `thehive_get_alert` | Get a specific alert by ID |
| `thehive_create_alert` | Create a new alert |
| `thehive_update_alert` | Update alert fields |
| `thehive_promote_alert` | Promote an alert to a case |
| `thehive_delete_alert` | Permanently delete an alert |

### Tasks (4 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_tasks` | List tasks for a case |
| `thehive_get_task` | Get a specific task by ID |
| `thehive_create_task` | Create a task in a case |
| `thehive_update_task` | Update task fields (status, assignee, etc.) |

### Observables (5 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_observables` | List observables for a case |
| `thehive_get_observable` | Get a specific observable by ID |
| `thehive_create_observable` | Add a single observable to a case |
| `thehive_create_observable_bulk` | Add multiple observables of the same type in one request |
| `thehive_search_observables` | Search observables across all cases |

### Task Logs (2 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_task_logs` | List log entries for a task |
| `thehive_create_task_log` | Add a log entry to a task |

### Comments (2 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_comments` | List comments on a case |
| `thehive_create_comment` | Add a comment to a case |

### Users (2 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_users` | List users in the organization |
| `thehive_get_current_user` | Get the authenticated user's profile |

### Cortex (7 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_analyzers` | List available Cortex analyzers |
| `thehive_get_observable_enrichment_options` | List analyzers that can enrich an observable |
| `thehive_run_analyzer` | Run a Cortex analyzer on an observable |
| `thehive_run_analyzer_and_wait` | Run an analyzer and wait for completion |
| `thehive_get_job` | Get analyzer job status and results |
| `thehive_wait_for_job` | Poll a job until it reaches a terminal status |
| `thehive_summarize_job_report` | Return a compact analyzer report summary |

### Query (1 tool)

| Tool | Description |
|------|-------------|
| `thehive_query` | Execute guarded raw TheHive Query DSL for complex searches when enabled with `THEHIVE_ENABLE_RAW_QUERY=true` |

### Templates (1 tool)

| Tool | Description |
|------|-------------|
| `thehive_list_case_templates` | List available case templates |

### Status (1 tool)

| Tool | Description |
|------|-------------|
| `thehive_status` | Get server health, version, and capabilities |

## Prompt Templates

| Prompt | Description |
|--------|-------------|
| `case-summary` | Generate a comprehensive incident case report |
| `alert-triage` | Triage and analyze an alert for escalation |
| `incident-response` | Guided incident response workflow |

## Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Open Cases | `thehive://cases/open` | Currently open cases |
| New Alerts | `thehive://alerts/new` | Unprocessed alerts |
| Current User | `thehive://user/current` | Authenticated user info |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run read-only live integration tests (skips when env vars are missing)
THEHIVE_URL=http://your-thehive:9000 THEHIVE_API_KEY=your-key npx tsx scripts/live-test.ts

# Run live write tests
THEHIVE_URL=http://your-thehive:9000 THEHIVE_API_KEY=your-key THEHIVE_LIVE_ALLOW_WRITES=true npx tsx scripts/live-test.ts

# Run live write tests with destructive cleanup, deletes, and merge checks
THEHIVE_URL=http://your-thehive:9000 THEHIVE_API_KEY=your-key THEHIVE_LIVE_ALLOW_WRITES=true THEHIVE_LIVE_ALLOW_DESTRUCTIVE=true npx tsx scripts/live-test.ts

# Type check
npm run typecheck

# Development mode
THEHIVE_URL=http://your-thehive:9000 THEHIVE_API_KEY=your-key npm run dev
```

## TheHive 5 Notes

- **Organizations matter.** The `admin` org only has platform permissions. Create a separate org (e.g. "SOC") with an `org-admin` user for full case/alert/task/observable access.
- **Case statuses changed in v5.** Closed statuses are: TruePositive, FalsePositive, Indeterminate, Duplicated, Other. There is no "Resolved" status.
- **PATCH returns 204.** Update operations return no body; the client re-fetches the entity automatically.
- **Observable creation returns arrays.** The client handles this transparently. Bulk creation uses `data` as an array.
- **Cortex connector endpoints** live under `/api/connector/` not `/api/v1/`.
- **`description` is required** when creating cases and alerts.
- **Destructive MCP tools are gated.** `thehive_delete_case` and `thehive_delete_alert` require `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true`.
- **Raw query is gated.** `thehive_query` requires `THEHIVE_ENABLE_RAW_QUERY=true`.

## License

MIT
