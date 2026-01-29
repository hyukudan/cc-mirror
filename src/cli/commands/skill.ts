/**
 * Skill command - Create and manage custom skills
 */

import fs from 'node:fs';
import path from 'node:path';
import * as core from '../../core/index.js';
import { readJson } from '../../core/fs.js';
import type { VariantMeta } from '../../core/types.js';
import type { ParsedArgs } from '../args.js';

export interface SkillCommandOptions {
  opts: ParsedArgs;
}

type SkillOperation = 'list' | 'create' | 'show' | 'remove';

const SKILL_TEMPLATE = `---
name: {{name}}
description: {{description}}
---

# {{name}}

{{description}}

## Usage

Describe how to use this skill.

## Implementation Notes

Add implementation details here.
`;

function showSkillHelp(): void {
  console.log(`
npx cc-mirror skill - Create and manage custom skills

USAGE:
  npx cc-mirror skill <variant> [operation] [name]

OPERATIONS:
  list                    List skills in variant
  create <name>           Create a new skill scaffold
  show <name>             Show skill content
  remove <name>           Remove a skill

OPTIONS:
  --description <text>    Skill description (for create)
  --json                  Output as JSON

EXAMPLES:
  npx cc-mirror skill zai list
  npx cc-mirror skill zai create my-skill --description "My custom skill"
  npx cc-mirror skill zai show my-skill
  npx cc-mirror skill zai remove my-skill
`);
}

function getSkillsDir(rootDir: string, variant: string): string {
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const variantDir = path.join(resolvedRoot, variant);

  if (!fs.existsSync(variantDir)) {
    throw new Error(`Variant not found: ${variant}`);
  }

  const metaPath = path.join(variantDir, 'variant.json');
  const meta = readJson<VariantMeta>(metaPath);
  const configDir = meta?.configDir || path.join(variantDir, 'config');

  return path.join(configDir, 'skills');
}

function listSkills(skillsDir: string): string[] {
  if (!fs.existsSync(skillsDir)) return [];

  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/**
 * Execute the skill command
 */
export function runSkillCommand({ opts }: SkillCommandOptions): void {
  const positional = opts._ || [];
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const json = Boolean(opts.json);

  if (opts.help || opts.h) {
    showSkillHelp();
    return;
  }

  const variant = positional[0];
  if (!variant) {
    console.error('Error: variant name required.');
    showSkillHelp();
    process.exitCode = 1;
    return;
  }

  const operation = (positional[1] ?? 'list') as SkillOperation;
  const skillName = positional[2];

  let skillsDir: string;
  try {
    skillsDir = getSkillsDir(rootDir, variant);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  switch (operation) {
    case 'list': {
      const skills = listSkills(skillsDir);
      if (json) {
        console.log(JSON.stringify(skills, null, 2));
        return;
      }
      if (skills.length === 0) {
        console.log(`No skills found in ${variant}.`);
        return;
      }
      console.log(`Skills in ${variant}:\n`);
      for (const skill of skills) {
        console.log(`  - ${skill}`);
      }
      return;
    }

    case 'create': {
      if (!skillName) {
        console.error('Error: skill name required.');
        process.exitCode = 1;
        return;
      }

      const skillDir = path.join(skillsDir, skillName);
      if (fs.existsSync(skillDir)) {
        console.error(`Error: Skill "${skillName}" already exists.`);
        process.exitCode = 1;
        return;
      }

      const description = (opts.description as string) || 'Custom skill';
      const content = SKILL_TEMPLATE.replace(/\{\{name\}\}/g, skillName).replace(/\{\{description\}\}/g, description);

      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, `${skillName}.md`), content);

      console.log(`✓ Created skill: ${skillName}`);
      console.log(`  Path: ${skillDir}`);
      console.log(`\nEdit ${path.join(skillDir, `${skillName}.md`)} to customize your skill.`);
      return;
    }

    case 'show': {
      if (!skillName) {
        console.error('Error: skill name required.');
        process.exitCode = 1;
        return;
      }

      const skillDir = path.join(skillsDir, skillName);
      if (!fs.existsSync(skillDir)) {
        console.error(`Error: Skill not found: ${skillName}`);
        process.exitCode = 1;
        return;
      }

      const mdFile = path.join(skillDir, `${skillName}.md`);
      if (fs.existsSync(mdFile)) {
        console.log(fs.readFileSync(mdFile, 'utf8'));
      } else {
        console.log(`Skill directory: ${skillDir}`);
        const files = fs.readdirSync(skillDir);
        console.log(`Files: ${files.join(', ')}`);
      }
      return;
    }

    case 'remove': {
      if (!skillName) {
        console.error('Error: skill name required.');
        process.exitCode = 1;
        return;
      }

      const skillDir = path.join(skillsDir, skillName);
      if (!fs.existsSync(skillDir)) {
        console.error(`Error: Skill not found: ${skillName}`);
        process.exitCode = 1;
        return;
      }

      fs.rmSync(skillDir, { recursive: true, force: true });
      console.log(`✓ Removed skill: ${skillName}`);
      return;
    }

    default:
      console.error(`Unknown operation: ${operation}`);
      showSkillHelp();
      process.exitCode = 1;
  }
}
