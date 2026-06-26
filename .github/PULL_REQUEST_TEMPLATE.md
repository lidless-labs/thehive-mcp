<!--
Thanks for sending a patch. Keep this short; delete sections that do not apply.
See CONTRIBUTING.md for what lands easily and what needs an issue first.
-->

## What and why

<!-- One or two sentences on the user-visible change and the problem it solves. -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] New tool / TheHive endpoint coverage
- [ ] Docs
- [ ] Refactor with no tool-surface change
- [ ] Surface change (rename a tool, change arguments, change the destructive-tool gate), opened an issue first per CONTRIBUTING.md

## Checklist

- [ ] `npm test` and `npm run typecheck` pass locally
- [ ] Added or updated tests covering the change
- [ ] Any new destructive or irreversible tool is gated behind `THEHIVE_ALLOW_DESTRUCTIVE_TOOLS`
- [ ] Updated the `Unreleased` section of `CHANGELOG.md` for any user-visible effect
- [ ] No API keys, personal details, real hostnames, real IPs, account names, or unredacted absolute paths in code, tests, docs, or this PR (examples use `192.0.2.x` and generic names)
- [ ] Conventional commit messages, no AI co-authorship trailers
