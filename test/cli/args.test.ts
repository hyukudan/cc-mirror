/**
 * CLI Arguments Parser Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../../src/cli/args.js';

test('parseArgs parses positional arguments', () => {
  const result = parseArgs(['create', 'test-variant']);
  assert.deepEqual(result._, ['create', 'test-variant']);
});

test('parseArgs handles --yes flag', () => {
  const result = parseArgs(['create', '--yes']);
  assert.equal(result.yes, true);
});

test('parseArgs handles --help flag', () => {
  const result = parseArgs(['--help']);
  assert.equal(result.help, true);
});

test('parseArgs handles -h flag', () => {
  const result = parseArgs(['-h']);
  assert.equal(result.help, true);
  assert.equal(result.h, true);
});

test('parseArgs handles --version flag', () => {
  const result = parseArgs(['--version']);
  assert.equal(result.version, true);
});

test('parseArgs handles -v flag', () => {
  const result = parseArgs(['-v']);
  assert.equal(result.version, true);
});

test('parseArgs handles --no-tweak flag', () => {
  const result = parseArgs(['create', '--no-tweak']);
  assert.equal(result.noTweak, true);
});

test('parseArgs handles --tui flag', () => {
  const result = parseArgs(['--tui']);
  assert.equal(result.tui, true);
});

test('parseArgs handles --no-tui flag', () => {
  const result = parseArgs(['--no-tui']);
  assert.equal(result.noTui, true);
});

test('parseArgs handles --quick flag', () => {
  const result = parseArgs(['--quick']);
  assert.equal(result.quick, true);
});

test('parseArgs handles --simple as alias for --quick', () => {
  const result = parseArgs(['--simple']);
  assert.equal(result.quick, true);
});

test('parseArgs handles --enable-team-mode flag', () => {
  const result = parseArgs(['--enable-team-mode']);
  assert.equal(result['enable-team-mode'], true);
});

test('parseArgs handles --env=VALUE syntax', () => {
  const result = parseArgs(['--env=FOO=bar', '--env=BAZ=qux']);
  assert.deepEqual(result.env, ['FOO=bar', 'BAZ=qux']);
});

test('parseArgs handles --env VALUE syntax', () => {
  const result = parseArgs(['--env', 'FOO=bar']);
  assert.deepEqual(result.env, ['FOO=bar']);
});

test('parseArgs handles key=value arguments', () => {
  const result = parseArgs(['--provider=zai', '--api-key=test-key']);
  assert.equal(result.provider, 'zai');
  assert.equal(result['api-key'], 'test-key');
});

test('parseArgs handles key value arguments', () => {
  const result = parseArgs(['--provider', 'minimax', '--name', 'my-variant']);
  assert.equal(result.provider, 'minimax');
  assert.equal(result.name, 'my-variant');
});

test('parseArgs handles boolean flags with trailing value', () => {
  // Parser treats consecutive flags as key-value pairs when no = is used
  // This tests that the parser correctly handles the case where a flag
  // consumes the next argument as its value
  const result = parseArgs(['--no-prompt-pack=true', '--no-skill-install=true']);
  assert.equal(result['no-prompt-pack'], 'true');
  assert.equal(result['no-skill-install'], 'true');
});

test('parseArgs handles mixed arguments', () => {
  const result = parseArgs([
    'create',
    '--provider=zai',
    '--yes',
    '--name',
    'test-variant',
    '--env=KEY=value',
    '--no-tweak',
  ]);

  assert.deepEqual(result._, ['create']);
  assert.equal(result.provider, 'zai');
  assert.equal(result.yes, true);
  assert.equal(result.name, 'test-variant');
  assert.deepEqual(result.env, ['KEY=value']);
  assert.equal(result.noTweak, true);
});

test('parseArgs handles model override arguments', () => {
  const result = parseArgs([
    '--model-sonnet=claude-sonnet-4-6',
    '--model-opus=claude-opus-4-6',
    '--model-haiku=claude-haiku-4-5-20251001',
  ]);

  assert.equal(result['model-sonnet'], 'claude-sonnet-4-6');
  assert.equal(result['model-opus'], 'claude-opus-4-6');
  assert.equal(result['model-haiku'], 'claude-haiku-4-5-20251001');
});

test('parseArgs ignores non-flag arguments starting with single dash', () => {
  // Single dash is not a valid flag format, it's skipped
  const result = parseArgs(['-provider', 'zai']);
  assert.deepEqual(result._, ['zai']);
  assert.equal(result.provider, undefined);
});

test('parseArgs treats -- as the end of flags', () => {
  const result = parseArgs(['my-variant', '--', '--version', '--foo=bar']);
  assert.deepEqual(result._, ['my-variant', '--version', '--foo=bar']);
  assert.equal(result.foo, undefined);
});

test('parseArgs handles empty array', () => {
  const result = parseArgs([]);
  assert.deepEqual(result._, []);
  assert.deepEqual(result.env, []);
});

test('parseArgs handles --prefix with value', () => {
  const result = parseArgs(['create', '--prefix', 'team1']);
  assert.equal(result.prefix, 'team1');
});

test('parseArgs handles --prefix=value syntax', () => {
  const result = parseArgs(['create', '--prefix=dev']);
  assert.equal(result.prefix, 'dev');
});

test('parseArgs handles --allow-collision flag', () => {
  const result = parseArgs(['create', '--allow-collision']);
  assert.equal(result['allow-collision'], true);
});

test('parseArgs handles --prefix and --allow-collision together', () => {
  const result = parseArgs(['create', '--prefix', 'my', '--allow-collision', '--provider', 'zai']);
  assert.equal(result.prefix, 'my');
  assert.equal(result['allow-collision'], true);
  assert.equal(result.provider, 'zai');
});
