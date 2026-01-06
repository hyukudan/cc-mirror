# Configuration Reference

Each variant stores its configuration under `~/.cc-mirror/<variant>/`.
Use `npx cc-mirror config <variant>` to inspect the current settings, permissions, and MCP servers. To edit env or permissions without a full update, run `npx cc-mirror config set <variant> --env KEY=VALUE --allow ToolA,ToolB` or `npx cc-mirror config unset <variant> --env KEY --deny ToolC`.

## Variant Layout

```
~/.cc-mirror/<variant>/
  config/
    settings.json
    .claude.json
    tasks/<team>/
    skills/
  tweakcc/
    config.json
    system-prompts/
  npm/
    node_modules/@anthropic-ai/claude-code/cli.js
  variant.json
```

## Key Files

### `config/settings.json`

Environment overrides for the wrapper. The `env` object is merged into the runtime environment when you run the wrapper.

```
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-...",
    "ANTHROPIC_BASE_URL": "https://...",
    "CC_MIRROR_SPLASH": "1"
  }
}
```

### `config/.claude.json`

Claude Code's internal config: approvals, onboarding state, theme, and MCP servers. This file is managed by Claude Code and cc-mirror.

### MCP servers

MCP servers are stored under `config/.claude.json` in the `mcpServers` section. The easiest way to add them is to run the variant wrapper so `CLAUDE_CONFIG_DIR` points at the right config (or use `cc-mirror mcp`):

```bash
zai mcp add-json airtable '{
  "command": "npx",
  "args": ["@rashidazarang/airtable-mcp"],
  "env": {
    "AIRTABLE_TOKEN": "",
    "AIRTABLE_BASE_ID": ""
  }
}'
npx cc-mirror mcp zai add-json airtable '{"command":"npx","args":["@rashidazarang/airtable-mcp"]}'
```

Use `cc-mirror sync` with `--items mcp-servers` to copy MCP server entries between variants.

### `variant.json`

Metadata describing the variant (provider, paths, team mode flag, etc). cc-mirror uses this to update and validate variants.

### `tweakcc/config.json`

tweakcc theme configuration and toolset settings.

### `config/tasks/<team>/`

Task JSON files for team mode. Each task is stored as `<id>.json`.

## Wrapper Location

Wrappers are created at:

- Linux/macOS: `~/.local/bin/<variant>`
- Windows: `%USERPROFILE%\\.cc-mirror\\bin\\<variant>.cmd`

Use `npx cc-mirror path` (or `--apply` on POSIX) to add the wrapper directory to `PATH`.
