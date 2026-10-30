(function(root){
  'use strict';
  const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const id=()=>crypto.randomUUID();
  const clone=value=>JSON.parse(JSON.stringify(value));
  function parsePrescription(text){
    const lines=text.trim().split(/\n/).filter(s=>s.trim());
    if(!lines.length)throw new Error('Add at least one line of sets.');
    return lines.map(line=>{
      const m=line.trim().match(/^(\d+)\s*[x×]\s*(\d+(?:\s*\+\s*\d+)*)\s*@\s*(\d+(?:\.\d+)?)\s*%?$/i);
      if(!m)throw new Error('Use sets x reps @ percent, for example 3 x 2 @ 80.');
      const step={sets:Number(m[1]),reps:m[2].split('+').map(Number),percent:Number(m[3])};
      if(step.sets<1||step.sets>30||step.reps.some(n=>n<1||n>30)||step.percent<1||step.percent>150)throw new Error('Check the sets, reps and percentage.');
      return step;
    });
  }
  function expand(block){
    return parsePrescription(block.prescription).flatMap((step,stage)=>Array.from({length:step.sets},(_,repeat)=>({
      key:block.id+'-'+stage+'-'+repeat,stage,repeat,percent:step.percent,reps:step.reps,
      weight:Math.round((Number(block.reference)||0)*step.percent/100/(Number(block.increment)||0.5))*(Number(block.increment)||0.5)
    })));
  }
  function block(base,referenceLift,prescription,extra={}){
    return {id:id(),base,referenceLift,prescription,reference:'',minutes:20,rest:120,increment:0.5,position:'',receiving:'',notes:'',...extra};
  }
  function classTemplate(){return {
    id:id(),date:localDate(),session:'Coached Class',title:'Class workout',phase:'setup',notes:'',done:{},skipped:[],restEnd:0,
    accessories:'3 rounds · lateral raises × 10 · loaded alternating movement × 10 (check with coach)',accessoriesDone:false,
    blocks:[
      block('Snatch','Snatch','1 x 1+2 @ 70\n1 x 1+2 @ 75\n1 x 1+2 @ 80\n3 x 1+1 @ 85',{complex:true,title:'Snatch pull + hang snatch',position:'Hang Above Knee',components:['Snatch pull','Hang snatch']}),
      block('Clean','Clean','1 x 2 @ 70\n1 x 2 @ 75\n2 x 2 @ 80\n2 x 1 @ 85',{title:'Clean'}),
      block('Squat','Front squat','1 x 5 @ 70\n1 x 3 @ 80\n1 x 2 @ 85\n2 x 1 @ 90',{title:'Front squat',squatType:'Front',minutes:12})
    ]};}
  function empty(session='Solo'){return {id:id(),date:localDate(),session,title:session==='1:1 Session'?'1:1 lesson':'My workout',phase:'setup',notes:'',done:{},skipped:[],restEnd:0,accessories:'',accessoriesDone:false,blocks:[block('Snatch','Snatch','3 x 2 @ 70',{title:'Snatch'})]};}
  function findReference(lift,entries,saved=[]){
    const isFront=lift==='Front squat';const isBack=lift==='Back squat';
    const base=isFront||isBack?'Squat':lift;
    const matching=entries.filter(e=>e.base===base&&e.weight>0&&
      !(e.position||[]).some(p=>p!=='Floor')&&
      !['Power','Muscle'].includes(e.receiving)&&
      (isFront||isBack?(e.technique||[]).includes(isFront?'Front':'Back'):!(e.technique||[]).length));
    if(matching.length)return {weight:Math.max(...matching.map(e=>Number(e.weight))),source:'Best logged full movement'};
    const fallback=!isFront&&!isBack&&saved.find(p=>p.lift===lift&&p.weight>0);
    return fallback?{weight:Number(fallback.weight),source:'Saved reference — check before starting'}:{weight:null,source:'Enter your reference max'};
  }
  function validate(workout){
    if(!workout.blocks.length)throw new Error('Add a lift first.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(workout.date))throw new Error('Choose a workout date.');
    workout.blocks.forEach(b=>{
      if(!(Number(b.reference)>0))throw new Error('Enter a reference max for '+b.title+'.');
      if(!(Number(b.increment)>0))throw new Error('Choose a rounding increment.');
      const sets=expand(b);
      if(b.complex&&sets.some(s=>s.reps.length!==2))throw new Error('This complex needs two rep counts, such as 1+2.');
      if(!b.complex&&sets.some(s=>s.reps.length!==1))throw new Error('Use a single rep count for '+b.title+'.');
      if(sets.some(s=>s.weight<=0))throw new Error('Check calculated weights for '+b.title+'.');
    });return true;
  }
  function pending(workout){return workout.blocks.flatMap(b=>expand(b).map(s=>({block:b,set:s}))).filter(x=>!workout.done[x.set.key]&&!workout.skipped.includes(x.set.key));}
  function toEntry(workout,b,set,weight,reps,note='',quality=null){
    if(!(Number(weight)>0)||!Number.isFinite(Number(weight)))throw new Error('Enter the weight you actually lifted.');
    const actual=String(reps).split('+').map(Number);
    if(actual.length!==(b.complex?2:1)||actual.some(r=>!Number.isInteger(r)||r<1||r>30))throw new Error(b.complex?'Use reps like 1+2.':'Enter the completed reps.');
    const description=b.complex?actual.map((n,i)=>n+' '+b.components[i]).join(' + '):actual[0]+' '+b.title;
    return {id:'workout-'+workout.id+'-'+set.key,date:workout.date,session:workout.session,base:b.base,
      position:b.position?[b.position]:[],receiving:b.receiving||'',grip:[],technique:b.complex?['Complex']:(b.squatType?[b.squatType]:[]),
      weight:Number(weight),sets:1,reps:actual.reduce((a,n)=>a+n,0),quality:quality?Number(quality):null,
      notes:[description,workout.title+' · '+set.percent+'% of '+b.referenceLift+' reference '+b.reference+' kg',b.notes,note,workout.notes].filter(Boolean).join('\n')};
  }
  root.TrainingCore={id,clone,localDate,parsePrescription,expand,block,classTemplate,empty,findReference,validate,pending,toEntry};
})(typeof window!=='undefined'?window:globalThis);
