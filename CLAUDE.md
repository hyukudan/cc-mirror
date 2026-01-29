# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CC-MIRROR creates isolated Claude Code variants with custom AI providers. Each variant has its own configuration, wrapper script, and can use different backends (DeepSeek, OpenRouter, MiniMax, etc.) through API translation.

## Commands

```bash
# Development
npm run dev                              # Run CLI from TypeScript
npm run dev -- create --provider zai     # Create variant
npm run dev -- update <name>             # Update variant
npm run tui                              # Launch TUI wizard

# Testing
npm test                                 # All tests
npm test -- --test-name-pattern="E2E"    # E2E tests only
npm test -- --test-name-pattern="TUI"    # TUI tests only
npm run test:watch                       # Watch mode

# Quality
npm run typecheck                        # TypeScript check
npm run lint                             # ESLint
npm run format                           # Prettier
npm run check                            # All checks + build

# Build
npm run bundle                           # Build dist/cc-mirror.mjs
```

## Architecture

### Core Flow

```
CLI/TUI → core/index.ts → VariantBuilder → Steps (11) → Variant Directory
```

The build uses a step-based pipeline where each step is isolated and can run sync (CLI) or async (TUI with progress).

### Build Steps (order matters)

1. PrepareDirectories → creates `~/.cc-mirror/<variant>/`
2. InstallNpm → installs Claude Code to `npm/`
3. CliPatch → patches cli.js for Ctrl+C handling
4. WriteConfig → creates `settings.json`, `.claude.json`
5. BrandTheme → creates `tweakcc/config.json` (MUST precede TeamMode)
6. TeamMode → patches cli.js for Task* tools, configures toolset
7. Tweakcc → applies theme + system prompts
8. Wrapper → creates `~/.local/bin/<name>`
9. ShellEnv → adds API key to shell profile (zai only)
10. SkillInstall → installs skills to `config/skills/`
11. Finalize → writes `variant.json` metadata

### Variant Directory Layout

```
~/.cc-mirror/<variant>/
├── config/
│   ├── settings.json      # API keys, model mappings
│   ├── .claude.json       # Onboarding state, MCP servers
│   ├── tasks/<team>/      # Team mode task storage
│   └── skills/            # Installed skills
├── tweakcc/
│   ├── config.json        # Brand theme + toolsets
│   └── system-prompts/    # Applied prompt overlays
├── npm/node_modules/...   # Claude Code installation
└── variant.json           # Metadata
```

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/providers/index.ts` | Provider definitions (baseUrl, models, auth) |
| `src/brands/*.ts` | TweakCC themes + blocked tools per provider |
| `src/core/variant-builder/` | Step-based build orchestration |
| `src/core/prompt-pack/` | Per-provider system prompt overlays |
| `src/team-pack/` | Team mode prompt files + toolset config |
| `src/tui/` | Ink-based terminal wizard |

### Team Mode

Enables TaskCreate/TaskGet/TaskUpdate/TaskList tools for multi-agent collaboration.

- Patches `function sU(){return!1}` → `function sU(){return!0}` in cli.js
- Note: Claude Code 2.1.x has Task tools enabled by default (no patch needed)
- Team name is directory-based at runtime: `<project-folder>[-TEAM_suffix]`
- `CLAUDE_CODE_TEAM_NAME` set by wrapper, NOT in settings.json

### API Translator

For providers without Anthropic-compatible APIs (DeepSeek, Kimi), cc-mirror runs a local proxy that translates between Anthropic and OpenAI formats.

## Test Helpers

Import from `test/helpers/`:

```typescript
import { makeTempDir, cleanup, tick, send, KEYS, withFakeNpm } from '../helpers/index.js';

// TUI test pattern
const app = render(React.createElement(Screen, { props }));
await tick();
await send(app.stdin, KEYS.down);
await send(app.stdin, KEYS.enter);
assert.ok(app.lastFrame()?.includes('expected'));
app.unmount();
```

## Conventions

- TypeScript + ESM only (no CommonJS)
- Tests: `*.test.ts` in `test/` mirroring `src/` structure
- Always use `node:assert/strict` for assertions
- Use `withFakeNpm()` in tests to avoid real npm downloads
- BrandThemeStep must always precede TeamModeStep (toolset config dependency)
