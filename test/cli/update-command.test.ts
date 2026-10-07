import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTempDir, cleanup } from '../helpers/fs-helpers.js';
import { runUpdateCommand } from '../../src/cli/commands/update.js';

const writeVariant = (root: string, dirName: string) => {
  fs.mkdirSync(path.join(root, dirName), { recursive: true });
  fs.writeFileSync(path.join(root, dirName, 'variant.json'), JSON.stringify({ name: dirName, provider: 'mirror' }));
};

test('update without a name keeps going when a variant fails and sets exitCode', () => {
  const root = makeTempDir();
  const originalError = console.error;
  const originalExitCode = process.exitCode;
  const errors: string[] = [];
  console.error = (...args: unknown[]) => errors.push(args.join(' '));
  try {
    // Invalid variant names make updateVariant throw before any install runs.
    writeVariant(root, 'bad name one');
    writeVariant(root, 'bad name two');

    assert.doesNotThrow(() => runUpdateCommand({ opts: { _: [], env: [], root } }));
    assert.equal(errors.filter((line) => line.startsWith('✗ Update failed:')).length, 2);
    assert.match(errors.at(-1) ?? '', /2 of 2 variants failed to update/);
    assert.equal(process.exitCode, 1);
  } finally {
    console.error = originalError;
    process.exitCode = originalExitCode;
    cleanup(root);
  }
});
