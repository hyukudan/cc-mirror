/**
 * SyncItemsScreen Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from 'ink-testing-library';
import { SyncItemsScreen } from '../../src/tui/screens/SyncItemsScreen.js';
import { tick, send, KEYS } from '../helpers/index.js';
import type { SyncItem } from '../../src/core/sync.js';

test('SyncItemsScreen renders available items', async () => {
  const app = render(
    React.createElement(SyncItemsScreen, {
      selectedItems: ['skills', 'mcp-servers', 'permissions', 'claude-md'],
      onConfirm: () => {},
      onBack: () => {},
    })
  );

  await tick();
  const output = app.lastFrame() ?? '';

  assert.ok(output.includes('Sync Items'), 'Should show title');
  assert.ok(output.includes('Skills'), 'Should show Skills');
  assert.ok(output.includes('MCP Servers'), 'Should show MCP Servers');
  assert.ok(output.includes('Permissions'), 'Should show Permissions');
  assert.ok(output.includes('CLAUDE.md'), 'Should show CLAUDE.md');
  assert.ok(output.includes('Tasks'), 'Should show Tasks');
  assert.ok(output.includes('Provider Env'), 'Should show Provider Env');

  app.unmount();
});

test('SyncItemsScreen confirm returns selected items', async () => {
  let selected: SyncItem[] | null = null;

  const app = render(
    React.createElement(SyncItemsScreen, {
      selectedItems: ['skills', 'mcp-servers'],
      onConfirm: (items) => {
        selected = items;
      },
      onBack: () => {},
    })
  );

  await tick();

  // Move to confirm (index 6)
  for (let i = 0; i < 6; i += 1) {
    await send(app.stdin, KEYS.down);
    await tick();
  }
  await send(app.stdin, KEYS.enter);
  await tick();

  if (!selected) {
    throw new Error('Should return selected items');
  }
  const selectedItems = selected as SyncItem[];
  assert.deepEqual(
    selectedItems.slice().sort(),
    ['skills', 'mcp-servers'].slice().sort(),
    'Should preserve selected items'
  );

  app.unmount();
});

test('SyncItemsScreen toggles items with space', async () => {
  let selected: SyncItem[] | null = null;

  const app = render(
    React.createElement(SyncItemsScreen, {
      selectedItems: [],
      onConfirm: (items) => {
        selected = items;
      },
      onBack: () => {},
    })
  );

  await tick();

  // Move to Tasks (index 4) and toggle
  for (let i = 0; i < 4; i += 1) {
    await send(app.stdin, KEYS.down);
    await tick();
  }
  await send(app.stdin, ' ');
  await tick();

  // Move to confirm (index 6)
  for (let i = 0; i < 2; i += 1) {
    await send(app.stdin, KEYS.down);
    await tick();
  }
  await send(app.stdin, KEYS.enter);
  await tick();

  if (!selected) {
    throw new Error('Should return selected items');
  }
  assert.deepEqual(selected, ['tasks'], 'Should include toggled item');

  app.unmount();
});
