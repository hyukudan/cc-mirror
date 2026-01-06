# Termux / Android Setup

This guide helps you run cc-mirror on Android using Termux. The biggest gotcha is making sure the wrapper directory is on your `PATH`.

---

## Requirements

- Termux installed
- Node.js installed via Termux

```bash
pkg update
pkg install nodejs
```

---

## Quick Setup

```bash
npx cc-mirror quick --provider mirror --name claude-termux
```

---

## PATH Setup (Recommended)

Use the built-in helper to append the export line to your shell profile:

```bash
npx cc-mirror path --apply
```

This updates:

- `~/.bashrc` for bash
- `~/.zshrc` for zsh
- `~/.profile` for other shells

Then reload your shell:

```bash
source ~/.bashrc
```

---

## Manual PATH Setup

If you want to do it manually:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

## Verify

```bash
which claude-termux
claude-termux
```

If `which` returns nothing, your PATH is still missing `~/.local/bin`.

---

## Alternate Install Location

You can install wrappers into Termux's default bin directory:

```bash
npx cc-mirror create --provider mirror --name claude-termux --bin-dir "$PREFIX/bin"
```

---

## Troubleshooting

- Check PATH instructions: `npx cc-mirror path`
- Run wrapper directly: `~/.local/bin/claude-termux`
- Confirm shell profile exists (`~/.bashrc` or `~/.profile`)
