import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('app-updates.js', 'utf8');
async function run({ version = 'new', offline = false, editing = false, accept = true } = {}) {
  const buttons = [];
  const requests = [];
  const navigations = [];
  const events = {};
  const location = { href: 'https://example.com/Barbell-Log/olympic-lifting-tracker.html', replace: url => navigations.push(url) };
  vm.runInNewContext(source, {
    URL, AbortSignal, location, confirm: () => accept,
    document: {
      currentScript: { dataset: { version: 'current' } }, visibilityState: 'visible',
      getElementById: id => id === 'header' ? { appendChild: b => buttons.push(b) } : buttons[0],
      createElement: () => ({ style: {} }), querySelector: () => editing,
      addEventListener: (name, fn) => { events[name] = fn; },
    },
    window: { addEventListener: (name, fn) => { events[name] = fn; } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (offline) throw new Error('offline');
      return { ok: true, json: async () => ({ version }) };
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  return { buttons, requests, navigations, events };
}
test('new release offers an explicit update without interrupting a workout', async () => {
  const result = await run();
  assert.equal(result.buttons.length, 1);
  assert.equal(result.navigations.length, 0);
  assert.equal(result.requests[0].options.cache, 'no-store');
  assert.ok(result.requests[0].url.searchParams.has('check'));
  assert.ok(result.events.visibilitychange && result.events.pageshow);
  result.buttons[0].onclick();
  const target = new URL(result.navigations[0]);
  assert.equal(target.origin, 'https://example.com');
  assert.equal(target.pathname, '/Barbell-Log/olympic-lifting-tracker.html');
  assert.equal(target.searchParams.get('appVersion'), 'new');
});
test('current version and offline checks do not offer a reload', async () => {
  assert.equal((await run({ version: 'current' })).buttons.length, 0);
  assert.equal((await run({ offline: true })).buttons.length, 0);
});
test('unfinished modal edits can cancel the update', async () => {
  const result = await run({ editing: true, accept: false });
  result.buttons[0].onclick();
  assert.equal(result.navigations.length, 0);
});
