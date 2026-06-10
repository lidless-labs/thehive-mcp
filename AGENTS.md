# Repository Guidance

## Definition of Done
A change is done only when all three pass, re-verified after your last edit:
1. `npm run typecheck`
2. `npm test`
3. `npm run build`

Report the actual results. If anything fails, paste the failure verbatim and do not claim success. Never weaken, skip, or delete a failing test to get green.

## Project Shape
- TypeScript MCP server for TheHive 5 (security incident response). 47 tools, 3 prompts, 3 resources over stdio. Tested against TheHive 5.4.11.
- Entry point: `src/index.ts` (built to `dist/index.js`, also the npm `bin`). Every tool module under `src/tools/` must be registered there via its `register*Tools` function.
- `src/client.ts` is the single HTTP client for the TheHive API. `src/config.ts` parses all `THEHIVE_*` env vars. `src/tools/safety.ts` holds the disabled-tool responses for gated tools.
- Configuration is env-var only. `THEHIVE_URL` and `THEHIVE_API_KEY` are required; see README for the rest.

## Live-Instance Prohibitions
TheHive holds real incident-response data. Treat every configured instance as production.
- During development or review: never run write or destructive tools against a live instance unless the user explicitly asks for that operation in this session. Read-only calls only.
- Adding a tool that deletes, merges, promotes, or mutates broadly: gate it behind `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS` via `src/tools/safety.ts`. Existing gated tools: `thehive_delete_case`, `thehive_delete_alert`, `thehive_merge_cases`, `thehive_promote_alert`.
- Adding a tool that accepts raw Query DSL: gate it behind `THEHIVE_ENABLE_RAW_QUERY` (as `thehive_query` is). Never loosen either gate's default-off behavior.
- Touching TLS handling: `THEHIVE_VERIFY_SSL=false` must only relax TLS for TheHive requests via the per-instance undici dispatcher in `src/client.ts`. Never disable TLS process-wide and never remove the scoped dispatcher.

## Verification Rules
- Type or API change: run `npm run typecheck` (`npm run lint` is the same command).
- Any code change: run `npm test` (vitest, `tests/`). The suite is fully mocked and offline; keep it that way. Do not add tests that require a live instance.
- Packaging or entry-point change: run `npm run build` (tsup).
- Editing `scripts/proxmox_install.sh`: `tests/scripts.test.ts` asserts on its literal content. Re-run `npm test` and update those assertions in the same change.
- `scripts/live-test.ts` hits a real instance. It is read-only by default; `THEHIVE_LIVE_ALLOW_WRITES=true` enables writes and `THEHIVE_LIVE_ALLOW_DESTRUCTIVE=true` enables deletes and merges. Set those flags only on an explicit user request, never to "verify" your own change.
- `prepublishOnly` runs typecheck + test + build; all three must pass before any publish.

## Publishing Boundary
- `core.hooksPath` is `hooks/`. The `pre-push` hook scans the tree with content-guard (`~/repos/content-guard`, policy `public-repo.json`) and blocks pushes on violations.
- Hook fires on a real leak: fix the content.
- Hook fires on a known-safe string: add an inline `<!-- content-guard: allow <rule-id> -->` tag.
- Never push with `--no-verify` and never disable or bypass the hook.
- Blocked by anything you cannot resolve (failing gate, missing credential, ambiguous requirement): report the exact blocker and stop. Do not work around it.

## Gotchas
- Published npm payload is limited by `package.json` `files` to `dist`, `README.md`, `CHANGELOG.md`, and `LICENSE`. New runtime assets outside `dist` will not ship; add them to `files` or build them in.
- ESM throughout (`"type": "module"`); local imports use `.js` extensions even in `.ts` sources.
- Adding or removing a tool: update the README tool count and the gated-tool lists in the same change.

## Memory Handoff
At the end of any substantial task, write a handoff note to `.claude/memory-handoffs/` using that directory's `TEMPLATE.md`. Record durable discoveries, gotchas, and decisions. Do not wait to be reminded.
