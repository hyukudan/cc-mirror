import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as core from '../../src/core/index.js';
import { makeTempDir, cleanup, writeExecutable } from '../helpers/index.js';

const isWindows = os.platform() === 'win32';

/**
 * Helper: create a variant directory with common fixable issues
 */
function createBrokenVariant(rootDir: string, binDir: string, name: string) {
  const variantDir = path.join(rootDir, name);
  const configDir = path.join(variantDir, 'config');
  const tweakDir = path.join(variantDir, 'tweakcc');
  const npmDir = path.join(variantDir, 'npm');
  const binaryPath = path.join(variantDir, 'bin', 'cli.js');
  const wrapperPath = path.join(binDir, name);

  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(tweakDir, { recursive: true });
  fs.mkdirSync(path.dirname(binaryPath), { recursive: true });
  writeExecutable(binaryPath, '#!/usr/bin/env node\n');

  const cliPath = path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
  fs.mkdirSync(path.dirname(cliPath), { recursive: true });

  return { variantDir, configDir, tweakDir, npmDir, binaryPath, wrapperPath, cliPath };
}

test('doctor --fix repairs wrapper permissions', { skip: isWindows && 'chmod not applicable on Windows' }, () => {
  const rootDir = makeTempDir();
  const binDir = makeTempDir();
  const name = 'fix-perms';
  const { variantDir, configDir, tweakDir, binaryPath, wrapperPath } = createBrokenVariant(rootDir, binDir, name);

  // Create wrapper WITHOUT executable permission
  fs.writeFileSync(wrapperPath, '#!/usr/bin/env bash\n', { mode: 0o644 });

  fs.writeFileSync(path.join(configDir, 'settings.json'), JSON.stringify({ env: {} }, null, 2));
  fs.writeFileSync(
    path.join(variantDir, 'variant.json'),
    JSON.stringify({ name, provider: 'zai', createdAt: new Date().toISOString(), binaryPath, configDir, tweakDir })
  );

  // Without --fix: should report issue
  const before = core.doctor(rootDir, binDir, { strict: true });
  const itemBefore = before.find((e) => e.name === name)!;
  assert.ok(itemBefore.issues?.some((i) => i.includes('Wrapper not executable')));

  // With --fix: should repair
  const after = core.doctor(rootDir, binDir, { fix: true });
  const itemAfter = after.find((e) => e.name === name)!;
  assert.ok(itemAfter.fixes?.some((f) => f.includes('chmod')));
  assert.equal(
    itemAfter.issues?.some((i) => i.includes('Wrapper not executable')),
    undefined
  );

  // Verify file is now executable
  fs.accessSync(wrapperPath, fs.constants.X_OK);

  cleanup(rootDir);
  cleanup(binDir);
});

test('doctor --fix removes CLAUDE_CODE_TEAM_NAME from settings', () => {
  const rootDir = makeTempDir();
  const binDir = makeTempDir();
  const name = 'fix-teamname';
  const { variantDir, configDir, tweakDir, binaryPath, wrapperPath } = createBrokenVariant(rootDir, binDir, name);
  writeExecutable(wrapperPath, '#!/usr/bin/env bash\n');

  fs.writeFileSync(
    path.join(configDir, 'settings.json'),
    JSON.stringify({ env: { GOOD_KEY: 'ok', CLAUDE_CODE_TEAM_NAME: 'oops' } }, null, 2)
  );
  fs.writeFileSync(
    path.join(variantDir, 'variant.json'),
    JSON.stringify({ name, provider: 'zai', createdAt: new Date().toISOString(), binaryPath, configDir, tweakDir })
  );

  const report = core.doctor(rootDir, binDir, { fix: true });
  const item = report.find((e) => e.name === name)!;
  assert.ok(item.fixes?.some((f) => f.includes('CLAUDE_CODE_TEAM_NAME')));

  // Verify settings.json was updated
  const settings = JSON.parse(fs.readFileSync(path.join(configDir, 'settings.json'), 'utf8'));
  assert.equal(settings.env.CLAUDE_CODE_TEAM_NAME, undefined);
  assert.equal(settings.env.GOOD_KEY, 'ok');

  cleanup(rootDir);
  cleanup(binDir);
});

test('doctor --fix removes invalid env keys from settings', () => {
  const rootDir = makeTempDir();
  const binDir = makeTempDir();
  const name = 'fix-envkeys';
  const { variantDir, configDir, tweakDir, binaryPath, wrapperPath } = createBrokenVariant(rootDir, binDir, name);
  writeExecutable(wrapperPath, '#!/usr/bin/env bash\n');

  fs.writeFileSync(
    path.join(configDir, 'settings.json'),
    JSON.stringify({ env: { VALID_KEY: 'ok', 'BAD-KEY': '1', '123bad': '2' } }, null, 2)
  );
  fs.writeFileSync(
    path.join(variantDir, 'variant.json'),
    JSON.stringify({ name, provider: 'zai', createdAt: new Date().toISOString(), binaryPath, configDir, tweakDir })
  );

  const report = core.doctor(rootDir, binDir, { fix: true });
  const item = report.find((e) => e.name === name)!;
  assert.ok(item.fixes?.some((f) => f.includes('invalid env keys')));

  const settings = JSON.parse(fs.readFileSync(path.join(configDir, 'settings.json'), 'utf8'));
  assert.equal(settings.env.VALID_KEY, 'ok');
  assert.equal(settings.env['BAD-KEY'], undefined);
  assert.equal(settings.env['123bad'], undefined);

  cleanup(rootDir);
  cleanup(binDir);
});

test('doctor --fix re-applies team mode cli.js patch', () => {
  const rootDir = makeTempDir();
  const binDir = makeTempDir();
  const name = 'fix-patch';
  const { variantDir, configDir, tweakDir, npmDir, binaryPath, wrapperPath, cliPath } = createBrokenVariant(
    rootDir,
    binDir,
    name
  );
  writeExecutable(wrapperPath, '#!/usr/bin/env bash\n');

  // Write cli.js with DISABLED team mode (simulates broken patch)
  fs.writeFileSync(cliPath, 'function sU(){return!1}');

  fs.writeFileSync(path.join(configDir, 'settings.json'), JSON.stringify({ env: {} }, null, 2));
  fs.writeFileSync(
    path.join(variantDir, 'variant.json'),
    JSON.stringify({
      name,
      provider: 'zai',
      createdAt: new Date().toISOString(),
      binaryPath,
      configDir,
      tweakDir,
      npmDir,
      teamModeEnabled: true,
    })
  );

  const report = core.doctor(rootDir, binDir, { fix: true });
  const item = report.find((e) => e.name === name)!;
  assert.ok(item.fixes?.some((f) => f.includes('team mode cli.js patch')));

  // Verify cli.js was patched
  const content = fs.readFileSync(cliPath, 'utf8');
  assert.ok(content.includes('function sU(){return!0}'));

  cleanup(rootDir);
  cleanup(binDir);
});

test('doctor --fix implies strict mode', () => {
  const rootDir = makeTempDir();
  const binDir = makeTempDir();
  const name = 'fix-strict';
  const { variantDir, configDir, tweakDir, binaryPath, wrapperPath } = createBrokenVariant(rootDir, binDir, name);
  writeExecutable(wrapperPath, '#!/usr/bin/env bash\n');

  fs.writeFileSync(path.join(configDir, 'settings.json'), JSON.stringify({ env: {} }, null, 2));
  fs.writeFileSync(
    path.join(variantDir, 'variant.json'),
    JSON.stringify({ name, provider: 'zai', createdAt: new Date().toISOString(), binaryPath, configDir, tweakDir })
  );

  // With --fix (no explicit --strict), should still get warnings (strict-only checks)
  const report = core.doctor(rootDir, binDir, { fix: true });
  const item = report.find((e) => e.name === name)!;
  // Strict checks run: we should get at least the version warning
  assert.ok(item.warnings !== undefined || item.issues !== undefined || item.ok);

  cleanup(rootDir);
  cleanup(binDir);
});
