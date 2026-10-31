// Pending states are derived independently of rendering so fast successful saves
// can stay quiet while offline/error states remain immediately visible.
function syncStatusView(s){
 if(!s.online)return{text:'Offline · saved on phone',tone:'offline',action:s.pending?'pending':'settings'};
 if(s.database&&!s.signedIn)return{text:'Sign in to resume sync',tone:'attention',action:'settings'};
 if(s.writeError||s.readError||s.backupError)return{text:'Sync needs attention',tone:'attention',action:'pending'};
 if(s.pending)return{text:s.connected?`${s.pending} change${s.pending===1?'':'s'} waiting to sync`:'Saved on phone · connect to sync',tone:'waiting',action:s.connected?'pending':'settings'};
 if(s.connected&&s.backupSupported&&s.backupPending)return{text:'Plan backup pending',tone:'waiting',action:'settings'};
 return{text:'',tone:'quiet',action:'settings'};
}
(() => {
 let waitingSince=0,timer=0,current=null;
 function state(){const connection=AppData.status(),backup=CloudBackup.status(),items=PendingLifts.list();return{online:navigator.onLine!==false,connected:!!AppData.endpoint(),database:connection.selected,signedIn:connection.signedIn,pending:items.length,writeError:items.some(i=>i.error||i.conflict),readError:typeof _lastFetchError!=='undefined'&&_lastFetchError&&_lastFetchEndpoint===AppData.endpoint(),backupSupported:backup.supported,backupPending:backup.pending,backupError:backup.lastError||'',backup};}
 function details(){const s=state();if(!s.online)return'You are offline. Completed sets and edits remain saved on this phone and will retry when connectivity returns.';if(s.database&&!s.signedIn)return'Sign in to your app account in Settings to resume database sync. Pending changes remain on this phone.';if(s.writeError)return'One or more saved changes need attention. Review the phone and database versions below, or retry the connection.';if(s.readError)return'Could not refresh your data. Cached history and pending changes remain on this phone.';if(s.backupError)return'Your plan backup is still on this phone: '+s.backupError;if(s.pending)return'Changes remain saved on this phone until their destination confirms them.';if(s.backupPending&&s.backupSupported)return'Your latest plan changes are saved on this phone and waiting for backup confirmation.';if(!s.connected)return'Connect your database in Settings to sync across devices.';if(!s.backupSupported)return'Lift sync is available. Connect Supabase to back up plans and templates too.';return'Up to date. No changes are waiting for sync.';}
 function render(){const banner=document.getElementById('sync-status-banner'),button=document.getElementById('sync-status');if(!banner||!button)return;const s=state(),view=syncStatusView(s);current=view;
  clearTimeout(timer);let visible=!!view.text;
  if(view.tone==='waiting'){if(!waitingSince)waitingSince=Date.now();const remaining=1500-(Date.now()-waitingSince);if(remaining>0){visible=false;timer=setTimeout(render,remaining);}}
  else waitingSince=0;
  banner.hidden=!visible;document.getElementById('header').classList.toggle('has-sync-status',visible);button.textContent=view.text;button.dataset.tone=view.tone;button.setAttribute('aria-label',view.text+'. Open sync details');
  const line=document.getElementById('settings-sync-status');if(line)line.textContent=details();
 }
 function open(){if(current?.action==='pending')DatabaseUI.pending();else DatabaseUI.open();}
 function install(){document.getElementById('sync-status').onclick=open;const section=document.createElement('section');section.className='connection-status-settings';section.innerHTML='<h4>Data sync</h4><p id="settings-sync-status" role="status" aria-live="polite"></p><button class="studio-secondary wide" id="refresh-data-button">Refresh data</button>';document.getElementById('database-account').appendChild(section);section.querySelector('button').onclick=syncBoth;for(const event of ['pendingliftschange','cloudbackupchange','databasechange','settingschange','datasyncchange','online','offline'])window.addEventListener(event,render);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')render();});render();}
 window.SyncStatus={render,details,open,state};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
