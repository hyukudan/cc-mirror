/**
 * CLI doctor command exit code tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runDoctorCommand } from '../../src/cli/commands/doctorCmd.js';
import { makeTempDir, cleanup } from '../helpers/fs-helpers.js';

const writeJson = (filePath: string, data: unknown) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

test('doctor --strict sets exit code when issues exist', () => {
  const rootDir = makeTempDir();
  const binDir = makeTempDir();
  const variantDir = path.join(rootDir, 'alpha');
  const configDir = path.join(variantDir, 'config');
  const tweakDir = path.join(variantDir, 'tweakcc');
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(tweakDir, { recursive: true });
  writeJson(path.join(variantDir, 'variant.json'), {
    name: 'alpha',
    binaryPath: '/missing/bin',
    configDir,
    tweakDir,
  });
  writeJson(path.join(configDir, 'settings.json'), { env: {} });

  const originalExitCode = process.exitCode;
  process.exitCode = 0;

  runDoctorCommand({
    opts: {
      _: [],
      env: [],
      root: rootDir,
      'bin-dir': binDir,
      strict: true,
    },
  });

  assert.equal(process.exitCode, 1);
  process.exitCode = originalExitCode;
  cleanup(rootDir);
  cleanup(binDir);
});
