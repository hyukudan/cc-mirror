# Changelog

All notable changes to this project will be documented in this file.

## [1.7.1] - 2026-02-07

### Fixed

- **Orchestration hang** (#34): All `TaskOutput` calls in orchestration skill now require `timeout=30000` to prevent infinite hangs when agents crash.
- **Temp dir isolation** (#24): Unix wrapper `mktemp` now uses `XDG_RUNTIME_DIR` / `TMPDIR` for per-user temp files, avoiding conflicts on multi-user systems.
- **Windows `nul` artifact**: Added `nul` to `.gitignore` to prevent Windows reserved device name from being tracked.

### Added

- `--no-team-skills` documented in CLI reference (`docs/reference/cli-reference.md`).
- Timeout Handling subsection in orchestration patterns error recovery guide.

## [1.7.0] - 2026-01-31

### Added

- `--no-team-skills` flag to enable team mode without bundled orchestrator/task-manager skills.
- TUI architecture documentation in `docs/architecture/tui-architecture.md`.

### Changed

- TUI refactored to use centralized state management (`useCreateAppState` hook).
- TUI router infrastructure integrated with `useEscapeNavigation`.

### Fixed

- **Security**: JSON parsing sanitized against prototype pollution.

## [1.6.1] - 2026-01-30

### Added

- `cc-mirror dashboard` command with variant overview, disk usage, and team mode status.
- `cc-mirror search` command to filter providers by capability, auth type, tier, or verified status.
- Template system for saving and reusing variant configurations.
- TUI theme system and router infrastructure.
- Package manager auto-detection (npm, bun, pnpm).

### Changed

- E2E tests expanded with better helpers.

## [1.6.0] - 2026-01-28

### Added

- **6 New Providers**: Kimi Code (K2.5), Vercel AI Gateway, Poe, Google Vertex AI, AWS Bedrock, Azure AI Foundry.
- **API Translator**: Built-in Anthropic ↔ OpenAI translation proxy for DeepSeek.
- Provider capabilities metadata for filtering and discovery.
- Enterprise maintenance tools and enhanced diagnostics.

### Changed

- Kimi provider updated to K2.5 models.
- Brand themes refactored to use shared color utilities.
- Team mode now supports Claude Code 2.1.x where Task tools are enabled by default.
- README comprehensively rewritten with Mermaid diagrams.

### Fixed

- Windows CMD error message display.
- TUI test timing stabilization.

## [1.5.1] - 2026-01-11

### Added

- Doctor JSON output (`--json` flag).
- List JSON output (`--json` flag).
- Version flag and help support.
- Strict doctor checks with provider validation.
- Release readiness checklist.

### Changed

- Config import hardened with variant validation.
- Tweakcc ctrl-g patch warnings suppressed.

### Fixed

- Tweakcc local resolution in dist.

## [1.5.0] - 2026-01-06

### Added

- Sync Variants flow to copy skills, MCP servers, permissions, and `CLAUDE.md`.
- `cc-mirror sync` CLI command for syncing configs between variants.
- `cc-mirror run <name>` command to launch a variant wrapper directly.
- `cc-mirror mcp <name>` command to manage MCP servers in a variant.
- `cc-mirror export/import` commands to snapshot and restore variant config.
- `cc-mirror config` command to inspect and edit variant settings.
- `cc-mirror path --apply` to append PATH exports to shell profiles.
- Sync options for `tasks`, `provider-env`, and `--dry-run`.
- GatewayZ and NanoGPT providers with themes, splash art, and model mapping.
- Windows support: `.cmd` wrappers, PowerShell profile integration.
- `--prefer-ipv4` flag for IPv4-first DNS resolution.
- `--npm-version` flag to override Claude Code package version.
- Ctrl+C interrupt patch for Claude Code CLI.

### Changed

- Model-mapping checks now use provider flags.
- Create/update summaries surface PATH tips.
- Wrapper paths are platform-aware.

### Fixed

- Windows npm installs use `shell` spawning.

## [1.4.2] - 2026-01-05

### Added

- Explicit model selection for all Task() calls in orchestration skill.
- Model tier framework: haiku, sonnet, opus with usage guidance.

### Changed

- All commands now use `npx cc-mirror` for portability.

## [1.4.0] - 2026-01-05

### Added

- Tasks CLI for team mode management (`cc-mirror tasks`).
- Task-manager skill auto-installed with team mode.
- Core tasks store with dependency resolution helpers.

### Fixed

- Args parser fix for boolean flags consuming next argument.

## [1.3.0] - 2026-01-05

### Changed

- Team mode uses `CLAUDE_CODE_TEAM_MODE`, deriving team names from project folder.

### Fixed

- Cross-project task pollution when settings.json overwrote dynamic team names.

## [1.2.1] - 2026-01-05

### Fixed

- Team mode updates now refresh the orchestration skill when already enabled.

## [1.1.5] - 2026-01-05

### Added

- Role detection in orchestration skill (main orchestrator vs spawned worker).
- Worker agent prompt template with WORKER preamble.
- Tool ownership section separating orchestrator vs worker tools.
- Complete task lifecycle in documentation.

### Changed

- Flow diagram shows complete lifecycle with TaskList and TaskUpdate.
- Agent scaling is now guidance-based, not quota-based.

### Fixed

- Agents no longer re-orchestrate when spawned.

## [1.1.4] - 2026-01-05

### Changed

- Renamed skill: `multi-agent-orchestrator` → `orchestration`.
- Completely rewritten orchestration skill with "Conductor" personality.
- Maximal AskUserQuestion guidance (4 questions, 4 options).

### Added

- Auto-approve orchestration skill in permissions.
- Team pack system prompts.
- Domain expertise routing with reference files.

## [1.1.3] - 2026-01-04

### Fixed

- useEffect infinite loop when toggling team mode.
- Team mode visibility in configuration/summary screens.
- Skill tool examples mismatch.

### Added

- Team Pack prompt files for enhanced team mode guidance.
- TeamModeScreen TUI component.
- Comprehensive tests for blocked tools, team mode, provider matrix.

## [1.1.2] - 2026-01-04

### Fixed

- Suppress verbose tweakcc output during CLI variant creation.

## [1.1.1] - 2026-01-04

### Fixed

- Mirror and CCRouter providers no longer prompt for API key.

### Removed

- Twitter/X share URL from create output.

## [1.1.0] - 2026-01-04

### Added

- **Team Mode** - Multi-agent collaboration with shared task management.
- **Mirror Claude Provider** - Pure Claude Code with team mode by default.
- **Multi-Agent Orchestrator Skill** - "The Conductor" identity.
- Team mode documentation and architecture docs.

### Changed

- Bundle script copies skills to `dist/skills`.
- Enhanced TUI with team mode toggle.

## [1.0.4] - 2026-01-04

### Changed

- Removed broken ASCII art success banner.
- Streamlined Z.ai and MiniMax prompt packs.

## [1.0.3] - 2026-01-03

### Changed

- Removed 5 unused dependencies.
- Production dependencies reduced from 10 to 5.

### Fixed

- Fixed bin path to use relative path.

## [1.0.2] - 2026-01-03

### Changed

- Upgraded to Ink 6.6.0 and React 19.

## [1.0.1] - 2026-01-03

### Fixed

- Fixed npx compatibility by keeping React/Ink external.

## [1.0.0] - 2026-01-03

### Added

- First public release.
- Claude Code Router support.
- Provider intro screens with setup guidance.
- Beautiful README with screenshots.

### Changed

- Removed LiteLLM provider (replaced by Claude Code Router).

## [0.3.0] - 2026-01-02

### Added

- Colored ASCII art splash screens for each provider.
- Async operations for live TUI progress updates.
- MIT License.

## [0.2.0] - 2026-01-02

### Added

- Full-screen TUI wizard.
- Brand theme presets.
- Prompt packs for enhanced system prompts.
- dev-browser skill auto-installation.

## [0.1.0] - 2026-01-02

### Added

- Initial release.
- CLI for creating Claude Code variants.
- Support for Z.ai, MiniMax, OpenRouter.
- tweakcc integration for themes.
