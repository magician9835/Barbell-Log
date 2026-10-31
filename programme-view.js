/* Shared stage rows for Train previews and saved-record programmes. */
(function(root){
  'use strict';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function rows(items){return items.map(s=>`<div class="programme-row"><span>${esc(s.label)}</span><strong>${esc(s.load)}</strong><small>${esc(s.detail||'')}</small></div>`).join('');}
  function notes(e){let text=String(e.notes||'');if(e.structure?.length){const prefix=e.structure.map(c=>`${c.reps} ${WorkoutModel.name(c)}`).join(' + ');if(text.startsWith(prefix))text=text.slice(prefix.length).trim();}return text;}
  function record(e){
    const components=e.structure||[];
    const reps=components.length?components.map(c=>c.reps||1).join('+'):e.reps;
    const actual=`${e.sets||1} × ${components.length>1?'('+reps+')':reps||'—'}`;
    const p=e.programme;
    const stages=Array.isArray(p?.stages)?p.stages:[];
    const programme=stages.length?`<details class="record-programme"><summary>Programme · ${stages.length} stages${p.minutes?' · '+esc(p.minutes)+' min':''}</summary><div class="studio-preview">${rows(stages.map(s=>({label:`${s.sets} × ${s.reps.join('+')}`,load:s.actualWeight!=null?`${s.actualWeight} kg recorded`:s.plannedWeight!=null?`${s.plannedWeight} kg target`:'Load not recorded',detail:s.percent!=null?`${s.percent}% prescribed`:''})))}</div></details>`:'';
    const note=notes(e);
    const noteHTML=!note?'':note.length>100||note.includes('\n')||stages.length?`<details class="record-notes"><summary>Notes / coach cues</summary><p>${esc(note)}</p></details>`:`<p class="record-note">${esc(note)}</p>`;
    return `<div class="record-actual"><span>${esc(actual)}${components.length>1?' complex':' reps'}</span><small>Recorded</small></div>${programme}${noteHTML}`;
  }
  root.ProgrammeView={rows,notes,record};
})(typeof window==='undefined'?globalThis:window);
