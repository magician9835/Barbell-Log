/* A compact view over saved sets; original rows remain editable and unchanged. */
(function(root){
 'use strict';
 const repKey=e=>(e.structure?.length?e.structure.map(c=>c.reps||1):[e.reps||1]).join('+');
 function groups(entries){
  const map=new Map();
  for(const e of entries){
   const identity=root.RecordBests.key(e)||e.id;
   const key=JSON.stringify([e.date,root.WorkoutModel.session(e.session)||e.session||'',e.workoutId||'',identity]);
   if(!map.has(key))map.set(key,[]);map.get(key).push(e);
  }
  return [...map.values()].map(rows=>{
   const warm=rows.filter(root.WorkoutModel.isWarmup),work=rows.filter(e=>!root.WorkoutModel.isWarmup(e));
   const successful=work.filter(e=>e.made!==false&&e.success!==false);
   const candidates=successful.length?successful:work.length?work:warm;
   const top=[...candidates].sort((a,b)=>Number(b.weight)-Number(a.weight)||Number(b.reps||1)-Number(a.reps||1))[0];
   const topSets=candidates.filter(e=>Number(e.weight)===Number(top.weight)&&repKey(e)===repKey(top)).reduce((n,e)=>n+(Number(e.sets)||1),0);
   return{top,topSets,entries:rows,warmups:warm.reduce((n,e)=>n+(Number(e.sets)||1),0),setCount:rows.reduce((n,e)=>n+(Number(e.sets)||1),0),workSets:work.length,warmupOnly:!work.length};
  });
 }
 root.LogSummary={groups,repKey};
})(typeof window==='undefined'?globalThis:window);
