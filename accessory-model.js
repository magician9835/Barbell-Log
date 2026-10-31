(function(root){
 'use strict';const copy=x=>JSON.parse(JSON.stringify(x)),id=()=>crypto.randomUUID();
 const exercise=(name,weight,reps,extra={})=>({id:id(),name,weight,reps,unit:'kg',dumbbells:2,eachSide:false,cue:'',...extra});
 function overhead(date){return{id:id(),schema:1,date,session:'Solo',type:'accessory',phase:'setup',title:'Overhead + Biceps',index:0,done:{},actuals:{},notes:'',timerEnd:0,timerKind:'',blocks:[
 {id:id(),kind:'timer',name:'Row warm-up',minutes:10,cue:'Easy to moderate. Nose-breathe if you can.'},
 {id:id(),kind:'checklist',name:'T-spine mobility',minutes:3,items:[
  {id:id(),name:'Foam roller thoracic extensions',reps:'8 slow reps',cue:'Roller under mid-back, hands behind head. Exhale as you arch back over it.'},
  {id:id(),name:'Quadruped thread-the-needle',reps:'6 each side',cue:'Hands and knees. Thread one arm under the other; rest shoulder and ear on the floor.'},
  {id:id(),name:'Open books',reps:'6 each side',cue:'Side-lying, knees stacked at 90°. Rotate the top arm open; keep the bottom knee pinned.'}]},
 {id:id(),kind:'checklist',name:'Shoulder prep',minutes:3,items:[
  {id:id(),name:'Band pull-aparts',reps:'15',cue:''},{id:id(),name:'Wall slides',reps:'10',cue:''},{id:id(),name:'Cuban press',reps:'10 · light DBs, 5–10 lb each',cue:'Upright row to elbow height, rotate to goalposts, press overhead, then reverse.'}]},
 {id:id(),kind:'strength',name:'Half-kneeling single-arm DB press',sets:3,rest:75,exercises:[exercise('Half-kneeling single-arm DB press',14,8,{eachSide:true,dumbbells:1,tempo:3,cue:'Lower for 3 seconds. Ribs stacked over hips; squeeze the glute of your back leg.'})]},
 {id:id(),kind:'strength',name:'Seated strict DB press',sets:3,rest:75,exercises:[exercise('Seated strict DB press',10,8,{cue:'Bench upright, feet planted, no leg drive. Control the descent.'})]},
 {id:id(),kind:'superset',name:'Biceps superset',sets:3,rest:60,exercises:[exercise('Incline DB curl',10,10,{cue:'Bench at 45–60°. Let arms hang back.'}),exercise('Hammer curl',8,10,{cue:'Neutral grip, palms facing each other.'})]}
 ]};}
 const loadBasis=e=>e.equipment==='plate'||e.weightBasis==='per plate'?'plate':'dumbbell';
 const loadLabel=e=>`${e.unit||'kg'} per ${loadBasis(e)}`;
 const loadShort=e=>`${e.unit||'kg'}/${loadBasis(e)==='plate'?'plate':'DB'}`;
 const steps=w=>w.blocks.flatMap(b=>Array.from({length:b.sets||1},(_,round)=>({block:b,round,key:b.id+'-'+round})));
 const current=w=>steps(w)[w.index]||null;
 function validate(w){if(!/^\d{4}-\d{2}-\d{2}$/.test(w.date))throw Error('Choose a date.');for(const b of w.blocks){if(b.exercises){if(!Number.isInteger(Number(b.sets))||b.sets<1||b.sets>12)throw Error('Use 1–12 sets or rounds.');if(b.rest<0||b.rest>120)throw Error('Rest must be between 0 and 120 seconds.');for(const e of b.exercises){if(!(Number(e.weight)>0)||e.weight>200||!Number.isInteger(Number(e.reps))||e.reps<1||e.reps>50)throw Error('Check dumbbell weights and reps.');}}else if(!(b.minutes>0)||b.minutes>60)throw Error('Choose a warm-up duration between 1 and 60 minutes.');}return true;}
 function actuals(step){return step.block.exercises.map(e=>({name:e.name,weight:Number(e.weight),unit:e.unit,equipment:e.equipment||'dumbbell',weightBasis:e.weightBasis||'per '+loadBasis(e),plateCount:e.plateCount??null,dumbbells:e.dumbbells,eachSide:e.eachSide,reps:Number(e.reps),left:Number(e.reps),right:Number(e.reps),tempo:e.tempo||null,cue:e.cue}));}
 function entry(w,step,actual,note=''){if(!step.block.exercises)throw Error('Preparation is a checklist, not a lift record.');const exercises=copy(actual);for(const e of exercises){if(!(Number(e.weight)>0)||!['kg','lb'].includes(e.unit))throw Error('Enter the actual weight for each exercise.');for(const r of e.eachSide?[e.left,e.right]:[e.reps])if(!Number.isInteger(Number(r))||r<1||r>50)throw Error('Enter actual reps for each side or exercise.');e.weight=Number(e.weight);e.reps=Number(e.reps);if(e.eachSide){e.left=Number(e.left);e.right=Number(e.right);}}
 return{id:'accessory-'+w.id+'-'+step.key,date:w.date,session:'Solo',name:step.block.name,workoutId:w.id,recordedAt:new Date().toISOString(),block:step.block.kind,round:step.round+1,weight:exercises[0].weight,exercises,notes:[note,w.notes].filter(Boolean).join('\n')};}
 function repeat(template,date){const w=copy(template);w.id=id();w.date=date;w.phase='setup';w.index=0;w.done={};w.actuals={};w.timerEnd=0;w.timerKind='';return w;}
 root.AccessoryModel={copy,id,loadBasis,loadLabel,loadShort,overhead,steps,current,validate,actuals,entry,repeat};
})(typeof window!=='undefined'?window:globalThis);
