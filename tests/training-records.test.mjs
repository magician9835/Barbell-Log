import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const html=readFileSync('olympic-lifting-tracker.html','utf8');
const source=html.slice(html.indexOf('function getTrainingRecord('),html.indexOf('function renderPBs(){'));
const context=vm.createContext({});vm.runInContext(source,context);
const record=context.getTrainingRecord;
test('65kg hang snatch beats full snatch and retains its variation',()=>{
  const full={id:'full',base:'Snatch',weight:56,date:'2025-12-23',session:'Coached Class',position:[]};
  const hang={id:'hang',base:'Snatch',weight:65,date:'2026-10-25',session:'Coached Class',position:['Hang Above Knee'],technique:[],receiving:''};
  const competition={...full,id:'competition',weight:80,session:'Competition'};
  assert.equal(record([full,hang,competition],'Snatch'),hang);
  assert.equal(record([full,hang,competition],'Snatch').position[0],'Hang Above Knee');
});
test('other modifiers stay attached to the selected record',()=>{
  const variant={base:'Clean and Jerk',weight:85,date:'2026-10-25',session:'1:1 Session',position:['Blocks'],technique:['Pause'],receiving:'Power',grip:['Wide Grip']};
  assert.equal(record([variant],'Clean and Jerk'),variant);
  assert.deepEqual(variant.technique,['Pause']);
});
test('equal weights use latest entry; sorting does not mutate history',()=>{
  const older={base:'Snatch',weight:65,date:'2026-09-01',session:'Solo'};
  const newer={...older,date:'2026-10-25',position:['Hang Above Knee']};
  const entries=[older,newer];assert.equal(record(entries,'Snatch'),newer);assert.equal(entries[0],older);
  assert.equal(record([{...older,weight:0},{...older,weight:-10}],'Snatch'),null);
});
