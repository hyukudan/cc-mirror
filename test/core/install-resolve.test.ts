import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveClaudeBinaryPath } from '../../src/core/install.js';

test('resolveClaudeBinaryPath returns bin/claude.exe on win32-style', () => {
  const p = resolveClaudeBinaryPath('/tmp/x', '@anthropic-ai/claude-code', 'win32');
  assert.equal(p, '/tmp/x/node_modules/@anthropic-ai/claude-code/bin/claude.exe');
});
test('resolveClaudeBinaryPath returns bin/claude on POSIX', () => {
  const p = resolveClaudeBinaryPath('/tmp/x', '@anthropic-ai/claude-code', 'linux');
  assert.equal(p, '/tmp/x/node_modules/@anthropic-ai/claude-code/bin/claude');
});
test('resolveClaudeBinaryPath uses process.platform by default', () => {
  const p = resolveClaudeBinaryPath('/tmp/x', '@anthropic-ai/claude-code');
  const expected = path.join(
    '/tmp/x/node_modules/@anthropic-ai/claude-code/bin',
    process.platform === 'win32' ? 'claude.exe' : 'claude'
  );
  assert.equal(p, expected);
});
