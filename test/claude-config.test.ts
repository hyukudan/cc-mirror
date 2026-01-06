import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureOnboardingState, listMcpServers, upsertMcpServer, removeMcpServer } from '../src/core/claude-config.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cc-mirror-claude-config-'));

test('ensureOnboardingState writes dark theme + onboarding flag', () => {
  const tempDir = makeTempDir();
  fs.mkdirSync(tempDir, { recursive: true });

  const result = ensureOnboardingState(tempDir, { themeId: 'dark' });
  assert.equal(result.updated, true);
  assert.equal(result.themeChanged, true);
  assert.equal(result.onboardingChanged, true);

  const configPath = path.join(tempDir, '.claude.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
    theme?: string;
    hasCompletedOnboarding?: boolean;
  };
  assert.equal(config.theme, 'dark');
  assert.equal(config.hasCompletedOnboarding, true);

  const second = ensureOnboardingState(tempDir, { themeId: 'dark' });
  assert.equal(second.updated, false);
});

test('upsertMcpServer adds entries and removeMcpServer deletes them', () => {
  const tempDir = makeTempDir();
  fs.mkdirSync(tempDir, { recursive: true });

  const server = {
    command: 'npx',
    args: ['@example/mcp'],
    env: {
      API_KEY: 'test',
    },
  };

  assert.equal(upsertMcpServer(tempDir, 'example', server), true);
  let servers = listMcpServers(tempDir);
  assert.equal(servers.example?.command, 'npx');
  assert.deepEqual(servers.example?.args, ['@example/mcp']);

  assert.equal(upsertMcpServer(tempDir, 'example', server), false);

  assert.equal(removeMcpServer(tempDir, 'example'), true);
  assert.equal(removeMcpServer(tempDir, 'example'), false);
  servers = listMcpServers(tempDir);
  assert.deepEqual(servers, {});
});
