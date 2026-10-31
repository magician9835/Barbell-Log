/* Medal comparisons use movement identity, never session type or storage format. */
(function(root){
 'use strict';
 const clean=x=>String(x||'').trim(),list=x=>[...new Set((Array.isArray(x)?x:typeof x==='string'?x.split(' + '):[]).map(clean).filter(Boolean))].sort();
 const localDate=()=>{const d=new Date();return[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 function movement(c){const base=clean(c.base),name=base==='Other'?clean(c.name):'';if(!base||base==='Other'&&!name)return null;const position=list(c.position).map(x=>x==='Hang (unspecified)'?'Hang Above Knee':x).filter(x=>x!=='Floor'&&!(base==='Jerk'&&x==='Rack'));let receiving=clean(c.receiving);if(['Snatch','Clean'].includes(base)&&['','Squat (Full)','Squat','Full'].includes(receiving))receiving='';if(base==='Jerk'&&!receiving)receiving='Split';return[base,name,position,list(c.grip),list(c.technique),receiving];}
 function components(e){if(Array.isArray(e.structure)&&e.structure.length)return e.structure;const base=e.base||e.lift;if(base==='Clean and Jerk')return[{base:'Clean',position:e.position||[],grip:e.grip||[],technique:e.technique||[],receiving:'',reps:1},{base:'Jerk',position:[],grip:[],technique:[],receiving:e.receiving||'Split',reps:1}];return[{...e,base,reps:e.reps||1}];}
 function key(e){const cs=components(e),ms=cs.map(movement);if(ms.some(x=>!x))return null;if(ms.length===1)return JSON.stringify(['single',ms[0]]);const cj=ms.length===2&&ms[0][0]==='Clean'&&ms[1][0]==='Jerk'&&Number(cs[0].reps||1)===Number(cs[1].reps||1);return JSON.stringify(cj?['clean-and-jerk',...ms]:['complex',...ms.map((m,i)=>[m,Number(cs[i].reps)||1])]);}
 function observations(entries=[],meets=[],pbs=[],today=localDate()){
  const out=[],rows=[...new Map(entries.filter(Boolean).map((e,i)=>[e.id||'row-'+i,e])).values()];
  const valid=e=>!e.deleted&&e.made!==false&&e.success!==false&&Number.isFinite(Number(e.weight))&&Number(e.weight)>0&&(!e.date||e.date<=today);
  function add(e,eligible,source,sourceId){if(!valid(e))return;const k=key(e);if(k)out.push({key:k,weight:Number(e.weight),date:e.date||'',id:e.id||'',eligible,source,sourceId});const cs=components(e);if(cs.length>1)for(const c of cs){const ck=key({...c,structure:undefined});if(ck&&ck!==k)out.push({key:ck,weight:Number(e.weight),date:e.date||'',id:'',eligible:false,source,sourceId});}}
  rows.forEach((e,i)=>add(e,!!e.id&&e.phase!=='warmup'&&!(e.workoutId&&!e.phase&&/(?:^|\n)(?:Class|Solo|1:1|Opener rehearsal) · \d{4}-\d{2}-\d{2} · Warm-up(?:\n|$)/.test(e.notes||'')),'log',e.id||'row-'+i));
  for(const [i,m]of meets.entries())for(const [name,base]of [['snatch','Snatch'],['cj','Clean and Jerk']])for(const [j,a]of (m[name]||[]).entries())if(a?.made===true)add({base,date:m.date,weight:a.weight},false,'meet',m.id||'meet-'+i+'-'+j);
  for(const [i,p]of pbs.entries()){
   // Settings PBs also contain derived base-only caches. Do not reinterpret a
   // known hang/complex source as a new full-movement historical baseline.
   if(p.date&&rows.some(e=>valid(e)&&e.date===p.date&&e.base===p.lift&&Number(e.weight)===Number(p.weight)))continue;
   if(p.date&&meets.some(m=>m.date===p.date&&((p.lift==='Snatch'?m.snatch:p.lift==='Clean and Jerk'?m.cj:[])||[]).some(a=>a?.made===true&&Number(a.weight)===Number(p.weight))))continue;
   add({...p,base:p.lift||p.base},false,'seed','seed-'+i);
  }
  return out;
 }
 function badges(entries=[],meets=[],pbs=[],today){const groups=new Map();for(const o of observations(entries,meets,pbs,today)){const group=groups.get(o.key)||[];group.push(o);groups.set(o.key,group);}const ids=new Set();for(const group of groups.values()){const max=Math.max(...group.map(o=>o.weight)),best=group.filter(o=>o.weight===max).sort((a,b)=>a.date.localeCompare(b.date)||Number(b.eligible)-Number(a.eligible)||String(a.id).localeCompare(String(b.id)));const first=best[0];if(first?.eligible)ids.add(first.id);}return ids;}
 root.RecordBests={movement,components,key,observations,badges};
})(typeof window==='undefined'?globalThis:window);
