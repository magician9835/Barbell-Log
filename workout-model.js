(function(root){
  'use strict';
  const id=()=>crypto.randomUUID(),copy=x=>JSON.parse(JSON.stringify(x));
  const date=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const session=s=>({'class':'Coached Class','coached class':'Coached Class','1:1':'1:1 Session','1:1 session':'1:1 Session','solo':'Solo','competition':'Competition','comp':'Competition'}[String(s||'').trim().toLowerCase()]||'');
  const sessionLabel=s=>({'Coached Class':'Class','1:1 Session':'1:1',Solo:'Solo',Competition:'Competition'}[session(s)]||'Not recorded');
  const bases=['Snatch','Clean','Jerk','Squat','Pull','Deadlift','Bench Press','Barbell Row','Pendlay Row','Other'];
  const component=(base='Snatch')=>({id:id(),base,position:[],receiving:'',grip:[],technique:base==='Squat'?['Back']:[],reps:1,cue:''});
  function name(c){const bits=[c.base==='Other'?(c.name||'Other'):c.base];if(c.receiving&&c.receiving!=='Squat (Full)'&&c.receiving!=='Split')bits.push(c.receiving);bits.push(...(c.grip||[]),...(c.technique||[]).filter(x=>!['Complex','2-Position'].includes(x)),...(c.position||[]));return bits.join(' · ');}
  const sequence=b=>b.rehearsal?(b.rehearsalLift||(b.components[0]?.base==='Snatch'?'Snatch':'Clean and Jerk')):b.components.map(name).join(' + ');
  function reference(b){if(b.components.some(c=>c.base==='Snatch'))return'Snatch';if(b.components.some(c=>c.base==='Clean')&&b.components.some(c=>c.base==='Jerk'))return'Clean and Jerk';const c=b.components.find(c=>c.base!=='Pull')||b.components[0];return c?.base==='Squat'?((c.technique||[]).includes('Front')?'Front squat':'Back squat'):c?.base==='Pull'&&(c.grip||[]).some(g=>g.startsWith('Snatch'))?'Snatch':c?.base==='Pull'&&(c.grip||[]).some(g=>g.startsWith('Clean'))?'Clean':c?.base||'Snatch';}
  const stage=(components,sets=1,percent=70)=>({id:id(),sets,mode:'percent',value:percent,reps:Object.fromEntries(components.map(c=>[c.id,c.reps||1]))});
  function block(){const components=[component()];return{id:id(),components,referenceLift:'Snatch',reference:'',minutes:20,stages:[stage(components)],warmups:true,warmupPlanVersion:2,notes:''};}
  function blank(type='class'){return{id:id(),schema:3,type,date:date(),session:type==='class'?'Coached Class':type==='lesson'?'1:1 Session':'Solo',loading:'gym',phase:'setup',blocks:[],done:{},skipped:[],notes:'',accessories:'',accessoriesDone:false,restEnd:0};}
  const title=w=>`${w.type==='opener'?'Opener rehearsal':sessionLabel(w.session)} · ${w.date}`;
  const gymPlates=[25,20,15,10,5,2.5,1.25];
  function gymLoads(){let sums=new Map([[0,[]]]);for(const plate of gymPlates){const next=new Map(sums);for(const [sum,used]of sums){const total=sum+plate,old=next.get(total);if(!old||used.length+1<old.length)next.set(total,[...used,plate]);}sums=next;}return [...sums].map(([side,plates])=>({weight:20+side*2,plates,bar:20,collars:0})).sort((a,b)=>a.weight-b.weight);}
  const loads=gymLoads();
  function load(raw,mode='gym',phase='work'){
    raw=Number(raw);if(!Number.isFinite(raw)||raw<0)throw new Error('Enter a positive weight.');
    if(mode==='competition'&&phase==='warmup'&&raw<26)return{requested:raw,weight:20,plates:[],bar:20,collars:0,limited:raw<20};
    if(mode==='competition'){const weight=Math.max(26,Math.round(raw));let side=(weight-25)/2;const plates=[];for(const p of [25,20,15,10,5,2.5,2,1.5,1,.5])while(side>=p-.001){plates.push(p);side=Math.round((side-p)*100)/100;}return{requested:raw,weight,plates,bar:20,collars:5,limited:raw<26};}
    const best=loads.reduce((best,x)=>Math.abs(x.weight-raw)<Math.abs(best.weight-raw)||Math.abs(x.weight-raw)===Math.abs(best.weight-raw)&&x.weight>best.weight?x:best,loads[0]);
    return{...best,plates:[...best.plates],requested:raw,limited:raw<20||raw>loads[loads.length-1].weight};
  }
  // Easy loading first: tens below the transition, fives near the target.
  // Only the last step may use change plates to close a gap above five kg.
  function warmupWeights(target,mode='gym',lift='Snatch'){
    target=Number(target);if(!Number.isFinite(target)||target<=20)return[];
    const minimum=mode==='competition'?26:22.5,weights=[20];
    const add=raw=>{const weight=load(raw,mode,'warmup').weight;if(weight<target&&weight>weights.at(-1))weights.push(weight);};
    const start=Math.max(mode==='competition'?30:25,Math.floor(target*.5/10)*10);
    add(start);
    const transition=Math.floor(Math.max(target*(lift==='Snatch'?.65:.8),target-(lift==='Snatch'?20:15))/5)*5;
    for(let i=0;i<40;i++){
      const current=weights.at(-1),step=current>=transition?5:10;
      let next=current<transition?Math.min(current+step,transition):current+step;
      // Do not overshoot a five-kilo step that fits below the working weight.
      if(next>=target&&step===10)next=current+5;
      if(next>=target)break;
      add(next);if(weights.at(-1)===current)break;
    }
    if(target-weights.at(-1)>5&&target>minimum){
      const close=mode==='competition'?Math.max(26,Math.ceil(target-5)):loads.find(x=>x.weight>=target-5&&x.weight<target)?.weight;
      if(close!==undefined)add(close);
    }
    return weights;
  }
  function legacyWarmups(b,work,mode){
    const first=work[0].weight,ceiling=b.rehearsal?first:Math.max(...work.map(s=>s.weight)),seen=new Set();
    return [{raw:20,reps:5},...[[.4,5],[.55,3],[.7,2],[.85,1]].map(([p,reps])=>({raw:ceiling*p,reps}))].map((s,i)=>{const loading=load(s.raw,mode,'warmup'),percent=loading.weight/(Number(b.reference)||ceiling||1)*100;return{key:`${b.id}-warm-${i}`,phase:'warmup',reps:b.components.length>1?[...work[0].reps]:[s.reps],percent,loading,weight:loading.weight,rest:rest(percent)};}).filter(s=>{if(s.weight>=first||seen.has(s.weight))return false;seen.add(s.weight);return true;});
  }
  function rest(percent){return percent<=50?0:percent<=65?45:percent<=80?75:120;}
  function working(b,mode){return b.stages.flatMap((s,index)=>{
    const raw=s.mode==='kg'?Number(s.value):Number(b.reference)*Number(s.value)/100;
    const loading=load(raw,mode),reference=Number(b.reference)||Math.max(...b.stages.filter(x=>x.mode==='kg').map(x=>Number(x.value)),1),percent=loading.weight/reference*100;
    return Array.from({length:Number(s.sets)},(_,repeat)=>({key:`${b.id}-${s.id}-${repeat}`,stageId:s.id,index,repeat,phase:'work',reps:b.components.map(c=>Number(s.reps[c.id]||1)),percent,loading,weight:loading.weight,rest:rest(percent)}));
  });}
  function expand(b,mode='gym'){
    const work=working(b,mode);if(!work.length)return work;
    const first=work[0].weight,lift=reference(b),warm=!b.warmups?[]:b.warmupPlanVersion===1?legacyWarmups(b,work,mode):warmupWeights(first,mode,lift).map((weight,i)=>{
      const percent=weight/(Number(b.reference)||first)*100,reps=weight===20?5:weight<=first*.5?5:weight<=first*.7?3:weight<=first*.8?2:1;
      return{key:`${b.id}-warm-${i}`,phase:'warmup',reps:b.components.length>1?[...work[0].reps]:[reps],percent,loading:load(weight,mode,'warmup'),weight,rest:rest(percent)};
    });
    const result=[...(b.rehearsal&&Array.isArray(b.rehearsalWarmups)?copy(b.rehearsalWarmups):warm),...work];if(b.rehearsal){const seconds=Number(b.restSeconds??180);if(!Number.isFinite(seconds)||seconds<60||seconds>600)throw Error('Choose 1–10 minutes of rehearsal recovery.');return result.map(s=>({...s,rest:s.phase==='warmup'&&s.percent<=50?0:seconds}));}const activeSeconds=result.reduce((n,s)=>n+Math.max(25,s.reps.reduce((a,r)=>a+r,0)*5+15),0);const maxRest=Math.max(30,Math.floor((Number(b.minutes)*60-activeSeconds)/Math.max(1,result.filter(s=>s.rest).length)));
    return result.map(s=>({...s,rest:Math.min(s.rest,maxRest,120)}));
  }
  function validate(w){if(!/^\d{4}-\d{2}-\d{2}$/.test(w.date))throw new Error('Choose a workout date.');if(!session(w.session)||session(w.session)==='Competition')throw new Error('Choose Class, 1:1 or Solo. Record actual competitions in Meets.');if(!w.blocks.length)throw new Error('Add a lift or complex first.');for(const b of w.blocks){if(b.rehearsal){const attempts=b.stages.map(s=>Number(s.value));if(b.stages.length>3||b.stages.some(s=>s.mode!=='kg'||Number(s.sets)!==1||!Number.isInteger(Number(s.value))||Number(s.value)<26)||attempts.some((n,i)=>i>0&&n<attempts[i-1]))throw Error('Use up to three whole-kilo attempts, staying the same or increasing.');const restSeconds=Number(b.restSeconds??180);if(!Number.isFinite(restSeconds)||restSeconds<60||restSeconds>600)throw Error('Use 1–10 minutes of rehearsal recovery.');}if(!b.components.length)throw new Error('Add a movement.');if(!b.stages.length)throw new Error('Add at least one working stage.');if(b.stages.some(s=>s.mode==='percent')&&!(Number(b.reference)>0))throw new Error(`Enter the ${b.referenceLift} reference max.`);for(const s of b.stages){if(!Number.isInteger(Number(s.sets))||s.sets<1||s.sets>30||!(Number(s.value)>0)||s.mode==='percent'&&s.value>150)throw new Error('Check the sets and weight / percentage.');if(b.components.some(c=>!Number.isInteger(Number(s.reps[c.id]))||s.reps[c.id]<1||s.reps[c.id]>30))throw new Error('Enter reps for every movement.');}if(!(b.minutes>0))throw new Error('Enter the block duration.');}return true;}
  const pending=w=>w.blocks.flatMap(b=>expand(b,w.loading).map(s=>({block:b,set:s}))).filter(x=>!w.done[x.set.key]&&!w.skipped.includes(x.set.key));
  function isWarmup(e){return !!e&&(e.phase==='warmup'||(!e.phase&&!!e.workoutId&&/(?:^|\n)(?:Class|Solo|1:1|Opener rehearsal) · \d{4}-\d{2}-\d{2} · Warm-up(?:\n|$)/.test(e.notes||'')));}
  function entry(w,b,s,weight,reps,note='',quality=null){
    weight=Number(weight);const counts=Array.isArray(reps)?reps.map(Number):String(reps).split('+').map(Number);
    if(!(weight>0)||!Number.isFinite(weight))throw new Error('Enter the actual weight.');if(counts.length!==b.components.length||counts.some(n=>!Number.isInteger(n)||n<1||n>30))throw new Error('Enter actual reps for each movement.');
    const components=b.components.map((c,i)=>({...copy(c),reps:counts[i]}));const cj=components.length===2&&components[0].base==='Clean'&&components[1].base==='Jerk';
    const primary=cj?'Clean and Jerk':components.find(c=>c.base==='Snatch')?.base||components.find(c=>c.base!=='Pull')?.base||components[0].base;
    const first=components.find(c=>c.base===primary)||components[0];const complex=components.length>1;
    return{id:`workout-${w.id}-${s.key}`,date:w.date,session:session(w.session),base:primary,position:complex?[]:[...(first.position||[])],receiving:cj?components[1].receiving||'Split':first.receiving||'',grip:complex?[]:[...(first.grip||[])],technique:complex&&!cj?['Complex']:[...(first.technique||[])],weight,sets:1,reps:counts.reduce((n,x)=>n+x,0),phase:s.phase==='warmup'?'warmup':'work',quality:s.phase!=='warmup'&&quality?Number(quality):null,structure:components,workoutId:w.id,...(s.stageId?{programme:{title:sequence(b),minutes:b.minutes,referenceLift:b.referenceLift,reference:Number(b.reference)||null,stages:b.stages.map(stage=>({sets:Number(stage.sets),reps:b.components.map(c=>Number(stage.reps[c.id]||1)),percent:stage.mode==='percent'?Number(stage.value):null,plannedWeight:load(stage.mode==='kg'?Number(stage.value):Number(b.reference)*Number(stage.value)/100,w.loading).weight,actualWeight:null}))}}:{}),
      notes:[components.map(c=>`${c.reps} ${name(c)}`).join(' + '),title(w)+' · '+(s.phase==='warmup'?'Warm-up':b.reference?s.percent.toFixed(0)+'% of '+b.referenceLift+' '+b.reference+' kg':weight+' kg'),...components.map(c=>c.cue).filter(Boolean),b.notes,note,w.notes].filter(Boolean).join('\n')};
  }
  function oldComponent(raw){const text=String(raw||'').toLowerCase();let c=component(text.includes('snatch')?'Snatch':text.includes('clean')?'Clean':text.includes('jerk')?'Jerk':text.includes('squat')?'Squat':'Other');if(text.includes('pull')){c.base='Pull';c.grip=[text.includes('snatch')?'Snatch Grip':'Clean Grip'];}if(text.includes('hang'))c.position=['Hang Above Knee'];if(text.includes('front'))c.technique=['Front'];if(text.includes('back'))c.technique=['Back'];if(text.includes('power'))c.receiving='Power';if(text.includes('pause'))c.technique.push('Pause');if(c.base==='Other')c.name=raw;return c;}
  function migrate(old){if(old?.schema===3){for(const b of old.blocks||[])b.warmupPlanVersion??=old.phase==='setup'?2:1;if(old.type==='opener'&&old.phase!=='finished'){old.loading='competition';old.session='Solo';(old.blocks||[]).forEach((b,i)=>{if(!b.rehearsal)return;const base=b.rehearsalLift||(i===0?'Snatch':'Clean and Jerk'),previous=b.components||[],bases=base==='Snatch'?['Snatch']:['Clean','Jerk'];b.rehearsalLift=base;b.components=bases.map((lift,n)=>({...component(lift),id:previous[n]?.id||id(),...(lift==='Jerk'?{receiving:'Split'}:{})}));b.stages=b.stages.map((s,n)=>({...s,attempt:s.attempt||n+1,mode:'kg',value:s.mode==='percent'?Math.floor(Number(b.reference)*Number(s.value)/100):s.value,sets:1,reps:Object.fromEntries(b.components.map(c=>[c.id,1]))}));b.referenceLift=base;b.reference=Number(b.stages[0]?.value)||b.reference;});}return old;}if(!old||!Array.isArray(old.blocks))return null;const w={...blank(session(old.session)==='Coached Class'?'class':'solo'),...copy(old),schema:3,loading:'gym',session:session(old.session)==='Competition'?'Solo':session(old.session)||'Coached Class'};w.blocks=old.blocks.map(o=>{const b=block();b.id=o.id||b.id;b.components=o.complex?(o.components||[o.title]).map(oldComponent):[{...component(o.base),position:(o.position?[o.position]:[]).map(p=>p==='Hang (unspecified)'?'Hang Above Knee':p),receiving:o.receiving||'',technique:o.squatType?[o.squatType]:[]}];b.referenceLift=o.referenceLift||reference(b);b.reference=o.reference||'';b.minutes=o.minutes||20;b.notes=o.notes||'';b.warmups=false;try{b.stages=String(o.prescription||'1 x 1 @ 70').split('\n').filter(Boolean).map(line=>{const m=line.match(/(\d+)\s*[x×]\s*([\d+]+)\s*@\s*([\d.]+)/i);if(!m)throw Error();return{...stage(b.components,Number(m[1]),Number(m[3])),reps:Object.fromEntries(b.components.map((c,i)=>[c.id,Number(m[2].split('+')[i]||1)]))};});}catch{b.stages=[stage(b.components)];}return b;});w.phase='setup';return w;}
  function parseText(text){const w=blank('class');let current;for(const raw of text.split('\n')){const line=raw.trim().replace(/[.;]+$/,'');if(!line)continue;const m=line.match(/^(\d+)\s*[x×]\s*(\d+(?:\s*\+\s*\d+)*)\s*@\s*(\d+(?:\.\d+)?)\s*%?$/i);if(m){if(!current)throw new Error('Add a movement heading before its sets.');const counts=m[2].split('+').map(Number);if(counts.length!==current.components.length)throw new Error('Rep counts must match the movement sequence.');current.stages.push({...stage(current.components,Number(m[1]),Number(m[3])),reps:Object.fromEntries(current.components.map((c,i)=>[c.id,counts[i]]))});}else{const minutes=line.match(/\((\d+)\s*min\)/i);const heading=line.replace(/^[A-Z]\)\s*/i,'').replace(/\([^)]*\)/g,'').trim();if(!heading||/accessor/i.test(heading))break;current=block();current.components=heading.replace(/clean\s*(?:and|&)\s*jerk|c\s*&\s*j/ig,'Clean + Jerk').split(/\s*\+\s*/).map(oldComponent);current.referenceLift=reference(current);current.minutes=minutes?Number(minutes[1]):20;current.stages=[];w.blocks.push(current);}}
    if(!w.blocks.length||w.blocks.some(b=>!b.stages.length))throw new Error('Check the transcription: movement heading, then sets x reps @ %.');return w;}
  function syncOpenerPlan(original,spec){
    if(original.type!=='opener'||original.phase==='finished')return original;
    const w=copy(original);
    for(const b of w.blocks){if(!b.rehearsal)continue;const base=b.rehearsalLift||(b.components[0]?.base==='Snatch'?'Snatch':'Clean and Jerk'),weights=spec[base];
      if(!Array.isArray(weights)||!(Number(weights[0])>=26))throw Error('Set both competition openers to at least 26 kg.');
      if(weights.some(n=>n!=null&&(!Number.isInteger(Number(n))||Number(n)<26)))throw Error('Competition attempts need whole kilos from 26 kg.');
      const before=expand(b,w.loading),covered=Object.keys(w.done||{}).some(k=>k.startsWith(b.id+'-'))||(w.skipped||[]).some(k=>k.startsWith(b.id+'-'));
      if(covered&&!Array.isArray(b.rehearsalWarmups))b.rehearsalWarmups=copy(before.filter(s=>s.phase==='warmup'));
      const stages=[],oldStages=b.stages,coveredWeight=[];
      for(let attempt=1;attempt<=3;attempt++){
        const old=oldStages.find(s=>s.attempt===attempt),key=old?`${b.id}-${old.id}-0`:'',done=w.done?.[key],keep=done||(w.skipped||[]).includes(key),n=weights[attempt-1];
        if(keep){stages.push(old);coveredWeight.push(Number(done?.weight??old.value));continue;}
        if(n==null)continue;
        if(coveredWeight.some(weight=>Number(n)<weight))throw Error('A new planned attempt is below a recorded rehearsal lift. Unlink to keep this rehearsal separate.');
        const next=old?{...old}: {...stage(b.components),mode:'kg',attempt};next.mode='kg';next.value=Number(n);next.sets=1;next.attempt=attempt;next.reps=Object.fromEntries(b.components.map(c=>[c.id,1]));stages.push(next);
      }
      b.stages=stages;b.reference=Number(stages[0]?.value)||b.reference;
      const after=new Map(expand(b,w.loading).map(s=>[s.key,s]));
      for(const old of before){const actual=w.actuals?.[old.key],next=after.get(old.key);if(actual&&next&&Number(actual.weight)===old.weight)actual.weight=next.weight;}
    }
    validate(w);return w;
  }
  function opener(spec){const w=blank('solo');w.type='opener';w.loading='competition';w.date=spec.date||date();w.blocks=['Snatch','Clean and Jerk'].map(base=>{const opener=Number(spec[base]?.[0]);if(!(opener>=26))throw new Error('Enter both opener weights, at least 26 kg with plates and collars.');const attempts=spec[base].filter(Boolean).map(Number);if(attempts.some((n,i)=>!Number.isInteger(n)||i>0&&n<attempts[i-1]))throw new Error('Use whole kilos with attempts staying the same or increasing.');const b=block();b.components=base==='Snatch'?[component('Snatch')]:[component('Clean'),{...component('Jerk'),receiving:'Split'}];b.referenceLift=base;b.reference=opener;b.rehearsal=true;b.rehearsalLift=base;b.restSeconds=180;b.minutes=spec.minutes||20;b.stages=spec[base].map((n,i)=>({n,attempt:i+1})).filter(x=>x.n).map(({n,attempt})=>({...stage(b.components,1,100),mode:'kg',value:Number(n),attempt}));return b;});return w;}
  root.WorkoutModel={id,copy,date,session,sessionLabel,bases,component,name,sequence,reference,stage,block,blank,title,load,loads,warmupWeights,rest,working,expand,validate,pending,isWarmup,entry,migrate,parseText,opener,syncOpenerPlan};
})(typeof window!=='undefined'?window:globalThis);
