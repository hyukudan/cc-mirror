/**
 * Filesystem Test Helpers
 *
 * Common utilities for file system operations in tests.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Create a temporary directory for testing
 */
export const makeTempDir = (prefix = 'cc-mirror-test-') => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

/**
 * Write an executable file
 */
export const writeExecutable = (filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
};

/**
 * Read file contents as UTF-8
 */
export const readFile = (filePath: string) => fs.readFileSync(filePath, 'utf8');

/**
 * Recursively remove a directory
 */
export const cleanup = (dir: string) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

/**
 * Capture console.log output during async function execution
 */
export const captureConsole = async (fn: () => Promise<void>): Promise<string> => {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    output.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
    await fn();
  } finally {
    console.log = originalLog;
  }

  return output.join('\n');
};
