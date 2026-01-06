# CLI Reference

All commands are available through `npx cc-mirror`.

## Commands

- `create [options]` - Create a new variant (interactive by default)
- `quick [options]` - Fast create (provider + key)
- `list` - List existing variants
- `update [name]` - Update one variant (omit name to update all)
- `remove <name>` - Remove a variant
- `doctor` - Health check all variants
- `tweak <name>` - Launch tweakcc customization
- `run <name>` - Launch a variant wrapper
- `mcp <name> [operation]` - Manage MCP servers for a variant
- `export <name> [file]` - Export a config snapshot
- `import <name> <file>` - Import a config snapshot
- `config <name>` - Show variant config summary
- `tasks [operation]` - Manage team tasks
- `path [--apply]` - Show PATH setup instructions
- `sync <source> <target...>` - Sync config between variants

## Options (create/quick)

- `--name <name>` - Variant name (becomes the CLI command)
- `--provider <name>` - Provider: zai | minimax | gatewayz | openrouter | nanogpt | ccrouter | mirror | custom
- `--api-key <key>` - Provider API key (see provider auth mode)
- `--brand <preset>` - Theme: auto | none | zai | minimax | gatewayz | openrouter | nanogpt | ccrouter | mirror
- `--quick` - Use quick mode (same as `quick` command)
- `--tui / --no-tui` - Force TUI on/off
- `--yes` - Accept defaults without prompts

## Options (advanced)

- `--base-url <url>` - Override `ANTHROPIC_BASE_URL`
- `--model-sonnet <name>` - Default Sonnet model
- `--model-opus <name>` - Default Opus model
- `--model-haiku <name>` - Default Haiku model
- `--root <path>` - Variants root (default: `~/.cc-mirror`)
- `--bin-dir <path>` - Wrapper install dir (default: `~/.local/bin` or `%USERPROFILE%\\.cc-mirror\\bin`)
- `--npm-package <name>` - Override Claude Code package (default: `@anthropic-ai/claude-code`)
- `--npm-version <ver>` - Override Claude Code package version (default: `2.0.76`)
- `--no-tweak` - Skip tweakcc theming
- `--no-prompt-pack` - Skip provider prompt pack
- `--prompt-pack-mode <mode>` - minimal | maximal
- `--shell-env` - Write env vars to shell profile (Z.ai)
- `--env KEY=VALUE` - Extra env var override (repeatable)
- `--timeout-ms <ms>` - API timeout override (ms)
- `--prefer-ipv4` - Prefer IPv4 DNS (sets `CC_MIRROR_PREFER_IPV4=1` unless `NODE_OPTIONS` is set)
- `--enable-team-mode` - Enable team mode (orchestrator + task-manager skills, Task* tools)
- `--disable-team-mode` - Disable team mode for quick setup
- `--no-skill-install` - Skip dev-browser skill install
- `--skill-update` - Refresh managed skills during update

## Options (path)

- `--apply` - Append PATH export to shell profile (POSIX/PowerShell)
- `--bin-dir <path>` - Check a custom wrapper directory

## Options (sync)

- `--items <list>` - Items to sync (`skills,mcp-servers,permissions,claude-md,tasks,provider-env`)
- `--source <name>` - Source variant (optional if positional)
- `--targets <list>` - Comma-separated targets (optional if positional)
- `--no-backup` - Skip config backup
- `--dry-run` - Show what would change without writing files

## Options (export)

- `--items <list>` - Items to export (`skills,mcp-servers,permissions,claude-md,tasks,provider-env`)
- `--variant <name>` - Variant to export (optional if positional)
- `--out <path>` - Output file path (optional)

## Options (import)

- `--items <list>` - Items to import (`skills,mcp-servers,permissions,claude-md,tasks,provider-env`)
- `--variant <name>` - Variant to import into (optional if positional)
- `--file <path>` - Input file path (optional if positional)
- `--no-backup` - Skip config backup
- `--dry-run` - Show what would change without writing files

## Options (config)

- `--variant <name>` - Variant to inspect (optional if positional)
- `--json` - Print JSON output
- `--show-values` - Show full env values (default masks secrets)

## MCP Command

Common examples:

```
npx cc-mirror mcp zai list
npx cc-mirror mcp zai show airtable
npx cc-mirror mcp zai add-json airtable '{"command":"npx","args":["@rashidazarang/airtable-mcp"]}'
npx cc-mirror mcp zai remove airtable
```

## Export/Import

```
npx cc-mirror export zai
npx cc-mirror import zai ./cc-mirror-zai.json
npx cc-mirror import zai ./cc-mirror-zai.json --items mcp-servers,permissions
```

## Config

```
npx cc-mirror config zai
npx cc-mirror config --json --variant minimax
```

## Tasks Command

Run `npx cc-mirror tasks --help` for all operations and flags. Common examples:

```
npx cc-mirror tasks
npx cc-mirror tasks show 5
npx cc-mirror tasks create --subject "Fix bug" --description "..."
npx cc-mirror tasks update 5 --status resolved
npx cc-mirror tasks clean --resolved --dry-run
```

## Interrupt Handling

In interactive sessions, Ctrl+C sends an interrupt signal (ESC) to stop streaming output. Press Ctrl+C twice to exit. In non-interactive shells, Ctrl+C exits immediately.
