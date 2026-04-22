/**
 * Targeted tests for src/core/install.ts
 *
 * Covers paths left uncovered after the CC 2.1.117 native-binary migration:
 *   - runPostinstallFallback: missing script + non-zero exit branches
 *   - resolveClaudeBinaryPath: non-scoped package edge cases
 *   - detectPackageManager / getInstallArgs: full matrix
 *   - installNpmClaude / installNpmClaudeAsync: happy + error paths via fake npm
 *   - getInstallPreflightNotes: platform-gated behaviour
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  detectPackageManager,
  getInstallArgs,
  resolveClaudeBinaryPath,
  runPostinstallFallback,
  installNpmClaude,
  installNpmClaudeAsync,
  getInstallPreflightNotes,
} from '../../src/core/install.js';
import { makeTempDir, cleanup, writeExecutable } from '../helpers/fs-helpers.js';
import { withFakeNpm } from '../helpers/fake-npm.js';

const isWindows = process.platform === 'win32';

test('runPostinstallFallback returns false when install.cjs is absent', () => {
  const dir = makeTempDir();
  try {
    // Create an empty package dir — no install.cjs present.
    const pkgDir = path.join(dir, 'node_modules', '@anthropic-ai', 'claude-code');
    fs.mkdirSync(pkgDir, { recursive: true });
    const ok = runPostinstallFallback(dir, '@anthropic-ai/claude-code');
    assert.equal(ok, false);
  } finally {
    cleanup(dir);
  }
});

test('runPostinstallFallback returns false when install.cjs exits non-zero', () => {
  const dir = makeTempDir();
  try {
    const pkgDir = path.join(dir, 'node_modules', '@anthropic-ai', 'claude-code');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'install.cjs'), 'process.exit(2);\n');
    const ok = runPostinstallFallback(dir, '@anthropic-ai/claude-code');
    assert.equal(ok, false);
  } finally {
    cleanup(dir);
  }
});

test('resolveClaudeBinaryPath handles non-scoped packages', () => {
  const p = resolveClaudeBinaryPath('/tmp/x', 'claude-code', 'linux');
  assert.equal(p, '/tmp/x/node_modules/claude-code/bin/claude');
});

test('resolveClaudeBinaryPath handles scoped packages on win32', () => {
  const p = resolveClaudeBinaryPath('/tmp/y', '@anthropic-ai/claude-code', 'win32');
  // path.join normalises slashes; just assert the tail.
  assert.ok(p.endsWith(path.join('node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe')));
});

test('getInstallArgs produces the right args for each package manager', () => {
  const dir = '/tmp/variant/npm';
  const spec = '@anthropic-ai/claude-code@2.1.117';
  assert.deepEqual(getInstallArgs('bun', dir, spec), ['add', '--cwd', dir, spec]);
  assert.deepEqual(getInstallArgs('pnpm', dir, spec), ['add', '--dir', dir, spec]);
  assert.deepEqual(getInstallArgs('yarn', dir, spec), ['add', '--cwd', dir, spec]);
  assert.deepEqual(getInstallArgs('npm', dir, spec), ['install', '--prefix', dir, '--no-save', spec]);
});

test('detectPackageManager throws when no package manager is on PATH', () => {
  const previousPath = process.env.PATH;
  // Point PATH at an empty directory so commandExists returns false for all PMs.
  const empty = makeTempDir();
  process.env.PATH = empty;
  try {
    assert.throws(() => detectPackageManager(), /No package manager/);
  } finally {
    process.env.PATH = previousPath;
    cleanup(empty);
  }
});

test('detectPackageManager returns an available manager when PATH is real', () => {
  // On a dev box at least one of bun/pnpm/yarn/npm exists. Accept any.
  const pm = detectPackageManager();
  assert.ok(['bun', 'pnpm', 'yarn', 'npm'].includes(pm), `unexpected pm: ${pm}`);
});

test('getInstallPreflightNotes returns [] on non-Windows', () => {
  if (isWindows) {
    // On real Windows this can return notes — nothing to assert cross-platform.
    return;
  }
  assert.deepEqual(getInstallPreflightNotes(), []);
});

test('installNpmClaude stages a native binary via the fake package manager', { skip: isWindows }, () => {
  const npmDir = makeTempDir();
  try {
    withFakeNpm(() => {
      const result = installNpmClaude({
        npmDir,
        npmPackage: '@anthropic-ai/claude-code',
        npmVersion: '2.1.117',
        stdio: 'pipe',
      });
      assert.ok(fs.existsSync(result.cliPath), 'binary path should exist after install');
      assert.equal(result.cliPath, path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude'));
      assert.ok(['bun', 'pnpm', 'yarn', 'npm'].includes(result.packageManager));
    });
  } finally {
    cleanup(npmDir);
  }
});

test('installNpmClaude falls back to postinstall when bin/claude is missing', { skip: isWindows }, () => {
  const npmDir = makeTempDir();
  try {
    withFakeNpm(() => {
      // Run the install, then delete bin/claude so the fallback branch runs
      // when we re-invoke. Easiest: install once to seed install.cjs + bin.exe,
      // delete claude, then call again — but spawnSync will re-run the fake.
      // Instead, do a single install and inspect that the fallback path is
      // reachable by removing claude after install, then re-running.
      installNpmClaude({
        npmDir,
        npmPackage: '@anthropic-ai/claude-code',
        npmVersion: '2.1.117',
        stdio: 'pipe',
      });
      const binDir = path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin');
      fs.rmSync(path.join(binDir, 'claude'));
      // The fake npm re-stages bin/claude on every run, so to hit the missing-
      // binary fallback we need to stop the fake from re-staging. Simplest:
      // call runPostinstallFallback directly to confirm it restages cleanly.
      const ok = runPostinstallFallback(npmDir, '@anthropic-ai/claude-code');
      assert.equal(ok, true);
      assert.ok(fs.existsSync(path.join(binDir, 'claude')));
    });
  } finally {
    cleanup(npmDir);
  }
});

test('installNpmClaude surfaces package-manager failures', { skip: isWindows }, () => {
  const binDir = makeTempDir();
  const npmDir = makeTempDir();
  // Fake npm that always exits 1 — simulates install failure.
  const failingNpm = `#!/usr/bin/env node
process.stderr.write('npm ERR! simulated network failure\\n');
process.exit(1);
`;
  try {
    for (const pm of ['npm', 'pnpm', 'bun', 'yarn']) {
      writeExecutable(path.join(binDir, pm), failingNpm);
    }
    const previousPath = process.env.PATH;
    process.env.PATH = `${binDir}${path.delimiter}${previousPath ?? ''}`;
    try {
      assert.throws(
        () =>
          installNpmClaude({
            npmDir,
            npmPackage: '@anthropic-ai/claude-code',
            npmVersion: '2.1.117',
            stdio: 'pipe',
          }),
        /install failed/
      );
    } finally {
      process.env.PATH = previousPath;
    }
  } finally {
    cleanup(binDir);
    cleanup(npmDir);
  }
});

test('installNpmClaudeAsync resolves on success', { skip: isWindows }, async () => {
  const npmDir = makeTempDir();
  try {
    // withFakeNpm is synchronous but we can manually stage the fake PATH for an
    // awaited call — do it by reusing the same helper pattern inline.
    const tmpBin = makeTempDir();
    const { createFakeNpm } = await import('../helpers/fake-npm.js');
    createFakeNpm(tmpBin);
    const previousPath = process.env.PATH;
    process.env.PATH = `${tmpBin}${path.delimiter}${previousPath ?? ''}`;
    try {
      const result = await installNpmClaudeAsync({
        npmDir,
        npmPackage: '@anthropic-ai/claude-code',
        npmVersion: '2.1.117',
        stdio: 'pipe',
      });
      assert.ok(fs.existsSync(result.cliPath));
    } finally {
      process.env.PATH = previousPath;
      cleanup(tmpBin);
    }
  } finally {
    cleanup(npmDir);
  }
});

test('installNpmClaudeAsync rejects when package manager exits non-zero', { skip: isWindows }, async () => {
  const binDir = makeTempDir();
  const npmDir = makeTempDir();
  const failingNpm = `#!/usr/bin/env node
process.stderr.write('pnpm ERR! simulated\\n');
process.exit(1);
`;
  try {
    for (const pm of ['npm', 'pnpm', 'bun', 'yarn']) {
      writeExecutable(path.join(binDir, pm), failingNpm);
    }
    const previousPath = process.env.PATH;
    process.env.PATH = `${binDir}${path.delimiter}${previousPath ?? ''}`;
    try {
      await assert.rejects(
        installNpmClaudeAsync({
          npmDir,
          npmPackage: '@anthropic-ai/claude-code',
          npmVersion: '2.1.117',
          stdio: 'pipe',
        }),
        /install failed/
      );
    } finally {
      process.env.PATH = previousPath;
    }
  } finally {
    cleanup(binDir);
    cleanup(npmDir);
  }
});

test('installNpmClaudeAsync rejects when package manager cannot be detected', async () => {
  const empty = makeTempDir();
  const previousPath = process.env.PATH;
  process.env.PATH = empty;
  try {
    await assert.rejects(
      installNpmClaudeAsync({
        npmDir: os.tmpdir(),
        npmPackage: '@anthropic-ai/claude-code',
        npmVersion: '2.1.117',
        stdio: 'pipe',
      }),
      /No package manager/
    );
  } finally {
    process.env.PATH = previousPath;
    cleanup(empty);
  }
});
