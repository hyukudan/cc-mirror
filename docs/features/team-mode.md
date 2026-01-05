# 🤖 Team Mode

Team Mode enables multi-agent collaboration in Claude Code through shared task management. Multiple agents can work together on complex projects, each claiming and completing tasks from a shared queue.

---

## Overview

```
                    ┌─────────────┐
                    │  Team Lead  │
                    │   Agent     │
                    └──────┬──────┘
                           │ creates tasks
                           ▼
                    ┌─────────────┐
                    │   Task      │
                    │   Storage   │
                    │  (JSON)     │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │ Worker 1  │   │ Worker 2  │   │ Worker 3  │
    │  claims   │   │  claims   │   │  claims   │
    │  task #1  │   │  task #2  │   │  task #3  │
    └───────────┘   └───────────┘   └───────────┘
```

Team Mode unlocks these tools in Claude Code:

| Tool         | Purpose                                       |
| ------------ | --------------------------------------------- |
| `TaskCreate` | Create tasks with subject and description     |
| `TaskGet`    | Retrieve full task details by ID              |
| `TaskUpdate` | Update status, add comments, set dependencies |
| `TaskList`   | List all tasks with summary info              |

---

## ⚡ Quick Start

### Enable Team Mode on New Variants

```bash
# Any provider with team mode
npx cc-mirror create --provider zai --name zai-team --enable-team-mode

# Mirror Claude has team mode by default
npx cc-mirror create --provider mirror --name mclaude
```

### Enable on Existing Variants

```bash
npx cc-mirror update myvariant --enable-team-mode
```

### Verify Team Mode

Run your variant and check for the `TaskCreate` tool:

```bash
zai-team
# Then ask: "Create a task to implement user authentication"
# If team mode is enabled, you'll see TaskCreate being used
```

---

## 🏗️ Architecture

### How It Works

Team mode is controlled by a function in Claude Code's `cli.js`:

```javascript
// Default (disabled)
function sU() {
  return !1;
}

// Patched (enabled)
function sU() {
  return !0;
}
```

When you use `--enable-team-mode`, cc-mirror patches this function automatically.

### Task Storage

Tasks are stored per-variant in isolated directories:

```
┌─────────────────────────────────────────────────────────┐
│  ~/.cc-mirror/<variant>/config/                         │
│  └── tasks/                                             │
│      └── <team_name>/                                   │
│          ├── 1.json        Task #1                      │
│          ├── 2.json        Task #2                      │
│          └── 3.json        Task #3                      │
└─────────────────────────────────────────────────────────┘
```

Each cc-mirror variant has completely isolated task storage via `CLAUDE_CONFIG_DIR`.

### Dynamic Team Names (v1.3.0+)

Team names are **purely directory-based** at runtime. This prevents cross-project task pollution:

| Command | Team Name |
|---------|-----------|
| `mc` | `<project-folder>` |
| `TEAM=A mc` | `<project-folder>-A` |
| `TEAM=backend mc` | `<project-folder>-backend` |

**Example:** Running `mc` in `/Users/you/projects/my-api` creates team name `my-api`.

### Multiple Teams in Same Project

Use the `TEAM` env var to run separate teams in the same folder:

```bash
# Terminal 1 - API team
TEAM=api mc

# Terminal 2 - Frontend team
TEAM=frontend mc
```

Each team has its own isolated task storage.

---

## 🎯 Orchestration Skill

When team mode is enabled, cc-mirror automatically installs an **orchestration skill** that teaches Claude how to effectively coordinate work using the team mode tools.

### The Conductor Identity

The skill teaches Claude to be **"The Conductor"** — a warm, capable orchestrator who transforms ambitious requests into elegant execution:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    You are the Conductor. Users bring the vision.               │
│    You orchestrate the symphony of agents that makes it real.   │
│                                                                 │
│    Complex work should feel effortless.                         │
│    That's your gift to every user.                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Core principles:**

- **Absorb complexity, radiate simplicity** — Users describe outcomes, you handle everything else
- **Parallel by default** — Independent work runs simultaneously
- **Ask smart, not often** — Rich questions upfront with `AskUserQuestion`, then execute with confidence
- **Celebrate progress** — Acknowledge milestones with visual feedback
- **Never expose the machinery** — No pattern names, agent counts, or internal mechanics

### The Execution Workflow

```
User Request → Clarify (AskUserQuestion) → Decompose (TaskCreate) →
    Set Dependencies → Find Ready Work → Spawn Background Agents →
    Continue Working → Process Notifications → Synthesize → Deliver
```

**Background agents are the default** — all agents run with `run_in_background=True`. The orchestrator continues working while agents execute, processing completion notifications as they arrive. Non-blocking mindset: "Agent is working — what else can I do?"

### What It Provides

| Aspect                     | What Claude Learns                                                      |
| -------------------------- | ----------------------------------------------------------------------- |
| **AskUserQuestion**        | MANDATORY for user input — never text menus, always rich visual options |
| **Task Graph**             | Decompose work into tasks with dependencies                             |
| **Orchestration Patterns** | Fan-Out, Pipeline, Map-Reduce, Speculative, Background                  |
| **Agent Prompting**        | Context, scope, constraints, output expectations                        |
| **Communication**          | Progress updates, milestone celebrations, warm professional tone        |
| **Signature**              | `─── ◈ Orchestrating ── [context] ──` format                            |

### Communication That Delights

Progress updates use natural language:

| What's Happening     | Claude Says                             |
| -------------------- | --------------------------------------- |
| Starting work        | "On it. Breaking this down..."          |
| Parallel exploration | "Exploring this from several angles..." |
| Phase complete       | Visual milestone box with summary       |
| Delivering results   | Clear, unified, satisfying presentation |

Milestone celebrations:

```
┌────────────────────────────────────────┐
│  ✓ Phase 1 Complete                    │
│                                        │
│  Database schema ready                 │
│  3 tables created, relationships set   │
│                                        │
│  Moving to Phase 2: API Routes         │
└────────────────────────────────────────┘
```

### Skill Location

```
~/.cc-mirror/<variant>/config/skills/orchestration/
├── SKILL.md              # Identity, philosophy, core workflow
└── references/
    ├── patterns.md       # All patterns with visual diagrams
    ├── tools.md          # AskUserQuestion (#1), agents, task tools
    ├── examples.md       # End-to-end workflow examples
    ├── guide.md          # User-facing explanations
    └── domains/          # Domain-specific guidance (8 domains)
```

---

## 📦 Team Pack

When team mode is enabled, cc-mirror also installs **Team Pack** — enhanced prompt files and toolset configuration.

### What Team Pack Does

1. **Copies prompt files** to `tweakcc/system-prompts/`:
   - `tool-description-tasklist.md` - TaskList tool guidance
   - `tool-description-taskupdate.md` - TaskUpdate tool guidance
   - `agent-prompt-task-tool-extra-notes.md` - Task tool notes

2. **Configures toolset** to block TodoWrite:
   - Creates a 'team' toolset with `blockedTools: ['TodoWrite', ...]`
   - Merges any provider-specific blocked tools (e.g., Z.ai's WebSearch)
   - Sets 'team' as the default toolset

### Why Block TodoWrite?

Team mode provides `TaskCreate`, `TaskGet`, `TaskUpdate`, and `TaskList` as the primary task management tools. TodoWrite is blocked to encourage use of the more capable team tools for multi-agent coordination.

---

### Managed vs User Skills

cc-mirror marks its installed skill with a `.cc-mirror-managed` file. If you want to customize the orchestrator:

1. Delete the `.cc-mirror-managed` marker
2. Edit the skill files as needed
3. Future updates won't overwrite your changes

---

## 📋 Task Tools Reference

### TaskCreate

Creates a new task in the shared task list.

```json
{
  "subject": "Implement user authentication",
  "description": "Add login/logout with JWT tokens, password hashing, and session management"
}
```

**When to Use:**

- Breaking down large work into smaller units
- Planning work that needs tracking
- Discovering additional work during implementation

### TaskGet

Retrieves full details of a task by ID.

```json
{
  "taskId": "1"
}
```

**Returns:**

```json
{
  "task": {
    "id": "1",
    "subject": "Implement user authentication",
    "description": "Add login/logout with JWT...",
    "status": "open",
    "owner": "worker-001",
    "blockedBy": [],
    "blocks": ["2", "3"],
    "comments": [{ "author": "team-lead", "content": "Priority: high" }]
  }
}
```

### TaskUpdate

Updates a task's status, adds comments, or sets dependencies.

```json
{
  "taskId": "1",
  "status": "resolved",
  "addComment": {
    "author": "worker-001",
    "content": "Completed with bcrypt for password hashing"
  }
}
```

**Key Features:**

- **Ownership Protection**: Only the owner (or team-lead) can update a task
- **Dependency Tracking**: `blocks` and `blockedBy` create bidirectional links
- **Comment Tracking**: Each comment has an author

### TaskList

Lists all tasks with summary information.

```json
{
  "tasks": [
    { "id": "1", "subject": "Setup database", "status": "resolved", "owner": "worker-001" },
    { "id": "2", "subject": "Implement user model", "status": "open", "blockedBy": ["1"] },
    { "id": "3", "subject": "Add authentication", "status": "open", "blockedBy": ["2"] }
  ]
}
```

---

## 🔗 Task Dependencies

Tasks can have blocking relationships:

```
Task #1: "Set up database"
   │
   │ blocks
   ▼
Task #2: "Implement user model" (blockedBy: ["1"])
   │
   │ blocks
   ▼
Task #3: "Add authentication" (blockedBy: ["2"])
```

### Workflow

1. **Create tasks** with `TaskCreate`
2. **Set up dependencies** with `TaskUpdate`:
   ```json
   {"taskId": "2", "addBlockedBy": ["1"]}
   {"taskId": "3", "addBlockedBy": ["2"]}
   ```
3. **Check availability** with `TaskList` - blocked tasks show their blockers
4. **Claim and work** on unblocked tasks
5. **Mark resolved** when complete - automatically unblocks dependent tasks

---

## 🌐 Environment Variables

Configure agent identity for multi-agent setups:

| Variable | Purpose | Example |
|----------|---------|---------|
| `CLAUDE_CODE_TEAM_MODE` | Enables team mode (set by cc-mirror in settings.json) | `"1"` |
| `CLAUDE_CODE_TEAM_NAME` | Computed team name (set by wrapper at runtime) | `"my-project"` |
| `TEAM` | Optional modifier appended to folder-based team name | `"api"` |
| `CLAUDE_CODE_AGENT_ID` | Unique identifier for this agent | `"worker-001"` |
| `CLAUDE_CODE_AGENT_TYPE` | Agent role/type | `"team-lead"`, `"worker"` |
| `CLAUDE_CODE_AGENT_NAME` | Human-readable agent name | `"Code Reviewer"` |

> **Important:** `CLAUDE_CODE_TEAM_NAME` must NOT be in `settings.json`, or Claude Code will overwrite the wrapper's dynamic value. The wrapper uses `CLAUDE_CODE_TEAM_MODE` and `TEAM` to compute the team name from the project folder.

### Example: Team Lead Configuration

```bash
export TEAM="backend"
export CLAUDE_CODE_AGENT_ID="lead-001"
export CLAUDE_CODE_AGENT_TYPE="team-lead"
```

### Example: Worker Configuration

```bash
export TEAM="backend"
export CLAUDE_CODE_AGENT_ID="worker-001"
export CLAUDE_CODE_AGENT_TYPE="worker"
```

---

## 🚀 Multi-Agent Example

### Launch a Team

```bash
#!/bin/bash
# launch-team.sh

VARIANT="zai-team"  # Must have team mode enabled
TEAM_NAME="backend"

# Launch team lead
TEAM="$TEAM_NAME" \
CLAUDE_CODE_AGENT_ID="lead" \
CLAUDE_CODE_AGENT_TYPE="team-lead" \
$VARIANT --print "Plan tasks for: $1" &

# Wait for planning
sleep 10

# Launch workers
for i in 1 2 3; do
  TEAM="$TEAM_NAME" \
  CLAUDE_CODE_AGENT_ID="worker-$i" \
  CLAUDE_CODE_AGENT_TYPE="worker" \
  $VARIANT --print "Check TaskList and claim available tasks. Complete them." &
done

wait
echo "All agents complete"
```

### Run It

```bash
./launch-team.sh "Build a REST API for todo management"
```

---

## 🛠️ CLI Task Management

cc-mirror provides a CLI for managing team tasks directly from the command line.

### Command Structure

```bash
cc-mirror tasks [operation] [id] [options]
```

### Operations

| Operation | Command                        | Description                              |
| --------- | ------------------------------ | ---------------------------------------- |
| List      | `cc-mirror tasks`              | List open tasks (default)                |
| Show      | `cc-mirror tasks show <id>`    | Show detailed task info                  |
| Create    | `cc-mirror tasks create`       | Create a new task                        |
| Update    | `cc-mirror tasks update <id>`  | Update an existing task                  |
| Delete    | `cc-mirror tasks delete <id>`  | Permanently delete a task                |
| Archive   | `cc-mirror tasks archive <id>` | Move task to archive (preserves history) |
| Clean     | `cc-mirror tasks clean`        | Bulk cleanup of tasks                    |
| Graph     | `cc-mirror tasks graph`        | Visualize task dependencies              |

### Common Options

| Flag               | Description                              |
| ------------------ | ---------------------------------------- |
| `--variant <name>` | Target variant (auto-detects if omitted) |
| `--all-variants`   | Show tasks across all variants           |
| `--team <name>`    | Target team name                         |
| `--all`            | Show all teams in variant(s)             |
| `--json`           | Output as JSON for scripting             |

### Examples

```bash
# List open tasks for current project
cc-mirror tasks

# List all tasks (including resolved)
cc-mirror tasks --status all

# Show task details
cc-mirror tasks show 18

# Create a new task
cc-mirror tasks create --subject "Implement auth" --description "Add JWT tokens"

# Mark a task as resolved with comment
cc-mirror tasks update 5 --status resolved --add-comment "Done"

# Delete a task permanently
cc-mirror tasks delete 42 --force

# Archive a task (preserves history in archive/ folder)
cc-mirror tasks archive 5

# Clean up resolved tasks (dry run)
cc-mirror tasks clean --resolved --dry-run

# Clean tasks older than 30 days
cc-mirror tasks clean --older-than 30 --force

# View tasks across all teams in a variant
cc-mirror tasks --variant mc --all

# JSON output for scripting
cc-mirror tasks --json | jq '.tasks[] | select(.status == "open")'

# View task dependency graph
cc-mirror tasks graph --variant mc --team my-project
```

### Dependency Graph Output

The `graph` command shows task dependencies visually:

```
TASK DEPENDENCY GRAPH (mc / my-project)
════════════════════════════════════════════════════════════

Legend: [✓] resolved  [○] open  [●] blocked

[✓] #1: Set up database schema
  └─ [○] #3: Implement user model
    └─ [●] #5: Add authentication
      └─ [●] #8: Implement protected routes

[○] #2: Configure test framework

Total: 8 | Open: 4 | Ready: 2 | Blocked: 2
```

### Smart Auto-Detection

The CLI automatically detects:

- **Team name**: Based on current git repository folder name (matches wrapper logic)
- **Variant**: First variant with tasks, or specify with `--variant`

This means running `cc-mirror tasks` in `/Users/you/projects/my-api` will automatically target the `my-api` team.

---

## 💡 Tips

### Best Practices

1. **Use descriptive subjects** - Tasks are easier to track with clear names
2. **Set dependencies early** - Prevents workers from starting blocked tasks
3. **Add comments** - Track progress and decisions within tasks
4. **Use agent types** - `team-lead` for planning, `worker` for execution

### Debugging

```bash
# List all tasks for a team
ls ~/.cc-mirror/<variant>/config/tasks/<team_name>/

# View a specific task
cat ~/.cc-mirror/<variant>/config/tasks/<team_name>/1.json | jq

# Check if team mode is enabled (look for patched function)
grep "function sU(){return" ~/.cc-mirror/<variant>/npm/node_modules/@anthropic-ai/claude-code/cli.js
# Should show: function sU(){return!0}
```

---

## ⚠️ Limitations

1. **Task storage is local** - Tasks stored in `~/.cc-mirror/<variant>/config/tasks/` - not shared across machines
2. **Manual coordination** - Workers don't automatically poll for new tasks
3. **Minified function** - The patched function name may change in future Claude Code versions

---

## 🔙 Related

- [Mirror Claude](mirror-claude.md) - Has team mode enabled by default
- [Architecture Overview](../architecture/overview.md) - How cc-mirror works
- [CLI Reference](../reference/cli-reference.md) - `--enable-team-mode` flag
