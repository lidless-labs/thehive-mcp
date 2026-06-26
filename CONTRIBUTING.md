# Contributing to thehive-mcp

thehive-mcp is a Model Context Protocol server that gives an AI client read-write control of [TheHive](https://thehive-project.org/) incident response platform. Patches are welcome. Before you start, please skim this file so we both spend our time on the right things.

## What kinds of changes land easily

- **Bug fixes** in the client, tool handlers, config parsing, or the live-test script.
- **New TheHive 5 tools** that map a real API endpoint, with the right safety classification (read, write, or gated destructive).
- **Sharper tool descriptions** so an agent picks the right tool, especially anything that corrects a TheHive 5 behavioral quirk.
- **Test coverage** for any of the above. Unit tests live alongside the source; the live integration script is `scripts/live-test.ts`.

## What needs a conversation first

- **A new destructive or irreversible tool.** Open an issue first. Anything that deletes, merges, or promotes must be gated behind `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS` and described as such.
- **Changing the gating model** for destructive tools or the raw Query DSL. The default-off posture is a deliberate safety property, not an accident.
- **Renaming a tool** or changing its arguments. Tool names are a public surface that other people's agent configs depend on.
- **Adding a runtime dependency.** The dependency set is intentionally small; new ones need a reason.

## What does not land

- Personal details, hostnames, real IPs, account IDs, API keys, or live TheHive URLs in code, tests, or docs. Use `192.0.2.x` (RFC 5737) and generic names in examples. CI and the local content-guard hook will flag real values.
- Code that relaxes TLS verification process-wide. `THEHIVE_VERIFY_SSL=false` must stay scoped to TheHive requests via the per-client dispatcher.
- AI co-authorship trailers on commits (`Co-Authored-By: <model>`). Conventional commits only.

## Local dev

```bash
git clone https://github.com/lidless-labs/thehive-mcp.git
cd thehive-mcp
npm install
npm run build
npm test
```

To run against a real TheHive instance (read-only, skips cleanly if the env vars are missing):

```bash
THEHIVE_URL=https://192.0.2.10:9000 THEHIVE_API_KEY=your-key npx tsx scripts/live-test.ts
```

Write and destructive passes are opt-in with `THEHIVE_LIVE_ALLOW_WRITES=true` and `THEHIVE_LIVE_ALLOW_DESTRUCTIVE=true`. See the Development section of [README.md](README.md) for the full set of flags.

## Adding a tool

1. Add the handler in the right module under `src/tools/` and register it with `server.tool("thehive_<name>", ...)`.
2. Use a `zod` schema for the arguments so the MCP client gets a typed input shape.
3. If the tool is destructive or irreversible, gate it behind `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS` using the existing safety helper, and say so in the description.
4. Add unit tests, and a live-test case if it touches the API in a new way.
5. Add a row to the matching tool table in `README.md` and an entry under `## [Unreleased]` in `CHANGELOG.md`.

## Filing issues

Please use the templates under `.github/ISSUE_TEMPLATE/`. The most useful bug report includes the package version, your Node version, your OS, and the full output with any tokens, real hostnames, or API keys redacted.

## License

By contributing you agree that your contribution is licensed under the MIT License, same as the rest of the repo.
</content>
