import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const c=vm.createContext({});for(const f of ['workout-model.js','record-bests.js','log-summary.js'])vm.runInContext(readFileSync(f,'utf8'),c);const G=c.LogSummary.groups,plain=x=>JSON.parse(JSON.stringify(x));
const base={date:'2026-11-01',base:'Squat',technique:['Front'],session:'Solo',workoutId:'rehearsal',sets:1,reps:1};
test('many warm-ups and working sets become a single highest-working-set summary without deleting rows',()=>{
 const rows=[20,40,60,80].map((weight,i)=>({...base,id:'warm-'+i,weight,reps:5,phase:'warmup'})).concat([95,100,105,110].map(weight=>({...base,id:'work-'+weight,weight,phase:'work'}))),before=JSON.stringify(rows),g=G(rows);
 assert.equal(g.length,1);assert.equal(g[0].top.weight,110);assert.equal(g[0].top.reps,1);assert.equal(g[0].topSets,1);assert.equal(g[0].warmups,4);assert.equal(g[0].entries.length,8);assert.equal(JSON.stringify(rows),before);
});
test('warm-ups cannot displace the top working set; repeats aggregate only matching top-weight reps',()=>{
 const g=G([{...base,id:'warm',weight:120,phase:'warmup'},{...base,id:'a',weight:100,reps:2},{...base,id:'b',weight:100,reps:2,sets:2},{...base,id:'c',weight:100,reps:1}])[0];
 assert.equal(g.top.id,'a');assert.equal(g.topSets,3);assert.equal(g.warmups,1);
});
test('real variants, distinct sessions, dates and workouts stay separate',()=>{
 const e={...base,id:'a',weight:100};const rows=[e,{...e,id:'b',technique:['Back']},{...e,id:'c',date:'2026-11-02'},{...e,id:'d',session:'1:1 Session'},{...e,id:'e',workoutId:'other'}];assert.equal(G(rows).length,5);
 const sn={...base,base:'Snatch',technique:[],id:'sn',weight:60};assert.equal(G([sn,{...sn,id:'hang',position:['Hang Above Knee']}]).length,2);
});
test('an ongoing warm-up-only block stays visible and failed sets do not become the top successful set',()=>{
 assert.equal(G([{...base,id:'warm',weight:20,phase:'warmup'}])[0].warmupOnly,true);
 const g=G([{...base,id:'miss',weight:115,made:false},{...base,id:'made',weight:110}])[0];assert.equal(g.top.id,'made');assert.equal(g.entries.length,2);
});
test('legacy and structured squat rows group while preserving the recorded movement name',()=>{
 const e={...base,id:'legacy',weight:100};const next={...base,id:'structured',weight:110,structure:[{base:'Squat',technique:['Front'],reps:1}]};assert.equal(G([e,next]).length,1);assert.deepEqual(plain(G([e,next])[0].top.structure[0].technique),['Front']);
});
