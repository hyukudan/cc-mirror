/**
 * CLI config command tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runConfigCommand } from '../../src/cli/commands/config.js';
import { makeTempDir, cleanup } from '../helpers/fs-helpers.js';

const writeJson = (filePath: string, data: unknown) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const setupVariant = (rootDir: string, name: string) => {
  const variantDir = path.join(rootDir, name);
  const configDir = path.join(variantDir, 'config');
  const tweakDir = path.join(variantDir, 'tweakcc');
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(tweakDir, { recursive: true });
  const meta = {
    name,
    provider: 'zai',
    createdAt: new Date().toISOString(),
    claudeOrig: '/tmp/cli.js',
    binaryPath: '/tmp/cli.js',
    configDir,
    tweakDir,
  };
  writeJson(path.join(variantDir, 'variant.json'), meta);
  return { variantDir, configDir };
};

const readSettings = (configDir: string) => {
  const settingsPath = path.join(configDir, 'settings.json');
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
    env?: Record<string, string>;
    permissions?: {
      allow?: string[];
      ask?: string[];
      deny?: string[];
    };
  };
};

const captureError = (fn: () => void): string[] => {
  const logs: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => logs.push(args.join(' '));
  try {
    fn();
  } finally {
    console.error = originalError;
  }
  return logs;
};

test('config set updates env overrides', () => {
  const rootDir = makeTempDir();
  const { configDir } = setupVariant(rootDir, 'alpha');
  writeJson(path.join(configDir, 'settings.json'), { env: { FOO: 'old' } });

  const originalConfigDir = process.env.CLAUDE_CONFIG_DIR;
  delete process.env.CLAUDE_CONFIG_DIR;
  process.exitCode = 0;

  runConfigCommand({
    opts: {
      _: ['set', 'alpha'],
      env: ['FOO=new', 'BAR=baz'],
      root: rootDir,
    },
  });

  const settings = readSettings(configDir);
  assert.equal(settings.env?.FOO, 'new');
  assert.equal(settings.env?.BAR, 'baz');

  if (originalConfigDir) {
    process.env.CLAUDE_CONFIG_DIR = originalConfigDir;
  }
  cleanup(rootDir);
});

test('config unset removes env overrides', () => {
  const rootDir = makeTempDir();
  const { configDir } = setupVariant(rootDir, 'beta');
  writeJson(path.join(configDir, 'settings.json'), { env: { FOO: 'bar', KEEP: 'yes' } });

  const originalConfigDir = process.env.CLAUDE_CONFIG_DIR;
  delete process.env.CLAUDE_CONFIG_DIR;
  process.exitCode = 0;

  runConfigCommand({
    opts: {
      _: ['unset', 'beta'],
      env: ['FOO'],
      root: rootDir,
    },
  });

  const settings = readSettings(configDir);
  assert.equal(settings.env?.FOO, undefined);
  assert.equal(settings.env?.KEEP, 'yes');

  if (originalConfigDir) {
    process.env.CLAUDE_CONFIG_DIR = originalConfigDir;
  }
  cleanup(rootDir);
});

test('config set updates permissions', () => {
  const rootDir = makeTempDir();
  const { configDir } = setupVariant(rootDir, 'gamma');
  writeJson(path.join(configDir, 'settings.json'), { permissions: { allow: ['TaskList'] } });

  const originalConfigDir = process.env.CLAUDE_CONFIG_DIR;
  delete process.env.CLAUDE_CONFIG_DIR;
  process.exitCode = 0;

  runConfigCommand({
    opts: {
      _: ['set', 'gamma'],
      env: [],
      allow: 'TaskCreate,TaskUpdate',
      deny: 'WebSearch',
      root: rootDir,
    },
  });

  const settings = readSettings(configDir);
  assert.deepEqual(settings.permissions?.allow, ['TaskCreate', 'TaskList', 'TaskUpdate']);
  assert.deepEqual(settings.permissions?.deny, ['WebSearch']);

  if (originalConfigDir) {
    process.env.CLAUDE_CONFIG_DIR = originalConfigDir;
  }
  cleanup(rootDir);
});

test('config unset updates permissions', () => {
  const rootDir = makeTempDir();
  const { configDir } = setupVariant(rootDir, 'delta');
  writeJson(path.join(configDir, 'settings.json'), {
    permissions: { allow: ['TaskCreate', 'TaskUpdate'], deny: ['WebSearch'] },
  });

  const originalConfigDir = process.env.CLAUDE_CONFIG_DIR;
  delete process.env.CLAUDE_CONFIG_DIR;
  process.exitCode = 0;

  runConfigCommand({
    opts: {
      _: ['unset', 'delta'],
      env: [],
      allow: 'TaskCreate',
      deny: 'WebSearch',
      root: rootDir,
    },
  });

  const settings = readSettings(configDir);
  assert.deepEqual(settings.permissions?.allow, ['TaskUpdate']);
  assert.equal(settings.permissions?.deny, undefined);

  if (originalConfigDir) {
    process.env.CLAUDE_CONFIG_DIR = originalConfigDir;
  }
  cleanup(rootDir);
});

test('config set rejects invalid env keys', () => {
  const rootDir = makeTempDir();
  const { configDir } = setupVariant(rootDir, 'epsilon');
  writeJson(path.join(configDir, 'settings.json'), { env: { FOO: 'old' } });

  const originalConfigDir = process.env.CLAUDE_CONFIG_DIR;
  const originalExitCode = process.exitCode;
  delete process.env.CLAUDE_CONFIG_DIR;
  process.exitCode = 0;

  const output = captureError(() => {
    runConfigCommand({
      opts: {
        _: ['set', 'epsilon'],
        env: ['1INVALID=value'],
        root: rootDir,
      },
    });
  });

  assert.equal(process.exitCode, 1);
  assert.ok(output.some((line) => line.includes('invalid env keys')));
  const settings = readSettings(configDir);
  assert.equal(settings.env?.FOO, 'old');

  process.exitCode = originalExitCode;
  if (originalConfigDir) {
    process.env.CLAUDE_CONFIG_DIR = originalConfigDir;
  }
  cleanup(rootDir);
});

test('config set rejects CLAUDE_CODE_TEAM_NAME', () => {
  const rootDir = makeTempDir();
  const { configDir } = setupVariant(rootDir, 'zeta');
  writeJson(path.join(configDir, 'settings.json'), { env: { FOO: 'old' } });

  const originalConfigDir = process.env.CLAUDE_CONFIG_DIR;
  const originalExitCode = process.exitCode;
  delete process.env.CLAUDE_CONFIG_DIR;
  process.exitCode = 0;

  const output = captureError(() => {
    runConfigCommand({
      opts: {
        _: ['set', 'zeta'],
        env: ['CLAUDE_CODE_TEAM_NAME=myteam'],
        root: rootDir,
      },
    });
  });

  assert.equal(process.exitCode, 1);
  assert.ok(output.some((line) => line.includes('managed dynamically')));
  const settings = readSettings(configDir);
  assert.equal(settings.env?.FOO, 'old');

  process.exitCode = originalExitCode;
  if (originalConfigDir) {
    process.env.CLAUDE_CONFIG_DIR = originalConfigDir;
  }
  cleanup(rootDir);
});
