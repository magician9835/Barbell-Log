import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source=readFileSync('phone-layout.js','utf8').split('\n(() => {')[0];
const context=vm.createContext({});vm.runInContext(source,context);
const measure=context.appViewportGeometry;
const phone={standalone:true,width:402,viewportHeight:812,visibleHeight:812,screenWidth:402,screenHeight:874,safeTop:62,focused:false,scale:1};
test('real reported iPhone 16 Pro geometry fills all 874px',()=>{
  const result=measure(phone);assert.equal(result.height,874);assert.equal(result.statusBarCompensated,true);
});
test('already full-height viewport does not receive another status-bar inset',()=>{
  const result=measure({...phone,viewportHeight:874,visibleHeight:874});assert.equal(result.height,874);assert.equal(result.statusBarCompensated,false);
});
test('Safari tab, unrelated gaps, landscape and page scaling are not compensated',()=>{
  for(const change of [{standalone:false},{viewportHeight:770,visibleHeight:770},{screenWidth:874,screenHeight:402},{scale:2},{safeTop:0}]){
    assert.equal(measure({...phone,...change}).statusBarCompensated,false);
  }
});
test('keyboard uses visible height and restores the full screen afterwards',()=>{
  assert.equal(measure({...phone,focused:true,visibleHeight:500}).height,500);
  assert.equal(measure({...phone,focused:true,viewportHeight:500,visibleHeight:500}).height,500);
  assert.equal(measure({...phone,focused:false}).height,874);
});
test('focused input with no visible keyboard does not shrink the app',()=>{
  assert.equal(measure({...phone,focused:true}).height,874);
});
