import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exportVariant, importVariant, readExportArchive, writeExportArchive } from '../src/core/export.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cc-mirror-export-'));

const writeJsonFile = (filePath: string, data: unknown) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

test('exportVariant and importVariant round-trip config data', () => {
  const rootDir = makeTempDir();
  const sourceVariant = path.join(rootDir, 'source');
  const targetVariant = path.join(rootDir, 'target');
  const sourceConfig = path.join(sourceVariant, 'config');
  const targetConfig = path.join(targetVariant, 'config');

  ensureDir(sourceConfig);
  ensureDir(targetConfig);

  writeJsonFile(path.join(sourceConfig, 'settings.json'), {
    env: {
      CUSTOM_FLAG: '1',
      ANTHROPIC_API_KEY: 'secret',
    },
    permissions: {
      allow: ['ToolA'],
      deny: ['ToolB'],
    },
  });

  writeJsonFile(path.join(sourceConfig, '.claude.json'), {
    mcpServers: {
      Airtable: {
        command: 'npx',
        args: ['@example/airtable-mcp'],
      },
    },
  });

  fs.writeFileSync(path.join(sourceConfig, 'CLAUDE.md'), 'Hello Claude');

  const skillFile = path.join(sourceConfig, 'skills', 'demo-skill', 'README.md');
  ensureDir(path.dirname(skillFile));
  fs.writeFileSync(skillFile, 'Skill content');

  const taskFile = path.join(sourceConfig, 'tasks', 'team-a', '1.json');
  ensureDir(path.dirname(taskFile));
  fs.writeFileSync(taskFile, JSON.stringify({ id: 1, subject: 'Task' }, null, 2));

  const exportResult = exportVariant(sourceVariant, [
    'skills',
    'mcp-servers',
    'permissions',
    'claude-md',
    'tasks',
    'provider-env',
  ]);

  const exportFile = path.join(rootDir, 'snapshot.json');
  writeExportArchive(exportFile, exportResult.archive);

  const archive = readExportArchive(exportFile);
  const importResult = importVariant(targetVariant, archive, {
    items: archive.items,
    createBackup: false,
  });
  assert.equal(importResult.success, true);

  const targetSettings = JSON.parse(fs.readFileSync(path.join(targetConfig, 'settings.json'), 'utf8')) as {
    env: Record<string, string>;
    permissions: { allow: string[]; deny: string[] };
  };
  assert.equal(targetSettings.env.CUSTOM_FLAG, '1');
  assert.equal(targetSettings.env.ANTHROPIC_API_KEY, 'secret');
  assert.deepEqual(targetSettings.permissions.allow, ['ToolA']);
  assert.deepEqual(targetSettings.permissions.deny, ['ToolB']);

  const targetClaude = JSON.parse(fs.readFileSync(path.join(targetConfig, '.claude.json'), 'utf8')) as {
    mcpServers: Record<string, { command: string }>;
  };
  assert.equal(targetClaude.mcpServers.Airtable.command, 'npx');

  const targetClaudeMd = fs.readFileSync(path.join(targetConfig, 'CLAUDE.md'), 'utf8');
  assert.equal(targetClaudeMd, 'Hello Claude');

  const targetSkill = fs.readFileSync(path.join(targetConfig, 'skills', 'demo-skill', 'README.md'), 'utf8');
  assert.equal(targetSkill, 'Skill content');

  const targetTask = JSON.parse(fs.readFileSync(path.join(targetConfig, 'tasks', 'team-a', '1.json'), 'utf8')) as {
    id: number;
  };
  assert.equal(targetTask.id, 1);
});
