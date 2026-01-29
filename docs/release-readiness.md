# Release Readiness Checklist

## Build & packaging

- [ ] npm install
- [ ] npm test
- [ ] npm run typecheck
- [ ] npm run bundle
- [ ] node dist/cc-mirror.mjs --version
- [ ] node dist/cc-mirror.mjs --help
- [ ] node dist/cc-mirror.mjs doctor --json
- [ ] node dist/cc-mirror.mjs list --json

## CLI smoke (mirror provider, no keys)

- [ ] node dist/cc-mirror.mjs quick --provider mirror --name rr-mirror --yes
- [ ] node dist/cc-mirror.mjs config rr-mirror --json
- [ ] node dist/cc-mirror.mjs doctor --strict
- [ ] node dist/cc-mirror.mjs update rr-mirror
- [ ] node dist/cc-mirror.mjs export rr-mirror ./rr-mirror.json
- [ ] node dist/cc-mirror.mjs import rr-mirror ./rr-mirror.json --dry-run
- [ ] node dist/cc-mirror.mjs sync rr-mirror rr-mirror --dry-run
- [ ] node dist/cc-mirror.mjs remove rr-mirror

## Provider credential validation

- [ ] create/update for zai/minimax/openrouter/gatewayz/nanogpt/ccrouter with real keys
- [ ] validate model overrides and base URL handling
- [ ] validate shell env writing for Z.ai

## TUI smoke

- [ ] npm run tui and complete Quick Setup
- [ ] create/update/remove flows
- [ ] doctor screen shows healthy variants
- [ ] prompt pack text references minimal only

## Docs & artifacts

- [ ] npm run render:tui-svg
- [ ] review docs/reference/cli-reference.md for accuracy
