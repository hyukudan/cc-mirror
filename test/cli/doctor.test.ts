/**
 * CLI Doctor Output Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { printDoctor } from '../../src/cli/doctor.js';

// Capture console.log output
function captureOutput(fn: () => void): string[] {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args.join(' '));
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  return logs;
}

test('printDoctor prints empty message for no variants', () => {
  const output = captureOutput(() => printDoctor([]));
  assert.deepEqual(output, ['No variants found.']);
});

test('printDoctor prints healthy variants with checkmark', () => {
  const report = [
    { name: 'alpha', ok: true, binaryPath: '/tmp/alpha', wrapperPath: '/tmp/bin/alpha' },
    { name: 'beta', ok: true, binaryPath: '/tmp/beta', wrapperPath: '/tmp/bin/beta' },
  ];

  const output = captureOutput(() => printDoctor(report));

  // 2 variants + empty line + summary = 4 lines
  assert.equal(output.length, 4);
  assert.ok(output[0].includes('✓'));
  assert.ok(output[0].includes('alpha'));
  assert.ok(output[1].includes('✓'));
  assert.ok(output[1].includes('beta'));
  assert.ok(output[3].includes('Summary: 2/2 healthy'));
});

test('printDoctor prints unhealthy variants with X and details', () => {
  const report = [{ name: 'broken', ok: false, binaryPath: '/tmp/broken', wrapperPath: '/tmp/bin/broken' }];

  const output = captureOutput(() => printDoctor(report));

  // 1 variant header + 2 details + empty line + summary = 5 lines
  assert.equal(output.length, 5);
  assert.ok(output[0].includes('✗'));
  assert.ok(output[0].includes('broken'));
  assert.ok(output[1].includes('binary:'));
  assert.ok(output[1].includes('/tmp/broken'));
  assert.ok(output[2].includes('wrapper:'));
  assert.ok(output[2].includes('/tmp/bin/broken'));
  assert.ok(output[4].includes('Summary: 0/1 healthy'));
});

test('printDoctor shows missing for undefined binaryPath', () => {
  const report = [{ name: 'missing', ok: false, wrapperPath: '/tmp/bin/missing' }];

  const output = captureOutput(() => printDoctor(report));

  // 1 variant header + 2 details + empty line + summary = 5 lines
  assert.equal(output.length, 5);
  assert.ok(output[1].includes('missing'));
  assert.ok(output[4].includes('Summary: 0/1 healthy'));
});

test('printDoctor handles mixed healthy and unhealthy', () => {
  const report = [
    { name: 'good', ok: true, binaryPath: '/tmp/good', wrapperPath: '/tmp/bin/good' },
    { name: 'bad', ok: false, binaryPath: '/tmp/bad', wrapperPath: '/tmp/bin/bad' },
  ];

  const output = captureOutput(() => printDoctor(report));

  // good: 1 line, bad: 3 lines (status + binary + wrapper) + empty line + summary = 6 lines
  assert.equal(output.length, 6);
  assert.ok(output[0].includes('✓'));
  assert.ok(output[0].includes('good'));
  assert.ok(output[1].includes('✗'));
  assert.ok(output[1].includes('bad'));
  assert.ok(output[5].includes('Summary: 1/2 healthy'));
});
