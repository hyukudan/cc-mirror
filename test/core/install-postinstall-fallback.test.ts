import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTempDir, cleanup } from '../helpers/fs-helpers.js';
import { runPostinstallFallback } from '../../src/core/install.js';

test('runPostinstallFallback executes install.cjs and surfaces success', () => {
  const dir = makeTempDir();
  try {
    const pkgDir = path.join(dir, 'node_modules', '@anthropic-ai', 'claude-code');
    fs.mkdirSync(path.join(pkgDir, 'bin'), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), '{"name":"@anthropic-ai/claude-code"}');

    // Simulate the real install.cjs, which replaces bin/claude.exe with the
    // platform-native binary. We just overwrite with a larger payload so the
    // "ran successfully" signal is visible.
    fs.writeFileSync(path.join(pkgDir, 'bin', 'claude.exe'), 'placeholder', { mode: 0o755 });
    fs.writeFileSync(
      path.join(pkgDir, 'install.cjs'),
      "const fs=require('fs'),p=require('path');const dst=p.join(__dirname,'bin','claude.exe');fs.writeFileSync(dst,'native-binary',{mode:0o755});",
      { mode: 0o644 }
    );

    const ok = runPostinstallFallback(dir, '@anthropic-ai/claude-code');
    assert.equal(ok, true);
    assert.equal(fs.readFileSync(path.join(pkgDir, 'bin', 'claude.exe'), 'utf8'), 'native-binary');
  } finally {
    cleanup(dir);
  }
});

test('runPostinstallFallback returns false when install.cjs missing', () => {
  const dir = makeTempDir();
  try {
    const pkgDir = path.join(dir, 'node_modules', '@anthropic-ai', 'claude-code');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), '{"name":"@anthropic-ai/claude-code"}');

    const ok = runPostinstallFallback(dir, '@anthropic-ai/claude-code');
    assert.equal(ok, false);
  } finally {
    cleanup(dir);
  }
});

test('runPostinstallFallback returns false on non-zero exit', () => {
  const dir = makeTempDir();
  try {
    const pkgDir = path.join(dir, 'node_modules', '@anthropic-ai', 'claude-code');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), '{"name":"@anthropic-ai/claude-code"}');
    fs.writeFileSync(path.join(pkgDir, 'install.cjs'), 'process.exit(2);');

    const ok = runPostinstallFallback(dir, '@anthropic-ai/claude-code');
    assert.equal(ok, false);
  } finally {
    cleanup(dir);
  }
});
