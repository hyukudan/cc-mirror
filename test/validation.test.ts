import test from 'node:test';
import assert from 'node:assert/strict';
import { assertValidTeamName, assertValidVariantName, assertValidBaseUrl } from '../src/core/validation.js';

test('validation', async (t) => {
  await t.test('assertValidVariantName accepts valid names', () => {
    assert.equal(assertValidVariantName('my-variant'), 'my-variant');
    assert.equal(assertValidVariantName('variant_1'), 'variant_1');
  });

  await t.test('assertValidVariantName rejects unsafe names', () => {
    const invalid = ['../bad', ' bad', 'bad ', '.', '..', 'bad/name', 'bad\\name', 'bad:name', 'CON'];
    for (const name of invalid) {
      assert.throws(() => assertValidVariantName(name));
    }
  });

  await t.test('assertValidTeamName accepts valid names', () => {
    assert.equal(assertValidTeamName('team-alpha'), 'team-alpha');
    assert.equal(assertValidTeamName('team_1'), 'team_1');
  });

  await t.test('assertValidTeamName rejects unsafe names', () => {
    const invalid = ['../bad', ' bad', 'bad ', '.', '..', 'bad/name', 'bad\\name', 'bad:name', 'LPT1'];
    for (const name of invalid) {
      assert.throws(() => assertValidTeamName(name));
    }
  });

  await t.test('assertValidBaseUrl accepts valid URLs', () => {
    assert.equal(assertValidBaseUrl('https://api.example.com/v1'), 'https://api.example.com/v1');
    assert.equal(assertValidBaseUrl('http://localhost:8080'), 'http://localhost:8080');
    assert.equal(assertValidBaseUrl('https://z.ai/api'), 'https://z.ai/api');
  });

  await t.test('assertValidBaseUrl rejects invalid URLs', () => {
    assert.throws(() => assertValidBaseUrl(''), /required/);
    assert.throws(() => assertValidBaseUrl('not-a-url'), /Invalid base URL/);
    assert.throws(() => assertValidBaseUrl('ftp://example.com'), /protocol/);
    assert.throws(() => assertValidBaseUrl('file:///etc/passwd'), /protocol/);
  });
});
