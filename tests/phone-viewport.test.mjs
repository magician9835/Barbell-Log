import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source=readFileSync('phone-layout.js','utf8').split('\n(() => {')[0];
const context=vm.createContext({});vm.runInContext(source,context);
const measure=context.appViewportGeometry;
const phone={standalone:true,width:402,viewportHeight:812,visibleHeight:812,screenWidth:402,screenHeight:874,safeTop:62,focused:false,scale:1};
test('real iPhone screenshot requires navigation inside the visible 812px',()=>{
  const result=measure(phone);assert.equal(result.height,812);assert.equal(result.statusBarCompensated,false);
});
test('already full-height viewport does not receive another status-bar inset',()=>{
  const result=measure({...phone,viewportHeight:874,visibleHeight:874});assert.equal(result.height,874);assert.equal(result.statusBarCompensated,false);
});
test('Safari tab, unrelated gaps, landscape and page scaling are not compensated',()=>{
  for(const change of [{standalone:false},{viewportHeight:770,visibleHeight:770},{screenWidth:874,screenHeight:402},{scale:2},{safeTop:0}]){
    assert.equal(measure({...phone,...change}).statusBarCompensated,false);
  }
});
test('keyboard keeps the shell stable and reports covered space for field scrolling',()=>{
  const result=measure({...phone,baselineHeight:812,focused:true,visibleHeight:500});
  assert.equal(result.height,812);assert.equal(result.keyboardCover,312);assert.equal(result.keyboard,true);
  assert.equal(measure({...phone,baselineHeight:812,focused:true,viewportHeight:500,visibleHeight:500}).height,812);
  assert.equal(measure({...phone,focused:false}).height,812);
});
test('focused input with no visible keyboard does not shrink the app',()=>{
  assert.equal(measure({...phone,focused:true}).height,812);
});
