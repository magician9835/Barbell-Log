import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const c=vm.createContext({});for(const file of ['workout-model.js','record-bests.js','analytics-model.js'])vm.runInContext(readFileSync(file,'utf8'),c);const M=c.AnalyticsModel,plain=x=>JSON.parse(JSON.stringify(x)),today='2026-11-07';
const sn=(id,date,weight,extra={})=>({id,date,weight,base:'Snatch',session:'Coached Class',reps:1,sets:1,...extra});
test('analytics exclude warm-ups, misses, deleted/future/invalid dates and non-finite loads',()=>{
 const rows=[sn('good','2026-11-01',60),sn('warm','2026-11-01',90,{phase:'warmup'}),sn('legacy-warm','2026-11-01',70,{workoutId:'w',notes:'Class · 2026-11-01 · Warm-up'}),sn('miss','2026-11-01',75,{made:false}),sn('failed','2026-11-01',75,{success:false}),sn('deleted','2026-11-01',75,{deleted:true}),sn('future','2026-11-08',100),sn('invalid','2026-02-30',60),sn('infinite','2026-11-01',Infinity),sn('no-movement','2026-11-01',60,{base:null}),sn('broken-complex','2026-11-01',60,{structure:[null]})];
 assert.deepEqual(plain(M.entries(rows,today).map(e=>e.id)),['good']);assert.equal(M.validDate('2024-02-29'),true);assert.equal(M.validDate('2026-02-29'),false);
});
test('equivalent legacy/structured full lifts share a variant while real hang records stay distinct',()=>{
 const rows=[sn('legacy','2026-10-01',60,{receiving:'Squat (Full)'}),sn('new','2026-11-01',62.5,{structure:[{base:'Snatch',reps:1,receiving:'',position:['Floor']}]}),sn('hang','2026-11-02',65,{position:['Hang Above Knee']})];
 const variants=M.variants(rows,'Snatch');assert.equal(variants.length,2);const selected=M.defaultVariant(variants,'Snatch');assert.equal(M.select(rows,{today,base:'Snatch',variant:selected}).length,2);assert.equal(M.summary(M.select(rows,{today,base:'Snatch',variant:selected})).best.weight,62.5);assert.match(variants.find(v=>v.key!==selected).label,/Hang Above Knee/);
});
test('rep filters preserve unknown historical counts and understand clean & jerk pairs',()=>{
 assert.equal(M.reps({base:'Clean and Jerk',reps:2}),'2');assert.equal(M.reps({base:'Clean and Jerk',structure:[{base:'Clean',reps:2},{base:'Jerk',reps:2}]}),'2');assert.equal(M.reps(sn('unknown','2026-11-01',60,{reps:null})),'—');assert.equal(M.reps({structure:[{base:'Pull',reps:1},{base:'Snatch',reps:2}]}),'1+2');
 const rows=[sn('single','2026-11-01',60),sn('double','2026-11-02',55,{reps:2})];assert.equal(M.select(rows,{today,rep:'1'}).length,1);
});
test('calendar windows are inclusive, session aliases match, and daily points use actual top sets',()=>{
 const rows=[sn('boundary','2026-10-11',50,{session:'Class'}),sn('too-old','2026-10-10',45),sn('low','2026-11-01',55),sn('top','2026-11-01',60),sn('latest','2026-11-02',57.5,{session:'Solo'})],before=JSON.stringify(rows);
 const selected=M.select(rows,{today,period:'28',session:'Coached Class'});assert.deepEqual(plain(selected.map(e=>e.id)),['boundary','low','top']);const info=M.summary(selected);assert.equal(info.days,2);assert.equal(info.best.id,'top');assert.equal(info.latest.id,'top');assert.equal(M.range(rows,today,'84').days,84);assert.equal(JSON.stringify(rows),before);
});
test('training counts dates once, includes complex components, and never invents RPE',()=>{
 const rows=[sn('a','2026-11-01',60,{quality:4}),sn('b','2026-11-01',55,{quality:5}),{...sn('complex','2026-11-02',50),structure:[{base:'Pull',reps:1},{base:'Snatch',reps:2}]},{...sn('cj','2026-11-03',80),base:'Clean and Jerk'}];const data=M.training(rows,today,'28');assert.equal(data.days,3);assert.equal(data.perWeek,.8);assert.equal(data.rated,2);assert.equal(data.balance.find(x=>x.base==='Snatch').days,2);for(const base of ['Pull','Clean','Jerk'])assert.equal(data.balance.find(x=>x.base===base).days,1);assert.equal(data.weeks.reduce((n,w)=>n+w.days,0),3);assert.ok(data.weeks.length<=8);assert.equal(data.rows.length,4);
});
