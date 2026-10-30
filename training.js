(() => {
  'use strict';
  const C=TrainingCore, key='barbell_training_v2', archiveKey='barbell_training_history_v2';
  let workout=null, busy=false, wake=null, awakeWanted=false, timerSoundPlayed=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=s=>sessionLabel(s);
  const sessionOptions=(selected)=>['Coached Class','1:1 Session','Solo','Competition'].map(s=>`<option value="${s}" ${s===selected?'selected':''}>${label(s)}</option>`).join('');
  const root=()=>document.getElementById('training-root');
  function load(){try{workout=JSON.parse(localStorage.getItem(key)||'null');if(workout&&!Array.isArray(workout.blocks))workout=null;}catch{workout=null;}}
  function save(){localStorage.setItem(key,JSON.stringify(workout));}
  function notifyError(e){showToast(e.message||'Could not save on this phone. Keep this screen open.','error');}
  function commit(change,redraw=true,top=false){try{const before=C.clone(workout);try{change();save();}catch(e){workout=before;throw e;}if(redraw)render();if(top)topOfWorkout();}catch(e){notifyError(e);}}
  function refs(w){const s=loadSettings();w.blocks.forEach(b=>{const ref=C.findReference(b.referenceLift,getCachedEntries(),s.pbs||[]);b.reference=ref.weight||'';b.referenceSource=ref.source;});return w;}
  function begin(kind){
    if(workout&&workout.phase!=='finished'){
      showConfirm('Replace this workout?','Completed sets stay in your log. The current plan will be replaced.','Replace',()=>create(kind));
    }else create(kind);
  }
  function create(kind){try{const next=refs(kind==='class'?C.classTemplate():C.empty(kind==='lesson'?'1:1 Session':'Solo'));localStorage.setItem(key,JSON.stringify(next));workout=next;render();}catch(e){notifyError(e);}}
  function topOfWorkout(){document.getElementById('pane-planner').scrollTop=0;window.scrollTo(0,0);}
  function openTrain(){switchTab('planner',document.querySelectorAll('#tabs .tab')[1]);render();topOfWorkout();}
  function recap(){openLogModal();document.getElementById('m-session').value='1:1 Session';}
  function field(title,html,help=''){return `<label class="train-field"><span>${title}</span>${html}${help?`<small>${help}</small>`:''}</label>`;}
  function input(action,value,type='text',extra=''){return `<input type="${type}" value="${esc(value)}" data-field="${action}" ${extra}>`;}
  function render(){
    const el=root();if(!el)return;
    document.getElementById('legacy-planner').hidden=true;
    if(!workout){el.innerHTML=`<div class="train-intro"><div class="eyebrow">LESS ADMIN. MORE LIFTING.</div><h2>Ready when you are.</h2><p>Set the program once. We’ll calculate the weights and track each set as you go.</p></div>
      <button class="train-choice" data-action="class"><strong>Start a class</strong><span>Your whiteboard workout, ready to customise →</span></button>
      <button class="train-choice" data-action="custom"><strong>Build a workout</strong><span>Add lifts, percentages and your own reference maxes →</span></button>
      <button class="train-choice" data-action="recap"><strong>Log a 1:1 lesson</strong><span>Capture the lifts and coaching notes you remember →</span></button>
      <details class="train-details"><summary>Classic planner & warm-ups</summary><button data-action="classic">Open classic tools</button></details>${templatesHTML()}${historyHTML()}`;bind();return;}
    const w=workout;
    const count=Object.keys(w.done).length;
    el.innerHTML=`<div class="train-heading"><div><div class="eyebrow">${esc(label(w.session))} · ${esc(w.date)}</div><h2>${esc(w.title)}</h2></div><button class="quiet" data-action="home" aria-label="Workout options">⋯</button></div>`+
      (w.phase==='setup'?setupHTML():w.phase==='finished'?finishHTML():activeHTML());
    bind();updateClock();updateSync();
  }
  function setupHTML(){const w=workout;return `<p class="train-help">Percentages use the normal full movement. A reference change is just for this workout; it won’t change your PB.</p>
    <div class="train-grid">${field('Workout name',input('title',w.title))}${field('Date',input('date',w.date,'date'))}${field('Session',`<select data-field="session">${sessionOptions(w.session)}</select>`)}${field('Round to (kg)',`<select data-field="rounding"><option value="0.5" ${w.blocks[0]?.increment===0.5?'selected':''}>0.5 kg</option><option value="1" ${w.blocks[0]?.increment===1?'selected':''}>1 kg</option><option value="2.5" ${w.blocks[0]?.increment===2.5?'selected':''}>2.5 kg</option></select>`)}</div>
    ${w.blocks.map((b,i)=>blockHTML(b,i)).join('')}
    <button class="train-secondary wide" data-action="add">+ Add a lift</button>
    <details class="train-details"><summary>Session notes & accessories (optional)</summary>${field('Coaching notes',`<textarea data-field="notes">${esc(w.notes)}</textarea>`)}${field('Accessory circuit',`<textarea data-field="accessories">${esc(w.accessories)}</textarea>`,'Tick it off without logging every rep.')}</details>
    <div class="train-actions"><button class="train-primary wide" data-action="start">Start workout</button><button class="train-secondary wide" data-action="template">Save as template</button><button class="quiet wide" data-action="new">Choose a different workout</button></div>`;}
  function blockHTML(b,i){
    let preview='';try{preview=C.expand(b).map(s=>`<span>${s.reps.join('+')} reps · ${s.percent}% <strong>${b.reference?s.weight.toFixed(s.weight%1?1:0)+' kg':'— kg'}</strong></span>`).join('');}catch(e){preview=`<p>${esc(e.message)}</p>`;}
    return `<section class="train-block" data-block="${esc(b.id)}"><div class="train-block-heading"><span class="block-letter">${String.fromCharCode(65+i)}</span><h3>${esc(b.title)}</h3><button class="quiet" data-action="remove" data-id="${b.id}" aria-label="Remove ${esc(b.title)}">×</button></div>
    <div class="train-grid">${field('Movement',`<select data-blockfield="movement" data-id="${b.id}">${['Snatch','Snatch pull + hang snatch','Clean','Hang snatch','Hang clean','Clean and Jerk','Jerk','Front squat','Back squat','Pull','Deadlift','Bench Press','Barbell Row'].map(t=>`<option ${t===b.title?'selected':''}>${t}</option>`).join('')}</select>`)}
    ${field(esc(b.referenceLift)+' reference (kg)',`<input type="number" min="1" step="0.5" inputmode="decimal" data-blockfield="reference" data-id="${b.id}" value="${esc(b.reference)}">`,esc(b.referenceSource||'For this workout only'))}</div>
    ${field('Sets × reps @ percentage',`<textarea class="prescription" data-blockfield="prescription" data-id="${b.id}" spellcheck="false">${esc(b.prescription)}</textarea>`,'One line per stage, e.g. 3 x 2 @ 80. Complex: 1 x 1+2 @ 70.')}
    <div class="train-preview">${preview}</div>
    <details class="train-details"><summary>Timing & coaching notes</summary><div class="train-grid">${field('Block minutes',`<input type="number" min="1" max="120" data-blockfield="minutes" data-id="${b.id}" value="${b.minutes}">`)}${field('Rest seconds',`<input type="number" min="0" max="900" step="15" data-blockfield="rest" data-id="${b.id}" value="${b.rest}">`)}</div>${field('Notes',`<textarea data-blockfield="notes" data-id="${b.id}">${esc(b.notes)}</textarea>`)}</details></section>`;
  }
  function activeHTML(){const w=workout;const next=C.pending(w)[0];const total=w.blocks.reduce((n,b)=>n+C.expand(b).length,0),count=Object.keys(w.done).length+w.skipped.length;
    if(!next)return `<div class="train-complete"><h3>All working sets covered.</h3><p>${Object.keys(w.done).length} completed · ${w.skipped.length} skipped</p></div>${accessoriesHTML()}<button class="train-primary wide" data-action="finish">Finish workout</button>${completedHTML()}`;
    const {block:b,set:s}=next;const blockSets=C.expand(b);const index=blockSets.findIndex(t=>t.key===s.key)+1;
    return `<div class="train-progress"><span>${count} / ${total} sets</span><progress max="${total}" value="${count}"></progress><span class="train-mini-rest">Rest <strong data-rest-clock>Ready</strong></span></div>
      <div class="train-current"><div class="eyebrow">${esc(b.title)} · SET ${index} OF ${blockSets.length}</div><div class="train-target"><strong>${s.weight.toFixed(s.weight%1?1:0)}</strong><span>kg × ${s.reps.join('+')}</span></div><p class="train-help">${s.percent}% of ${esc(b.referenceLift)} ${b.reference} kg · ${b.minutes} min block</p>
      ${b.complex?`<p class="train-complex">${s.reps.map((n,i)=>n+' '+esc(b.components[i])).join(' + ')}</p>`:''}${b.notes?`<p>${esc(b.notes)}</p>`:''}
      <div class="train-grid">${field('Actual weight (kg)',`<input id="train-actual-weight" type="number" inputmode="decimal" step="0.5" min="0.5" value="${s.weight}">`)}${field('Completed reps',`<input id="train-actual-reps" type="text" inputmode="${b.complex?'text':'numeric'}" value="${s.reps.join('+')}">`)}</div>
      <details class="train-details"><summary>Set notes / technique quality</summary>${field('Note',`<input id="train-set-note" type="text" placeholder="What changed?">`)}${field('Technique quality',`<select id="train-quality"><option value="">Not rated</option>${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join('')}</select>`)}</details>
      <button class="train-primary wide" data-action="complete" ${busy?'disabled':''}>Complete set & start rest</button><button class="quiet wide" data-action="skip">Skip / missed set (not logged)</button></div>
      <div class="train-rest"><div><span class="eyebrow">REST</span><strong data-rest-clock>Ready</strong></div><button class="train-secondary" data-action="rest">${w.restEnd>Date.now()?'End rest':'Start rest'}</button></div>
      <div class="train-sync" id="train-sync" aria-live="polite"></div>
      <details class="train-details"><summary>Adjust today’s reference max</summary><p class="train-help">Only remaining sets change. Completed weights stay as logged.</p>${field(esc(b.referenceLift)+' reference (kg)',`<input type="number" min="1" step="0.5" data-active-reference="${b.id}" value="${b.reference}">`)}</details>
      <label class="train-awake"><input type="checkbox" id="train-awake" ${awakeWanted?'checked':''}> Keep screen awake while training</label><p class="train-help">The timer stays accurate when you return. Lock-screen alarms aren’t supported by this web app.</p>
      ${completedHTML()}<button class="quiet wide" data-action="early">Finish early</button>`;
  }
  function accessoriesHTML(){return workout.accessories?`<div class="train-accessories"><label><input type="checkbox" data-field="accessoriesDone" ${workout.accessoriesDone?'checked':''}> Accessories done</label><p>${esc(workout.accessories)}</p><small>Optional. Not added to lift records.</small></div>`:'';}
  function completedHTML(){const done=Object.values(workout.done);return done.length?`<details class="train-details"><summary>Completed sets · ${done.length}</summary>${done.map(e=>`<div class="train-done"><span>${esc(e.notes.split('\n')[0])}</span><strong>${e.weight} kg</strong></div>`).join('')}</details>`:'';}
  function finishHTML(){return `<div class="train-complete"><div class="eyebrow">WORKOUT COMPLETE</div><h3>You showed up.</h3><p>${Object.keys(workout.done).length} sets recorded · ${workout.skipped.length} skipped</p><p id="train-sync" class="train-sync"></p></div>${accessoriesHTML()}${completedHTML()}<button class="train-primary wide" data-action="repeat">Repeat this workout</button><button class="train-secondary wide" data-action="new">Plan the next session</button>`;}
  function historyHTML(){let items=[];try{items=JSON.parse(localStorage.getItem(archiveKey)||'[]');}catch{}return items.length?`<div class="train-history"><div class="eyebrow">RECENT WORKOUTS</div>${items.slice(0,3).map(w=>`<div><strong>${esc(w.title)}</strong><span>${esc(w.date)} · ${Object.keys(w.done).length} sets</span><button class="train-secondary" data-action="history" data-id="${esc(w.id)}">Repeat workout</button></div>`).join('')}</div>`:'';}
  function templatesHTML(){let items=[];try{items=JSON.parse(localStorage.getItem('barbell_workout_templates_v2')||'[]');}catch{}return items.length?'<div class="train-history"><div class="eyebrow">YOUR TEMPLATES</div>'+items.map(w=>`<button class="train-choice" data-action="load-template" data-id="${esc(w.id)}"><strong>${esc(w.title)}</strong><span>${w.blocks.length} lifts · ${esc(label(w.session))}</span></button>`).join('')+'</div>':'';}
  function resetPlan(plan){const w=C.clone(plan);w.id=C.id();w.date=C.localDate();w.phase='setup';w.done={};w.skipped=[];w.restEnd=0;w.accessoriesDone=false;localStorage.setItem(key,JSON.stringify(w));workout=w;render();topOfWorkout();}
  function updatePreviews(){workout.blocks.forEach((b,i)=>{const card=root().querySelector('[data-block="'+b.id+'"]');if(!card)return;const temp=document.createElement('div');temp.innerHTML=blockHTML(b,i);card.querySelector('.train-preview').innerHTML=temp.querySelector('.train-preview').innerHTML;});}
  function selectMovement(b,title){
    b.title=title;b.complex=title==='Snatch pull + hang snatch';b.position=title.startsWith('Hang ')||b.complex?'Hang (unspecified)':'';b.squatType=title==='Front squat'?'Front':title==='Back squat'?'Back':'';
    b.base=b.squatType?'Squat':title.toLowerCase().includes('snatch')?'Snatch':title==='Hang clean'?'Clean':title;
    b.referenceLift=b.squatType?title:b.base;b.components=['Snatch pull','Hang snatch'];
    b.prescription=b.complex?'3 x 1+2 @ 70':'3 x 2 @ 70';const ref=C.findReference(b.referenceLift,getCachedEntries(),loadSettings().pbs||[]);b.reference=ref.weight||'';b.referenceSource=ref.source;
  }
  function bind(){
    root().querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>action(el.dataset.action,el.dataset.id));
    root().querySelectorAll('[data-field]').forEach(el=>el.onchange=()=>commit(()=>{const f=el.dataset.field;if(f==='rounding'){workout.blocks.forEach(b=>b.increment=Number(el.value));setTimeout(updatePreviews,0);}else workout[f]=el.type==='checkbox'?el.checked:el.value;},false));
    root().querySelectorAll('[data-blockfield]').forEach(el=>el.onchange=()=>{
      const field=el.dataset.blockfield;
      commit(()=>{const b=workout.blocks.find(b=>b.id===el.dataset.id);if(field==='movement')selectMovement(b,el.value);else{b[field]=['reference','minutes','rest'].includes(field)?Number(el.value):el.value;if(field==='reference')b.referenceSource='Your reference for this workout';}},field==='movement');
      if(field!=='movement')updatePreviews();
    });
    root().querySelectorAll('[data-active-reference]').forEach(el=>el.onchange=()=>{if(!(Number(el.value)>0)){showToast('Enter a positive reference max','error');return;}commit(()=>workout.blocks.find(b=>b.id===el.dataset.activeReference).reference=Number(el.value),true,true);});
    const awake=document.getElementById('train-awake');if(awake)awake.onchange=()=>setAwake(awake.checked);
  }
  function action(name,id){try{
    if(name==='template'){let templates=JSON.parse(localStorage.getItem('barbell_workout_templates_v2')||'[]');const plan=C.clone(workout);plan.phase='setup';plan.done={};plan.skipped=[];templates=[plan,...templates.filter(t=>t.title!==plan.title)].slice(0,12);localStorage.setItem('barbell_workout_templates_v2',JSON.stringify(templates));showToast('Workout template saved','success');return;}
    if(name==='history'||name==='load-template'){const items=JSON.parse(localStorage.getItem(name==='history'?archiveKey:'barbell_workout_templates_v2')||'[]');const plan=items.find(w=>w.id===id);if(plan)resetPlan(plan);return;}
    if(name==='class')return begin('class');if(name==='custom')return begin('custom');if(name==='recap')return recap();
    if(name==='classic'){document.getElementById('legacy-planner').hidden=false;document.getElementById('legacy-planner').scrollIntoView({behavior:'smooth'});return;}
    if(name==='home'||name==='new')return showConfirm('Choose another workout?','Completed sets stay in your log. An unfinished plan will be replaced.','Choose workout',()=>{localStorage.removeItem(key);workout=null;render();});
    if(name==='remove')return commit(()=>workout.blocks=workout.blocks.filter(b=>b.id!==id));
    if(name==='add')return commit(()=>workout.blocks.push(C.block('Snatch','Snatch','3 x 2 @ 70',{title:'Snatch'})));
    if(name==='start'){C.validate(workout);return commit(()=>{workout.phase='active';workout.started=Date.now();},true,true);}
    if(name==='complete')return complete();
    if(name==='skip')return commit(()=>{const next=C.pending(workout)[0];if(next)workout.skipped.push(next.set.key);workout.restEnd=0;});
    if(name==='rest')return commit(()=>{const next=C.pending(workout)[0];workout.restEnd=workout.restEnd>Date.now()?0:Date.now()+(next?.block.rest||120)*1000;timerSoundPlayed=false;try{getAudioCtx();}catch{}});
    if(name==='early')return showConfirm('Finish this workout?','Only completed sets are logged. Remaining sets will not be added.','Finish',finish);
    if(name==='finish')return finish();
    if(name==='repeat'){const next=C.clone(workout);next.id=C.id();next.date=C.localDate();next.phase='setup';next.done={};next.skipped=[];next.restEnd=0;next.accessoriesDone=false;localStorage.setItem(key,JSON.stringify(next));workout=next;render();}
  }catch(e){notifyError(e);}}
  async function complete(){if(busy)return;busy=true;try{
    const {block:b,set:s}=C.pending(workout)[0];
    const e=C.toEntry(workout,b,s,document.getElementById('train-actual-weight').value,document.getElementById('train-actual-reps').value,document.getElementById('train-set-note')?.value||'',document.getElementById('train-quality')?.value);
    PendingLifts.queue('updateEntry',e,loadSettings().sheetsUrl);
    workout.done[s.key]=e;workout.restEnd=Date.now()+Number(b.rest)*1000;timerSoundPlayed=false;save();render();topOfWorkout();
    try{getAudioCtx();}catch{}
    showToast('Set recorded on this phone','success');
    PendingLifts.drain(loadSettings().sheetsUrl).then(()=>{updateSync();fetchAndRender();}).catch(()=>updateSync());
  }catch(e){notifyError(e);}finally{busy=false;}}
  function finish(){try{workout.phase='finished';workout.restEnd=0;save();let history=JSON.parse(localStorage.getItem(archiveKey)||'[]');history=[C.clone(workout),...history.filter(w=>w.id!==workout.id)].slice(0,20);localStorage.setItem(archiveKey,JSON.stringify(history));setAwake(false);render();}catch(e){notifyError(e);}}
  async function setAwake(on){awakeWanted=on;if(!on){try{await wake?.release();}catch{}wake=null;return;}try{if(!navigator.wakeLock)throw new Error();wake=await navigator.wakeLock.request('screen');}catch{awakeWanted=false;const input=document.getElementById('train-awake');if(input)input.checked=false;showToast('Screen-awake mode is unavailable on this device','');}}
  function updateClock(){if(!workout)return;const seconds=Math.max(0,Math.ceil((workout.restEnd-Date.now())/1000));document.querySelectorAll('[data-rest-clock]').forEach(el=>el.textContent=seconds?Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):'Ready');if(workout.restEnd&&seconds===0&&!timerSoundPlayed){timerSoundPlayed=true;try{playTimerSound();}catch{}}}
  function updateSync(){const el=document.getElementById('train-sync');if(!el)return;const pending=PendingLifts.list().length;el.textContent=pending?pending+' change'+(pending===1?'':'s')+' saved on phone · waiting for spreadsheet':'All recorded sets confirmed in spreadsheet';if(!loadSettings().sheetsUrl)el.textContent='Saved on this phone · connect your spreadsheet in Settings to sync';}
  function install(){
    const pane=document.getElementById('pane-planner');const legacy=document.createElement('div');legacy.id='legacy-planner';while(pane.firstChild)legacy.appendChild(pane.firstChild);pane.appendChild(Object.assign(document.createElement('div'),{id:'training-root'}));pane.appendChild(legacy);
    const intro=document.createElement('div');intro.className='training-home';intro.innerHTML=`<div><span class="eyebrow">TRAIN WITH LESS ADMIN</span><strong>Your next set, sorted.</strong></div><button class="train-primary" id="open-training">Train</button>`;
    const log=document.getElementById('pane-log');log.insertBefore(intro,log.firstChild);document.getElementById('open-training').onclick=openTrain;
    load();render();setInterval(updateClock,500);
    document.addEventListener('visibilitychange',()=>{updateClock();if(document.visibilityState==='visible'&&awakeWanted)setAwake(true);});
    window.addEventListener('pendingliftschange',updateSync);
    document.querySelector('#tabs .tab:nth-child(2) span').textContent='Train';
    const restore=document.createElement('div');restore.className='train-backup';restore.innerHTML='<button class="train-secondary" id="backup-app">Back up all app data</button><label class="train-secondary">Restore backup<input type="file" id="restore-app" accept="application/json,.json" hidden></label><small>Includes settings, plans and pending lifts. Keep your backup private.</small><p>Version 2026-10-30.15 · <button class="quiet" id="check-app-update">Check for updates</button></p>';
    document.getElementById('pane-settings').appendChild(restore);document.getElementById('backup-app').onclick=backup;
    document.getElementById('restore-app').onchange=restoreBackup;
    document.getElementById('check-app-update').onclick=()=>{window.dispatchEvent(new Event('pageshow'));showToast('Checking for an update…','');};
  }
  function backup(){const data={format:'barbell-log-backup',version:1,created:new Date().toISOString(),data:{}};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('barbell_'))data.data[k]=localStorage.getItem(k);}const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='barbell-log-backup-'+C.localDate()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function restoreBackup(event){try{
    const file=event.target.files[0];if(!file)return;if(file.size>5*1024*1024)throw new Error('Backup is too large.');const data=JSON.parse(await file.text());if(data.format!=='barbell-log-backup'||data.version!==1||!data.data||typeof data.data!=='object')throw new Error('Choose a Barbell Log backup.');
    const currentPending=PendingLifts.list();
    const restoredPending=JSON.parse(data.data.barbell_pending_lifts_v1||'[]');
    if(!Array.isArray(restoredPending))throw new Error('Invalid pending changes in backup.');
    data.data.barbell_pending_lifts_v1=JSON.stringify([...restoredPending.filter(i=>!currentPending.some(c=>c.id===i.id&&c.endpoint===i.endpoint)),...currentPending]);
    const entries=Object.entries(data.data);if(entries.some(([k,v])=>!k.startsWith('barbell_')||typeof v!=='string'))throw new Error('Invalid backup contents.');entries.forEach(([,v])=>JSON.parse(v));
    showConfirm('Restore this backup?','This replaces local settings and plans. Current pending saves are retained. Back up first. Spreadsheet rows are not changed.','Restore',()=>{try{const before=new Map(entries.map(([k])=>[k,localStorage.getItem(k)]));try{entries.forEach(([k,v])=>localStorage.setItem(k,v));}catch(e){before.forEach((v,k)=>v===null?localStorage.removeItem(k):localStorage.setItem(k,v));throw e;}location.reload();}catch(e){notifyError(e);}});
  }catch(e){notifyError(e);}finally{event.target.value='';}}
  window.TrainingApp={open:openTrain,render,begin,recap};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
