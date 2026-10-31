// Durable outbox for lift writes. A POST is not an acknowledgement: Apps Script
// responses are opaque in the browser, so only a fresh read can confirm a save.
(() => {
  const key = 'barbell_pending_lifts_v1';
  let draining = null;
  const read = () => {
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(items)) throw new Error('Pending lift storage is invalid');
    return items;
  };
  const write = items => localStorage.setItem(key, JSON.stringify(items));
  const notify = () => window.dispatchEvent(new Event('pendingliftschange'));
  const list = () => { try { return read(); } catch { return []; } };
  const relevant = (item, endpoint) => !item.endpoint || item.endpoint === endpoint;
  const fields = ['id','date','session','base','receiving','notes'];
  const numbers = ['weight','sets','reps','quality'];
  function matches(actual, expected) {
    return actual && (!actual.structure||!expected.structure||JSON.stringify(actual.structure)===JSON.stringify(expected.structure)) && fields.every(k => String(actual[k] || '') === String(expected[k] || '')) &&
      numbers.every(k => (Number(actual[k]) || null) === (Number(expected[k]) || null)) &&
      ['position','grip','technique'].every(k => JSON.stringify(actual[k] || []) === JSON.stringify(expected[k] || []));
  }
  async function snapshot(endpoint) {
    const url = new URL(endpoint);
    url.searchParams.set('action', 'getAll');
    url.searchParams.set('_check', Date.now());
    const response = await fetch(url.href, { cache:'no-store', signal:AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Cannot read spreadsheet');
    const data = await response.json();
    if (data.error || !Array.isArray(data.entries)) throw new Error(data.error || 'Invalid spreadsheet response');
    return data;
  }
  function confirmed(item, entries) {
    if(item.action==='deleteMeet')return !(entries.meets||[]).some(e=>e.id===item.id);
    if(item.action==='logBW')return (entries.bw||[]).some(e=>e.date===item.entry.date&&Number(e.weight)===Number(item.entry.weight)&&String(e.note||'')===String(item.entry.note||''));
    if(item.action==='saveMeet'){
      const actual=(entries.meets||[]).find(e=>e.id===item.id);
      return !!actual&&['name','date','location','notes'].every(k=>String(actual[k]||'')===String(item.entry[k]||''))&&Number(actual.bw||0)===Number(item.entry.bw||0)&&['snatch','cj'].every(k=>JSON.stringify(actual[k]||[])===JSON.stringify(item.entry[k]||[]));
    }
    const actual = entries.entries.find(e => e.id === item.id);
    return item.action === 'deleteEntry' ? !actual : matches(actual, item.entry);
  }
  function queueMany(changes, endpoint) {
    let items=read();
    const tokens=[];
    for(const {action,entry} of changes){
      const id=typeof entry==='string'?entry:entry.id;
      if(!id)throw new Error('Lift ID is missing');
      const item={action,id,endpoint:endpoint||'',token:crypto.randomUUID()};
      if(typeof AppData!=='undefined'&&AppData.isEndpoint(item.endpoint))item.expectedRevision=AppData.revision(action,id);
      if(!action.startsWith('delete'))item.entry=JSON.parse(JSON.stringify(entry));
      items=[...items.filter(i=>!(i.id===id&&i.endpoint===item.endpoint)),item];
      tokens.push(item.token);
    }
    write(items); // All planner lifts persist together or the planner stays open.
    notify();
    return tokens;
  }
  function queue(action,entry,endpoint){return queueMany([{action,entry}],endpoint)[0];}
  async function process(endpoint) {
    const attempted = new Set();
    while (true) {
      if(typeof AppData!=='undefined'&&AppData.status?.().activating&&!AppData.isEndpoint(endpoint))break;
      let item = read().find(i => relevant(i, endpoint) && !attempted.has(i.token));
      if (!item || !endpoint) break;
      attempted.add(item.token);
      if (!item.endpoint) {
        write(read().map(i => i.token === item.token ? { ...i, endpoint } : i));
        item = { ...item, endpoint };
      }
      try {
        if(typeof AppData!=='undefined'&&AppData.isEndpoint(endpoint)){
          const ack=await AppData.write(item);
          write(read().filter(i=>i.token!==item.token).map(i=>i.id===item.id&&i.endpoint===item.endpoint&&i.expectedRevision===item.expectedRevision?{...i,expectedRevision:ack.revision}:i));
          notify();continue;
        }
        let entries = await snapshot(endpoint);
        if (!confirmed(item, entries)) {
          // Existing backend's updateEntry is an ID-based upsert. Its log action
          // wrongly deduplicates distinct sets with the same date/lift/weight.
          const body = item.action.startsWith('delete')
            ? { action:item.action, id:item.id }
            : item.action==='logBW'?{action:'logBW',entry:item.entry}:item.action==='saveMeet'?{action:'saveMeet',meet:item.entry}:{ action:'updateEntry', entry:item.entry };
          await fetch(endpoint, { method:'POST', mode:'no-cors',
            headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body),
            signal:AbortSignal.timeout(15000) });
          entries = await snapshot(endpoint);
        }
        if (!confirmed(item, entries)) throw new Error('Spreadsheet has not confirmed this change');
        // Do not remove an edit made while this request was in flight.
        write(read().filter(i => i.token !== item.token));
      } catch (error) {
        write(read().map(i=>i.token===item.token?{...i,error:error.message,...(error.conflict?{conflict:error.conflict}:{})}:i));
        console.warn('Change remains saved on this device awaiting confirmation:', error.message);
      }
      notify();
    }
  }
  function drain(endpoint) {
    if (!draining) draining = process(endpoint).finally(() => { draining = null; });
    return draining;
  }
  function overlay(entries, endpoint) {
    const byId = new Map(entries.map(e => [e.id, e]));
    list().filter(i => relevant(i, endpoint)&&['updateEntry','deleteEntry'].includes(i.action)).forEach(i => {
      if (i.action === 'deleteEntry') byId.delete(i.id);
      else byId.set(i.id, { ...i.entry, pending:true });
    });
    return [...byId.values()];
  }
  function overlayRecords(data,endpoint){const result={...data,entries:overlay(data.entries||[],endpoint)};for(const [name,add,del]of [['meets','saveMeet','deleteMeet'],['bw','logBW',null],['accessories','saveAccessory','deleteAccessory']]){const rows=new Map((data[name]||[]).map(e=>[e.id,e]));for(const i of list().filter(i=>relevant(i,endpoint))){if(i.action===del)rows.delete(i.id);else if(i.action===add)rows.set(i.id,{...i.entry,pending:true});}result[name]=[...rows.values()];}return result;}
  function resolve(token,choice){const item=list().find(i=>i.token===token);if(!item?.conflict)return;if(choice==='cloud')write(read().filter(i=>i.token!==token));else write(read().map(i=>i.token===token?{...i,token:crypto.randomUUID(),expectedRevision:item.conflict.revision,error:undefined,conflict:undefined}:i));notify();}
  window.PendingLifts = { queue, queueMany, drain, idle:()=>draining||Promise.resolve(), overlay, overlayRecords, resolve, list, matches };
})();
