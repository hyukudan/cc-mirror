import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveClaudeBinaryPath } from '../../src/core/install.js';

test('resolveClaudeBinaryPath always returns bin/claude.exe', () => {
  const p = resolveClaudeBinaryPath('/tmp/x', '@anthropic-ai/claude-code');
  assert.equal(p, '/tmp/x/node_modules/@anthropic-ai/claude-code/bin/claude.exe');
});

test('resolveClaudeBinaryPath handles non-scoped packages', () => {
  const p = resolveClaudeBinaryPath('/tmp/x', 'claude-code');
  assert.equal(p, '/tmp/x/node_modules/claude-code/bin/claude.exe');
});
