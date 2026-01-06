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
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as { env?: Record<string, string> };
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
