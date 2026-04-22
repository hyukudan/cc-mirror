import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTempDir, cleanup } from '../helpers/fs-helpers.js';
import { runPostinstallFallback } from '../../src/core/install.js';

test('runPostinstallFallback executes install.cjs when binary missing', () => {
  const dir = makeTempDir();
  try {
    const pkgDir = path.join(dir, 'node_modules', '@anthropic-ai', 'claude-code');
    fs.mkdirSync(path.join(pkgDir, 'bin'), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), '{"name":"@anthropic-ai/claude-code"}');
    fs.writeFileSync(path.join(pkgDir, 'bin', 'claude.exe'), '#!/bin/sh\necho hi\n', { mode: 0o755 });
    fs.writeFileSync(
      path.join(pkgDir, 'install.cjs'),
      "const fs=require('fs'),p=require('path');const dst=p.join(__dirname,'bin','claude');fs.copyFileSync(p.join(__dirname,'bin','claude.exe'),dst);fs.chmodSync(dst,0o755);",
      { mode: 0o644 }
    );
    const ok = runPostinstallFallback(dir, '@anthropic-ai/claude-code');
    assert.equal(ok, true);
    assert.ok(fs.existsSync(path.join(pkgDir, 'bin', 'claude')));
  } finally {
    cleanup(dir);
  }
});
