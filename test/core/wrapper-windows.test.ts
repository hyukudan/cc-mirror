/**
 * Targeted tests for the Windows CMD wrapper generator.
 *
 * writeWindowsWrapper was uncovered after the native-binary migration removed
 * the CliPatchStep/cli.js-based tests that exercised cross-platform paths.
 * These tests call it directly (platform-independent — the function is pure).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  writeWindowsWrapper,
  writeWrapperForPlatform,
  writeWrapper,
  getWrapperName,
  getWrapperPath,
} from '../../src/core/wrapper.js';
import { makeTempDir, cleanup } from '../helpers/fs-helpers.js';

const isWindows = process.platform === 'win32';

test('writeWindowsWrapper emits a .cmd file with CRLF line endings', () => {
  const dir = makeTempDir();
  try {
    const wrapperPath = path.join(dir, 'wrap.cmd');
    const configDir = path.join(dir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    writeWindowsWrapper(wrapperPath, configDir, 'C:\\path\\to\\claude.exe');

    assert.ok(fs.existsSync(wrapperPath));
    const content = fs.readFileSync(wrapperPath, 'utf8');
    assert.ok(content.startsWith('@echo off'), 'should start with @echo off');
    assert.ok(content.includes('\r\n'), 'should use CRLF line endings');
    assert.ok(content.includes('CLAUDE_CONFIG_DIR'), 'should set CLAUDE_CONFIG_DIR');
    assert.ok(content.includes('TWEAKCC_CONFIG_DIR'), 'should set TWEAKCC_CONFIG_DIR');
  } finally {
    cleanup(dir);
  }
});

test('writeWindowsWrapper writes a companion -env.js helper', () => {
  const dir = makeTempDir();
  try {
    const wrapperPath = path.join(dir, 'wrap.cmd');
    const configDir = path.join(dir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    writeWindowsWrapper(wrapperPath, configDir, 'C:\\claude.exe');

    const helperPath = path.join(dir, 'wrap-env.js');
    assert.ok(fs.existsSync(helperPath), 'helper script should be written beside wrapper');
    const helperContent = fs.readFileSync(helperPath, 'utf8');
    assert.ok(helperContent.includes("require('fs')"), 'helper should be a node script');
    assert.ok(helperContent.includes('CLAUDE_CONFIG_DIR'), 'helper should read CLAUDE_CONFIG_DIR');
  } finally {
    cleanup(dir);
  }
});

test('writeWindowsWrapper execs the binary directly when no translation is requested', () => {
  const dir = makeTempDir();
  try {
    const wrapperPath = path.join(dir, 'wrap.cmd');
    const configDir = path.join(dir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    writeWindowsWrapper(wrapperPath, configDir, 'C:\\claude.exe');

    const content = fs.readFileSync(wrapperPath, 'utf8');
    assert.ok(content.includes('"C:\\claude.exe" %*'), 'should exec native binary with %*');
    // No launcher on a plain native wrapper.
    assert.ok(!content.includes('launcher.ts'), 'should not reference dev launcher');
  } finally {
    cleanup(dir);
  }
});

test('writeWindowsWrapper switches to the translator launcher when requiresTranslation is set', () => {
  const dir = makeTempDir();
  try {
    const wrapperPath = path.join(dir, 'wrap.cmd');
    const configDir = path.join(dir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    writeWindowsWrapper(wrapperPath, configDir, 'C:\\claude.exe', 'native', { requiresTranslation: true });

    const content = fs.readFileSync(wrapperPath, 'utf8');
    // Either npx tsx (dev) or node (bundled) — assert one of the two.
    const hasLauncher = /npx tsx "|node "/.test(content);
    assert.ok(hasLauncher, 'should invoke translator launcher via node or npx tsx');
    assert.ok(
      content.includes(configDir.replace(/\//g, '\\')) || content.includes(configDir),
      'should pass config dir to launcher'
    );
  } finally {
    cleanup(dir);
  }
});

test('writeWindowsWrapper includes team-name and unset-auth-token branches', () => {
  const dir = makeTempDir();
  try {
    const wrapperPath = path.join(dir, 'wrap.cmd');
    const configDir = path.join(dir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    writeWindowsWrapper(wrapperPath, configDir, 'C:\\claude.exe');

    const content = fs.readFileSync(wrapperPath, 'utf8');
    assert.ok(content.includes('CLAUDE_CODE_TEAM_NAME'), 'should derive team name dynamically');
    assert.ok(content.includes('CC_MIRROR_UNSET_AUTH_TOKEN'), 'should handle unset-auth-token option');
    assert.ok(content.includes('CC_MIRROR_PREFER_IPV4'), 'should handle IPv4 preference');
  } finally {
    cleanup(dir);
  }
});

test('writeWindowsWrapper emits a splash block with multiple provider styles', () => {
  const dir = makeTempDir();
  try {
    const wrapperPath = path.join(dir, 'wrap.cmd');
    const configDir = path.join(dir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    writeWindowsWrapper(wrapperPath, configDir, 'C:\\claude.exe');

    const content = fs.readFileSync(wrapperPath, 'utf8');
    assert.ok(content.includes(':splash_zai'), 'should include zai splash label');
    assert.ok(content.includes(':splash_minimax'), 'should include minimax splash label');
    assert.ok(content.includes(':splash_deepseek'), 'should include deepseek splash label');
    assert.ok(content.includes(':splash_default'), 'should include default splash label');
  } finally {
    cleanup(dir);
  }
});

test('writeWrapper respects requiresTranslation option and routes through launcher', () => {
  const dir = makeTempDir();
  try {
    const wrapperPath = path.join(dir, 'wrap.sh');
    const configDir = path.join(dir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    writeWrapper(wrapperPath, configDir, '/opt/claude/bin/claude', 'native', { requiresTranslation: true });

    const content = fs.readFileSync(wrapperPath, 'utf8');
    const execLine = content.split('\n').find((line) => line.startsWith('exec')) ?? '';
    assert.ok(/(npx tsx|__cc_mirror_node_bin)/.test(execLine), 'exec line should use translator launcher');
    assert.ok(execLine.includes('/opt/claude/bin/claude'), 'exec line should still pass the binary path');
    assert.ok(execLine.includes(configDir), 'exec line should include config dir');
  } finally {
    cleanup(dir);
  }
});

test('getWrapperName appends .cmd on Windows and is bare on POSIX', () => {
  const name = getWrapperName('cc-zai');
  if (isWindows) {
    assert.equal(name, 'cc-zai.cmd');
  } else {
    assert.equal(name, 'cc-zai');
  }
});

test('getWrapperPath joins binDir + getWrapperName', () => {
  const p = getWrapperPath('/tmp/bin', 'cc-zai');
  assert.equal(p, path.join('/tmp/bin', getWrapperName('cc-zai')));
});

test('writeWrapperForPlatform dispatches to the correct generator', () => {
  const dir = makeTempDir();
  try {
    const wrapperPath = path.join(dir, 'wrap');
    const configDir = path.join(dir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    const returned = writeWrapperForPlatform(wrapperPath, configDir, '/opt/claude/bin/claude');
    assert.equal(returned, wrapperPath, 'should return the wrapper path');
    assert.ok(fs.existsSync(wrapperPath), 'wrapper file should exist');

    const content = fs.readFileSync(wrapperPath, 'utf8');
    if (isWindows) {
      assert.ok(content.startsWith('@echo off'), 'Windows branch should emit a .cmd script');
    } else {
      assert.ok(content.startsWith('#!/usr/bin/env bash'), 'POSIX branch should emit a bash script');
    }
  } finally {
    cleanup(dir);
  }
});
