import test from 'node:test';
import assert from 'node:assert/strict';
import { assertValidTeamName, assertValidVariantName } from '../src/core/validation.js';

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
});
