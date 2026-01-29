import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../src/tui/app.js';
import * as providers from '../src/providers/index.js';
import { icons } from '../src/tui/components/ui/theme.js';

delete process.env.Z_AI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;

// Import test helpers
import { tick, send, waitFor, KEYS, makeCore } from './helpers/index.js';

const down = KEYS.down;
const enter = KEYS.enter;

const frameText = (app: { lastFrame: () => string | undefined }) => app.lastFrame() || '';

const waitForText = async (app: { lastFrame: () => string | undefined }, text: string, attempts = 100) => {
  const ok = await waitFor(() => frameText(app).includes(text), attempts);
  assert.ok(ok, `Expected to see "${text}"`);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const waitForAnyText = async (app: { lastFrame: () => string | undefined }, texts: string[], attempts = 100) => {
  const ok = await waitFor(() => texts.some((text) => frameText(app).includes(text)), attempts);
  assert.ok(ok, `Expected to see one of: ${texts.join(', ')}`);
};

const selectMenuItem = async (
  app: { lastFrame: () => string | undefined; stdin: { write: (value: string) => void } },
  label: string,
  maxMoves = 30
) => {
  await waitForText(app, label);
  for (let i = 0; i < maxMoves; i += 1) {
    const selectedLine = frameText(app)
      .split('\n')
      .find((line) => line.includes(icons.pointer));
    if (selectedLine && selectedLine.includes(label)) {
      return;
    }
    await send(app.stdin, down);
  }
  assert.fail(`Expected "${label}" to be selected`);
};

test('TUI create flow applies tweakcc by default', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  // Home -> New Variant
  await tick();
  await tick();
  await waitForText(app, 'Quick Setup', 200);
  await selectMenuItem(app, 'New Variant');
  await send(app.stdin, enter);

  // Select Provider (zai is default)
  await waitForText(app, 'Select Provider', 200);
  await send(app.stdin, enter);

  // Setting up (intro screen)
  await waitForText(app, 'Setting up', 200);
  await send(app.stdin, enter);

  // Choose Theme
  await waitForText(app, 'Choose Theme', 200);
  await send(app.stdin, enter);

  // Variant Name
  await waitForText(app, 'Variant Name', 200);
  await send(app.stdin, enter);

  // Base URL (for zai)
  await waitForText(app, 'Base URL', 200);
  await send(app.stdin, enter);

  // API Key
  await waitForText(app, 'API Key', 200);
  await send(app.stdin, enter);

  // Browser Automation
  await waitForText(app, 'Browser Automation', 200);
  await send(app.stdin, enter);

  // Team Mode
  await waitForText(app, 'Team Mode', 200);
  await send(app.stdin, enter);

  // Shell Environment (zai specific)
  await waitForText(app, 'Shell Environment', 200);
  await send(app.stdin, enter);

  // Custom Environment
  await waitForText(app, 'Custom Environment', 200);
  await send(app.stdin, down); // select No
  await send(app.stdin, enter);

  // Review Configuration
  await waitForText(app, 'Review Configuration', 200);
  await send(app.stdin, enter);

  // Verify create was called with correct params
  const created = await waitFor(() => calls.create.length > 0, 200);
  assert.ok(created, 'createVariant should be called');
  assert.equal(calls.create.length, 1);
  assert.equal(calls.create[0].name, 'zai');
  assert.equal(calls.create[0].providerKey, 'zai');
  assert.equal(calls.create[0].noTweak, false); // tweakcc always applied now

  app.unmount();
});

test('TUI manage -> update flow', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();
  await waitForText(app, 'Quick Setup');
  await selectMenuItem(app, 'Manage Variants');
  await send(app.stdin, enter);
  await waitForText(app, 'Manage Variants');
  await selectMenuItem(app, 'alpha');
  await send(app.stdin, enter); // pick alpha
  await waitForText(app, 'Details');
  await selectMenuItem(app, 'Update');
  await send(app.stdin, enter);
  await waitFor(() => calls.update.length > 0);

  assert.equal(calls.update.length, 1);
  assert.equal(calls.update[0].name, 'alpha');

  app.unmount();
});

test('TUI manage -> remove flow', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();
  await waitForText(app, 'Quick Setup');
  await selectMenuItem(app, 'Manage Variants');
  await send(app.stdin, enter);
  await waitForText(app, 'Manage Variants');
  await selectMenuItem(app, 'alpha');
  await send(app.stdin, enter); // pick alpha
  await waitForText(app, 'Details');
  await selectMenuItem(app, 'Remove');
  await send(app.stdin, enter);
  await send(app.stdin, enter); // confirm remove
  await waitFor(() => calls.remove.length > 0);

  assert.equal(calls.remove.length, 1);
  assert.equal(calls.remove[0].name, 'alpha');

  app.unmount();
});

test('TUI update all flow', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();
  await waitForText(app, 'Quick Setup');
  await selectMenuItem(app, 'Update All');
  await send(app.stdin, enter);
  await tick();

  assert.equal(calls.update.length, 2);
  assert.equal(calls.update[0].name, 'alpha');
  assert.equal(calls.update[1].name, 'beta');

  app.unmount();
});

test('TUI doctor flow', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();
  await waitForText(app, 'Quick Setup');
  await selectMenuItem(app, 'Diagnostics');
  await send(app.stdin, enter);
  await tick();

  const frame = frameText(app);
  assert.ok(frame.includes('alpha'));
  assert.ok(calls.doctor.length >= 1);
  assert.equal(calls.doctor[0].root, '/tmp/root');
  assert.equal(calls.doctor[0].bin, '/tmp/bin');

  app.unmount();
});

// Settings flow test removed - Settings option was removed from TUI
