import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as core from '../../src/core/index.js';
import { makeTempDir, cleanup, writeExecutable } from '../helpers/index.js';

const isWindows = os.platform() === 'win32';

test('doctor strict reports config issues', () => {
  const rootDir = makeTempDir();
  const binDir = makeTempDir();
  const name = 'valid-name';
  const variantDir = path.join(rootDir, name);
  const configDir = path.join(variantDir, 'config');
  const tweakDir = path.join(variantDir, 'tweakcc');
  const npmDir = path.join(variantDir, 'npm');
  const binaryPath = path.join(variantDir, 'bin', 'cli.js');
  const wrapperPath = path.join(binDir, name);

  fs.mkdirSync(path.join(configDir, 'tasks'), { recursive: true });
  // ':' is invalid in both team names and Windows directory names.
  // On Windows, we can't create a directory with invalid-name chars, so skip.
  if (!isWindows) {
    fs.mkdirSync(path.join(configDir, 'tasks', 'bad:team'));
  }
  fs.mkdirSync(tweakDir, { recursive: true });
  fs.mkdirSync(path.dirname(binaryPath), { recursive: true });
  writeExecutable(binaryPath, '#!/usr/bin/env node\n');
  writeExecutable(wrapperPath, '#!/usr/bin/env bash\n');

  const cliPath = path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
  fs.mkdirSync(path.dirname(cliPath), { recursive: true });
  fs.writeFileSync(cliPath, 'function sU(){return!1}');

  fs.writeFileSync(
    path.join(configDir, 'settings.json'),
    JSON.stringify({ env: { 'BAD-KEY': '1', CLAUDE_CODE_TEAM_NAME: 'oops' } }, null, 2)
  );
  fs.writeFileSync(
    path.join(variantDir, 'variant.json'),
    JSON.stringify(
      {
        name,
        provider: 'zai',
        createdAt: new Date().toISOString(),
        claudeOrig: 'cli.js',
        binaryPath,
        configDir,
        tweakDir,
        npmDir,
        teamModeEnabled: true,
      },
      null,
      2
    )
  );

  const report = core.doctor(rootDir, binDir, { strict: true });
  const item = report.find((entry) => entry.name === name);
  assert.ok(item);
  assert.equal(item.ok, false);
  assert.ok(item.issues?.some((issue) => issue.includes('invalid env keys')));
  assert.ok(item.issues?.some((issue) => issue.includes('CLAUDE_CODE_TEAM_NAME')));
  if (!isWindows) {
    assert.ok(item.issues?.some((issue) => issue.includes('invalid team name')));
  }
  assert.ok(item.issues?.some((issue) => issue.includes('team mode enabled but cli.js patch missing')));

  cleanup(rootDir);
  cleanup(binDir);
});
