/* Competition timing is a plan around attempts, not a two-minute rest cap. */
(function(root){
 'use strict';
 const number=(v,f)=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):f;
 const clock=(time,minutes)=>{if(!/^\d{2}:\d{2}$/.test(time||''))return'';const [h,m]=time.split(':').map(Number),t=((Math.round(h*60+m+minutes)%1440)+1440)%1440;return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
 function suggest(opener,key='sn'){
  opener=Math.floor(Number(opener));if(!Number.isFinite(opener)||opener<26)return[];
  return root.WorkoutModel.warmupWeights(opener,'competition',key==='sn'?'Snatch':'Clean and Jerk').map(weight=>({
   id:'suggested-'+key+'-'+weight,weight,
   reps:weight===20?3:weight<=opener*.5?(key==='sn'?3:2):weight<=opener*.7&&key==='sn'?2:1
  }));
 }
 function validSteps(steps,opener){if(!Array.isArray(steps)||!steps.length)throw Error('Add at least one warm-up.');if(steps.length>20)throw Error('Keep the ladder to 20 warm-up sets.');const ids=new Set();for(const s of steps){if(!s.id||ids.has(s.id))throw Error('Warm-up set IDs must be unique.');ids.add(s.id);if(!Number.isInteger(Number(s.weight))||(Number(s.weight)!==20&&Number(s.weight)<26)||Number(s.weight)>=Number(opener))throw Error('Use a 20 kg bare bar or whole kilos from 26 kg, below your opener.');if(!Number.isInteger(Number(s.reps))||s.reps<1||s.reps>10)throw Error('Use 1–10 reps.');}return true;}
 function schedule(steps,{pace=1,finalOut=3,spacing=3,initialOut=null,start='',live=null,now=Date.now()}={}){
  pace=number(pace,1);finalOut=number(finalOut,3);spacing=number(spacing,3);
  if(pace<.5||pace>3||!Number.isInteger(finalOut)||finalOut<1||finalOut>10||!Number.isInteger(spacing)||spacing<1||spacing>6)throw Error('Check timing preferences.');
  initialOut=number(initialOut,null);if(initialOut!==null&&(!Number.isInteger(initialOut)||initialOut<0||initialOut>150))throw Error('Count 0–150 platform attempts before your opener.');const hasLive=live&&Number.isInteger(live.remaining)&&live.remaining>=0&&Number.isFinite(live.at);
  const eta=hasLive?(Number.isFinite(live.anchor)?live.anchor:live.at)+live.remaining*pace*60000:null;
  return steps.map((s,i)=>{const out=finalOut+(steps.length-1-i)*spacing,at=hasLive?eta-out*pace*60000:null;return{...s,out,clock:hasLive?new Date(at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):initialOut!==null&&start?clock(start,(initialOut-out)*pace):'',at,minutesTo:at===null?null:(at-now)/60000};});
 }
 function liveForSession(live,start,date){if(!live)return null;const scheduled=/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&/^\d{2}:\d{2}$/.test(start||'')?new Date(date+'T'+start+':00').getTime():NaN;return{...live,anchor:Number.isFinite(scheduled)?Math.max(live.at,scheduled):live.at};}
 function status(rows,done={},live=null){const next=rows.find(s=>!done[s.id]);if(!next)return{state:'ready',next:null};if(!live||live.anchor>Date.now())return{state:'planned',next};if(live.remaining===0)return{state:'called',next};return{state:live.remaining>next.out?'wait':live.remaining===next.out?'due':'behind',next};}
 function startCJ(start,total,pace=1,breakMins=10,override=''){if(override)return override;total=number(total,null);return start&&total!==null&&Number.isInteger(total)&&total>0&&total<=40?clock(start,total*3*number(pace,1)+number(breakMins,10)):'';}
 root.CompetitionWarmupModel={number,clock,suggest,validSteps,schedule,status,startCJ,liveForSession};
})(typeof window==='undefined'?globalThis:window);
