import { DEFAULT_BIN_DIR } from '../core/constants.js';
import { getRandomHaiku } from '../tui/content/haikus.js';

export const printHelp = () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                           CC-MIRROR                                      ║
║              Create Claude Code Variants with Custom Providers           ║
╚══════════════════════════════════════════════════════════════════════════╝

WHAT IS CC-MIRROR?
  CC-MIRROR creates isolated Claude Code installations that connect to
  different AI providers. Each variant is independent with its own
  config, theme, and settings.

QUICK START
  npx cc-mirror quick              # Fast setup: provider + key → done
  npx cc-mirror create             # Full wizard with all options

COMMANDS
  create [options]             Create a new variant
  quick [options]              Fast: provider + API key only
  list                         List all variants
  update [name]                Update to latest Claude Code
  remove <name>                Remove a variant
  version                      Print CLI version
  doctor                       Health check all variants
  tweak <name>                 Launch tweakcc customization
  run <name>                   Launch a variant wrapper
  mcp <name> [operation]       Manage MCP servers for a variant
  export <name> [file]         Export config snapshot
  import <name> <file>         Import config snapshot
  config [operation]           Show or edit variant config summary
  tasks [operation]            Manage team tasks (list, show, create, update, delete, clean)
  path [--apply]               Show PATH setup instructions
  sync <source> <target...>    Sync config between variants

OPTIONS (global)
  --help, -h                   Show help
  --version, -v                Print CLI version

OPTIONS (create/quick)
  --name <name>                Variant name (becomes CLI command)
  --provider <name>            Provider: zai | minimax | gatewayz | openrouter | nanogpt | ccrouter | mirror
  --api-key <key>              Provider API key
  --brand <preset>             Theme: auto | none | zai | minimax | gatewayz | openrouter | nanogpt | ccrouter | mirror
  --quick                      Fast path mode
  --tui / --no-tui             Force TUI on/off

OPTIONS (advanced)
  --base-url <url>             ANTHROPIC_BASE_URL override
  --model-sonnet <name>        Default Sonnet model
  --model-opus <name>          Default Opus model
  --model-haiku <name>         Default Haiku model
  --root <path>                Variants root (default: ~/.cc-mirror)
  --bin-dir <path>             Wrapper install dir (default: ${DEFAULT_BIN_DIR})
  --npm-package <name>         Claude Code package override
  --npm-version <ver>          Claude Code package version override
  --no-tweak                   Skip tweakcc theming
  --no-prompt-pack             Skip provider prompt pack
  --prompt-pack-mode <mode>    minimal (maximal deprecated)
  --shell-env                  Write env vars to shell profile (Z.ai)
  --no-skill-install           Skip dev-browser skill install
  --skill-update               Refresh managed skills during update
  --env KEY=VALUE              Extra env var override (repeatable)
  --timeout-ms <ms>            API timeout override (ms)
  --prefer-ipv4                Prefer IPv4 DNS (sets CC_MIRROR_PREFER_IPV4=1)
  --enable-team-mode           Enable team mode
  --disable-team-mode          Disable team mode (quick setup)

OPTIONS (path)
  --apply                      Append PATH export to shell profile (POSIX/PowerShell)

OPTIONS (doctor)
  --strict                     Run extra validation checks (names, settings, team mode)
  --json                       Output doctor report as JSON

OPTIONS (list)
  --json                       Output variant list as JSON

OPTIONS (sync)
  --items <list>               skills,mcp-servers,permissions,claude-md,tasks,provider-env
  --source <name>              Source variant (optional if positional)
  --targets <list>             Comma-separated targets (optional if positional)
  --no-backup                  Skip config backup
  --dry-run                    Show what would change without writing files

OPTIONS (export)
  --items <list>               skills,mcp-servers,permissions,claude-md,tasks,provider-env
  --variant <name>             Variant to export (optional if positional)
  --out <path>                 Output file path

OPTIONS (import)
  --items <list>               skills,mcp-servers,permissions,claude-md,tasks,provider-env
  --variant <name>             Variant to import into (optional if positional)
  --file <path>                Input file path
  --no-backup                  Skip config backup
  --dry-run                    Show what would change without writing files

OPTIONS (config)
  --variant <name>             Variant to inspect (optional if positional)
  --json                       Print JSON output
  --show-values                Show full env values (default masks secrets)
  --env KEY=VALUE              Env override (repeatable; for set)
  --env KEY                    Env key to remove (repeatable; for unset)
  --allow <list>               Comma-separated allow list (set/unset)
  --ask <list>                 Comma-separated ask list (set/unset)
  --deny <list>                Comma-separated deny list (set/unset)

EXAMPLES
  npx cc-mirror quick --provider zai
  npx cc-mirror create --provider minimax --brand minimax
  npx cc-mirror update zai
  npx cc-mirror doctor
  npx cc-mirror path
  npx cc-mirror run zai
  npx cc-mirror mcp zai list
  npx cc-mirror export zai
  npx cc-mirror import zai ./cc-mirror-zai.json
  npx cc-mirror config zai
  npx cc-mirror config list

LEARN MORE
  https://github.com/numman-ali/cc-mirror

────────────────────────────────────────────────────────────────────────────
Created by Numman Ali • https://x.com/nummanali
`);
};

/**
 * Print a random haiku (easter egg: --haiku flag)
 */
export const printHaiku = () => {
  const haiku = getRandomHaiku();
  console.log(`
    ─────────────────────────────
    ${haiku[0]}
    ${haiku[1]}
    ${haiku[2]}
    ─────────────────────────────
`);
};
