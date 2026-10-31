import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync('olympic-lifting-tracker.html', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length, 'App must contain JavaScript');
for (const [index, [, attributes, source]] of scripts.entries()) {
  const external = attributes.match(/\bsrc="([^"]+)"/);
  if (external) new Script(readFileSync(external[1].split('?')[0], 'utf8'), { filename: external[1] });
  else new Script(source, { filename: `app-script-${index}.js` });
}
new Script(readFileSync('barbell-log-apps-script.js', 'utf8'), { filename: 'barbell-log-apps-script.js' });
assert.ok(existsSync('icon.png'), 'Home-screen icon must exist');
console.log('App and backend JavaScript syntax checked; home-screen icon present.');

const version = JSON.parse(readFileSync('app-version.json', 'utf8')).version;
assert.ok(html.includes(`data-version="${version}"`) && html.includes(`app-updates.js?v=${version}`), 'Release versions must match');

// Inline controls are executable code too; syntax-check them before release.
for (const match of html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').matchAll(/\bon(?:click|change|input|keydown)="([^"]*)"/g)) {
  const handler=match[1].replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  new Script(`(function(event){${handler}\n})`,{filename:'inline-control'});
}
