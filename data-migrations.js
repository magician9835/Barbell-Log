(() => {
  const flag='barbell_cleanup_20261030_v1';
  if(localStorage.getItem(flag))return;
  const test=e=>e&&e.date==='2026-10-30';
  try{
    const read=(k,fallback)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(fallback));
    for(const k of ['barbell_last_entries_v1'])localStorage.setItem(k,JSON.stringify(read(k,[]).filter(e=>!test(e))));
    localStorage.setItem('barbell_pending_lifts_v1',JSON.stringify(read('barbell_pending_lifts_v1',[]).filter(i=>!test(i.entry))));
    const settings=read('barbell_settings_v1',{});
    settings.pbs=(settings.pbs||[]).filter(e=>!test(e));settings.meets=(settings.meets||[]).filter(e=>!test(e));settings.bwLog=(settings.bwLog||[]).filter(e=>!test(e));
    if(!settings.comp?.date)settings.comp={name:'Lift Off Autumn 2026',date:'2026-11-08',location:'CrossFit Tufnell Park, London'};
    localStorage.setItem('barbell_settings_v1',JSON.stringify(settings));
    const workout=read('barbell_training_v2',null);if(test(workout))localStorage.removeItem('barbell_training_v2');
    localStorage.setItem('barbell_training_history_v2',JSON.stringify(read('barbell_training_history_v2',[]).filter(w=>!test(w))));
    localStorage.setItem(flag,'true');
  }catch(error){console.warn('Test-data cleanup could not complete:',error.message);}
})();
