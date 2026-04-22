/**
 * Barrel-file import smoke tests.
 *
 * These barrel files re-export symbols from their siblings. They had zero
 * coverage because no test ever imported them; a simple import is enough to
 * exercise every line. The goal is to keep these public-API entry points
 * visible to c8 without dragging in command side effects.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

test('variant-builder steps barrel re-exports all step classes', async () => {
  const mod = await import('../src/core/variant-builder/steps/index.js');
  assert.ok(typeof mod.PrepareDirectoriesStep === 'function');
  assert.ok(typeof mod.InstallNpmStep === 'function');
  assert.ok(typeof mod.TeamModeStep === 'function');
  assert.ok(typeof mod.WriteConfigStep === 'function');
  assert.ok(typeof mod.BrandThemeStep === 'function');
  assert.ok(typeof mod.TweakccStep === 'function');
  assert.ok(typeof mod.WrapperStep === 'function');
  assert.ok(typeof mod.ShellEnvStep === 'function');
  assert.ok(typeof mod.SkillInstallStep === 'function');
  assert.ok(typeof mod.FinalizeStep === 'function');
});

test('variant-builder update-steps barrel re-exports all update steps', async () => {
  const mod = await import('../src/core/variant-builder/update-steps/index.js');
  assert.ok(typeof mod.InstallNpmUpdateStep === 'function');
  assert.ok(typeof mod.TeamModeUpdateStep === 'function');
  assert.ok(typeof mod.ModelOverridesStep === 'function');
  assert.ok(typeof mod.TweakccUpdateStep === 'function');
  assert.ok(typeof mod.WrapperUpdateStep === 'function');
  assert.ok(typeof mod.ConfigUpdateStep === 'function');
  assert.ok(typeof mod.ShellEnvUpdateStep === 'function');
  assert.ok(typeof mod.SkillInstallUpdateStep === 'function');
  assert.ok(typeof mod.PluginRepairStep === 'function');
  assert.ok(typeof mod.FinalizeUpdateStep === 'function');
});

test('TUI content barrel re-exports haikus/poems/messages etc.', async () => {
  const mod = await import('../src/tui/content/index.js');
  // Just ensure some expected exports are present; exact surface depends on
  // the bundle. The test is primarily for coverage of the barrel itself.
  assert.ok(Object.keys(mod).length > 0, 'barrel should re-export at least one member');
});

test('core/translator barrel is importable as a public API', async () => {
  const mod = await import('../src/core/translator/index.js');
  assert.ok(typeof mod.startTranslatorProxy === 'function');
});
