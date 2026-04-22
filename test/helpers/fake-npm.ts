/**
 * Fake NPM Helpers
 *
 * Create a mock npm command for testing variant installation without actually
 * downloading packages. Emits the Claude Code 2.1.113+ native-binary package
 * layout:
 *
 *   node_modules/@anthropic-ai/claude-code/
 *     package.json               # bin -> bin/claude.exe, postinstall -> install.cjs
 *     install.cjs                # copies bin/claude.exe -> bin/claude (+0755)
 *     cli-wrapper.cjs            # minimal stub referenced by some tooling
 *     bin/
 *       claude.exe               # executable shell-script placeholder
 *       claude                   # pre-staged copy; postinstall re-stages it
 */

import fs from 'node:fs';
import path from 'node:path';
import { makeTempDir, writeExecutable, cleanup } from './fs-helpers.js';

const FAKE_CLAUDE_VERSION = '0.0.0-fake';
const FAKE_NPM_PACKAGE = '@anthropic-ai/claude-code';

/**
 * Shell-script placeholder that stands in for the platform-native Claude
 * binary. It honours `CC_MIRROR_FAKE_NPM_PAYLOAD` at runtime so individual
 * tests can customise what "claude" prints.
 */
const buildClaudeExePlaceholder = () =>
  `#!/bin/sh
# Fake Claude Code native binary placeholder produced by cc-mirror test harness.
PAYLOAD="\${CC_MIRROR_FAKE_NPM_PAYLOAD:-claude dummy}"
echo "$PAYLOAD"
`;

/**
 * Minimal postinstall script emitted into the fake package. It mirrors what
 * the real 2.1.113+ installer does: copy the platform-specific binary (here
 * always `bin/claude.exe`) into `bin/claude` with exec bits.
 */
const INSTALL_CJS = `#!/usr/bin/env node
// Stub postinstall for the cc-mirror test harness.
const fs = require('node:fs');
const path = require('node:path');

const pkgRoot = __dirname;
const source = path.join(pkgRoot, 'bin', 'claude.exe');
const target = path.join(pkgRoot, 'bin', 'claude');

if (!fs.existsSync(source)) {
  // Nothing to stage; real installers would throw here.
  process.exit(0);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
fs.chmodSync(target, 0o755);
`;

/**
 * Minimal stub for the Node wrapper shipped alongside the native binary. A
 * couple of third-party tools reference this file; keeping a placeholder
 * available avoids false negatives in tests that stat it.
 */
const CLI_WRAPPER_CJS = `#!/usr/bin/env node
// Fake cli-wrapper.cjs stub emitted by cc-mirror test harness. The real file
// forwards to the native binary; tests should not exec it.
process.exit(0);
`;

/**
 * Write the fake @anthropic-ai/claude-code package into the given prefix,
 * reproducing the native-binary layout on disk.
 */
const stageFakeClaudePackage = (prefix: string) => {
  const pkgRoot = path.join(prefix, 'node_modules', ...FAKE_NPM_PACKAGE.split('/'));
  const binDir = path.join(pkgRoot, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  const pkgJson = {
    name: FAKE_NPM_PACKAGE,
    version: FAKE_CLAUDE_VERSION,
    bin: { claude: 'bin/claude.exe' },
    scripts: { postinstall: 'node install.cjs' },
    optionalDependencies: {
      '@anthropic-ai/claude-code-linux-x64': FAKE_CLAUDE_VERSION,
    },
  };
  fs.writeFileSync(path.join(pkgRoot, 'package.json'), `${JSON.stringify(pkgJson, null, 2)}\n`);

  fs.writeFileSync(path.join(pkgRoot, 'install.cjs'), INSTALL_CJS);
  fs.writeFileSync(path.join(pkgRoot, 'cli-wrapper.cjs'), CLI_WRAPPER_CJS);

  writeExecutable(path.join(binDir, 'claude.exe'), buildClaudeExePlaceholder());
  // Pre-stage bin/claude so consumers that skip postinstall still see a
  // runnable entry point. The real installer does the same via install.cjs.
  writeExecutable(path.join(binDir, 'claude'), buildClaudeExePlaceholder());
};

/**
 * Create a fake npm/pnpm/bun/yarn script that stages the native-binary layout
 * under the requested prefix. Handles the different package-manager argument
 * formats: npm `--prefix`, pnpm `--dir`, bun/yarn `--cwd`.
 */
export const createFakeNpm = (dir: string) => {
  const script = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const FAKE_VERSION = ${JSON.stringify(FAKE_CLAUDE_VERSION)};
const FAKE_PKG = ${JSON.stringify(FAKE_NPM_PACKAGE)};
const CLAUDE_EXE_PLACEHOLDER = ${JSON.stringify(buildClaudeExePlaceholder())};
const INSTALL_CJS = ${JSON.stringify(INSTALL_CJS)};
const CLI_WRAPPER_CJS = ${JSON.stringify(CLI_WRAPPER_CJS)};

const args = process.argv.slice(2);
let prefix = '';
for (let i = 0; i < args.length; i += 1) {
  // Handle all package-manager directory flags.
  if ((args[i] === '--prefix' || args[i] === '--dir' || args[i] === '--cwd') && args[i + 1]) {
    prefix = args[i + 1];
  }
}
if (!prefix) {
  prefix = process.cwd();
}

const pkgSpec = args[args.length - 1] || FAKE_PKG;
const atIndex = pkgSpec.lastIndexOf('@');
const pkgName = atIndex > 0 ? pkgSpec.slice(0, atIndex) : pkgSpec;
const pkgRoot = path.join(prefix, 'node_modules', ...pkgName.split('/'));
const binDir = path.join(pkgRoot, 'bin');
fs.mkdirSync(binDir, { recursive: true });

const pkgJson = {
  name: pkgName,
  version: FAKE_VERSION,
  bin: { claude: 'bin/claude.exe' },
  scripts: { postinstall: 'node install.cjs' },
  optionalDependencies: {
    '@anthropic-ai/claude-code-linux-x64': FAKE_VERSION,
  },
};
fs.writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\\n');
fs.writeFileSync(path.join(pkgRoot, 'install.cjs'), INSTALL_CJS);
fs.writeFileSync(path.join(pkgRoot, 'cli-wrapper.cjs'), CLI_WRAPPER_CJS);

fs.writeFileSync(path.join(binDir, 'claude.exe'), CLAUDE_EXE_PLACEHOLDER, { mode: 0o755 });
fs.chmodSync(path.join(binDir, 'claude.exe'), 0o755);
fs.writeFileSync(path.join(binDir, 'claude'), CLAUDE_EXE_PLACEHOLDER, { mode: 0o755 });
fs.chmodSync(path.join(binDir, 'claude'), 0o755);
`;

  // Create fake scripts for all package managers.
  const packageManagers = ['npm', 'pnpm', 'bun', 'yarn'];
  for (const pm of packageManagers) {
    const pmPath = path.join(dir, pm);
    const pmCmdPath = path.join(dir, `${pm}.cmd`);
    writeExecutable(pmPath, script);
    fs.writeFileSync(pmCmdPath, ['@echo off', `node "%~dp0\\${pm}" %*`, ''].join('\r\n'), 'utf8');
  }

  return path.join(dir, 'npm');
};

/**
 * Execute a function with fake npm in PATH.
 *
 * The fake package manager stages the Claude Code 2.1.113+ native-binary
 * layout (bin/claude.exe + install.cjs + bin/claude) under the requested
 * prefix.
 */
export const withFakeNpm = (fn: () => void) => {
  const binDir = makeTempDir();
  createFakeNpm(binDir);
  const previousPath = process.env.PATH || '';
  process.env.PATH = `${binDir}${path.delimiter}${previousPath}`;
  try {
    fn();
  } finally {
    process.env.PATH = previousPath;
    delete process.env.CC_MIRROR_FAKE_NPM_PAYLOAD;
    cleanup(binDir);
  }
};

// Exposed for direct use when a test wants to stage the package into an
// already-existing prefix without going through the package-manager shim.
export const stageFakeClaudePackageInPrefix = (prefix: string) => stageFakeClaudePackage(prefix);
