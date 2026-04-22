/**
 * Tests for the fake-npm harness.
 *
 * These tests assert the on-disk layout emitted by `withFakeNpm` matches the
 * Claude Code 2.1.113+ native-binary packaging:
 *   - `bin/claude.exe` (platform-native binary placeholder)
 *   - `install.cjs` postinstall script that copies `bin/claude.exe` → `bin/claude`
 *   - `package.json` with `bin`, `scripts.postinstall`, and `optionalDependencies`
 *   - `bin/claude` exists with exec bits after a simulated install
 *   - no legacy `cli.js`
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { withFakeNpm } from './fake-npm.js';
import { makeTempDir, cleanup } from './fs-helpers.js';

const NPM_PKG = '@anthropic-ai/claude-code';

test('withFakeNpm emits native-binary package layout (no cli.js)', () => {
  withFakeNpm(() => {
    const prefix = makeTempDir('cc-mirror-fake-npm-prefix-');
    try {
      // Run fake npm install exactly the way the real installer is invoked.
      execFileSync('npm', ['install', '--prefix', prefix, `${NPM_PKG}@0.0.0-fake`], {
        stdio: 'pipe',
        env: process.env,
      });

      const pkgRoot = path.join(prefix, 'node_modules', ...NPM_PKG.split('/'));

      // package.json with native-binary shape.
      const pkgJsonPath = path.join(pkgRoot, 'package.json');
      assert.ok(fs.existsSync(pkgJsonPath), 'package.json should exist');
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')) as {
        version?: string;
        bin?: Record<string, string>;
        scripts?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
      };
      assert.ok(pkg.version, 'package.json should declare a version');
      assert.deepEqual(pkg.bin, { claude: 'bin/claude.exe' }, 'bin must point at bin/claude.exe');
      assert.equal(pkg.scripts?.postinstall, 'node install.cjs', 'postinstall should run install.cjs');
      assert.ok(
        pkg.optionalDependencies && Object.keys(pkg.optionalDependencies).length > 0,
        'optionalDependencies stub should be present'
      );

      // install.cjs postinstall script must exist.
      const installCjs = path.join(pkgRoot, 'install.cjs');
      assert.ok(fs.existsSync(installCjs), 'install.cjs should exist');

      // bin/claude.exe placeholder exists and is executable.
      const claudeExe = path.join(pkgRoot, 'bin', 'claude.exe');
      assert.ok(fs.existsSync(claudeExe), 'bin/claude.exe should exist');
      const exeMode = fs.statSync(claudeExe).mode & 0o777;
      assert.ok((exeMode & 0o111) !== 0, `bin/claude.exe should be executable (mode: ${exeMode.toString(8)})`);

      // bin/claude should exist with exec bits (either pre-staged or produced by postinstall).
      const claudeBin = path.join(pkgRoot, 'bin', 'claude');
      assert.ok(fs.existsSync(claudeBin), 'bin/claude should exist after install');
      const binMode = fs.statSync(claudeBin).mode & 0o777;
      assert.ok((binMode & 0o111) !== 0, `bin/claude should be executable (mode: ${binMode.toString(8)})`);

      // Legacy cli.js must NOT be produced.
      const legacyCli = path.join(pkgRoot, 'cli.js');
      assert.ok(!fs.existsSync(legacyCli), 'legacy cli.js must NOT be emitted by fake npm');
    } finally {
      cleanup(prefix);
    }
  });
});
