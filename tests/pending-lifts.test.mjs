import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

const source=readFileSync('pending-lifts.js','utf8');
const entry={id:'lift-1',date:'2026-10-30',session:'Solo',base:'Snatch',weight:50,sets:3,reps:2,quality:4,notes:'',position:[],technique:[],grip:[],receiving:''};
function client(options={}){
  const storage=options.storage||new Map();
  const server=options.server||[];
  const requests=[];
  const window={dispatchEvent(){}};
  const state={offline:false,ack:true};
  vm.runInNewContext(source,{
    window, Event, URL, AbortSignal, crypto:{randomUUID}, console:{warn(){}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(options.full)throw new Error('quota');storage.set(k,v);}},
    fetch:async(url,init={})=>{
      requests.push({url,init});
      if(state.offline)throw new Error('offline');
      if(init.method==='POST'){
        const body=JSON.parse(init.body);
        if(state.ack){
          const index=server.findIndex(e=>e.id===(body.id||body.entry.id));
          if(index>=0)server.splice(index,1);
          if(body.entry)server.push(body.entry);
        }
        return{type:'opaque'};
      }
      return{ok:true,json:async()=>({entries:JSON.parse(JSON.stringify(server))})};
    },
  });
  return{api:window.PendingLifts,storage,server,requests,state};
}
test('offline lift survives reload and retries by stable ID without losing repeated sets',async()=>{
  const first=client();first.state.offline=true;
  first.api.queue('updateEntry',entry,'https://example.com/api');
  await first.api.drain('https://example.com/api');
  assert.equal(first.api.list().length,1);
  const second=client({storage:first.storage});
  assert.equal(second.api.overlay([],'https://example.com/api')[0].pending,true);
  second.api.queue('updateEntry',{...entry,id:'lift-2'},'https://example.com/api');
  await second.api.drain('https://example.com/api');
  assert.equal(second.server.length,2);
  assert.equal(second.api.list().length,0);
  assert.ok(second.requests.filter(r=>r.init.method==='POST').every(r=>JSON.parse(r.init.body).action==='updateEntry'));
});
test('opaque POST success without readback confirmation remains pending',async()=>{
  const c=client();c.state.ack=false;
  c.api.queue('updateEntry',entry,'https://example.com/api');
  await c.api.drain('https://example.com/api');
  assert.equal(c.api.list().length,1);
  c.state.ack=true;
  await c.api.drain('https://example.com/api');
  assert.equal(c.api.list().length,0);
});
test('already confirmed retry does not POST again',async()=>{
  const c=client({server:[entry]});
  c.api.queue('updateEntry',entry,'https://example.com/api');
  await c.api.drain('https://example.com/api');
  assert.equal(c.requests.filter(r=>r.init.method==='POST').length,0);
  assert.equal(c.api.list().length,0);
});
test('delete keeps ID and waits until the row is actually absent',async()=>{
  const c=client({server:[entry]});c.state.ack=false;
  c.api.queue('deleteEntry',entry.id,'https://example.com/api');
  await c.api.drain('https://example.com/api');
  assert.equal(JSON.parse(c.requests.find(r=>r.init.method==='POST').init.body).id,entry.id);
  assert.equal(c.api.list().length,1);
  c.state.ack=true;await c.api.drain('https://example.com/api');
  assert.equal(c.server.length,0);assert.equal(c.api.list().length,0);
});
test('pending writes never move to a different configured spreadsheet',async()=>{
  const c=client();c.api.queue('updateEntry',entry,'https://example.com/old');
  await c.api.drain('https://example.com/new');
  assert.equal(c.requests.length,0);assert.equal(c.api.list().length,1);
});
test('planner batch cannot clear planner when local storage fails',()=>{
  const c=client({full:true});
  assert.throws(()=>c.api.queueMany([{action:'updateEntry',entry}],'https://example.com/api'),/quota/);
  assert.equal(c.storage.size,0);
});
