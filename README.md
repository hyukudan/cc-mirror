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
  <strong>Create multiple isolated Claude Code variants with custom providers.</strong>
</p>

---

## What is CC-MIRROR?

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│   One tool. Multiple Claude Code instances. Complete isolation.                │
│                                                                                │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│   │   zai    │   │ minimax  │   │openrouter│   │ ccrouter │   │ mclaude  │   │
│   │  GLM-4.7 │   │  M2.1    │   │ 100+ LLMs│   │  Local   │   │  Claude  │   │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   │
│        │              │              │              │              │          │
│        └──────────────┴──────────────┴──────────────┴──────────────┘          │
│                                      │                                         │
│                           ┌──────────▼──────────┐                             │
│                           │    Claude Code      │                             │
│                           │    (isolated)       │                             │
│                           └─────────────────────┘                             │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

CC-MIRROR creates **isolated Claude Code instances** that connect to different AI providers. Each variant has its own config, sessions, themes, and API credentials — completely separate from each other.

---

## ⚡ Quick Start

```bash
# Run the interactive TUI
npx cc-mirror

# Or quick setup from CLI
npx cc-mirror quick --provider zai --api-key "$Z_AI_API_KEY"
```

<p align="center">
  <img src="./assets/cc-mirror-home.png" alt="CC-MIRROR Home Screen" width="600">
</p>

---

## 🔌 Supported Providers

| Provider       | Models                 | Auth       | Best For                        |
| -------------- | ---------------------- | ---------- | ------------------------------- |
| **Z.ai**       | GLM-4.7, GLM-4.5-Air   | API Key    | Heavy coding with GLM reasoning |
| **MiniMax**    | MiniMax-M2.1           | API Key    | Unified model experience        |
| **GatewayZ**   | Claude via OneRouter   | Auth Token | Anthropic API via GatewayZ      |
| **OpenRouter** | 100+ models            | Auth Token | Model flexibility, pay-per-use  |
| **NanoGPT**    | 100+ models            | Auth Token | Model flexibility, pay-per-use  |
| **CCRouter**   | Ollama, DeepSeek, etc. | Optional   | Local-first development         |
| **Mirror**     | Claude (native)        | OAuth/Key  | Pure Claude with team mode      |

```bash
# Z.ai (GLM Coding Plan)
npx cc-mirror quick --provider zai --api-key "$Z_AI_API_KEY"

# MiniMax (MiniMax-M2.1)
npx cc-mirror quick --provider minimax --api-key "$MINIMAX_API_KEY"

# GatewayZ (OneRouter gateway)
npx cc-mirror quick --provider gatewayz --api-key "$GATEWAYZ_API_KEY" \
  --model-sonnet "claude-sonnet-4-20250514" \
  --model-opus "claude-opus-4-5-20251101" \
  --model-haiku "claude-haiku-3-5-20241022"

# OpenRouter (100+ models)
npx cc-mirror quick --provider openrouter --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "anthropic/claude-3.5-sonnet"

# NanoGPT (100+ models)
npx cc-mirror quick --provider nanogpt --api-key "$NANOGPT_API_KEY" \
  --model-sonnet "zai-org/glm-4.7:thinking" \
  --model-opus "zai-org/glm-4.7:thinking" \
  --model-haiku "zai-org/glm-4.7:thinking"

# Claude Code Router (local LLMs)
npx cc-mirror quick --provider ccrouter

# Mirror Claude (pure Claude with team mode)
npx cc-mirror quick --provider mirror --name mclaude
```

---

## 📁 How It Works

Each variant lives in its own directory with complete isolation:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ~/.cc-mirror/                                                          │
│                                                                         │
│  ├── zai/                          ← Your Z.ai variant                  │
│  │   ├── npm/                      Claude Code installation             │
│  │   ├── config/                   API keys, sessions, MCP servers      │
│  │   ├── tweakcc/                  Theme & prompt customization         │
│  │   └── variant.json              Metadata                             │
│  │                                                                      │
│  ├── minimax/                      ← Your MiniMax variant               │
│  │   └── ...                                                            │
│  │                                                                      │
│  └── mclaude/                      ← Your Mirror Claude variant         │
│      └── ...                                                            │
│                                                                         │
│  Wrappers: ~/.local/bin/zai, ~/.local/bin/minimax, ~/.local/bin/mclaude │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Run any variant directly from your terminal:

```bash
zai          # Launch Z.ai variant
minimax      # Launch MiniMax variant
mclaude      # Launch Mirror Claude variant
```

---

## ✨ Features

| Feature                    | Description                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------- |
| **🔌 Multiple Providers**  | Z.ai, MiniMax, GatewayZ, OpenRouter, NanoGPT, CCRouter, Mirror, or custom endpoints    |
| **📁 Complete Isolation**  | Each variant has its own config, sessions, and credentials                             |
| **🎨 Brand Themes**        | Custom color schemes per provider via [tweakcc](https://github.com/Piebald-AI/tweakcc) |
| **📝 Prompt Packs**        | Enhanced system prompts for Z.ai and MiniMax                                           |
| **🤖 Team Mode**           | Multi-agent collaboration with shared task management                                  |
| **📋 Tasks CLI**           | Manage, archive, and visualize task dependencies from command line                     |
| **🔄 One-Command Updates** | Update all variants when Claude Code releases                                          |

---

## 🛠️ Commands

```bash
# Create & manage variants
npx cc-mirror create              # Full configuration wizard
npx cc-mirror quick [options]     # Fast setup with defaults
npx cc-mirror list                # List all variants
npx cc-mirror update [name]       # Update one or all variants
npx cc-mirror remove <name>       # Delete a variant
npx cc-mirror doctor              # Health check all variants

# Task management (team mode)
npx cc-mirror tasks               # List open tasks
npx cc-mirror tasks show <id>     # Show task details
npx cc-mirror tasks create        # Create new task
npx cc-mirror tasks update <id>   # Update task
npx cc-mirror tasks delete <id>   # Delete task
npx cc-mirror tasks archive <id>  # Archive task
npx cc-mirror tasks clean         # Bulk cleanup
npx cc-mirror tasks graph         # Visualize dependencies

# Launch your variant
zai                           # Run Z.ai variant
minimax                       # Run MiniMax variant
mclaude                       # Run Mirror Claude variant
```

---

## 🎛️ CLI Options

```
--provider <name>        zai | minimax | gatewayz | openrouter | nanogpt | ccrouter | mirror | custom
--name <name>            Variant name (becomes the CLI command)
--api-key <key>          Provider API key
--base-url <url>         Custom API endpoint
--model-sonnet <name>    Map to sonnet model (OpenRouter/GatewayZ/NanoGPT)
--model-opus <name>      Map to opus model (OpenRouter/GatewayZ/NanoGPT)
--model-haiku <name>     Map to haiku model (OpenRouter/GatewayZ/NanoGPT)
--brand <preset>         Theme: auto | zai | minimax | gatewayz | openrouter | nanogpt | ccrouter | mirror
--enable-team-mode       Enable team mode (TaskCreate, TaskGet, TaskUpdate, TaskList)
--no-tweak               Skip tweakcc theme
--no-prompt-pack         Skip prompt pack
```

---

## 🎨 Brand Themes

Each provider includes a custom color theme:

| Brand          | Style                            |
| -------------- | -------------------------------- |
| **zai**        | Dark carbon with gold accents    |
| **minimax**    | Coral/red/orange spectrum        |
| **gatewayz**   | Dark portal with violet accents  |
| **openrouter** | Teal/cyan gradient               |
| **nanogpt**    | Purple/violet gradient           |
| **ccrouter**   | Sky blue accents                 |
| **mirror**     | Silver/chrome with electric blue |

---

## 🤖 Team Mode

Enable multi-agent collaboration with shared task management:

```bash
# Enable on any variant
npx cc-mirror create --provider zai --name zai-team --enable-team-mode

# Mirror Claude has team mode by default
npx cc-mirror quick --provider mirror --name mclaude
```

Team mode enables: `TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList` tools plus an **orchestrator skill** that teaches Claude effective multi-agent coordination patterns.

### Tasks CLI (v1.4.0+)

Manage team tasks from the command line:

```bash
# List open tasks
npx cc-mirror tasks

# View across all teams
npx cc-mirror tasks --all

# Create and update tasks
npx cc-mirror tasks create --subject "Add auth" --description "JWT implementation"
npx cc-mirror tasks update 5 --status resolved --add-comment "Done"

# Cleanup resolved tasks
npx cc-mirror tasks clean --resolved --dry-run
npx cc-mirror tasks clean --resolved --force

# Archive instead of delete (preserves task history)
npx cc-mirror tasks archive 5

# Visualize dependency graph
npx cc-mirror tasks graph
```

### Project-Scoped Tasks (v1.3.0+)

Tasks are scoped by project folder — no cross-project pollution:

```bash
# Run in different project folders - tasks stay isolated
cd ~/projects/api && mc      # Team: api
cd ~/projects/frontend && mc # Team: frontend

# Multiple teams in the same project
TEAM=backend mc   # Team: <project-folder>-backend
TEAM=frontend mc  # Team: <project-folder>-frontend
```

→ [Team Mode Documentation](docs/features/team-mode.md)

---

## 🪞 Mirror Claude

A pure Claude Code variant with enhanced features:

- **No proxy** — Connects directly to Anthropic's API
- **Team mode** — Enabled by default
- **Isolated config** — Experiment without affecting your main setup
- **Custom theme** — Silver/chrome aesthetic
- **Multiple accounts** — Create multiple mirror variants and authenticate each once

```bash
npx cc-mirror quick --provider mirror --name mclaude
mclaude  # Authenticate via OAuth or API key
```

→ [Mirror Claude Documentation](docs/features/mirror-claude.md)

---

## 📚 Documentation

| Document                                        | Description                                 |
| ----------------------------------------------- | ------------------------------------------- |
| [Team Mode](docs/features/team-mode.md)         | Multi-agent collaboration with shared tasks |
| [Mirror Claude](docs/features/mirror-claude.md) | Pure Claude Code with enhanced features     |
| [Architecture](docs/architecture/overview.md)   | How cc-mirror works under the hood          |
| [Full Documentation](docs/README.md)            | Complete documentation index                |

---

## 🔗 Related Projects

- [tweakcc](https://github.com/Piebald-AI/tweakcc) — Theme and customize Claude Code
- [Claude Code Router](https://github.com/musistudio/claude-code-router) — Route Claude Code to any LLM
- [n-skills](https://github.com/numman-ali/n-skills) — Universal skills for AI agents

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

**Want to add a provider?** Check the [Provider Guide](docs/TWEAKCC-GUIDE.md).

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

<p align="center">
  <strong>Created by <a href="https://github.com/numman-ali">Numman Ali</a></strong><br>
  <a href="https://twitter.com/nummanali">@nummanali</a>
</p>
