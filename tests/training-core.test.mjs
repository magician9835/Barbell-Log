import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const context=vm.createContext({crypto:{randomUUID}});
vm.runInContext(readFileSync('training-core.js','utf8'),context);
const C=context.TrainingCore;
const plain=v=>JSON.parse(JSON.stringify(v));

test('whiteboard expands into 17 working sets with complex reps intact',()=>{
  const w=C.classTemplate();w.blocks.forEach(b=>b.reference=100);
  assert.equal(C.validate(w),true);
  assert.equal(w.blocks[0].position,'Hang (unspecified)');
  assert.deepEqual(plain(w.blocks.map(b=>C.expand(b).length)),[6,6,5]);
  assert.deepEqual(plain(C.expand(w.blocks[0])[0].reps),[1,2]);
  assert.equal(C.expand(w.blocks[0])[5].weight,85);
});
test('changing a session reference only recalculates remaining prescriptions',()=>{
  const w=C.classTemplate(),b=w.blocks[0];b.reference=60;
  const set=C.expand(b)[0];const e=C.toEntry(w,b,set,42,'1+2');w.done[set.key]=e;
  b.reference=70;
  assert.equal(w.done[set.key].weight,42);
  assert.equal(C.pending(w)[0].set.weight,52.5);
  assert.match(e.notes,/1 Snatch pull \+ 2 Hang snatch/);
  assert.deepEqual(plain(e.technique),['Complex']);
  assert.equal(e.id,C.toEntry(w,b,set,49,'1+2').id,'Retries keep a stable entry ID');
});
test('full-movement reference excludes hang and power records',()=>{
  const ref=C.findReference('Snatch',[
    {base:'Snatch',weight:70,position:['Hang Above Knee'],technique:[]},
    {base:'Snatch',weight:80,position:[],receiving:'Power',technique:[]},
    {base:'Snatch',weight:60,position:['Floor'],technique:[]},
  ]);
  assert.equal(ref.weight,60);
  assert.equal(C.findReference('Front squat',[{base:'Squat',weight:150,technique:['Back']}]).weight,null);
});
test('missing references, bad prescriptions and invalid actual reps cannot log',()=>{
  const w=C.classTemplate();assert.throws(()=>C.validate(w),/reference max/);
  for(const text of ['0 x 2 @ 70','3 x 2 @ 999','hello'])assert.throws(()=>C.parsePrescription(text));
  const b=w.blocks[0];b.reference=65;const s=C.expand(b)[0];
  assert.throws(()=>C.toEntry(w,b,s,-10,'1+2'),/weight/);
  assert.throws(()=>C.toEntry(w,b,s,45,'2'),/1\+2/);
});
test('rounding respects the configured loading increment',()=>{
  const b=C.block('Clean','Clean','1 x 2 @ 75',{reference:101,increment:2.5});
  assert.equal(C.expand(b)[0].weight,75);
});
