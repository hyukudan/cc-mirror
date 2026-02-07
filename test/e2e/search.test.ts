/**
 * E2E Tests - Search Command
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, '../../src/cli/index.ts');

const runSearch = (args: string[] = []): { stdout: string; stderr: string; status: number | null } => {
  const result = spawnSync('npx', ['tsx', cliPath, 'search', ...args], {
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, NODE_ENV: 'test' },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
};

test('E2E: Search command', async (t) => {
  await t.test('lists all providers without filters', () => {
    const { stdout, status } = runSearch([]);
    assert.equal(status, 0, 'Should exit with 0');
    assert.ok(stdout.includes('PROVIDER'), 'Should have table header');
    assert.ok(stdout.includes('zai'), 'Should include zai provider');
    assert.ok(stdout.includes('mirror'), 'Should include mirror provider');
    assert.ok(stdout.includes('openrouter'), 'Should include openrouter provider');
  });

  await t.test('filters by vision capability', () => {
    const { stdout, status } = runSearch(['--capability', 'vision']);
    assert.equal(status, 0, 'Should exit with 0');
    assert.ok(stdout.includes('zai'), 'zai supports vision');
    assert.ok(stdout.includes('mirror'), 'mirror supports vision');
    assert.ok(stdout.includes('openrouter'), 'openrouter supports vision');
    // minimax does not support vision
    assert.ok(!stdout.includes('minimax') || stdout.includes('MiniMax'), 'Check minimax filtered');
  });

  await t.test('filters by tool-use capability', () => {
    const { stdout, status } = runSearch(['--capability', 'tool-use']);
    assert.equal(status, 0, 'Should exit with 0');
    assert.ok(stdout.includes('zai'), 'zai supports tool-use');
    assert.ok(stdout.includes('minimax'), 'minimax supports tool-use');
  });

  await t.test('filters by auth type api-key', () => {
    const { stdout, status } = runSearch(['--auth-type', 'api-key']);
    assert.equal(status, 0, 'Should exit with 0');
    assert.ok(stdout.includes('zai'), 'zai uses api-key');
    assert.ok(stdout.includes('minimax'), 'minimax uses api-key');
    // openrouter uses auth-token, should not appear
    assert.ok(!stdout.split('\n').some((line) => line.startsWith('openrouter')), 'openrouter should be filtered');
  });

  await t.test('filters by auth type auth-token', () => {
    const { stdout, status } = runSearch(['--auth-type', 'auth-token']);
    assert.equal(status, 0, 'Should exit with 0');
    assert.ok(stdout.includes('openrouter'), 'openrouter uses auth-token');
    assert.ok(stdout.includes('gatewayz'), 'gatewayz uses auth-token');
  });

  await t.test('outputs JSON format', () => {
    const { stdout, status } = runSearch(['--json']);
    assert.equal(status, 0, 'Should exit with 0');
    const data = JSON.parse(stdout) as Array<{ key: string; capabilities: string[] }>;
    assert.ok(Array.isArray(data), 'Should return array');
    assert.ok(data.length > 0, 'Should have providers');
    assert.ok(
      data.some((p) => p.key === 'zai'),
      'Should include zai'
    );
    assert.ok(data[0].capabilities, 'Should have capabilities');
  });

  await t.test('rejects invalid capability', () => {
    const { stderr, status } = runSearch(['--capability', 'invalid-cap']);
    assert.equal(status, 1, 'Should exit with 1');
    assert.ok(stderr.includes('Invalid capability'), 'Should show error');
  });

  await t.test('rejects invalid auth type', () => {
    const { stderr, status } = runSearch(['--auth-type', 'invalid-auth']);
    assert.equal(status, 1, 'Should exit with 1');
    assert.ok(stderr.includes('Invalid auth type'), 'Should show error');
  });

  await t.test('filters by tier', () => {
    const { stdout, status } = runSearch(['--tier', 'enterprise']);
    assert.equal(status, 0, 'Should exit with 0');
    assert.ok(stdout.includes('vertex'), 'vertex is enterprise');
    assert.ok(stdout.includes('bedrock'), 'bedrock is enterprise');
  });

  await t.test('filters by verified', () => {
    const { stdout, status } = runSearch(['--verified']);
    assert.equal(status, 0, 'Should exit with 0');
    // All verified providers should appear
    assert.ok(stdout.includes('zai'), 'zai is verified');
    assert.ok(stdout.includes('openrouter'), 'openrouter is verified');
  });

  await t.test('combines capability and auth-type filters', () => {
    const { stdout, status } = runSearch(['--capability', 'vision', '--auth-type', 'api-key']);
    assert.equal(status, 0, 'Should exit with 0');
    assert.ok(stdout.includes('zai'), 'zai has vision + api-key');
    // openrouter has vision but uses auth-token
    assert.ok(!stdout.split('\n').some((line) => line.startsWith('openrouter')), 'openrouter filtered (auth-token)');
  });
});
