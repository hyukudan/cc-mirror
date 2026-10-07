import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTempDir, cleanup } from '../helpers/fs-helpers.js';
import { ensurePnpmAllowBuilds } from '../../src/core/install.js';

const PKG = '@anthropic-ai/claude-code';

test('ensurePnpmAllowBuilds creates pnpm-workspace.yaml approving the package', () => {
  const dir = makeTempDir();
  try {
    ensurePnpmAllowBuilds(dir, PKG);
    assert.equal(fs.readFileSync(path.join(dir, 'pnpm-workspace.yaml'), 'utf8'), `allowBuilds:\n  '${PKG}': true\n`);
  } finally {
    cleanup(dir);
  }
});

test('ensurePnpmAllowBuilds answers the pnpm v11 placeholder and keeps other keys', () => {
  const dir = makeTempDir();
  try {
    const file = path.join(dir, 'pnpm-workspace.yaml');
    fs.writeFileSync(
      file,
      `allowBuilds:\n  '${PKG}': set this to true or false\nminimumReleaseAgeExclude:\n  - '${PKG}@2.1.219'\n`
    );
    ensurePnpmAllowBuilds(dir, PKG);
    const out = fs.readFileSync(file, 'utf8');
    assert.match(out, /^allowBuilds:\n {2}'@anthropic-ai\/claude-code': true\n/);
    assert.doesNotMatch(out, /set this to true or false/);
    assert.match(out, /minimumReleaseAgeExclude:\n {2}- '@anthropic-ai\/claude-code@2\.1\.219'/);
  } finally {
    cleanup(dir);
  }
});

test('ensurePnpmAllowBuilds adds the package to an existing allowBuilds block', () => {
  const dir = makeTempDir();
  try {
    const file = path.join(dir, 'pnpm-workspace.yaml');
    fs.writeFileSync(file, `allowBuilds:\n  esbuild: true\n`);
    ensurePnpmAllowBuilds(dir, PKG);
    const out = fs.readFileSync(file, 'utf8');
    assert.match(out, /'@anthropic-ai\/claude-code': true/);
    assert.match(out, /esbuild: true/);
  } finally {
    cleanup(dir);
  }
});
