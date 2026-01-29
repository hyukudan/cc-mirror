/**
 * Task Templates - Apply pre-defined task templates
 */

import fs from 'node:fs';
import path from 'node:path';
import { readJson, writeJson } from '../../../core/fs.js';

export interface TaskTemplate {
  name: string;
  description?: string;
  tasks: TaskTemplateItem[];
}

interface TaskTemplateItem {
  subject: string;
  description?: string;
  blockedBy?: string[]; // References other task subjects in template
}

const TEMPLATES_DIR = '.cc-mirror-task-templates';

function getTemplatesDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return path.join(home, TEMPLATES_DIR);
}

function ensureTemplatesDir(): string {
  const dir = getTemplatesDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });

    // Create default templates
    createDefaultTemplates(dir);
  }
  return dir;
}

function createDefaultTemplates(dir: string): void {
  // Feature development template
  const featureTemplate: TaskTemplate = {
    name: 'feature',
    description: 'Standard feature development workflow',
    tasks: [
      { subject: 'Design feature architecture' },
      { subject: 'Implement core functionality', blockedBy: ['Design feature architecture'] },
      { subject: 'Write unit tests', blockedBy: ['Implement core functionality'] },
      { subject: 'Write integration tests', blockedBy: ['Write unit tests'] },
      { subject: 'Update documentation', blockedBy: ['Implement core functionality'] },
      { subject: 'Code review', blockedBy: ['Write unit tests', 'Update documentation'] },
    ],
  };

  // Bug fix template
  const bugfixTemplate: TaskTemplate = {
    name: 'bugfix',
    description: 'Bug investigation and fix workflow',
    tasks: [
      { subject: 'Reproduce the bug' },
      { subject: 'Investigate root cause', blockedBy: ['Reproduce the bug'] },
      { subject: 'Implement fix', blockedBy: ['Investigate root cause'] },
      { subject: 'Add regression test', blockedBy: ['Implement fix'] },
      { subject: 'Verify fix', blockedBy: ['Add regression test'] },
    ],
  };

  // Sprint planning template
  const sprintTemplate: TaskTemplate = {
    name: 'sprint',
    description: 'Sprint planning and execution',
    tasks: [
      { subject: 'Sprint planning meeting' },
      { subject: 'Task breakdown', blockedBy: ['Sprint planning meeting'] },
      { subject: 'Sprint execution', blockedBy: ['Task breakdown'] },
      { subject: 'Daily standup notes' },
      { subject: 'Sprint review', blockedBy: ['Sprint execution'] },
      { subject: 'Sprint retrospective', blockedBy: ['Sprint review'] },
    ],
  };

  // Code review template
  const reviewTemplate: TaskTemplate = {
    name: 'code-review',
    description: 'Comprehensive code review process',
    tasks: [
      { subject: 'Review code changes' },
      { subject: 'Check test coverage', blockedBy: ['Review code changes'] },
      { subject: 'Verify documentation', blockedBy: ['Review code changes'] },
      { subject: 'Performance impact assessment', blockedBy: ['Review code changes'] },
      { subject: 'Security review', blockedBy: ['Review code changes'] },
      {
        subject: 'Approve or request changes',
        blockedBy: ['Check test coverage', 'Verify documentation', 'Security review'],
      },
    ],
  };

  writeJson(path.join(dir, 'feature.json'), featureTemplate);
  writeJson(path.join(dir, 'bugfix.json'), bugfixTemplate);
  writeJson(path.join(dir, 'sprint.json'), sprintTemplate);
  writeJson(path.join(dir, 'code-review.json'), reviewTemplate);
}

export function listTaskTemplates(): TaskTemplate[] {
  const dir = ensureTemplatesDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const templates: TaskTemplate[] = [];

  for (const file of files) {
    const template = readJson<TaskTemplate>(path.join(dir, file));
    if (template && template.name) templates.push(template);
  }

  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadTaskTemplate(name: string): TaskTemplate | null {
  const dir = ensureTemplatesDir();
  const templatePath = path.join(dir, `${name}.json`);
  if (!fs.existsSync(templatePath)) return null;
  return readJson<TaskTemplate>(templatePath);
}

export function saveTaskTemplate(template: TaskTemplate): void {
  const dir = ensureTemplatesDir();
  const templatePath = path.join(dir, `${template.name}.json`);
  writeJson(templatePath, template);
}

export function deleteTaskTemplate(name: string): boolean {
  const dir = getTemplatesDir();
  const templatePath = path.join(dir, `${name}.json`);
  if (!fs.existsSync(templatePath)) return false;
  fs.unlinkSync(templatePath);
  return true;
}

export function printTaskTemplateHelp(): void {
  console.log(`
npx cc-mirror tasks template - Manage task templates

USAGE:
  npx cc-mirror tasks template [operation] [name]

OPERATIONS:
  list                    List available templates
  show <name>             Show template details
  apply <name> [prefix]   Create tasks from template
  save <name>             Save current tasks as template (WIP)
  delete <name>           Delete a template

DEFAULT TEMPLATES:
  feature                 Feature development workflow
  bugfix                  Bug investigation and fix
  sprint                  Sprint planning and execution
  code-review             Code review process

EXAMPLES:
  npx cc-mirror tasks template list
  npx cc-mirror tasks template show feature
  npx cc-mirror tasks template apply feature "Auth Feature"
`);
}
