import os, shutil
"""Real Supabase JS client + fake Auth/RPC transport. Never touches live data."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time,base64,hmac,hashlib,mimetypes
root=Path(__file__).resolve().parents[1]
out=Path(os.environ.get('BARBELL_ARTIFACTS',str(root/'.artifacts')))/'database';out.mkdir(parents=True,exist_ok=True)
uid='11111111-1111-4111-8111-111111111111';email='owner@example.test'
def jwt():
 def b(x):return base64.urlsafe_b64encode(json.dumps(x).encode()).rstrip(b'=')
 raw=b({'alg':'HS256','typ':'JWT'})+b'.'+b({'sub':uid,'aud':'authenticated','role':'authenticated','email':email,'iat':int(time.time()),'exp':int(time.time())+3600})
 return (raw+b'.'+base64.urlsafe_b64encode(hmac.new(b'test-fixture',raw,hashlib.sha256).digest()).rstrip(b'=')).decode()
seed={'id':'legacy-snatch','date':'2026-10-25','session':'Coached Class','base':'Snatch','position':['Hang Above Knee'],'receiving':'Squat (Full)','grip':[],'technique':[],'weight':65,'sets':1,'reps':1,'quality':4,'notes':'Realistic fake legacy row'}
rows={('lift',seed['id']):{'data':seed.copy(),'revision':1,'deleted':False}};states={};mutations={};calls=[];offline=False;sheet_posts=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('BARBELL_BROWSER_PATH') or shutil.which('chromium') or None,args=['--no-sandbox']);page=browser.new_page(viewport={'width':402,'height':812},is_mobile=True,has_touch=True);page.set_default_timeout(7000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""localStorage.setItem('barbell_cleanup_20261030_v1','true');Object.defineProperty(navigator,'onLine',{get:()=>localStorage.getItem('__test_offline')!=='1',configurable:true});""")
 def response(route,data,status=200):route.fulfill(status=status,content_type='application/json',headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'},body=json.dumps(data))
 def serve(route):
  global offline
  url=route.request.url
  if url.startswith('https://cyfqbfebiwauyuygdtsi.supabase.co/'):
   if offline:route.abort();return
   data=json.loads(route.request.post_data or '{}');name=url.split('/rest/v1/rpc/')[-1];calls.append((name,data))
   if '/auth/v1/token' in url:
    response(route,{'access_token':jwt(),'refresh_token':'test-refresh','expires_in':3600,'token_type':'bearer','user':{'id':uid,'email':email,'email_confirmed_at':'2026-10-31T00:00:00Z','app_metadata':{'provider':'email'},'user_metadata':{},'aud':'authenticated','role':'authenticated'}});return
   if '/auth/v1/' in url:response(route,{});return
   if name=='barbell_claim_history':response(route,{'success':True,'imported':1});return
   if name=='barbell_import_legacy':
    for e in data['p_data'].get('entries',[]):rows.setdefault(('lift',e['id']),{'data':e,'revision':1,'deleted':False})
    response(route,{'success':True,'imported':0});return
   if name=='barbell_get_all':
    body={'entries':[],'meets':[],'bw':[],'accessories':[],'apiVersion':4,'appState':states.copy()}
    for (kind,rid),r in rows.items():
     if not r['deleted']:body[{'lift':'entries','meet':'meets','bodyweight':'bw','accessory':'accessories'}[kind]].append({**r['data'],'revision':r['revision']})
    response(route,body);return
   if name=='barbell_save_snapshot':
    states[data['p_key']]={'id':data['p_id'],'key':data['p_key'],'value':data['p_value'],'updatedAt':str(time.time())};response(route,{'saved':True,'id':data['p_id']});return
   if name=='barbell_apply_change':
    token=data['p_token']
    if token in mutations:response(route,mutations[token]);return
    action=data['p_action'];kind={'updateEntry':'lift','deleteEntry':'lift','saveAccessory':'accessory','deleteAccessory':'accessory','saveMeet':'meet','deleteMeet':'meet','logBW':'bodyweight'}[action];payload=data['p_payload'];key=(kind,payload['id']);old=rows.get(key);deleting=action.startswith('delete')
    if old and old['data']!=payload and data['p_expected_revision']!=old['revision']:
     response(route,{'success':False,'conflict':True,'id':payload['id'],'current':{**old['data'],'revision':old['revision'],'deleted':old['deleted']}});return
    revision=(old['revision'] if old else 0)+1;rows[key]={'data':payload,'revision':revision,'deleted':deleting};ack={'success':True,'id':payload['id'],'revision':revision,'deleted':deleting};mutations[token]=ack;response(route,ack);return
   response(route,{'error':'Unexpected RPC '+name},400);return
  if url.startswith('http://localhost:8000/sheet'):
   if route.request.method=='POST':sheet_posts.append(route.request.post_data)
   response(route,{'entries':[seed],'meets':[],'bw':[]});return
  if url.startswith('http://localhost:8000/'):
   file=root/url.split('localhost:8000/')[1].split('?')[0]
   if file.is_file():route.fulfill(content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream',body=file.read_bytes());return
  route.abort()
 page.route('**/*',serve)
 page.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded')
 page.evaluate("""()=>{saveSettingsData({...loadSettings(),sheetsUrl:'http://localhost:8000/sheet'});PendingLifts.queue('updateEntry',{id:'phone-only',date:'2026-10-31',session:'Solo',base:'Clean',weight:75,sets:1,reps:1,position:[],grip:[],technique:[],notes:'Queued before migration'},'http://localhost:8000/sheet');}""")
 page.locator('#tabs .tab').nth(4).click();page.locator('[name=db-email]').fill(email);page.locator('[name=db-password]').fill('test-password-never-real');page.locator('#database-sign-in').click()
 try:page.wait_for_function("AppData.usesDatabase() && PendingLifts.list().length===0 && !AppData.status().activating")
 except Exception:
  print('MIGRATION DEBUG',page.evaluate('AppData.status()'),page.locator('[data-db-message]').inner_text(),[name for name,args in calls],page.evaluate('PendingLifts.list()'));raise
 assert not sheet_posts,sheet_posts
 assert rows[('lift','phone-only')]['data']['weight']==75
 assert page.evaluate('AppData.endpoint()').endswith(uid)
 assert page.evaluate("JSON.parse(localStorage.barbell_before_database_v4).data.barbell_pending_lifts_v1")
 page.wait_for_function('!!CloudBackup.status().lastConfirmed');page.wait_for_function('document.getElementById("sync-status-banner").hidden')
 assert page.locator('#syncBtn').count()==0
 header_height=page.locator('#header').bounding_box()['height']
 assert page.locator('#refresh-data-button').is_visible()
 # Settings expose the active account and backups without retired setup UI.
 settings=page.locator('#pane-settings')
 assert page.locator('#sheetsUrl').count()==0
 assert page.locator('.legacy-connector').count()==0
 assert page.locator('#database-copy-app-url').count()==0
 assert page.locator('[data-db-activate]').is_hidden()
 assert page.evaluate("document.querySelector('#pane-settings').children[0].id")=='display-settings'
 assert page.evaluate("document.querySelector('#database-account').compareDocumentPosition(document.querySelector('#backup-settings')) & Node.DOCUMENT_POSITION_FOLLOWING")
 assert page.locator('#backup-settings').get_attribute('open') is None
 page.locator('#backup-settings>summary').click()
 for retired in ['Google Sheets Sync','Apps Script URL','Project setup (owner only)','BARBELL LOG v1.3']:
  assert retired not in settings.inner_text()
 assert page.locator('.settings-advanced').get_attribute('open') is None
 with page.expect_download() as csv_info:page.locator('#export-lift-csv').click()
 csv_path=out/'lift-export.csv';csv_info.value.save_as(str(csv_path))
 assert 'legacy-snatch' in csv_path.read_text() and '"quality"' in csv_path.read_text()
 page.locator('#database-account').scroll_into_view_if_needed();page.screenshot(path=str(out/'settings-clean.png'))
 page.locator('#refresh-data-button').click();page.wait_for_function('!document.getElementById("refresh-data-button").disabled')
 # The saved workout starts immediately; preparation is optional and every
 # exercise has independent set rows.
 page.locator('#tabs .tab').nth(1).click();page.locator('[data-act=accessory]').click();page.locator('[data-ac=new]').click()
 assert page.locator('.ac-exercise-card').count()==3
 assert page.locator('[data-ac=start]').count()==0
 assert page.locator('.ac-preparation').get_attribute('open') is None
 blocks=page.evaluate("JSON.parse(localStorage.barbell_accessory_workout_v1).blocks.filter(b=>b.exercises).map(b=>b.id)")
 def row(block,index):return page.locator('#ac-row-'+block+'-'+str(index))
 row(blocks[0],0).locator('[data-ac=edit-set]').click()
 page.locator('.ac-side-detail summary').click()
 field=page.locator('[data-x=left]');field.evaluate('(e)=>window.originalAccessoryInput=e');field.fill('7');assert field.evaluate('(e)=>e===window.originalAccessoryInput')
 page.locator('#ac-apply-log').click();page.wait_for_function('PendingLifts.list().length===0')
 ac=[r for (k,i),r in rows.items() if k=='accessory'];assert len(ac)==1 and ac[0]['data']['exercises'][0]['left']==7 and ac[0]['data']['weight']==14
 assert len([1 for (k,i) in rows if k=='lift'])==2
 assert page.locator('[data-ac-clock]').count()==1
 page.screenshot(path=str(out/'connected-accessory.png'))
 # Log a different exercise's third set offline, rather than following a wizard.
 offline=True;page.evaluate("localStorage.setItem('__test_offline','1');window.dispatchEvent(new Event('offline'))");assert page.locator('#sync-status').inner_text()=='Offline · saved on phone';assert page.locator('#header').bounding_box()['height']==header_height
 row(blocks[1],2).locator('[data-ac=log-set]').click();page.wait_for_timeout(300);assert len(json.loads(page.evaluate('localStorage.barbell_pending_lifts_v1')))==1
 page.reload(wait_until='domcontentloaded');page.locator('#tabs .tab').nth(1).click();page.locator('[data-act=accessory]').click();page.locator('[data-ac=resume]').click()
 assert row(blocks[1],2).get_attribute('data-ac-done')=='true'
 assert '14 kg/DB' in row(blocks[0],1).inner_text()
 offline=False;page.evaluate("localStorage.removeItem('__test_offline');window.dispatchEvent(new Event('online'))")
 page.wait_for_function('PendingLifts.list().length===0');page.wait_for_function('document.getElementById("sync-status-banner").hidden');assert len([1 for k,i in rows if k=='accessory'])==2
 # A concurrent edit cannot silently overwrite the newer database record.
 page.evaluate("openEditModal('legacy-snatch')");rows[('lift','legacy-snatch')]['data']={**seed,'weight':80};rows[('lift','legacy-snatch')]['revision']=2
 page.locator('[data-editor=weight]').fill('70');page.locator('[data-act=editor-save]').click();page.wait_for_function('PendingLifts.list().some(i=>i.conflict)');assert rows[('lift','legacy-snatch')]['data']['weight']==80
 page.locator('#sync-status').click();assert page.locator('dialog').last.is_visible();page.locator('[data-choice=cloud]').click();page.wait_for_function('PendingLifts.list().length===0');page.locator('dialog [aria-label=Close]').click()
 assert rows[('lift','legacy-snatch')]['data']['weight']==80
 page.locator('#tabs .tab').nth(1).click()
 for block,index in [(blocks[0],1),(blocks[0],2),(blocks[1],0),(blocks[1],1)]:row(block,index).locator('[data-ac=log-set]').click()
 row(blocks[2],0).locator('[data-ac=edit-set]').click()
 assert page.locator('[data-x=weight]').count()==2
 page.locator('[data-x=weight]').first.fill('12');page.locator('#ac-apply-set').click()
 for index in range(3):row(blocks[2],index).locator('[data-ac=log-set]').click()
 page.locator('[data-ac=finish]').click();page.wait_for_function('PendingLifts.list().length===0')
 supers=[r['data'] for (k,i),r in rows.items() if k=='accessory' and r['data']['block']=='superset']
 assert len(supers)==3 and all(s['exercises'][0]['weight']==12 and s['exercises'][1]['weight']==8 for s in supers)
 page.locator('[data-ac=save-template]').click();page.locator('#ac-store-template').click()
 assert json.loads(page.evaluate('localStorage.barbell_accessory_templates_v1'))[0]['blocks'][5]['exercises'][0]['weight']==12
 page.locator('[data-ac=home]').click()
 assert page.locator('.ac-history-session').count()==1
 page.locator('.ac-history-session summary').click()
 assert 'Half-kneeling' in page.locator('.ac-history-session').inner_text()
 assert '3 × 12 kg/DB' in page.locator('.ac-history-session').inner_text()
 template_id=page.evaluate('JSON.parse(localStorage.barbell_accessory_templates_v1)[0].id')
 page.locator('[data-ac=template][data-id="'+template_id+'"]').click()
 assert page.locator('.ac-exercise-card').count()==3 and page.locator('[data-ac=start]').count()==0
 assert '12 kg/DB' in page.locator('.ac-exercise-card').last.inner_text()
 draft_id=page.evaluate('JSON.parse(localStorage.barbell_accessory_workout_v1).id')
 page.locator('[data-ac=back]').click()
 # Retrospective entry can create a plate-loaded superset and log all rounds.
 page.locator('[data-ac=after]').click()
 page.locator('.ac-session-meta summary').click();page.locator('[data-ac-meta=date]').fill('2026-10-29');page.locator('[data-ac-meta=date]').blur();page.locator('[data-ac-meta=session]').select_option('Coached Class')
 page.locator('[data-ac=add-block]').click()
 page.locator('[data-ex=name][data-j="0"]').fill('Lateral raise')
 page.locator('[data-ex=equipment][data-j="0"]').select_option('plate');page.locator('[data-ex=weight][data-j="0"]').fill('5');page.locator('[data-ex=reps][data-j="0"]').fill('10')
 page.locator('#ac-superset').check();page.locator('[data-ex=name][data-j="1"]').fill('Loaded Alekna');page.locator('[data-ex=equipment][data-j="1"]').select_option('plate');page.locator('[data-ex=weight][data-j="1"]').fill('5')
 page.locator('#ac-save-block').click();page.locator('[data-ac=log-block]').click();page.wait_for_function('PendingLifts.list().length===0')
 after_plan=json.loads(page.evaluate('localStorage.barbell_accessory_workout_v1'))
 assert after_plan['timerEnd']==0 and len(after_plan['done'])==3
 assert all(v['entry']['session']=='Coached Class' and v['entry']['date']=='2026-10-29' and v['entry']['exercises'][0]['equipment']=='plate' for v in after_plan['done'].values())
 page.locator('[data-ac=finish]').click();page.locator('[data-ac=home]').click()
 assert page.locator('[data-ac=draft][data-id="'+draft_id+'"]').count()==1
 before_delete=len([1 for kind,i in rows if kind=='accessory'])
 page.locator('[data-ac=delete-template][data-id="'+template_id+'"]').click();page.locator('#confirmYes').click()
 assert len(json.loads(page.evaluate('localStorage.barbell_accessory_templates_v1')))==0
 assert len([1 for kind,i in rows if kind=='accessory'])==before_delete
 # Accessories link directly to a live Class without becoming Olympic records.
 page.evaluate("TrainingApp.open();TrainingApp.begin('class')")
 page.locator('[data-act=add-block]').click();page.locator('[data-block-field=reference]').fill('70');page.locator('[data-block-field=warmups]').select_option('no');page.locator('[data-act=start]').click()
 parent_id=page.evaluate('JSON.parse(localStorage.barbell_workout_v3).id')
 page.locator('[data-act=linked-accessories]').click();page.locator('[data-ac=blank]').click();page.locator('[data-ac=add-block]').click()
 page.locator('[data-ex=name][data-j="0"]').fill('Push-up');page.locator('[data-ex=equipment][data-j="0"]').select_option('bodyweight');page.locator('#ac-block-sets').fill('2');page.locator('#ac-save-block').click()
 linked=json.loads(page.evaluate('localStorage.barbell_accessory_workout_v1'))
 assert linked['parentWorkoutId']==parent_id and linked['session']=='Coached Class'
 for index in range(2):row(linked['blocks'][0]['id'],index).locator('[data-ac=log-set]').click()
 page.wait_for_function('PendingLifts.list().length===0')
 body=[r['data'] for (kind,i),r in rows.items() if kind=='accessory' and r['data']['workoutId']==linked['id']]
 assert len(body)==2 and all(e['weight'] is None and e['parentWorkoutId']==parent_id for e in body)
 assert len([1 for kind,i in rows if kind=='lift'])==2
 page.locator('[data-ac=finish]').click()
 # Refresh and cross-width checks preserve the selected authenticated backend.
 page.reload(wait_until='domcontentloaded');page.wait_for_function('AppData.status().signedIn');assert page.evaluate('AppData.usesDatabase()')
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812});page.locator('#tabs .tab').nth(4).click();assert page.evaluate('document.documentElement.scrollWidth')<=width
  page.evaluate("localStorage.setItem('__test_offline','1');window.dispatchEvent(new Event('offline'))");assert page.locator('#sync-status').is_visible();assert page.evaluate('document.documentElement.scrollWidth')<=width;assert page.locator('#header').bounding_box()['height']==header_height
  page.evaluate("localStorage.removeItem('__test_offline');window.dispatchEvent(new Event('online'))")
 # Plate-loaded accessories retain their weight basis in summaries and editing.
 plate={'id':'plate-label-fixture','date':'2026-10-29','session':'Coached Class','name':'Lateral raise','weight':5,'round':1,'exercises':[{'name':'Lateral raise','weight':5,'unit':'kg','equipment':'plate','weightBasis':'per plate','plateCount':None,'dumbbells':0,'eachSide':False,'reps':10}],'notes':'Photo programme'}
 rows[('accessory',plate['id'])]={'data':plate,'revision':1,'deleted':False}
 # Finish any reconnect read already in flight, then request a fresh result.
 page.evaluate('async()=>{await fetchAndRender();await fetchAndRender();}')
 page.wait_for_function("JSON.parse(localStorage.barbell_accessory_records_v1||'[]').some(e=>e.id==='plate-label-fixture')")
 page.locator('#tabs .tab').nth(1).click();page.locator('[data-act=accessory]').click()
 plate_card=page.locator('[data-ac=edit-record][data-id=plate-label-fixture]')
 plate_card.locator('xpath=ancestor::details').first.locator('summary').click()
 assert '5 kg/plate' in plate_card.inner_text() and '/DB' not in plate_card.inner_text()
 plate_card.click();assert page.get_by_text('kg per plate',exact=True).is_visible();page.locator('dialog [aria-label=Close]').click()
 # A second phone recovers the saved program before it writes its first snapshot.
 page.wait_for_timeout(800);page.evaluate('async()=>{await CloudBackup.sync();}')
 second=browser.new_page(viewport={'width':402,'height':812},is_mobile=True,has_touch=True);second.route('**/*',serve)
 second.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded');second.locator('#tabs .tab').nth(4).click();second.locator('[name=db-email]').fill(email);second.locator('[name=db-password]').fill('test-password-never-real');second.locator('#database-sign-in').click();second.wait_for_function('AppData.usesDatabase() && !AppData.status().activating')
 assert second.evaluate("JSON.parse(localStorage.barbell_accessory_workout_v1).parentWorkoutId")==parent_id
 assert len(second.evaluate("JSON.parse(localStorage.barbell_accessory_workout_v1).done"))==2
 second.close()
 assert not errors,errors
 print('PASS: real SDK sign-in, legacy cutover, pending-ID transfer, confirmed snapshots, accessory isolation, exact DB weights, both-side reps, offline reload/retry, edit conflict review, fresh-phone plan recovery, quiet header, automatic reconnect, manual Settings refresh and mobile widths.')
 browser.close()
