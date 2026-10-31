/* Calendar-aware smoothing; recorded points remain available for editing. */
(function(root){
 'use strict';
 const DAY=86400000,esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const time=date=>Date.parse(date+'T00:00:00Z');
 const month=t=>new Date(t).toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'});
 function smooth(rows){let previous;return rows.map((e,i)=>{const t=time(e.date),weight=Number(e.weight);const alpha=i?1-Math.exp(-(t-time(rows[i-1].date))/(30*DAY)):1;previous=i?previous+alpha*(weight-previous):weight;return{date:e.date,weight:previous};});}
 // Monotone cubic interpolation avoids drawing peaks beyond averaged values.
 function curve(points){if(!points.length)return'';if(points.length===1)return`M ${points[0].x} ${points[0].y}`;const slopes=points.slice(1).map((p,i)=>(p.y-points[i].y)/(p.x-points[i].x));const tangents=points.map((p,i)=>{if(!i)return slopes[0];if(i===points.length-1)return slopes.at(-1);const a=slopes[i-1],b=slopes[i];return a*b<=0?0:2*a*b/(a+b);});let d=`M ${points[0].x} ${points[0].y}`;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],h=(b.x-a.x)/3;d+=` C ${a.x+h} ${a.y+h*tangents[i-1]}, ${b.x-h} ${b.y-h*tangents[i]}, ${b.x} ${b.y}`;}return d;}
 function ticks(first,last){if(month(first)===month(last))return[{time:(first+last)/2,label:month(first),anchor:'middle'}];const count=last-first>180*DAY?4:3;const seen=new Set();return Array.from({length:count},(_,i)=>({time:first+(last-first)*i/(count-1),label:month(first+(last-first)*i/(count-1)),anchor:i===0?'start':i===count-1?'end':'middle'})).filter((t,i,a)=>{if(seen.has(t.label))return false;if(i>0&&i<a.length-1&&t.label===a.at(-1).label)return false;seen.add(t.label);return true;});}
 function render(rows,{unit='kg',convert=x=>x}={}){
  rows=rows.map(e=>({...e,weight:convert(Number(e.weight))}));
  if(!rows.length)return'<p class="studio-muted">Start logging to see your progress.</p>';
  const width=360,height=230,left=42,right=14,top=18,bottom=40,plot=width-left-right;
  const min=Math.max(0,Math.floor((Math.min(...rows.map(e=>Number(e.weight)))-5)/5)*5),max=Math.ceil((Math.max(...rows.map(e=>Number(e.weight)))+5)/5)*5;
  const first=time(rows[0].date),last=time(rows.at(-1).date),span=Math.max(DAY,last-first);
  const x=t=>rows.length===1?left+plot/2:left+(t-first)/span*plot,y=w=>height-bottom-(w-min)/(max-min)*(height-top-bottom);
  const pts=rows.map(e=>({e,x:x(time(e.date)),y:y(Number(e.weight))}));
  const trend=rows.length>=3?curve(smooth(rows).map(e=>({x:x(time(e.date)),y:y(e.weight)}))):'';
  const grid=[min,(min+max)/2,max].map(w=>`<line x1="${left}" x2="${width-right}" y1="${y(w)}" y2="${y(w)}" stroke="currentColor" opacity=".15"/><text x="${left-8}" y="${y(w)+4}" text-anchor="end" fill="currentColor" font-size="11">${Number(w.toFixed(1))}</text>`).join('');
  return `<div class="analytics-chart-legend"><span><i class="chart-recorded-key"></i>Daily heaviest</span>${trend?'<span><i class="chart-trend-key"></i>Smooth trend</span>':''}</div><svg class="analytics-chart" viewBox="0 0 ${width} ${height}" role="group" aria-label="Daily heaviest logged weight${trend?' with a 30-day smoothed average':''}; dates shown as month and year"><text x="${left-8}" y="10" text-anchor="end" fill="currentColor" font-size="10">${esc(unit)}</text>${grid}<polyline class="analytics-recorded-line" points="${pts.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="var(--accent)" stroke-opacity=".55" stroke-width="1.5"/>${trend?`<path class="analytics-smooth-line" d="${trend}" fill="none" stroke="var(--text)" stroke-width="3" stroke-linecap="round"/>`:''}${pts.map(({e,x,y})=>{const label=new Date(time(e.date)).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+' · '+e.weight+' '+unit+' · '+(root.buildLiftName?root.buildLiftName(e):e.base||'Lift');return`<a href="#" data-record="${esc(e.id)}" aria-label="${esc(label)}"><circle cx="${x}" cy="${y}" r="12" fill="transparent"/><circle cx="${x}" cy="${y}" r="3.5" fill="var(--accent)"/><title>${esc(label)}</title></a>`;}).join('')}${ticks(first,last).map(t=>`<text class="analytics-date-tick" x="${x(t.time)}" y="${height-12}" text-anchor="${t.anchor}" fill="currentColor" font-size="11">${t.label}</text>`).join('')}</svg><p class="chart-note">${trend?'Smooth trend: a 30-day exponential average of the daily heaviest sets.':'The smooth trend appears after three training days.'}</p>`;
 }
 root.AnalyticsChart={smooth,curve,ticks,render};
})(typeof window==='undefined'?globalThis:window);
