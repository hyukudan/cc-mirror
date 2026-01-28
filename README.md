# CC-MIRROR

<p align="center">
  <img src="./assets/cc-mirror-providers.png" alt="CC-MIRROR Provider Themes" width="800">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cc-mirror"><img src="https://img.shields.io/npm/v/cc-mirror.svg" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://twitter.com/nummanali"><img src="https://img.shields.io/twitter/follow/nummanali?style=social" alt="Twitter Follow"></a>
</p>

<p align="center">
  <strong>Create multiple isolated Claude Code variants with custom AI providers.</strong>
</p>

---

## What is CC-MIRROR?

CC-MIRROR lets you run **multiple isolated Claude Code instances**, each connecting to a different AI provider. Every variant has its own configuration, sessions, themes, and credentials — completely independent from each other.

```mermaid
flowchart TB
    subgraph providers["🔌 AI Providers"]
        direction LR
        subgraph gateways["API Gateways"]
            zai["Z.ai<br/><small>GLM-4.7</small>"]
            minimax["MiniMax<br/><small>M2.1</small>"]
            openrouter["OpenRouter<br/><small>100+ LLMs</small>"]
            vercel["Vercel<br/><small>AI Gateway</small>"]
            poe["Poe<br/><small>Multi-model</small>"]
        end
        subgraph cloud["Cloud Enterprise"]
            vertex["Vertex AI<br/><small>GCP</small>"]
            bedrock["Bedrock<br/><small>AWS</small>"]
            foundry["Foundry<br/><small>Azure</small>"]
        end
        subgraph local["Local & Native"]
            kimi["Kimi Code<br/><small>K2.5</small>"]
            deepseek["DeepSeek<br/><small>Reasoner</small>"]
            ccrouter["CCRouter<br/><small>Ollama</small>"]
            mirror["Mirror<br/><small>Claude Native</small>"]
        end
    end

    subgraph ccmirror["⚡ CC-MIRROR CLI"]
        cli["Variant Manager + TUI"]
    end

    subgraph variants["📁 Isolated Variants (~/.cc-mirror/)"]
        direction LR
        v1["<b>zai/</b><br/>npm/ config/ tweakcc/"]
        v2["<b>vertex/</b><br/>npm/ config/ tweakcc/"]
        v3["<b>kimi/</b><br/>npm/ config/ tweakcc/"]
    end

    subgraph wrappers["🚀 CLI Wrappers"]
        direction LR
        w1["$ zai"]
        w2["$ vertex"]
        w3["$ kimi"]
    end

    providers --> cli
    cli --> variants
    v1 -.-> w1
    v2 -.-> w2
    v3 -.-> w3
```

**Key benefits:**
- **Provider flexibility** — Switch between 12+ AI providers without reconfiguring
- **Complete isolation** — Each variant has its own API keys, sessions, and settings
- **Custom themes** — Unique color schemes per provider via [tweakcc](https://github.com/Piebald-AI/tweakcc)
- **Team mode** — Multi-agent collaboration with shared task management
- **One-command updates** — Keep all variants in sync when Claude Code releases

---

## About This Fork

> **Original project:** [numman-ali/cc-mirror](https://github.com/numman-ali/cc-mirror)

This fork extends the original cc-mirror with additional tooling for power users and enterprise scenarios:

| Addition | Description |
|----------|-------------|
| **MCP Management** | `cc-mirror mcp` to list/add/remove MCP servers per variant |
| **Config Export/Import** | `cc-mirror export/import` to snapshot and restore configurations |
| **Config Operations** | `cc-mirror config` for inspecting and editing env variables + permissions |
| **Cloud Providers** | Added Vertex AI (GCP), Bedrock (AWS), and Foundry (Azure) support |
| **Extended Providers** | Added Kimi Code, DeepSeek, Vercel AI Gateway, and Poe API |
| **Integrated Translator** | Built-in Anthropic↔OpenAI API translation for OpenAI-compatible providers |
| **Color Utilities** | Shared theme system for consistent provider branding |

We keep full compatibility with upstream and contribute improvements back when possible.

---

## Quick Start

```bash
# Interactive TUI (recommended for first-time setup)
npx cc-mirror

# Quick setup from CLI
npx cc-mirror quick --provider zai --api-key "$Z_AI_API_KEY"
```

<p align="center">
  <img src="./assets/cc-mirror-home.png" alt="CC-MIRROR Home Screen" width="600">
</p>

---

## Supported Providers

CC-MIRROR supports **13 providers** across three categories:

### API Gateway Providers
These providers offer access to multiple models through a unified API:

| Provider | Models | Auth | Best For |
|----------|--------|------|----------|
| **Z.ai** | GLM-4.7, GLM-4.5-Air | API Key | Heavy coding with GLM reasoning |
| **MiniMax** | MiniMax-M2.1 | API Key | Unified model experience |
| **OpenRouter** | 100+ models | Auth Token | Model flexibility, pay-per-use |
| **NanoGPT** | 100+ models | Auth Token | Model flexibility, pay-per-use |
| **Vercel** | Multi-provider | Auth Token | Vercel AI Gateway access |
| **Poe** | Claude via Poe | Auth Token | Quora's Poe API |
| **GatewayZ** | Claude via OneRouter | Auth Token | Anthropic API via GatewayZ |

### Cloud Enterprise Providers
Native Claude access through major cloud platforms:

| Provider | Platform | Auth | Best For |
|----------|----------|------|----------|
| **Vertex AI** | Google Cloud | GCP Auth | Enterprise GCP deployments |
| **Bedrock** | AWS | AWS Credentials | Enterprise AWS deployments |
| **Foundry** | Azure | Azure Auth | Enterprise Azure deployments |

### Local & Native Providers

| Provider | Models | Auth | Best For |
|----------|--------|------|----------|
| **CCRouter** | Ollama, local LLMs | Optional | Local-first development |
| **Mirror** | Claude (native) | OAuth/Key | Pure Claude with team mode |
| **Kimi Code** | kimi-for-coding (K2.5) | API Key | Moonshot AI coding assistant |
| **DeepSeek** | deepseek-chat, deepseek-reasoner | API Key | Cost-effective reasoning |

---

## Provider Setup Examples

### API Gateway Providers

```bash
# Z.ai (GLM Coding Plan)
npx cc-mirror quick --provider zai --api-key "$Z_AI_API_KEY"

# Z.ai China endpoint
Z_AI_BASE_URL="https://open.bigmodel.cn/api/anthropic" \
  npx cc-mirror quick --provider zai --api-key "$Z_AI_API_KEY"

# MiniMax
npx cc-mirror quick --provider minimax --api-key "$MINIMAX_API_KEY"

# OpenRouter (100+ models)
npx cc-mirror quick --provider openrouter --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "anthropic/claude-3.5-sonnet"

# NanoGPT
npx cc-mirror quick --provider nanogpt --api-key "$NANOGPT_API_KEY" \
  --model-sonnet "zai-org/glm-4.7:thinking"

# Vercel AI Gateway
npx cc-mirror quick --provider vercel --api-key "$VERCEL_API_KEY" \
  --model-sonnet "anthropic/claude-sonnet-4"

# Poe API
npx cc-mirror quick --provider poe --api-key "$POE_API_KEY" \
  --model-sonnet "Claude-3.5-Sonnet"

# GatewayZ
npx cc-mirror quick --provider gatewayz --api-key "$GATEWAYZ_API_KEY" \
  --model-sonnet "claude-sonnet-4-20250514"
```

### Cloud Enterprise Providers

```bash
# Google Vertex AI (requires gcloud auth)
npx cc-mirror quick --provider vertex \
  --env "ANTHROPIC_VERTEX_PROJECT_ID=your-project-id"

# AWS Bedrock (requires AWS credentials)
npx cc-mirror quick --provider bedrock \
  --env "AWS_REGION=us-east-1"

# Azure AI Foundry
npx cc-mirror quick --provider foundry \
  --env "ANTHROPIC_FOUNDRY_RESOURCE=your-resource" \
  --env "ANTHROPIC_FOUNDRY_API_KEY=your-key"
```

### Local & Native Providers

```bash
# Claude Code Router (local LLMs via Ollama, etc.)
npx cc-mirror quick --provider ccrouter

# Mirror Claude (pure Claude with team mode)
npx cc-mirror quick --provider mirror --name mclaude

# Kimi Code (Moonshot AI - Anthropic-compatible)
npx cc-mirror quick --provider kimi --api-key "$KIMI_API_KEY"

# DeepSeek (uses integrated translator)
npx cc-mirror quick --provider deepseek --api-key "$DEEPSEEK_API_KEY"
```

---

## How It Works

```mermaid
flowchart LR
    A["🎯 npx cc-mirror quick<br/>--provider zai"] --> B["📦 Install Claude Code<br/>in isolated npm/"]
    B --> C["⚙️ Configure API keys<br/>& environment"]
    C --> D["🎨 Apply theme<br/>via tweakcc"]
    D --> E["🔗 Create wrapper<br/>~/.local/bin/zai"]
    E --> F["🚀 Run: $ zai"]
```

Each variant lives in its own directory with complete isolation:

```
~/.cc-mirror/
├── zai/                          ← Z.ai variant
│   ├── npm/                      Claude Code installation
│   ├── config/                   API keys, sessions, MCP servers
│   ├── tweakcc/                  Theme & prompt customization
│   └── variant.json              Metadata (provider, version, etc.)
│
├── vertex/                       ← Google Cloud variant
│   └── ...
│
├── kimi/                         ← Moonshot AI variant
│   └── ...
│
└── mclaude/                      ← Mirror Claude variant
    └── ...

Wrappers:
├── ~/.local/bin/zai              (Linux/macOS)
├── ~/.local/bin/vertex
├── ~/.local/bin/kimi
└── ~/.local/bin/mclaude
```

**Windows wrappers:** `%USERPROFILE%\.cc-mirror\bin\<variant>.cmd`

---

## Integrated API Translator

CC-MIRROR includes a built-in **Anthropic↔OpenAI API translator** that enables using OpenAI-compatible providers directly with Claude Code:

```mermaid
flowchart LR
    subgraph wrapper["Variant Wrapper"]
        direction TB
        proxy["Translation Proxy<br/><small>localhost:auto</small>"]
    end

    CC["Claude Code<br/><small>Anthropic API</small>"] --> proxy
    proxy --> DS["DeepSeek API<br/><small>OpenAI format</small>"]
    proxy --> Other["Other OpenAI-compatible<br/><small>Groq, Together, etc.</small>"]
```

**How it works:**
1. The wrapper starts a local translation proxy on a random port
2. Claude Code connects to the proxy (thinks it's Anthropic API)
3. The proxy translates requests to OpenAI format and forwards them
4. Responses are translated back to Anthropic format

**Providers using the translator:**

| Provider | API | Models | Notes |
|----------|-----|--------|-------|
| **DeepSeek** | `api.deepseek.com` | deepseek-chat, deepseek-reasoner | Cost-effective reasoning |

**Providers with native Anthropic API (no translation):**

| Provider | API | Notes |
|----------|-----|-------|
| **Kimi Code** | `api.kimi.com/coding/` | Already Anthropic-compatible |
| **Z.ai** | `api.z.ai/api/anthropic` | Native Anthropic format |
| **MiniMax** | `api.minimax.io/anthropic` | Native Anthropic format |

> The translator handles streaming, tool use, and all Claude Code features transparently.

Run any variant directly from your terminal:

```bash
zai          # Launch Z.ai variant
vertex       # Launch Vertex AI variant
kimi         # Launch Kimi variant
mclaude      # Launch Mirror Claude variant
```

---

## Brand Themes

Each provider includes a custom color theme powered by [tweakcc](https://github.com/Piebald-AI/tweakcc):

| Brand | Theme Name | Style |
|-------|------------|-------|
| **zai** | Emerald | Dark carbon with gold accents |
| **minimax** | Coral | Coral/red/orange spectrum |
| **gatewayz** | Portal | Dark portal with violet accents |
| **openrouter** | Ocean | Teal/cyan gradient |
| **nanogpt** | Nebula | Purple/violet gradient |
| **ccrouter** | Sky | Sky blue accents |
| **mirror** | Chrome | Silver/chrome with electric blue |
| **kimi** | Lunar | Indigo/silver moonlit aesthetic |
| **deepseek** | Deep | Blue gradient, intelligent vibes |
| **vercel** | Edge | Clean black/white minimalist |
| **poe** | Violet | Mystical violet/purple |
| **vertex** | Cloud | Google blue/green/yellow palette |
| **bedrock** | Ember | AWS orange warm tones |
| **foundry** | Azure | Azure blue professional |

---

## Commands Reference

### Variant Management

```bash
npx cc-mirror                     # Interactive TUI
npx cc-mirror create              # Full configuration wizard
npx cc-mirror quick [options]     # Fast setup with defaults
npx cc-mirror list                # List all variants
npx cc-mirror list --json         # List in JSON format
npx cc-mirror update [name]       # Update one or all variants
npx cc-mirror remove <name>       # Delete a variant
npx cc-mirror doctor              # Health check all variants
npx cc-mirror run <name>          # Launch a variant
```

### Configuration Management

```bash
npx cc-mirror config <name>                    # Show variant config
npx cc-mirror config list                      # List all variant configs
npx cc-mirror config set <name> --env KEY=VAL  # Set env override
npx cc-mirror config unset <name> --env KEY    # Remove env override
npx cc-mirror export <name>                    # Export config snapshot
npx cc-mirror import <name> <file>             # Import config snapshot
```

### MCP Server Management

```bash
npx cc-mirror mcp <name>                       # List MCP servers
npx cc-mirror mcp <name> add-json <id> '{...}' # Add MCP server
npx cc-mirror mcp <name> remove <id>           # Remove MCP server
```

### Sync Between Variants

```bash
npx cc-mirror sync <source> <target...>
npx cc-mirror sync source --targets team-a,team-b --items skills,mcp-servers
npx cc-mirror sync source target --no-backup --dry-run
```

### Task Management (Team Mode)

```bash
npx cc-mirror tasks               # List open tasks
npx cc-mirror tasks show <id>     # Show task details
npx cc-mirror tasks create        # Create new task
npx cc-mirror tasks update <id>   # Update task
npx cc-mirror tasks archive <id>  # Archive task
npx cc-mirror tasks clean         # Bulk cleanup
npx cc-mirror tasks graph         # Visualize dependencies
```

---

## CLI Options

### Provider Options

```
--provider <name>        Provider: zai | minimax | gatewayz | openrouter | nanogpt |
                         ccrouter | mirror | kimi | deepseek | vercel | poe | vertex |
                         bedrock | foundry | custom
--name <name>            Variant name (becomes the CLI command)
--api-key <key>          Provider API key
--base-url <url>         Custom API endpoint
```

### Model Mapping

```
--model-sonnet <name>    Map to sonnet model
--model-opus <name>      Map to opus model
--model-haiku <name>     Map to haiku model
```

### Customization

```
--brand <preset>         Theme: auto | zai | minimax | gatewayz | openrouter |
                         nanogpt | ccrouter | mirror | kimi | deepseek | vercel |
                         poe | vertex | bedrock | foundry
--npm-package <name>     Claude Code package override
--npm-version <ver>      Claude Code version override
--no-tweak               Skip tweakcc theme
--no-prompt-pack         Skip prompt pack
```

### Features

```
--enable-team-mode       Enable team mode (TaskCreate, TaskGet, TaskUpdate, TaskList)
--shell-env              Write env vars to shell profile
--env KEY=VALUE          Extra env var override (repeatable)
--timeout-ms <ms>        API timeout override (ms)
--prefer-ipv4            Prefer IPv4 DNS (sets CC_MIRROR_PREFER_IPV4=1)
```

### Sync Options

```
--items <list>           skills,mcp-servers,permissions,claude-md,tasks,provider-env
--source <name>          Source variant
--targets <list>         Comma-separated targets
--no-backup              Skip config backup
--dry-run                Show what would change
```

### Config Options

```
--variant <name>         Variant to inspect
--json                   Print JSON output
--show-values            Show full env values (default masks secrets)
--allow <list>           Comma-separated allow list
--ask <list>             Comma-separated ask list
--deny <list>            Comma-separated deny list
```

---

## Team Mode

Enable multi-agent collaboration with shared task management:

```mermaid
flowchart TB
    subgraph team["🤝 Team Mode"]
        direction TB
        tools["TaskCreate / TaskGet<br/>TaskUpdate / TaskList"]
        orchestrator["Orchestrator Skill"]
        manager["Task Manager Skill"]
    end

    subgraph projects["📂 Project Isolation"]
        direction LR
        p1["~/projects/api<br/><small>Team: api</small>"]
        p2["~/projects/frontend<br/><small>Team: frontend</small>"]
    end

    team --> projects
    p1 -.- t1[("tasks.json")]
    p2 -.- t2[("tasks.json")]
```

```bash
# Enable on any variant
npx cc-mirror create --provider zai --name zai-team --enable-team-mode

# Mirror Claude has team mode by default
npx cc-mirror quick --provider mirror --name mclaude
```

Team mode enables:
- `TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList` tools
- **Orchestrator skill** for coordinating multi-agent workflows
- **Task-manager skill** for CLI task hygiene

### Project-Scoped Tasks

Tasks are automatically scoped by project folder:

```bash
cd ~/projects/api && mc      # Team: api
cd ~/projects/frontend && mc # Team: frontend

# Multiple teams in the same project
TEAM=backend mc              # Team: <project>-backend
TEAM=frontend mc             # Team: <project>-frontend
```

> [Team Mode Documentation](docs/features/team-mode.md)

---

## Mirror Claude

A pure Claude Code variant with enhanced features:

- **Direct connection** — No proxy, connects directly to Anthropic's API
- **Team mode** — Enabled by default
- **Isolated config** — Experiment without affecting your main setup
- **Multiple accounts** — Create multiple mirror variants for different accounts

```bash
npx cc-mirror quick --provider mirror --name mclaude
mclaude  # Authenticate via OAuth or API key

# Multiple accounts
npx cc-mirror quick --provider mirror --name mclaude-work
npx cc-mirror quick --provider mirror --name mclaude-personal
```

> [Mirror Claude Documentation](docs/features/mirror-claude.md)

---

## Platform Notes

### Windows

**PowerShell** (recommended):
```powershell
npx cc-mirror path --apply
# Then open a new PowerShell window
```

**CMD**: `path --apply` only updates PowerShell profile. For CMD, add manually:
1. Open System Properties → Environment Variables
2. Edit user `Path` → Add `%USERPROFILE%\.cc-mirror\bin`
3. Open a new CMD window

Or run the wrapper directly:
```cmd
%USERPROFILE%\.cc-mirror\bin\<variant>.cmd
```

### Termux / Android

Quick PATH fix:

```bash
npx cc-mirror path --apply
```

Or install wrappers into Termux's default bin:

```bash
npx cc-mirror create --provider mirror --name claude-termux --bin-dir "$PREFIX/bin"
```

> [Termux Guide](docs/features/termux.md)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| IPv6 connection resets (Z.ai) | Use `--prefer-ipv4` or `--env CC_MIRROR_PREFER_IPV4=1` |
| Command not found after create | Run `npx cc-mirror path --apply` (PowerShell) or add bin dir to PATH manually (CMD) |
| Windows splash weirdness | Set `--env CC_MIRROR_SPLASH_UTF8=0` to skip `chcp 65001` |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Team Mode](docs/features/team-mode.md) | Multi-agent collaboration with shared tasks |
| [Mirror Claude](docs/features/mirror-claude.md) | Pure Claude Code with enhanced features |
| [Termux/Android](docs/features/termux.md) | Android setup and PATH guidance |
| [Architecture](docs/architecture/overview.md) | How cc-mirror works under the hood |
| [Provider Guide](docs/TWEAKCC-GUIDE.md) | How to add a new provider |
| [Full Documentation](docs/README.md) | Complete documentation index |

---

## Related Projects

- [tweakcc](https://github.com/Piebald-AI/tweakcc) — Theme and customize Claude Code
- [Claude Code Router](https://github.com/musistudio/claude-code-router) — Route Claude Code to any LLM
- [n-skills](https://github.com/numman-ali/n-skills) — Universal skills for AI agents

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

**Want to add a provider?** Check the [Provider Guide](docs/TWEAKCC-GUIDE.md).

---

## License

MIT — see [LICENSE](LICENSE)

---

<p align="center">
  <strong>Original project by <a href="https://github.com/numman-ali">Numman Ali</a></strong> · <a href="https://twitter.com/nummanali">@nummanali</a><br>
  <em>Fork maintained by <a href="https://github.com/hyukudan">hyukudan</a></em>
</p>
