/**
 * Cross-platform exit utilities
 *
 * Ensures stdout/stderr buffers are flushed before process exit.
 * This is critical for Windows CMD where streams may not flush
 * before process.exit() is called, causing silent failures.
 */

/**
 * Exit the process after ensuring stdout/stderr are flushed.
 * On Windows CMD (non-TTY), process.exit() can terminate before
 * buffered output is written, resulting in no visible output.
 */
export const exitWithFlush = (code: number = 0): void => {
  process.exitCode = code;

  // In TTY mode, streams flush synchronously - exit immediately
  if (process.stdout.isTTY && process.stderr.isTTY) {
    process.exit(code);
    return;
  }

  // For non-TTY (Windows CMD, pipes), force flush via write callback
  process.stderr.write('', () => {
    process.exit(code);
  });

  // Fallback timeout to prevent infinite hang if callback never fires
  setTimeout(() => process.exit(code), 200);
};
