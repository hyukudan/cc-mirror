/**
 * E2E Tests - Dashboard Command
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../src/core/index.js';
import { runDashboard } from '../../src/cli/commands/dashboard.js';
import { makeTempDir, cleanup, withFakeNpm, captureConsole } from '../helpers/index.js';

test('E2E: Dashboard command', async (t) => {
  const createdDirs: string[] = [];

  t.after(() => {
    for (const dir of createdDirs) {
      cleanup(dir);
    }
  });

  await t.test('dashboard renders without errors when no variants exist', async () => {
    const rootDir = makeTempDir();
    const binDir = makeTempDir();
    createdDirs.push(rootDir, binDir);

    const output = await captureConsole(async () => {
      await runDashboard({ rootDir, binDir });
    });

    assert.ok(output.includes('CC-Mirror Dashboard'), 'Should include dashboard title');
    assert.ok(output.includes('No variants found'), 'Should indicate no variants');
  });

  await t.test('dashboard shows variants with correct info', async () => {
    await withFakeNpm(async () => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      // Create a variant
      core.createVariant({
        name: 'dashboard-test',
        providerKey: 'zai',
        apiKey: 'test-key',
        rootDir,
        binDir,
        brand: 'zai',
        promptPack: false,
        skillInstall: false,
        noTweak: true,
        tweakccStdio: 'pipe',
      });

      const output = await captureConsole(async () => {
        await runDashboard({ rootDir, binDir });
      });

      assert.ok(output.includes('CC-Mirror Dashboard'), 'Should include dashboard title');
      assert.ok(output.includes('Variants (1)'), 'Should show variant count');
      assert.ok(output.includes('dashboard-test'), 'Should show variant name');
      assert.ok(output.includes('Ready') || output.includes('✓'), 'Should show ready status');
    });
  });

  await t.test('dashboard shows team mode info', async () => {
    await withFakeNpm(async () => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      // Create a variant with team mode
      core.createVariant({
        name: 'team-dashboard',
        providerKey: 'zai',
        apiKey: 'test-key',
        rootDir,
        binDir,
        brand: 'zai',
        promptPack: false,
        skillInstall: false,
        noTweak: true,
        tweakccStdio: 'pipe',
        enableTeamMode: true,
      });

      const output = await captureConsole(async () => {
        await runDashboard({ rootDir, binDir });
      });

      assert.ok(output.includes('Team Mode: 1 active variant'), 'Should show team mode active');
    });
  });

  await t.test('dashboard outputs JSON when --json flag is used', async () => {
    await withFakeNpm(async () => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      // Create a variant
      core.createVariant({
        name: 'json-test',
        providerKey: 'zai',
        apiKey: 'test-key',
        rootDir,
        binDir,
        brand: 'zai',
        promptPack: false,
        skillInstall: false,
        noTweak: true,
        tweakccStdio: 'pipe',
      });

      const output = await captureConsole(async () => {
        await runDashboard({ rootDir, binDir, json: true });
      });

      // Parse JSON output
      const data = JSON.parse(output);
      assert.ok(Array.isArray(data.variants), 'Should have variants array');
      assert.equal(data.variants.length, 1, 'Should have one variant');
      assert.equal(data.variants[0].name, 'json-test', 'Should have correct variant name');
      assert.ok(typeof data.totalDisk === 'string', 'Should have totalDisk string');
    });
  });

  await t.test('dashboard shows disk usage', async () => {
    await withFakeNpm(async () => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      // Create a variant
      core.createVariant({
        name: 'disk-test',
        providerKey: 'minimax',
        apiKey: 'test-key',
        rootDir,
        binDir,
        brand: 'minimax',
        promptPack: false,
        skillInstall: false,
        noTweak: true,
        tweakccStdio: 'pipe',
      });

      const output = await captureConsole(async () => {
        await runDashboard({ rootDir, binDir });
      });

      assert.ok(output.includes('Disk:'), 'Should show disk usage');
      // Check for size format (e.g., "150.0 MB" or similar)
      assert.match(output, /\d+(\.\d+)?\s*(B|KB|MB|GB|TB)/, 'Should show formatted size');
    });
  });
});
