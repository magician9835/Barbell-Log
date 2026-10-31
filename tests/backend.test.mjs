import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the Apps Script functions without accessing the live spreadsheet.
function backend() {
  const context = vm.createContext({
    Session: { getScriptTimeZone: () => 'Etc/UTC' },
    Utilities: { formatDate: date => date.toISOString().slice(0, 10) },
  });
  vm.runInContext(readFileSync('barbell-log-apps-script.js', 'utf8'), context);
  return context;
}

function sheet(rows) {
  return {
    rows,
    getLastRow() { return rows.length; },
    getLastColumn() { return rows[0].length; },
    appendRow(row) { rows.push([...row]); },
    deleteRow(row) { rows.splice(row - 1, 1); },
    getRange(row, col, height = 1, width = 1) {
      return {
        getValues: () => Array.from({ length: height }, (_, r) =>
          Array.from({ length: width }, (_, c) => rows[row - 1 + r]?.[col - 1 + c] ?? '')),
        setValues(values) {
          values.forEach((value, r) => value.forEach((cell, c) => {
            rows[row - 1 + r] ??= [];
            rows[row - 1 + r][col - 1 + c] = cell;
          }));
        },
      };
    },
  };
}

const lift = {
  id: 'test-entry', date: '2026-10-30', session: 'Solo', base: 'Snatch',
  position: ['Hang Above Knee'], receiving: 'Power', grip: [],
  technique: ['Pause'], weight: 50, sets: 3, reps: 2, quality: 4,
  notes: 'Test fixture, never sent to Google',
};
const plain = value => JSON.parse(JSON.stringify(value));

test('log entry survives append, retry, read, edit and delete by ID', () => {
  const api = backend();
  const headers = plain(vm.runInContext('HEADERS.LOG', api));
  const log = sheet([headers]);
  const ss = { getSheetByName: name => name === 'Log' ? log : null };
  api.appendLogEntry(ss, lift);
  api.appendLogEntry(ss, lift);
  assert.equal(log.rows.length, 2, 'Retry of the same ID must not duplicate a lift');
  assert.deepEqual(plain(api.getAllLogEntries(ss)), [lift]);
  api.updateEntry(ss, { ...lift, weight: 55 });
  assert.equal(api.getAllLogEntries(ss)[0].weight, 55);
  assert.equal(log.rows.length, 2);
  api.deleteEntry(ss, lift.id);
  assert.deepEqual(plain(api.getAllLogEntries(ss)), []);
});

test('legacy log without Grip reads modifiers and weight correctly', () => {
  const api = backend();
  const headers = plain(vm.runInContext('HEADERS.LOG', api)).filter(h => h !== 'Grip');
  const row = plain(api.entryToRow(lift));
  row.splice(5, 1);
  const log = sheet([headers, row]);
  assert.deepEqual(plain(api.getAllLogEntries({ getSheetByName: () => log })), [lift]);
});

test('meet history preserves made and missed attempts and derives total', () => {
  const api = backend();
  const meet = { id: 'meet-test', name: 'Test Meet', date: '2026-10-30',
    location: 'Test', bw: 80, notes: '',
    snatch: [{weight:50,made:true},{weight:53,made:false},{weight:53,made:true}],
    cj: [{weight:70,made:true},{weight:75,made:false},{weight:75,made:true}] };
  const row = plain(api.meetToRow(meet));
  assert.equal(row[20], 128);
  assert.ok(row[21] > 128, 'Sinclair adjusts total for bodyweight');
  const meets = sheet([plain(vm.runInContext('HEADERS.MEETS', api)), row]);
  assert.deepEqual(plain(api.getAllMeets({ getSheetByName: () => meets })), [meet]);
});

test('ID-based upserts preserve distinct same-weight sets on the existing backend', () => {
  const api = backend();
  const log = sheet([plain(vm.runInContext('HEADERS.LOG', api))]);
  const ss = { getSheetByName: () => log };
  api.updateEntry(ss, lift);
  api.updateEntry(ss, { ...lift, id: 'second-set' });
  api.updateEntry(ss, lift);
  assert.equal(api.getAllLogEntries(ss).length, 2);
  assert.deepEqual(plain(api.getAllLogEntries(ss)).map(e => e.id), [lift.id, 'second-set']);
});

test('structured complexes survive spreadsheet roundtrip without column shifts',()=>{
 const api=backend(),headers=plain(vm.runInContext('HEADERS.LOG',api)),log=sheet([headers]),ss={getSheetByName:()=>log};
 const complex={...lift,structure:[{base:'Pull',reps:1},{base:'Snatch',position:['Hang Above Knee'],reps:2}],workoutId:'workout-abc'};
 api.updateEntry(ss,complex);assert.deepEqual(plain(api.getAllLogEntries(ss)),[complex]);assert.equal(log.rows[1][12],lift.id);
});
test('plan backups split under cell limits, retry by ID, and keep previous versions',()=>{
 const api=backend(),state=sheet([['ID','Key','Updated At','Part','Parts','JSON']]),ss={getSheetByName:()=>state};
 const record={id:'version-a',key:'device/test',value:{plan:'a'.repeat(100000)}};api.saveAppState(ss,record);assert.equal(state.rows.length,4);assert.ok(state.rows.slice(1).every(r=>r[5].length<=40000));api.saveAppState(ss,record);assert.equal(state.rows.length,4);assert.deepEqual(plain(api.getAppState(ss)['device/test'].value),record.value);
 api.saveAppState(ss,{...record,id:'version-b',value:{plan:'new'}});assert.equal(state.rows.length,5);assert.equal(api.getAppState(ss)['device/test'].id,'version-b');
 state.rows.push(['incomplete','device/test','now',1,2,'{"plan":']);assert.equal(api.getAppState(ss)['device/test'].id,'version-b');
});
