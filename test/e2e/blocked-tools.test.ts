/**
 * E2E Tests - Blocked Tools Configuration
 *
 * Tests that provider blocked tools are correctly written to
 * settings.json permissions.deny and team mode adds TodoWrite.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as core from '../../src/core/index.js';
import { ZAI_DENY_TOOLS, MINIMAX_DENY_TOOLS } from '../../src/core/claude-config.js';
import { makeTempDir, readFile, cleanup, withFakeNpm } from '../helpers/index.js';

test('E2E: Blocked Tools', async (t) => {
  const createdDirs: string[] = [];

  t.after(() => {
    for (const dir of createdDirs) {
      cleanup(dir);
    }
  });

  await t.test('zai brand has blocked tools configured in settings.json', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      core.createVariant({
        name: 'test-zai-blocked',
        providerKey: 'zai',
        apiKey: 'test-key',
        rootDir,
        binDir,
        enableTeamMode: false,
        promptPack: false,
        skillInstall: false,
        noTweak: true,
        tweakccStdio: 'pipe',
      });

      const variantDir = path.join(rootDir, 'test-zai-blocked');
      const settingsPath = path.join(variantDir, 'config', 'settings.json');

      assert.ok(fs.existsSync(settingsPath), 'settings.json should exist');

      const settings = JSON.parse(readFile(settingsPath));
      const deny: unknown = settings.permissions?.deny;

      assert.ok(Array.isArray(deny), 'permissions.deny should be an array');

      // Verify all expected tools are blocked
      for (const tool of ZAI_DENY_TOOLS) {
        assert.ok((deny as string[]).includes(tool), `settings.permissions.deny should include ${tool}`);
      }
    });
  });

  await t.test('minimax brand has blocked tools configured in settings.json', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      core.createVariant({
        name: 'test-minimax-blocked',
        providerKey: 'minimax',
        apiKey: 'test-key',
        rootDir,
        binDir,
        enableTeamMode: false,
        promptPack: false,
        skillInstall: false,
        noTweak: true,
        tweakccStdio: 'pipe',
      });

      const variantDir = path.join(rootDir, 'test-minimax-blocked');
      const settingsPath = path.join(variantDir, 'config', 'settings.json');

      assert.ok(fs.existsSync(settingsPath), 'settings.json should exist');

      const settings = JSON.parse(readFile(settingsPath));
      const deny: unknown = settings.permissions?.deny;

      assert.ok(Array.isArray(deny), 'permissions.deny should be an array');

      // Verify all expected tools are blocked
      for (const tool of MINIMAX_DENY_TOOLS) {
        assert.ok((deny as string[]).includes(tool), `settings.permissions.deny should include ${tool}`);
      }
    });
  });

  await t.test('team mode adds TodoWrite to settings.json permissions.deny for zai', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      core.createVariant({
        name: 'test-zai-team',
        providerKey: 'zai',
        apiKey: 'test-key',
        rootDir,
        binDir,
        enableTeamMode: true,
        promptPack: false,
        skillInstall: false,
        noTweak: true,
        tweakccStdio: 'pipe',
      });

      const variantDir = path.join(rootDir, 'test-zai-team');
      const settingsPath = path.join(variantDir, 'config', 'settings.json');

      assert.ok(fs.existsSync(settingsPath), 'settings.json should exist');

      const settings = JSON.parse(readFile(settingsPath));
      const deny: unknown = settings.permissions?.deny;

      assert.ok(Array.isArray(deny), 'permissions.deny should be an array');

      // Verify TodoWrite is blocked
      assert.ok((deny as string[]).includes('TodoWrite'), 'settings.permissions.deny should include TodoWrite');

      // Verify zai blocked tools are also present (merged)
      for (const tool of ZAI_DENY_TOOLS) {
        assert.ok(
          (deny as string[]).includes(tool),
          `settings.permissions.deny should include inherited blocked tool ${tool}`
        );
      }
    });
  });

  await t.test('team mode adds TodoWrite to settings.json permissions.deny for minimax', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      core.createVariant({
        name: 'test-minimax-team',
        providerKey: 'minimax',
        apiKey: 'test-key',
        rootDir,
        binDir,
        enableTeamMode: true,
        promptPack: false,
        skillInstall: false,
        noTweak: true,
        tweakccStdio: 'pipe',
      });

      const variantDir = path.join(rootDir, 'test-minimax-team');
      const settingsPath = path.join(variantDir, 'config', 'settings.json');

      assert.ok(fs.existsSync(settingsPath), 'settings.json should exist');

      const settings = JSON.parse(readFile(settingsPath));
      const deny: unknown = settings.permissions?.deny;

      assert.ok(Array.isArray(deny), 'permissions.deny should be an array');

      // Verify TodoWrite is blocked
      assert.ok((deny as string[]).includes('TodoWrite'), 'settings.permissions.deny should include TodoWrite');

      // Verify minimax blocked tools are also present (merged)
      for (const tool of MINIMAX_DENY_TOOLS) {
        assert.ok(
          (deny as string[]).includes(tool),
          `settings.permissions.deny should include inherited blocked tool ${tool}`
        );
      }
    });
  });
});
