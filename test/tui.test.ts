import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../src/tui/app.js';
import * as providers from '../src/providers/index.js';

delete process.env.Z_AI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;

// Import test helpers
import { tick, send, waitFor, KEYS, makeCore } from './helpers/index.js';

const down = KEYS.down;
const enter = KEYS.enter;

const waitForText = async (app: { lastFrame: () => string | undefined }, text: string, attempts = 100) => {
  const ok = await waitFor(() => (app.lastFrame() || '').includes(text), attempts);
  assert.ok(ok, `Expected to see "${text}"`);
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

  await tick();
  await waitForText(app, 'Quick Setup');
  await send(app.stdin, down); // home -> create
  await send(app.stdin, enter);
  await waitForText(app, 'Select Provider');
  await send(app.stdin, enter); // provider select -> default (zai)
  await waitForText(app, 'Setting up');
  await send(app.stdin, enter); // intro screen -> continue
  const reachedBrand = await waitFor(() => {
    const frame = app.lastFrame() || '';
    return frame.includes('Choose Theme') || frame.includes('Variant Name');
  });
  assert.ok(reachedBrand);
  const brandFrame = app.lastFrame() || '';
  if (brandFrame.includes('Choose Theme')) {
    await send(app.stdin, enter); // brand preset (auto)
    await waitForText(app, 'Variant Name');
  }
  await send(app.stdin, enter); // name
  const reachedBaseUrl = await waitFor(() => {
    const frame = app.lastFrame() || '';
    return frame.includes('Base URL') || frame.includes('API Key') || frame.includes('Browser Automation');
  });
  assert.ok(reachedBaseUrl);
  const baseUrlFrame = app.lastFrame() || '';
  if (baseUrlFrame.includes('Base URL')) {
    await send(app.stdin, enter); // base url
    await waitForText(app, 'API Key');
  }
  const apiKeyFrame = app.lastFrame() || '';
  if (apiKeyFrame.includes('API Key')) {
    await send(app.stdin, enter); // api key
  }
  await waitForText(app, 'Browser Automation');
  await send(app.stdin, enter); // install dev-browser? default Yes
  await waitForText(app, 'Team Mode');
  await send(app.stdin, enter); // team mode? default Yes
  const reachedShellEnv = await waitFor(() => {
    const frame = app.lastFrame() || '';
    return frame.includes('Shell Environment') || frame.includes('Custom Environment');
  });
  assert.ok(reachedShellEnv);
  const shellFrame = app.lastFrame() || '';
  if (shellFrame.includes('Shell Environment')) {
    await send(app.stdin, enter); // write Z_AI_API_KEY? default Yes
    await waitForText(app, 'Custom Environment');
  }
  await send(app.stdin, down); // add env? select No
  await send(app.stdin, enter);

  await waitForText(app, 'Review Configuration');

  await send(app.stdin, enter); // summary -> create

  const created = await waitFor(() => calls.create.length > 0);
  assert.ok(created);
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
  await send(app.stdin, down); // create
  await send(app.stdin, down); // manage
  await send(app.stdin, enter);
  await waitForText(app, 'Manage Variants');
  await waitForText(app, 'alpha');
  await send(app.stdin, enter); // pick alpha
  await waitForText(app, 'Details');
  await send(app.stdin, enter); // update
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
  await send(app.stdin, down); // create
  await send(app.stdin, down); // manage
  await send(app.stdin, enter);
  await waitForText(app, 'Manage Variants');
  await waitForText(app, 'alpha');
  await send(app.stdin, enter); // pick alpha
  await waitForText(app, 'Details');
  await send(app.stdin, down); // team mode
  await send(app.stdin, down); // tweak
  await send(app.stdin, down); // remove
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
  await send(app.stdin, down); // create
  await send(app.stdin, down); // manage
  await send(app.stdin, down); // sync
  await send(app.stdin, down); // updateAll
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
  await send(app.stdin, down); // create
  await send(app.stdin, down); // manage
  await send(app.stdin, down); // sync
  await send(app.stdin, down); // updateAll
  await send(app.stdin, down); // doctor
  await send(app.stdin, enter);
  await tick();

  const frame = app.lastFrame() || '';
  assert.ok(frame.includes('alpha'));
  assert.ok(calls.doctor.length >= 1);
  assert.equal(calls.doctor[0].root, '/tmp/root');
  assert.equal(calls.doctor[0].bin, '/tmp/bin');

  app.unmount();
});

// Settings flow test removed - Settings option was removed from TUI
