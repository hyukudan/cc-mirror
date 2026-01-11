import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from 'ink-testing-library';
import { TextField } from '../../src/tui/components/ui/Input.js';

test('TextField renders error message when provided', () => {
  const { lastFrame } = render(
    <TextField label="Command name" value="" onChange={() => {}} onSubmit={() => {}} error="Invalid variant name." />
  );

  const output = lastFrame() || '';
  assert.ok(output.includes('Invalid variant name.'));
});
