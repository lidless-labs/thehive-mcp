# TheHive MCP Server

MCP (Model Context Protocol) server for [TheHive](https://thehive-project.org/) - an open-source security incident response platform. Exposes TheHive's API as MCP tools for AI-assisted incident response workflows.

## Features

- **25 MCP tools** covering cases, alerts, tasks, observables, task logs, comments, and users
- **3 MCP resources** for browsing open cases, new alerts, and current user
- **3 MCP prompts** for guided incident response workflows
- TheHive API v1 with Bearer token authentication
- TypeScript strict mode, Node.js 20+
- Zod schema validation on all tool parameters

## Tools

### Cases (6 tools)
| Tool | Description |
|------|-------------|
| `thehive_list_cases` | List cases with filters (status, severity, tags, owner) |
| `thehive_get_case` | Get detailed case information by ID |
| `thehive_create_case` | Create a new case with title, severity, TLP, tags |
| `thehive_update_case` | Update case fields (status, severity, owner, summary) |
| `thehive_search_cases` | Search cases by title keyword |
| `thehive_merge_cases` | Merge multiple cases into one |

### Alerts (5 tools)
| Tool | Description |
|------|-------------|
| `thehive_list_alerts` | List alerts with filters (status, severity, source, type) |
| `thehive_get_alert` | Get detailed alert information by ID |
| `thehive_create_alert` | Create a new alert with type, source, sourceRef |
| `thehive_update_alert` | Update alert fields |
| `thehive_promote_alert` | Promote an alert to a case |

### Tasks (4 tools)
| Tool | Description |
|------|-------------|
| `thehive_list_tasks` | List tasks for a case (filter by status, assignee) |
| `thehive_get_task` | Get detailed task information |
| `thehive_create_task` | Create a task in a case |
| `thehive_update_task` | Update task fields (status, assignee, etc.) |

### Observables (4 tools)
| Tool | Description |
|------|-------------|
| `thehive_list_observables` | List observables/IOCs for a case |
| `thehive_get_observable` | Get detailed observable information |
| `thehive_create_observable` | Add an observable to a case (IP, domain, hash, etc.) |
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

## Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Open Cases | `thehive://cases/open` | All cases with New or InProgress status |
| New Alerts | `thehive://alerts/new` | Unprocessed alerts awaiting triage |
| Current User | `thehive://user/current` | Authenticated user profile |

## Prompts

| Prompt | Description |
|--------|-------------|
| `case-summary` | Generate a comprehensive incident case summary for reporting |
| `alert-triage` | Triage and analyze a security alert for escalation decision |
| `incident-response` | Guided incident response workflow with task creation |

## Setup

### Prerequisites

- Node.js 20+
- A running TheHive instance (v5.x with API v1)
- An API key with appropriate permissions

### Environment Variables

```bash
THEHIVE_URL=https://thehive.example.com    # Required: TheHive instance URL
THEHIVE_API_KEY=your-api-key-here          # Required: API authentication key
THEHIVE_VERIFY_SSL=true                     # Optional: SSL verification (default: true)
THEHIVE_TIMEOUT=30                          # Optional: Request timeout in seconds (default: 30)
```

### Install and Build

```bash
npm install
npm run build
```

### MCP Client Configuration

Add to your MCP client configuration (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "thehive": {
      "command": "node",
      "args": ["/path/to/thehive-mcp/dist/index.js"],
      "env": {
        "THEHIVE_URL": "https://thehive.example.com",
        "THEHIVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

Or run directly with npx:

```json
{
  "mcpServers": {
    "thehive": {
      "command": "npx",
      "args": ["-y", "thehive-mcp"],
      "env": {
        "THEHIVE_URL": "https://thehive.example.com",
        "THEHIVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
THEHIVE_URL=http://localhost:9000 THEHIVE_API_KEY=key npm run dev

# Type check
npm run typecheck

# Run tests
npm test

# Build for production
npm run build

# Run production build
npm start
```

## TheHive API Reference

This server targets TheHive API v1 (`/api/v1/`). Key concepts:

- **Severity levels:** 1 (Low), 2 (Medium), 3 (High), 4 (Critical)
- **TLP levels:** 0 (Clear), 1 (Green), 2 (Amber), 3 (Red)
- **PAP levels:** 0 (Clear), 1 (Green), 2 (Amber), 3 (Red)
- **Case status:** New, InProgress, Resolved, Deleted
- **Alert status:** New, Updated, Ignored, Imported
- **Task status:** Waiting, InProgress, Completed, Cancel
- **Observable types:** ip, domain, url, mail, hash, filename, fqdn, user-agent, regexp, other

## License

MIT
