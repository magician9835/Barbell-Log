import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('olympic-lifting-tracker.html', 'utf8');
const renderSource = html.slice(html.indexOf('function renderLog(){'), html.indexOf('\nfunction formatDate(d)'));
function render(entry, meets) {
  const container = { innerHTML: '' };
  const context = vm.createContext({
    document: { getElementById: () => container }, activeFilter: 'all',
    getCachedEntries: () => [entry], getMeets: () => meets,
    buildLiftName: e => e.base, formatDate: d => d,
    dispW: w => w, unitLabel: () => 'kg',
  });
  const labelSource=html.match(/function sessionLabel\(session\)\{[\s\S]*?\n\}/)[0];
  const identitySource=html.match(/function liftIdentity\(e\)\{[^\n]+/)[0];
  const escapeSource=html.match(/function escapeText\(value\)\{[^\n]+/)[0];
  vm.runInContext(identitySource+'\n'+escapeSource+'\n'+labelSource + '\n' + renderSource + '\nrenderLog();', context);
  return container.innerHTML;
}
const entry = { id: 'fixture', date: '2026-10-25', base: 'Clean and Jerk',
  session: 'Coached Class', weight: 80, position: [], technique: [], receiving: '' };
const meets = [{ date: '2025-11-29' }, { date: '2026-10-04' }];

test('class clean and jerk from screenshot has no competition badge', () => {
  assert.doesNotMatch(render(entry, meets), /COMP LIFT/);
  assert.match(render(entry, meets), />Class</);
});
test('competition badge requires an actual meet date and Competition session', () => {
  assert.match(render({ ...entry, date: '2026-10-04', session: 'Competition' }, meets), /COMP LIFT/);
  assert.doesNotMatch(render({ ...entry, session: 'Competition' }, meets), /COMP LIFT/);
  for (const session of ['Coached Class', 'Solo', '1:1 Session']) {
    assert.doesNotMatch(render({ ...entry, date: '2026-10-04', session }, meets), /COMP LIFT/);
  }
});
test('snatch and modifiers retain competition-form restrictions', () => {
  const snatch = { ...entry, base: 'Snatch', date: '2025-11-29', session: 'Competition', position: ['Floor'] };
  assert.match(render(snatch, meets), /COMP LIFT/);
  assert.doesNotMatch(render({ ...snatch, position: ['Hang Above Knee'] }, meets), /COMP LIFT/);
  assert.doesNotMatch(render({ ...snatch, technique: ['Pause'] }, meets), /COMP LIFT/);
  assert.doesNotMatch(render({ ...snatch, base: 'Squat' }, meets), /COMP LIFT/);
});
