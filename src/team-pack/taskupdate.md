<!--
name: 'Tool Description: TaskUpdate'
description: Description for the TaskUpdate tool (Team Mode version)
ccVersion: 2.1.16
-->

Use this tool to update a task in the task list.

## When to Use This Tool

**Mark tasks as completed:**

- When you have completed the work described in a task
- When a task is no longer needed or has been superseded
- IMPORTANT: Always mark your assigned tasks as completed when you finish them
- After completing, call TaskList to find your next task

**Mark tasks as in progress:**

- When you start working on a task, set status to 'in_progress'

**Delete tasks:**

- Setting status to 'deleted' permanently removes the task

**Update task details:**

- When requirements change or become clearer
- When establishing dependencies between tasks

## Fields You Can Update

- **status**: 'pending', 'in_progress', 'completed', or 'deleted'
- **subject**: Change the task title (imperative form, e.g., "Run tests")
- **description**: Change the task description
- **activeForm**: Present continuous form shown while task is in_progress (e.g., "Running tests")
- **owner**: Change the task owner (agent name)
- **metadata**: Merge metadata keys into the task (set a key to null to delete it)
- **addBlocks**: Mark tasks that cannot start until this one completes
- **addBlockedBy**: Mark tasks that must complete before this one can start

## Staleness

Make sure to read a task's latest state using `TaskGet` before updating it.

## Examples

Mark task as in progress when starting work:

```json
{ "taskId": "1", "status": "in_progress" }
```

Mark task as completed after finishing work:

```json
{ "taskId": "1", "status": "completed" }
```

Delete a task:

```json
{ "taskId": "1", "status": "deleted" }
```

Set up task dependencies:

```json
{ "taskId": "2", "addBlockedBy": ["1"] }
```
