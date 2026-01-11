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

const captureOutput = (fn: () => void): string[] => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args.join(' '));
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  return logs;
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

test('doctor --json outputs report', () => {
  const rootDir = makeTempDir();
  const binDir = makeTempDir();
  const variantDir = path.join(rootDir, 'alpha');
  const configDir = path.join(variantDir, 'config');
  const tweakDir = path.join(variantDir, 'tweakcc');
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(tweakDir, { recursive: true });
  const binaryPath = path.join(variantDir, 'cli.js');
  fs.writeFileSync(binaryPath, '#!/usr/bin/env node\n');
  const wrapperPath = path.join(binDir, 'alpha');
  fs.writeFileSync(wrapperPath, '#!/usr/bin/env bash\n');
  writeJson(path.join(variantDir, 'variant.json'), {
    name: 'alpha',
    binaryPath,
    configDir,
    tweakDir,
  });
  writeJson(path.join(configDir, 'settings.json'), { env: {} });

  const output = captureOutput(() => {
    runDoctorCommand({
      opts: {
        _: [],
        env: [],
        root: rootDir,
        'bin-dir': binDir,
        json: true,
      },
    });
  });

  const report = JSON.parse(output.join('\n')) as Array<{ name: string; ok: boolean }>;
  assert.equal(report.length, 1);
  assert.equal(report[0]?.name, 'alpha');

  cleanup(rootDir);
  cleanup(binDir);
});
