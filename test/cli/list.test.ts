/**
 * CLI list command tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runListCommand } from '../../src/cli/commands/list.js';
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

test('list --json outputs variants', () => {
  const rootDir = makeTempDir();
  const variantDir = path.join(rootDir, 'alpha');
  fs.mkdirSync(variantDir, { recursive: true });
  writeJson(path.join(variantDir, 'variant.json'), {
    name: 'alpha',
    provider: 'zai',
    createdAt: new Date().toISOString(),
    claudeOrig: '/tmp/cli.js',
    binaryPath: '/tmp/cli.js',
    configDir: path.join(variantDir, 'config'),
    tweakDir: path.join(variantDir, 'tweakcc'),
  });

  const output = captureOutput(() =>
    runListCommand({
      opts: {
        _: [],
        env: [],
        root: rootDir,
        json: true,
      },
    })
  );

  const report = JSON.parse(output.join('\n')) as Array<{ name: string }>;
  assert.equal(report.length, 1);
  assert.equal(report[0]?.name, 'alpha');

  cleanup(rootDir);
});

test('list --json outputs empty array when no variants', () => {
  const rootDir = makeTempDir();
  const output = captureOutput(() =>
    runListCommand({
      opts: {
        _: [],
        env: [],
        root: rootDir,
        json: true,
      },
    })
  );

  const report = JSON.parse(output.join('\n')) as unknown[];
  assert.deepEqual(report, []);

  cleanup(rootDir);
});
