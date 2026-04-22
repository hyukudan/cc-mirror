/**
 * Targeted tests for src/team-pack/index.ts
 *
 * Covers the team-pack helpers that ship with every variant: prompt copy,
 * stale-file cleanup, and the settings.json mutation used when disabling
 * Team Mode. These lost incidental coverage when the cli.js-based legacy
 * TeamMode tests were removed during the native-binary migration.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  copyTeamPackPrompts,
  cleanStaleTeamPackFiles,
  removeTeamToolset,
  STALE_TEAM_PACK_TARGETS,
  TEAM_PACK_FILES,
} from '../../src/team-pack/index.js';
import { makeTempDir, cleanup } from '../helpers/fs-helpers.js';

test('copyTeamPackPrompts creates target dir when absent and copies prompts', () => {
  const dir = makeTempDir();
  try {
    const systemPromptsDir = path.join(dir, 'deep', 'nested', 'system-prompts');
    assert.equal(fs.existsSync(systemPromptsDir), false);

    const copied = copyTeamPackPrompts(systemPromptsDir);

    assert.ok(fs.existsSync(systemPromptsDir), 'should mkdir -p');
    // At least some team-pack files should be shipped and therefore copied.
    assert.ok(copied.length > 0, 'should copy at least one prompt');
    // All copied names should be in the documented target list.
    for (const name of copied) {
      assert.ok(
        TEAM_PACK_FILES.some((f) => f.target === name),
        `copied file ${name} should be declared in TEAM_PACK_FILES`
      );
      assert.ok(fs.existsSync(path.join(systemPromptsDir, name)));
    }
  } finally {
    cleanup(dir);
  }
});

test('cleanStaleTeamPackFiles removes files in STALE_TEAM_PACK_TARGETS only', () => {
  const dir = makeTempDir();
  try {
    const sysDir = path.join(dir, 'system-prompts');
    fs.mkdirSync(sysDir, { recursive: true });

    // Plant one stale target + one unrelated file.
    const [firstStale] = STALE_TEAM_PACK_TARGETS;
    if (!firstStale) {
      // Nothing to clean up — assert behaviour is a no-op and return.
      assert.deepEqual(cleanStaleTeamPackFiles(sysDir), []);
      return;
    }
    fs.writeFileSync(path.join(sysDir, firstStale), 'stale content');
    fs.writeFileSync(path.join(sysDir, 'keep-me.md'), 'fresh content');

    const removed = cleanStaleTeamPackFiles(sysDir);
    assert.deepEqual(removed, [firstStale]);
    assert.equal(fs.existsSync(path.join(sysDir, firstStale)), false);
    assert.equal(fs.existsSync(path.join(sysDir, 'keep-me.md')), true);
  } finally {
    cleanup(dir);
  }
});

test('cleanStaleTeamPackFiles returns [] when no stale files are present', () => {
  const dir = makeTempDir();
  try {
    const sysDir = path.join(dir, 'system-prompts');
    fs.mkdirSync(sysDir, { recursive: true });
    assert.deepEqual(cleanStaleTeamPackFiles(sysDir), []);
  } finally {
    cleanup(dir);
  }
});

test('copyTeamPackPrompts also sweeps stale files during copy', () => {
  const dir = makeTempDir();
  try {
    const sysDir = path.join(dir, 'system-prompts');
    fs.mkdirSync(sysDir, { recursive: true });

    const [firstStale] = STALE_TEAM_PACK_TARGETS;
    if (firstStale) {
      fs.writeFileSync(path.join(sysDir, firstStale), 'stale');
    }

    copyTeamPackPrompts(sysDir);

    if (firstStale) {
      assert.equal(fs.existsSync(path.join(sysDir, firstStale)), false, 'stale file should be swept');
    }
  } finally {
    cleanup(dir);
  }
});

test('removeTeamToolset returns false when settings.json does not exist', () => {
  const dir = makeTempDir();
  try {
    assert.equal(removeTeamToolset(dir), false);
  } finally {
    cleanup(dir);
  }
});

test('removeTeamToolset returns false when TodoWrite is not in deny list', () => {
  const dir = makeTempDir();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ permissions: { deny: ['SomeOtherTool'] } }, null, 2));

    assert.equal(removeTeamToolset(dir), false);
    // Settings should be untouched.
    const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.deepEqual(content.permissions.deny, ['SomeOtherTool']);
  } finally {
    cleanup(dir);
  }
});

test('removeTeamToolset removes TodoWrite and preserves other deny entries', () => {
  const dir = makeTempDir();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          env: { FOO: 'bar' },
          permissions: { allow: ['A'], deny: ['TodoWrite', 'SomeOtherTool'] },
        },
        null,
        2
      )
    );

    assert.equal(removeTeamToolset(dir), true);
    const updated = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.deepEqual(updated.permissions.deny, ['SomeOtherTool']);
    assert.deepEqual(updated.permissions.allow, ['A']);
    assert.equal(updated.env.FOO, 'bar', 'unrelated top-level fields should survive');
  } finally {
    cleanup(dir);
  }
});

test('removeTeamToolset handles empty/absent deny arrays gracefully', () => {
  const dir = makeTempDir();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ permissions: {} }, null, 2));
    assert.equal(removeTeamToolset(dir), false);
  } finally {
    cleanup(dir);
  }
});

test('removeTeamToolset returns false on malformed JSON without throwing', () => {
  const dir = makeTempDir();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    fs.writeFileSync(settingsPath, 'not-json');
    assert.equal(removeTeamToolset(dir), false);
  } finally {
    cleanup(dir);
  }
});
