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
  doctor                       Health check all variants
  tweak <name>                 Launch tweakcc customization
  tasks [operation]            Manage team tasks (list, show, create, update, delete, clean)

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
  --no-tweak                   Skip tweakcc theming
  --no-prompt-pack             Skip provider prompt pack
  --prompt-pack-mode <mode>    minimal | maximal
  --shell-env                  Write env vars to shell profile (Z.ai)
  --env KEY=VALUE              Extra env var override (repeatable)
  --timeout-ms <ms>            API timeout override (ms)
  --prefer-ipv4                Set NODE_OPTIONS=--dns-result-order=ipv4first

EXAMPLES
  npx cc-mirror quick --provider zai
  npx cc-mirror create --provider minimax --brand minimax
  npx cc-mirror update zai
  npx cc-mirror doctor

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
