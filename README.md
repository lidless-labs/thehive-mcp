<p align="center">
  <img src="docs/assets/thehive-mcp-social-preview.jpg" alt="thehive-mcp banner" width="900">
</p>

<p align="center">
  <a href="https://lidless.dev"><img src="docs/assets/marks/thehive-mcp-circle.png" width="48" alt="Lidless Labs"></a>
</p>
<h1 align="center">thehive-mcp</h1>

<p align="center">
  <strong>An MCP server that gives an AI client full read-write control of TheHive: cases, alerts, tasks, observables, and Cortex analyzers, over stdio with all mutations gated off by default.</strong>
</p>

<p align="center">
  <strong>Website: <a href="https://lidless.dev/thehive-mcp">lidless.dev/thehive-mcp</a></strong>
</p>

<p align="center">
  <img src="https://shieldcn.dev/github/ci/lidless-labs/thehive-mcp.svg?branch=main&workflow=ci.yml" alt="ci">
  <img src="https://shieldcn.dev/npm/thehive-mcp.svg" alt="npm version">
  <img src="https://shieldcn.dev/badge/MCP-server-8A2BE2.svg" alt="MCP server">
  <img src="https://shieldcn.dev/badge/license-MIT-green.svg" alt="MIT license">
</p>

thehive-mcp is a Model Context Protocol server for [TheHive](https://thehive-project.org/), the open-source security incident response platform. It lets an AI client run the SOC workflow end to end: open and triage cases, promote alerts, track observables, drive tasks, and run Cortex analyzers, all through one stdio process. It differs from a generic REST wrapper because the dangerous verbs (delete, merge, promote, raw query) ship disabled and only turn on behind explicit environment flags, so an agent cannot quietly destroy case data.

## What it does

thehive-mcp is an MCP server for **TheHive** incident response and case management. It exposes 57 Model Context Protocol tools that map onto the full TheHive 5 API surface, so an MCP client (Claude Desktop, Claude Code, Codex CLI, OpenClaw, Hermes, or any other) can drive a security operations center: create and triage cases, manage alerts, add and search observables, run and poll Cortex analyzers, file task logs and comments, and orchestrate SOAR-style incident response workflows in plain language. It talks to your TheHive instance over its REST API and speaks MCP over stdio, so it slots into any agent that supports the protocol with no extra service to run.

All 28 mutating tools are disabled by default, including record creation, additive writes, state changes, bulk operations, and Cortex analyzer and responder submissions. Operator authority enables local previews. Execution requires `dryRun: false` and `confirm: true` for each approved call. The raw Query DSL has a separate default-off gate. TLS relaxation is scoped to TheHive requests only. The server is tested against TheHive 5.4.11.

## Quickstart

Run it straight from npm, no global install needed:

```bash
npx -y thehive-mcp
```

Point it at your TheHive instance with two environment variables:

```bash
THEHIVE_URL=https://192.0.2.10:9000 \
THEHIVE_API_KEY=your-api-key \
npx -y thehive-mcp
```

The server speaks MCP over stdio, so it is meant to be launched by an MCP client rather than run by hand. The client config below is the normal entry point.

### MCP client config

Drop this into any MCP client that reads the standard `mcpServers` map (Claude Desktop, Claude Code, and most others use this exact shape):

```json
{
  "mcpServers": {
    "thehive": {
      "command": "npx",
      "args": ["-y", "thehive-mcp"],
      "env": {
        "THEHIVE_URL": "https://192.0.2.10:9000",
        "THEHIVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

To enable mutation previews and the raw Query DSL tool, add the flags to `env`:

```json
{
  "mcpServers": {
    "thehive": {
      "command": "npx",
      "args": ["-y", "thehive-mcp"],
      "env": {
        "THEHIVE_URL": "https://192.0.2.10:9000",
        "THEHIVE_API_KEY": "your-api-key",
        "THEHIVE_ALLOW_DESTRUCTIVE_TOOLS": "true",
        "THEHIVE_ENABLE_RAW_QUERY": "true"
      }
    }
  }
}
```

For Claude Desktop, the config file lives at `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). Per-harness instructions (Claude Code, Codex CLI, OpenClaw, Hermes) are in [Client setup](#client-setup) below.

## Tools

57 tools across cases, alerts, tasks, observables, Cortex, and more. All 28 mutating tools require operator authority, default to preview, and require explicit confirmation for execution. The 29 read/query tools retain their existing behavior, including the separate raw query flag.

### Cases (16 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_cases` | List cases with filters (status, severity, tags, owner) |
| `thehive_get_case` | Get a specific case by ID |
| `thehive_create_case` | Create a new case |
| `thehive_update_case` | Update case fields. Requires operator approval |
| `thehive_search_cases` | Search cases by title keyword |
| `thehive_close_case` | Close a case with resolution status and summary. Requires operator approval |
| `thehive_assign_case` | Assign a case to a user. Requires operator approval |
| `thehive_update_case_custom_fields` | Update case custom fields |
| `thehive_add_case_tags` | Add tags without replacing existing tags |
| `thehive_remove_case_tags` | Remove selected tags |
| `thehive_set_case_flag` | Set or clear the case flag |
| `thehive_bulk_assign_cases` | Assign multiple cases to a user. Requires `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true` |
| `thehive_bulk_close_cases` | Close multiple cases with the same resolution. Requires `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true` |
| `thehive_case_timeline_summary` | Summarize case details, tasks, observables, and comments |
| `thehive_delete_case` | Permanently delete a case (with optional force). Requires `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true` |
| `thehive_merge_cases` | Merge multiple cases into one (irreversible). Requires `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true` |

### Alerts (10 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_alerts` | List alerts with filters (status, severity, source, type) |
| `thehive_get_alert` | Get a specific alert by ID |
| `thehive_create_alert` | Create a new alert |
| `thehive_update_alert` | Update alert fields. Requires operator approval |
| `thehive_promote_alert` | Promote an alert to a case (creates a new case). Requires `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true` |
| `thehive_delete_alert` | Permanently delete an alert. Requires `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true` |
| `thehive_list_alert_observables` | List observables attached to an alert |
| `thehive_list_alert_comments` | List comments on an alert |
| `thehive_create_alert_observable` | Add an observable to an alert without promoting it |
| `thehive_create_alert_comment` | Add a comment to an alert |

### Tasks (4 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_tasks` | List tasks for a case |
| `thehive_get_task` | Get a specific task by ID |
| `thehive_create_task` | Create a task in a case |
| `thehive_update_task` | Update task fields (status, assignee, etc.) |

### Observables (6 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_observables` | List observables for a case |
| `thehive_get_observable` | Get a specific observable by ID |
| `thehive_create_observable` | Add a single observable to a case |
| `thehive_create_observable_bulk` | Add multiple observables of the same type in one request |
| `thehive_update_observable` | Update an observable (IOC, sighted, TLP/PAP, tags, message) |
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

### Cortex (10 tools)

| Tool | Description |
|------|-------------|
| `thehive_list_analyzers` | List available Cortex analyzers |
| `thehive_get_observable_enrichment_options` | List analyzers that can enrich an observable |
| `thehive_run_analyzer` | Run a Cortex analyzer on an observable |
| `thehive_run_analyzer_and_wait` | Run an analyzer and wait for completion |
| `thehive_get_job` | Get analyzer job status and results |
| `thehive_wait_for_job` | Poll a job until it reaches a terminal status |
| `thehive_summarize_job_report` | Return a compact analyzer report summary |
| `thehive_list_responders` | List Cortex responders available for a case, alert, task, or observable |
| `thehive_run_responder` | Run a Cortex responder on an entity. Requires `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true` |
| `thehive_list_actions` | List past responder actions on an entity |

### Similarity (2 tools)

| Tool | Description |
|------|-------------|
| `thehive_get_similar_cases` | Cases sharing observables with an alert or case |
| `thehive_get_similar_alerts` | Alerts sharing observables with an alert or case |

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

## Configuration

Set environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `THEHIVE_URL` | Yes | - | TheHive instance URL using `http` or `https` (e.g. `https://192.0.2.10:9000`) |
| `THEHIVE_API_KEY` | Yes | - | API key for authentication |
| `THEHIVE_VERIFY_SSL` | No | `true` | Set to `false` only for trusted lab systems with self-signed TLS. When disabled, TLS verification is relaxed only for TheHive requests (via a scoped dispatcher), not for the whole process |
| `THEHIVE_TIMEOUT` | No | `30` | Request timeout in seconds (1-300) |
| `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS` | No | `false` | Enable local previews for all 28 mutations, including additive writes and analyzer submissions. Execution also requires `dryRun: false` and `confirm: true` |
| `THEHIVE_ALLOW_INSECURE_HTTP` | No | `false` | Explicitly permit plaintext HTTP API credentials outside loopback |
| `THEHIVE_ENABLE_RAW_QUERY` | No | `false` | Set to `true` to enable the raw Query DSL MCP tool |

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

## Client setup

The [MCP client config](#mcp-client-config) above works for any client that reads the standard `mcpServers` map. The notes below cover clients with their own setup command and the source-checkout variant for each.

### Claude Code

```bash
claude mcp add thehive \
  --env THEHIVE_URL=https://192.0.2.10:9000 \
  --env THEHIVE_API_KEY=your-api-key \
  -- npx -y thehive-mcp
```

Add `--scope user` to make it available from any directory instead of only the current project.

### Codex CLI

[Codex CLI](https://github.com/openai/codex) registers MCP servers via `codex mcp add`:

```bash
codex mcp add thehive \
  --env THEHIVE_URL=https://192.0.2.10:9000 \
  --env THEHIVE_API_KEY=your-api-key \
  -- npx -y thehive-mcp
```

Codex writes the entry to `~/.codex/config.toml` under `[mcp_servers.thehive]`. Verify with `codex mcp list`.

### OpenClaw

```bash
openclaw mcp set thehive '{
  "command": "npx",
  "args": ["-y", "thehive-mcp"],
  "env": {
    "THEHIVE_URL": "https://192.0.2.10:9000",
    "THEHIVE_API_KEY": "your-api-key"
  }
}'
```

Then restart the gateway and confirm registration:

```bash
systemctl --user restart openclaw-gateway
openclaw mcp list
```

### Hermes Agent

[Hermes Agent](https://github.com/NousResearch/hermes-agent) reads MCP config from `~/.hermes/config.yaml` under the `mcp_servers` key:

```yaml
mcp_servers:
  thehive:
    command: "npx"
    args: ["-y", "thehive-mcp"]
    env:
      THEHIVE_URL: "https://192.0.2.10:9000"
      THEHIVE_API_KEY: "your-api-key"
```

Then reload MCP from inside a Hermes session with `/reload-mcp`.

### Source checkout

If you run from a source checkout instead of the npm package, point `command`/`args` at the built `dist/index.js`:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/thehive-mcp/dist/index.js"]
}
```

## TheHive 5 notes

- **Organizations matter.** The `admin` org only has platform permissions. Create a separate org (e.g. "SOC") with an `org-admin` user for full case/alert/task/observable access.
- **Case statuses changed in v5.** Closed statuses are: TruePositive, FalsePositive, Indeterminate, Duplicated, Other. There is no "Resolved" status.
- **PATCH returns 204.** Update operations return no body; the client re-fetches the entity automatically.
- **Observable creation returns arrays.** The client handles this transparently. Bulk creation uses `data` as an array.
- **Cortex connector endpoints** live under `/api/connector/` not `/api/v1/`.
- **`description` is required** when creating cases and alerts.
- **Destructive MCP tools are gated.** `thehive_delete_case`, `thehive_delete_alert`, `thehive_merge_cases` (irreversible), `thehive_promote_alert`, `thehive_run_responder`, `thehive_bulk_assign_cases`, and `thehive_bulk_close_cases` require `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true`. The same gate protects single-case close/assign, generic case state/ownership changes, case creation with an owner, and alert status changes. Calls preview locally until both `dryRun: false` and `confirm: true` are supplied.
- **Tool output and upstream responses are bounded.** Every tool declares MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`), tool text is capped at 100,000 characters, upstream response bodies are capped at 10 MB, and bulk tools issue at most 5 concurrent requests.
- **Raw query is gated.** `thehive_query` requires `THEHIVE_ENABLE_RAW_QUERY=true`.
- **SSL verification is scoped.** Setting `THEHIVE_VERIFY_SSL=false` relaxes TLS certificate validation only for requests to TheHive (via a per-client undici dispatcher) and never disables it process-wide. A warning is logged to stderr when enabled.

## Why not the TheHive REST API directly?

You can, and for a script you should. The REST API is the right tool when you already know exactly which endpoint you want. thehive-mcp exists for the case where an AI agent is doing the deciding: it turns the API into 57 named, typed, described tools an MCP client can pick from in natural language, handles the TheHive 5 quirks (204 PATCH responses, array-shaped observable creation, connector endpoints under `/api/connector/`), and puts safety rails in front of the irreversible verbs so a model cannot delete or merge case data unless you explicitly opted in. A raw HTTP client gives you none of that.

## Why not a generic OpenAPI-to-MCP bridge?

A generic bridge exposes every endpoint flat, with no notion of which calls are dangerous and no awareness of TheHive 5's behavioral edges. thehive-mcp is hand-built for TheHive: destructive tools are gated, the raw Query DSL is gated and shape-checked, TLS relaxation is scoped to TheHive requests only, sensitive values are redacted from error output, and the tool descriptions carry the correct TheHive 5 status enums (TruePositive, FalsePositive, and so on, not the old "Resolved"). Those are decisions a generic bridge cannot make for you.

## What thehive-mcp is not

- It is not a replacement for TheHive. You need a running TheHive 5 instance and a valid API key; this server only talks to one.
- It is not a hosted service or daemon. It is a stdio process your MCP client launches on demand. Nothing listens on a port and nothing phones home.
- It is not a Cortex server. It drives Cortex analyzers through TheHive's connector, but analyzer execution happens in your own Cortex deployment. For a dedicated Cortex MCP server, see [cortex-mcp](https://lidless.dev/cortex-mcp).
- It is not safe-by-omission. Destructive tools exist; they are gated, not removed. Turning on `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS` hands an agent the ability to delete and merge real case data.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run read-only live integration tests (skips when env vars are missing)
THEHIVE_URL=https://192.0.2.10:9000 THEHIVE_API_KEY=your-key npx tsx scripts/live-test.ts

# Run live write tests
THEHIVE_URL=https://192.0.2.10:9000 THEHIVE_API_KEY=your-key THEHIVE_LIVE_ALLOW_WRITES=true npx tsx scripts/live-test.ts

# Run live write tests with destructive cleanup, deletes, and merge checks
THEHIVE_URL=https://192.0.2.10:9000 THEHIVE_API_KEY=your-key THEHIVE_LIVE_ALLOW_WRITES=true THEHIVE_LIVE_ALLOW_DESTRUCTIVE=true npx tsx scripts/live-test.ts

# Type check
npm run typecheck

# Development mode
THEHIVE_URL=https://192.0.2.10:9000 THEHIVE_API_KEY=your-key npm run dev
```

## Contributing

Bug reports and patches are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for what lands easily, [SECURITY.md](SECURITY.md) for reporting vulnerabilities, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Issue templates are under [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE).

## License

[MIT](LICENSE)

---

<p align="center"><a href="https://lidless.dev">Part of <strong>Lidless Labs</strong></a> &middot; the eye does not close</p>

<p align="center"><sub><strong>Security / SOC:</strong> <a href="https://github.com/lidless-labs/soc-stack">soc-stack</a> &middot; <a href="https://github.com/lidless-labs/wazuh-mcp">wazuh-mcp</a> &middot; <a href="https://github.com/lidless-labs/misp-mcp">misp-mcp</a> &middot; <a href="https://github.com/lidless-labs/suricata-mcp">suricata-mcp</a> &middot; <a href="https://github.com/lidless-labs/cortex-mcp">cortex-mcp</a> &middot; <a href="https://github.com/lidless-labs/mitre-mcp">mitre-mcp</a> &middot; <a href="https://github.com/lidless-labs/zeek-mcp">zeek-mcp</a> &middot; <a href="https://github.com/lidless-labs/hotwash">hotwash</a></sub></p>

<p align="center"><sub><a href="https://lidless.dev">All tools</a> &middot; <a href="https://github.com/lidless-labs">Lidless Labs on GitHub</a></sub></p>
</content>

### Operator approval for every mutation

All 28 tools that create, update, delete, merge, promote, or submit jobs require
`THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true`. This includes tasks, observables, tags,
custom fields, flags, comments, task logs, bulk operations, and Cortex analyzers
and responders. Classification uses an explicit reviewed read inventory,
independent of MCP annotations. Unknown tool names receive the mutation policy.

After enabling the flag, mutating calls preview their tool, targets, and
parameters locally by default. Preview sends no network requests and does not
validate target existence or permissions. Review the plan with the operator.
Execution requires **both** `dryRun: false` and `confirm: true` on that call.
These controls are never forwarded to TheHive. Confirmation records the caller's
assertion of approval. The server cannot authenticate a human decision.

Confirmation does not supply idempotency. After an uncertain response, inspect
upstream state before repeating a mutation. Analyzer polling failures return the
started job as untrusted evidence with an uncertain outcome. Inspect that job
with `thehive_get_job` or `thehive_wait_for_job` instead of resubmitting it.
The server never automatically replays an analyzer submission.

### Untrusted evidence in outputs

Tool JSON and JSON resources now return `{ provenance, data }`. Consumers that
previously read an object or array at the top level must read `data` instead.
The server marks data from TheHive and Cortex as untrusted evidence. Instructions
inside incident descriptions, comments, observable values, and analyzer reports
must never authorize tool calls. Markup delimiters and Unicode line separators
are escaped in serialized JSON, including object keys, and decode to their
original values when parsed. Truncated outputs keep their provenance and remain
valid JSON. Prompt arguments use an escaped input block, with operator approval
required before mutations.

### HTTPS and private certificate authorities

Remote API URLs now require HTTPS by default. Migration: deployments that
intentionally use plaintext beyond loopback must explicitly set
`THEHIVE_ALLOW_INSECURE_HTTP=true`. This sends API credentials over plaintext.
HTTP remains supported for literal IPv4 loopback addresses, IPv6 loopback, and
`localhost`. Redirects are rejected for API and status requests, so an HTTPS
endpoint cannot redirect a credential-bearing call elsewhere.

For a private CA, keep `THEHIVE_VERIFY_SSL=true` and set
`NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.pem` before starting Node. Node loads the
PEM bundle at process startup. This extends trust while keeping certificate and
hostname verification enabled. The existing `THEHIVE_VERIFY_SSL=false` escape
hatch still affects only this client's dispatcher and never disables TLS
verification process-wide.

### Installer service permissions

New installer services run as the dedicated `thehive-mcp` system account. The
application tree and credential file stay root-owned, with the credential file
readable only by root. Systemd reads that file before dropping privileges.
The service uses a read-only system view, a private temporary directory, no
capabilities, and no privilege escalation. Systemd manages writable state,
cache, and runtime directories under the service name. The sandbox keeps Node's
JIT available. Existing installations must recreate the service unit and
service account to adopt these settings.
