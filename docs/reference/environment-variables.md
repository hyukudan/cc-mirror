# Environment Variables

This reference lists the key environment variables used by cc-mirror and Claude Code.

## Wrapper and Config

- `CLAUDE_CONFIG_DIR` - Variant config directory (set by wrapper)
- `TWEAKCC_CONFIG_DIR` - tweakcc config directory (set by wrapper)
- `CC_MIRROR_TUI_PATH` - Override TUI entrypoint location (advanced)

## Provider Auth

- `ANTHROPIC_API_KEY` - API-key auth (zai, minimax, custom, mirror optional)
- `ANTHROPIC_AUTH_TOKEN` - Token auth (openrouter, gatewayz, nanogpt, ccrouter)
- `ANTHROPIC_BASE_URL` - Override API endpoint (set per provider)

## Model Mapping

- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `ANTHROPIC_SMALL_FAST_MODEL`
- `ANTHROPIC_MODEL`
- `CLAUDE_CODE_SUBAGENT_MODEL` - Optional sub-agent model override

## Team Mode

- `CLAUDE_CODE_TEAM_MODE` - Enable team mode for a variant
- `CLAUDE_CODE_TEAM_NAME` - Team name (derived by wrapper when team mode is on)
- `CLAUDE_CODE_AGENT_ID` - Agent identifier (team mode)
- `CLAUDE_CODE_AGENT_TYPE` - `team-lead` or `worker`
- `TEAM` - Optional suffix appended to team names

## Wrapper Splash

- `CC_MIRROR_SPLASH` - `1` to show splash, `0` to disable
- `CC_MIRROR_SPLASH_STYLE` - Provider style (zai, minimax, openrouter, gatewayz, nanogpt, ccrouter, mirror)
- `CC_MIRROR_PROVIDER_LABEL` - Custom splash label
- `CC_MIRROR_SPLASH_UTF8` - Windows: `0` to skip `chcp 65001`
- `CC_MIRROR_UNSET_AUTH_TOKEN` - Internal flag to unset `ANTHROPIC_AUTH_TOKEN`

## Misc

- `DISABLE_AUTOUPDATER` - `1` to disable Claude Code auto-updater
- `NODE_OPTIONS` - Node flags (e.g. `--dns-result-order=ipv4first`)
- `Z_AI_API_KEY` - Z.ai CLI key (written from `ANTHROPIC_API_KEY` when `--shell-env` is used)
- `Z_AI_BASE_URL` - Z.ai API endpoint override (China default)
