# Security Policy

## Supported versions

thehive-mcp follows the latest published release on npm. Only the most recent minor release receives security fixes. Pin to a released version if you need a known-good build.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems. Email **me@solomonneas.dev** with: <!-- content-guard: allow pii/email -->

- A short description of the issue.
- Steps to reproduce (or a minimal proof of concept).
- The version or commit you tested against.
- Whether you would like to be credited in the release notes.

You should get an acknowledgment within 72 hours. If you do not, please follow up; the mail may have been filtered.

## In scope

- Command injection, path traversal, or unsafe handling of tool arguments inside the MCP server.
- Bypasses of the destructive-tool gate. The four irreversible tools (`thehive_delete_case`, `thehive_delete_alert`, `thehive_merge_cases`, `thehive_promote_alert`) must stay unreachable unless `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true` is set.
- Bypasses of the raw Query DSL gate (`thehive_query` reachable without `THEHIVE_ENABLE_RAW_QUERY=true`, or input that escapes the query shape, range, sort, and name guards).
- TLS verification leaking process-wide when `THEHIVE_VERIFY_SSL=false` is set (it must stay scoped to TheHive requests via the per-client dispatcher).
- Leaks of the API key, TheHive URL, or other sensitive values into logs, tool output, or error details.

## A note on capability

This server is a deliberate bridge between an AI client and a live TheHive instance. With the gates enabled it can delete and merge real case data on purpose. That is a capability, not a vulnerability. Reports about an agent doing what an enabled tool is documented to do are out of scope; reports about a tool acting **outside** its documented gate are in scope.

## Out of scope

- Vulnerabilities in TheHive, Cortex, or the MCP SDK themselves. Report those to their respective projects.
- Issues that require an attacker to already have your TheHive API key, your MCP client config, or write access to your machine.
- Destructive actions performed by tools you explicitly enabled with `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS` or `THEHIVE_ENABLE_RAW_QUERY`. The gate is the boundary; opting in is on you.

## Disclosure

We aim to ship a fix within 14 days of confirming a valid report. A coordinated disclosure timeline can be negotiated for issues that need longer.
</content>
