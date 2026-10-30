import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const html=readFileSync('olympic-lifting-tracker.html','utf8');
const source=html.slice(html.indexOf('function getAllPBs(){'),html.indexOf('function getTrainingRecord('));
function records(entries,pbs=[]){const context=vm.createContext({loadSettings:()=>({pbs}),getCachedEntries:()=>entries});vm.runInContext(source,context);return context.getAllPBs();}
test('scrolling record summaries retain source session, ID and modifiers',()=>{
  for(const session of ['Coached Class','1:1 Session','Solo','Competition']){
    const entry={id:'record',base:'Squat',date:'2026-10-25',weight:125,session,technique:['Back']};
    const pb=records([entry]).getPB('Squat');
    assert.equal(pb.session,session);assert.equal(pb.id,'record');assert.deepEqual(pb.technique,['Back']);
  }
});
test('equal-weight historical seed cannot hide known session information',()=>{
  const log={id:'clean',base:'Clean',date:'2026-10-25',weight:100,session:'1:1 Session'};
  const seed={lift:'Clean',date:'2025-12-18',weight:100};
  assert.equal(records([log],[seed]).getPB('Clean').session,'1:1 Session');
});
test('unknown historical source is preserved without inventing a session',()=>{
  const seed={lift:'Jerk',date:'2025-01-14',weight:65};
  assert.equal(records([],[seed]).getPB('Jerk'),seed);
  assert.equal(records([],[seed]).getPB('Jerk').session,undefined);
});
