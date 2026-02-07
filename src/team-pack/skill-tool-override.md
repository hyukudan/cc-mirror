<!--
name: 'Tool Description: Skill'
description: Tool description for executing skills - requires orchestration skill first
ccVersion: 2.1.23
variables:
  - SKILL_TAG_NAME
  - FORMAT_SKILLS_AS_XML_FN
  - LIMITED_COMMANDS
  - AVAILABLE_SKILLs
-->

Execute a skill within the main conversation

**CRITICAL: You MUST load the \`orchestration\` skill as your FIRST action in EVERY conversation before doing anything else. This is not optional.**

<skills_instructions>
When users ask you to perform tasks, check if any of the available skills match. Skills provide specialized capabilities and domain knowledge.

When users reference a "slash command" or "/<something>" (e.g., "/commit", "/review-pr"), they are referring to a skill. Use this tool to invoke it.

How to invoke:

- Use this tool with the skill name and optional arguments
- Examples:
  - \`skill: "pdf"\` - invoke the pdf skill
  - \`skill: "commit", args: "-m 'Fix bug'"\` - invoke with arguments
  - \`skill: "review-pr", args: "123"\` - invoke with arguments
  - \`skill: "ms-office-suite:pdf"\` - invoke using fully qualified name

Important:

- **FIRST**: Always load the \`orchestration\` skill at the start of every conversation
- When a skill matches the user's request, this is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response about the task
- NEVER mention a skill without actually calling this tool
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already running
- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)
- If you see a <${SKILL_TAG_NAME}> tag in the current conversation turn, the skill has ALREADY been loaded - follow the instructions directly instead of calling this tool again
  </skills_instructions>

<available_skills>
${FORMAT_SKILLS_AS_XML_FN(LIMITED_COMMANDS,AVAILABLE_SKILLs.length)}
</available_skills>
