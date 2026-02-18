/**
 * E2E Tests - Team Mode Feature
 *
 * Tests team mode enable/disable functionality:
 * - cli.js patching
 * - bundled skill installation
 * - variant.json metadata
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as core from '../../src/core/index.js';
import { TEAM_PACK_FILES, STALE_TEAM_PACK_TARGETS } from '../../src/team-pack/index.js';
import { makeTempDir, readFile, cleanup, withFakeNpm } from '../helpers/index.js';

const TEAM_MODE_ENABLED = 'function sU(){return!0}';
const TEAM_MODE_DISABLED = 'function sU(){return!1}';

test('E2E: Team Mode', async (t) => {
  const createdDirs: string[] = [];

  t.after(() => {
    for (const dir of createdDirs) {
      cleanup(dir);
    }
  });

  await t.test('enables team mode and patches cli.js', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      const result = core.createVariant({
        name: 'test-team-enabled',
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

      // Verify variant was created
      const variantDir = path.join(rootDir, 'test-team-enabled');
      assert.ok(fs.existsSync(variantDir), 'variant dir should exist');

      // Verify cli.js was patched
      const cliPath = path.join(variantDir, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
      const cliContent = readFile(cliPath);
      assert.ok(cliContent.includes(TEAM_MODE_ENABLED), 'cli.js should have team mode enabled');
      assert.ok(!cliContent.includes(TEAM_MODE_DISABLED), 'cli.js should not have team mode disabled');

      // Verify bundled skills installed
      const orchestratorPath = path.join(variantDir, 'config', 'skills', 'orchestration');
      const taskManagerPath = path.join(variantDir, 'config', 'skills', 'task-manager');
      assert.ok(fs.existsSync(orchestratorPath), 'orchestrator skill directory should exist');
      assert.ok(fs.existsSync(path.join(orchestratorPath, 'SKILL.md')), 'orchestrator SKILL.md should exist');
      assert.ok(fs.existsSync(taskManagerPath), 'task-manager skill directory should exist');
      assert.ok(fs.existsSync(path.join(taskManagerPath, 'SKILL.md')), 'task-manager SKILL.md should exist');

      // Verify marker file
      const orchestratorMarker = path.join(orchestratorPath, '.cc-mirror-managed');
      const taskManagerMarker = path.join(taskManagerPath, '.cc-mirror-managed');
      assert.ok(fs.existsSync(orchestratorMarker), 'orchestrator managed marker should exist');
      assert.ok(fs.existsSync(taskManagerMarker), 'task-manager managed marker should exist');

      // Verify variant.json has teamModeEnabled
      const metaPath = path.join(variantDir, 'variant.json');
      const meta = JSON.parse(readFile(metaPath));
      assert.equal(meta.teamModeEnabled, true, 'variant.json should have teamModeEnabled: true');

      // Verify result notes mention team mode
      assert.ok(
        result.notes?.some((note) => note.includes('Team mode')),
        'notes should mention team mode'
      );
    });
  });

  await t.test('skips team mode when not enabled', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      core.createVariant({
        name: 'test-team-disabled',
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

      const variantDir = path.join(rootDir, 'test-team-disabled');

      // Verify cli.js was NOT patched
      const cliPath = path.join(variantDir, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
      const cliContent = readFile(cliPath);
      assert.ok(cliContent.includes(TEAM_MODE_DISABLED), 'cli.js should have team mode disabled');
      assert.ok(!cliContent.includes(TEAM_MODE_ENABLED), 'cli.js should not have team mode enabled');

      // Verify bundled skills NOT installed
      const orchestratorPath = path.join(variantDir, 'config', 'skills', 'orchestration');
      const taskManagerPath = path.join(variantDir, 'config', 'skills', 'task-manager');
      assert.ok(!fs.existsSync(orchestratorPath), 'orchestrator skill should not be installed');
      assert.ok(!fs.existsSync(taskManagerPath), 'task-manager skill should not be installed');

      // Verify variant.json does not have teamModeEnabled
      const metaPath = path.join(variantDir, 'variant.json');
      const meta = JSON.parse(readFile(metaPath));
      assert.ok(!meta.teamModeEnabled, 'variant.json should not have teamModeEnabled: true');
    });
  });

  await t.test('mirror provider auto-enables team mode', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      core.createVariant({
        name: 'test-mirror',
        providerKey: 'mirror',
        rootDir,
        binDir,
        promptPack: false,
        skillInstall: false,
        noTweak: true,
        tweakccStdio: 'pipe',
      });

      const variantDir = path.join(rootDir, 'test-mirror');

      // Mirror provider should auto-enable team mode
      const cliPath = path.join(variantDir, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
      const cliContent = readFile(cliPath);
      assert.ok(cliContent.includes(TEAM_MODE_ENABLED), 'mirror should auto-enable team mode');

      // Verify bundled skills installed
      const orchestratorPath = path.join(variantDir, 'config', 'skills', 'orchestration');
      const taskManagerPath = path.join(variantDir, 'config', 'skills', 'task-manager');
      assert.ok(fs.existsSync(orchestratorPath), 'orchestrator skill should be auto-installed for mirror');
      assert.ok(fs.existsSync(taskManagerPath), 'task-manager skill should be auto-installed for mirror');
    });
  });

  await t.test('team mode can be toggled via update', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      // Create without team mode
      core.createVariant({
        name: 'test-toggle',
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

      const variantDir = path.join(rootDir, 'test-toggle');
      const cliPath = path.join(variantDir, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');

      // Verify initially disabled
      let cliContent = readFile(cliPath);
      assert.ok(cliContent.includes(TEAM_MODE_DISABLED), 'should start with team mode disabled');

      // Enable via update (noTweak to avoid tweakcc async issues with fake npm)
      core.updateVariant(rootDir, 'test-toggle', {
        binDir,
        enableTeamMode: true,
        noTweak: true,
      });

      // Verify now enabled
      cliContent = readFile(cliPath);
      assert.ok(cliContent.includes(TEAM_MODE_ENABLED), 'should have team mode enabled after update');

      // Verify bundled skills installed
      const orchestratorPath = path.join(variantDir, 'config', 'skills', 'orchestration');
      const taskManagerPath = path.join(variantDir, 'config', 'skills', 'task-manager');
      assert.ok(fs.existsSync(orchestratorPath), 'orchestrator skill should be installed after enabling');
      assert.ok(fs.existsSync(taskManagerPath), 'task-manager skill should be installed after enabling');

      // Disable via update (noTweak to avoid tweakcc async issues with fake npm)
      core.updateVariant(rootDir, 'test-toggle', {
        binDir,
        disableTeamMode: true,
        noTweak: true,
      });

      // Verify disabled again
      cliContent = readFile(cliPath);
      assert.ok(cliContent.includes(TEAM_MODE_DISABLED), 'should have team mode disabled after update');

      // Verify bundled skills removed
      assert.ok(!fs.existsSync(orchestratorPath), 'orchestrator skill should be removed after disabling');
      assert.ok(!fs.existsSync(taskManagerPath), 'task-manager skill should be removed after disabling');
    });
  });

  await t.test('team pack prompts are installed when team mode enabled', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      core.createVariant({
        name: 'test-team-pack',
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

      const variantDir = path.join(rootDir, 'test-team-pack');
      const systemPromptsDir = path.join(variantDir, 'tweakcc', 'system-prompts');

      // Verify all team pack prompt files are installed
      for (const file of TEAM_PACK_FILES) {
        const targetPath = path.join(systemPromptsDir, file.target);
        assert.ok(fs.existsSync(targetPath), `team pack file ${file.target} should exist`);

        // Verify content is not empty
        const content = fs.readFileSync(targetPath, 'utf8');
        assert.ok(content.length > 0, `team pack file ${file.target} should have content`);
      }
    });
  });

  await t.test('team pack cleans up stale files from previous versions', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      // Create variant with team mode
      core.createVariant({
        name: 'test-stale-cleanup',
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

      const variantDir = path.join(rootDir, 'test-stale-cleanup');
      const systemPromptsDir = path.join(variantDir, 'tweakcc', 'system-prompts');

      // Simulate stale files left from a previous version
      for (const staleFile of STALE_TEAM_PACK_TARGETS) {
        fs.writeFileSync(path.join(systemPromptsDir, staleFile), 'stale content');
      }

      // Re-run update which should clean up stale files
      core.updateVariant(rootDir, 'test-stale-cleanup', { noTweak: true, settingsOnly: true });

      // Verify stale files are gone
      for (const staleFile of STALE_TEAM_PACK_TARGETS) {
        const targetPath = path.join(systemPromptsDir, staleFile);
        assert.ok(!fs.existsSync(targetPath), `stale file ${staleFile} should be removed after update`);
      }

      // Verify current files are still there
      for (const file of TEAM_PACK_FILES) {
        const targetPath = path.join(systemPromptsDir, file.target);
        assert.ok(fs.existsSync(targetPath), `current file ${file.target} should still exist`);
      }
    });
  });

  await t.test('team mode blocks TodoWrite via permissions.deny', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      core.createVariant({
        name: 'test-team-toolset',
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

      const variantDir = path.join(rootDir, 'test-team-toolset');
      const settingsPath = path.join(variantDir, 'config', 'settings.json');

      // Verify settings.json exists
      assert.ok(fs.existsSync(settingsPath), 'settings.json should exist');

      // Parse and verify permissions deny configuration
      const settings = JSON.parse(readFile(settingsPath));

      // Check that permissions.deny includes TodoWrite
      assert.ok(Array.isArray(settings.permissions?.deny), 'permissions.deny should be an array');
      assert.ok(settings.permissions.deny.includes('TodoWrite'), 'TodoWrite should be in permissions.deny');

      // Verify tweakcc config does NOT have toolsets (crash-prone)
      const tweakccConfigPath = path.join(variantDir, 'tweakcc', 'config.json');
      assert.ok(fs.existsSync(tweakccConfigPath), 'tweakcc config should exist');
      const tweakccConfig = JSON.parse(readFile(tweakccConfigPath));
      assert.equal(tweakccConfig.settings?.toolsets, undefined, 'tweakcc config should not have toolsets');
    });
  });

  await t.test('team pack prompts are NOT installed when team mode disabled', () => {
    withFakeNpm(() => {
      const rootDir = makeTempDir();
      const binDir = makeTempDir();
      createdDirs.push(rootDir, binDir);

      core.createVariant({
        name: 'test-no-team-pack',
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

      const variantDir = path.join(rootDir, 'test-no-team-pack');
      const systemPromptsDir = path.join(variantDir, 'tweakcc', 'system-prompts');

      // Verify team pack prompt files are NOT installed
      for (const file of TEAM_PACK_FILES) {
        const targetPath = path.join(systemPromptsDir, file.target);
        assert.ok(!fs.existsSync(targetPath), `team pack file ${file.target} should NOT exist when team mode disabled`);
      }
    });
  });
});
