/**
 * Collision detection tests for src/core/paths.ts
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { detectCommandCollision } from '../../src/core/paths.js';

describe('detectCommandCollision', () => {
  test('reports no collision for unique name', () => {
    const result = detectCommandCollision('cc-mirror-test-nonexistent-xyz', '/tmp/nonexistent-bin');
    assert.equal(result.hasCollision, false);
    assert.equal(result.existingWrapper, false);
    assert.equal(result.pathConflict, false);
  });

  test('reports PATH conflict for system commands when binDir is on PATH', () => {
    const originalPath = process.env.PATH;
    try {
      const binDir = '/tmp/cc-mirror-test-collision';
      process.env.PATH = `${binDir}:${originalPath}`;
      const result = detectCommandCollision('ls', binDir);
      assert.equal(result.pathConflict, true);
      assert.equal(result.hasCollision, true);
    } finally {
      if (originalPath !== undefined) {
        process.env.PATH = originalPath;
      } else {
        delete process.env.PATH;
      }
    }
  });

  test('reports no PATH conflict when binDir is not on PATH', () => {
    const originalPath = process.env.PATH;
    try {
      // Use a binDir that is NOT on PATH
      const binDir = '/tmp/cc-mirror-test-not-on-path';
      // Ensure binDir is not already on PATH by filtering it out
      const filteredPath = (originalPath || '')
        .split(':')
        .filter((d) => d !== binDir)
        .join(':');
      process.env.PATH = filteredPath;
      const result = detectCommandCollision('ls', binDir);
      assert.equal(result.pathConflict, false);
      assert.equal(result.binDirOnPath, false);
    } finally {
      if (originalPath !== undefined) {
        process.env.PATH = originalPath;
      } else {
        delete process.env.PATH;
      }
    }
  });

  test('reports binDirOnPath correctly', () => {
    const originalPath = process.env.PATH;
    try {
      const binDir = '/tmp/cc-mirror-test-onpath';
      process.env.PATH = `${binDir}:${originalPath}`;
      const result = detectCommandCollision('cc-mirror-test-nonexistent-xyz', binDir);
      assert.equal(result.binDirOnPath, true);
      // No collision since the command does not exist
      assert.equal(result.hasCollision, false);
    } finally {
      if (originalPath !== undefined) {
        process.env.PATH = originalPath;
      } else {
        delete process.env.PATH;
      }
    }
  });

  test('reports existingWrapper when file exists at wrapper path', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const tmpDir = fs.mkdtempSync(path.join(os.default.tmpdir(), 'cc-mirror-test-'));
    try {
      // Create a fake wrapper file
      const wrapperPath = path.join(tmpDir, 'test-wrapper');
      fs.writeFileSync(wrapperPath, '#!/bin/sh\n', { mode: 0o755 });

      const result = detectCommandCollision('test-wrapper', tmpDir);
      assert.equal(result.existingWrapper, true);
      assert.equal(result.hasCollision, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
