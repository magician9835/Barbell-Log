import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync('olympic-lifting-tracker.html', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length, 'App must contain JavaScript');
for (const [index, [, attributes, source]] of scripts.entries()) {
  if (!/\bsrc\s*=/.test(attributes)) new Script(source, { filename: `app-script-${index}.js` });
}
new Script(readFileSync('barbell-log-apps-script.js', 'utf8'), { filename: 'barbell-log-apps-script.js' });
assert.ok(existsSync('icon.png'), 'Home-screen icon must exist');
console.log('App and backend JavaScript syntax checked; home-screen icon present.');
