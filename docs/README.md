# CC-MIRROR Documentation

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   ╭─────╮╭─────╮    ╭───╮╭───╮╭───╮╭───────╮╭───────╮╭───────╮╭───────╮     │
│   │ ╭───╯│ ╭───╯    │ ╭╮╯│ ╭─╯╰─╮ ││ ╭─╮ ╭─╯│ ╭─╮ ╭─╯│ ╭───╮ ││ ╭─╮ ╭─╯     │
│   │ │    │ │   ╭────│ ││ │ │  ╭─╯ ││ ╰─╯ │  │ ╰─╯ │  │ │   │ ││ ╰─╯ │       │
│   │ ╰───╮│ ╰───╯    │ ╰╯╭╯ ╰──╯ ╭─╯│ ╭─╮ │  │ ╭─╮ │  │ ╰───╯ ││ ╭─╮ │       │
│   ╰─────╯╰─────╯    ╰───╯╰──────╯  ╰─╯ ╰─╯  ╰─╯ ╰─╯  ╰───────╯╰─╯ ╰─╯       │
│                                                                              │
│   Create multiple isolated Claude Code variants with custom providers        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 📚 Documentation Index

### ⚡ Getting Started

| Document                                    | Description                           |
| ------------------------------------------- | ------------------------------------- |
| [Quick Start](../README.md#quick-start)     | Install and create your first variant |
| [CLI Reference](reference/cli-reference.md) | All commands, flags, and options      |

### 🤖 Features

| Document                                   | Description                                 |
| ------------------------------------------ | ------------------------------------------- |
| [Team Mode](features/team-mode.md)         | Multi-agent collaboration with shared tasks |
| [Mirror Claude](features/mirror-claude.md) | Pure Claude Code with advanced features     |
| [Termux/Android](features/termux.md)       | Android setup and PATH guidance             |
| [Brand Themes](features/brand-themes.md)   | Custom color schemes per provider           |
| [Prompt Packs](features/prompt-packs.md)   | Enhanced system prompts                     |

### 🏗️ Architecture

| Document                                               | Description                        |
| ------------------------------------------------------ | ---------------------------------- |
| [Overview](architecture/overview.md)                   | How cc-mirror works under the hood |
| [Provider System](architecture/provider-system.md)     | Adding and configuring providers   |
| [Variant Lifecycle](architecture/variant-lifecycle.md) | Create, update, and remove flows   |

### 🔧 Reference

| Document                                                    | Description                |
| ----------------------------------------------------------- | -------------------------- |
| [Configuration](reference/configuration.md)                 | All config files explained |
| [Environment Variables](reference/environment-variables.md) | Env var reference          |
| [CLI Reference](reference/cli-reference.md)                 | Commands and flags         |
| [Tweakcc Guide](TWEAKCC-GUIDE.md)                           | Theme customization        |

---

## 🗺️ Quick Navigation

```
docs/
├── README.md                 ← You are here
├── features/
│   ├── team-mode.md         # 🤖 Multi-agent collaboration
│   ├── mirror-claude.md     # 🪞 Pure Claude Code variant
│   ├── termux.md            # 📱 Android setup
│   ├── brand-themes.md      # 🎨 Custom themes
│   └── prompt-packs.md      # 📝 System prompt enhancements
├── architecture/
│   ├── overview.md          # 🏗️ System architecture
│   ├── provider-system.md   # 🔌 Provider configuration
│   └── variant-lifecycle.md # 🔄 Create/update flows
└── reference/
    ├── cli-reference.md     # 💻 CLI commands
    ├── configuration.md     # ⚙️ Config files
    └── environment-variables.md # 🔑 Env vars
```

---

## 💡 Quick Links

- **New to cc-mirror?** Start with the [Quick Start](../README.md#quick-start)
- **Want team features?** Read about [Team Mode](features/team-mode.md)
- **Pure Claude experience?** Try [Mirror Claude](features/mirror-claude.md)
- **On Android?** Follow [Termux/Android](features/termux.md)
- **Adding a provider?** See [Provider System](architecture/provider-system.md)

---

## 📊 Provider Comparison

```
┌──────────────┬─────────────────┬──────────────┬────────────┬────────────┐
│   Provider   │     Model       │  Auth Mode   │ Prompt Pack│ Team Mode  │
├──────────────┼─────────────────┼──────────────┼────────────┼────────────┤
│ zai          │ GLM-4.7         │ API Key      │ ✓ Full     │ Optional   │
│ minimax      │ MiniMax-M2.1    │ API Key      │ ✓ Full     │ Optional   │
│ gatewayz     │ Claude via GWZ  │ Auth Token   │ ✗          │ Optional   │
│ openrouter   │ You choose      │ Auth Token   │ ✗          │ Optional   │
│ nanogpt      │ You choose      │ Auth Token   │ ✗          │ Optional   │
│ ccrouter     │ Local LLMs      │ Optional     │ ✗          │ Optional   │
│ mirror       │ Claude (native) │ OAuth/Key    │ ✗ Pure     │ ✓ Default  │
└──────────────┴─────────────────┴──────────────┴────────────┴────────────┘
```

---

<p align="center">
  <strong>Created by <a href="https://github.com/numman-ali">Numman Ali</a></strong>
</p>
