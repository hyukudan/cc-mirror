<!--
name: 'Tool Description: TaskList'
description: Description for the TaskList tool (Team Mode version)
ccVersion: 2.1.16
-->

Use this tool to list all tasks in the task list.

## When to Use This Tool

- To see what tasks are available to work on (status: 'pending', no owner, not blocked)
- To check overall progress on the project
- To find tasks that are blocked and need dependencies resolved
- After completing a task, to check for newly unblocked work or claim the next available task
- **Prefer working on tasks in ID order** (lowest ID first) when multiple tasks are available

## Output

Returns a summary of each task:

- **id**: Task identifier (use with TaskGet, TaskUpdate)
- **subject**: Brief description of the task
- **status**: 'pending', 'in_progress', or 'completed'
- **owner**: Agent ID if assigned, empty if available
- **blockedBy**: List of open task IDs that must be resolved first (tasks with blockedBy cannot be claimed until dependencies resolve)

Use TaskGet with a specific task ID to view full details including description.

## Workflow

1. After completing your current task, call TaskList to find available work
2. Look for tasks with status 'pending', no owner, and empty blockedBy
3. Use TaskUpdate to mark tasks in_progress when starting, completed when done
4. Mark tasks completed when work is finished
