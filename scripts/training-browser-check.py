import os, shutil
"""Exercise real mobile UI against a fake Sheets API; never writes to Google."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, mimetypes
root=Path(__file__).resolve().parents[1]
out=Path(os.environ.get('BARBELL_ARTIFACTS',str(root/'.artifacts')))/'v3';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('BARBELL_BROWSER_PATH') or shutil.which('chromium') or None,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':402,'height':812},is_mobile=True,has_touch=True)
 page.set_default_timeout(6000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 rows={};states={}
 def serve(r):
  url=r.request.url
  if url.startswith('http://localhost:8000/api'):
   if r.request.method=='POST':
    data=json.loads(r.request.post_data);action=data['action']
    if action=='saveState':
     record=data['record'];states[record['key']]={**record,'updatedAt':'2026-10-30T23:00:00Z'}
    elif action=='deleteEntry':rows.pop(data['id'],None)
    elif action=='updateEntry':rows[data['entry']['id']]=data['entry']
   r.fulfill(content_type='application/json',body=json.dumps({'apiVersion':3,'appState':states,'entries':list(rows.values()),'meets':[],'bw':[]}));return
  if url.startswith('http://localhost:8000/'):
   path=root/url.split('localhost:8000/')[1].split('?')[0]
   if path.is_file():r.fulfill(content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream',body=path.read_bytes());return
  r.abort()
 page.route('**/*',serve)
 page.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded')
 assert page.locator('.brand-lockup img').is_visible()
 page.locator('#header-comp-badge').click();assert int(page.locator('.countdown-big').inner_text())>=0;page.locator('dialog [aria-label=Close]').click()
 page.locator('#tabs .tab').nth(1).click();page.locator('[data-act=new-class]').click()
 assert page.locator('.studio-component').count()==0
 page.locator('[data-act=add-block]').click()
 page.locator('[data-comp=base]').select_option('Pull')
 page.locator('[data-act=modifier][data-value="Snatch Grip"]').click()
 page.locator('[data-act=component-add]').click()
 page.locator('[data-act=modifier][data-value="Hang Above Knee"]').last.click()
 page.locator('[data-block-field=reference]').fill('60')
 page.locator('[data-block-field=warmups]').select_option('no')
 page.locator('[data-stage-rep]').nth(1).fill('2')
 page.locator('[data-stage=sets]').fill('2')
 assert page.locator('[data-value="Hang (unspecified)"]').count()==0
 assert page.evaluate('document.documentElement.scrollWidth')==402
 page.locator('[data-act=template-save]').click()
 page.locator('[data-act=start]').click()
 assert page.locator('[data-actual-rep]').count()==2
 assert page.locator('.session-plan-grid [data-plan-status=current]').count()==1
 assert page.locator('.session-plan-grid li').count()==2
 assert page.locator('.session-plan-grid').first.is_visible()
 # Editing actual reps must not replace the input node or shrink the shell.
 field=page.locator('[data-actual-rep="1"]');field.evaluate('(x)=>window.originalReps=x');field.fill('3')
 assert field.evaluate('(x)=>x===window.originalReps')
 height=page.locator('#app').bounding_box()['height']
 page.set_viewport_size({'width':402,'height':500});page.wait_for_timeout(100)
 assert page.locator('#app').bounding_box()['height']==height
 assert field.is_visible() and field.evaluate('(x)=>x===window.originalReps')
 page.set_viewport_size({'width':402,'height':812});field.blur();page.wait_for_timeout(150)
 page.locator('.session-set-note summary').click()
 page.locator('[data-actual=note]').fill('Coach said: good extension')
 page.locator('[data-act=complete]').click()
 assert len(json.loads(page.evaluate("localStorage.getItem('barbell_pending_lifts_v1')")))==1
 plan=json.loads(page.evaluate("localStorage.getItem('barbell_workout_v3')"));entry=next(iter(plan['done'].values()))
 assert entry['session']=='Coached Class' and entry['structure'][1]['reps']==3
 assert entry['structure'][1]['position']==['Hang Above Knee']
 assert page.locator('.session-plan-grid [data-plan-status=done]').count()==1
 page.locator('[data-act=edit-completed]').first.click()
 assert page.locator('#studio-log-dialog').is_visible()
 page.locator('[data-editor=quality]').select_option('4')
 page.locator('[data-act=editor-save]').click()
 page.wait_for_function('document.querySelector("#studio-log-dialog")===null')
 assert json.loads(page.evaluate("localStorage.getItem('barbell_workout_v3')"))['done'][next(iter(plan['done']))]['quality']==4
 # Connect and verify both lift and entire-plan readback confirmation.
 page.evaluate("async()=>{saveSettingsData({...loadSettings(),sheetsUrl:'http://localhost:8000/api'});await syncBoth();await CloudBackup.connect();}")
 page.wait_for_function("PendingLifts.list().length===0")
 page.wait_for_function("Object.keys(CloudBackup.status().lastRead?.appState||{}).length>0")
 assert len(rows)==1 and len(states)==1
 assert next(iter(states.values()))['value']['data']['barbell_workout_v3']['done']
 page.screenshot(path=str(out/'active.png'))
 # Leave without saving unfinished work; completed sets must remain in the log.
 page.locator('[data-act=exit]').click();page.locator('#discard-draft').click()
 assert len(rows)==1
 page.locator('[data-act=template-open]').click();assert page.locator('.studio-component').count()==2
 page.locator('[data-act=switch]').click();page.locator('[data-act=template-delete]').click();page.locator('#confirmYes').click()
 assert page.locator('[data-act=template-open]').count()==0
 # Saved programmes use Train's stage rows; expanding details must not edit.
 page.evaluate("""()=>{const items=getCachedEntries();items[0].programme={minutes:20,stages:[{sets:1,reps:[1,2],percent:70,actualWeight:null},{sets:3,reps:[1,1],percent:85,actualWeight:55}]};items[0].notes+='\\nProgramme from the board, with lower loads unknown.';setCachedEntries(items);renderLog();}""")
 page.locator('#tabs .tab').nth(0).click()
 row=page.locator('#logList .log-entry').first
 assert row.locator('.record-actual').inner_text().startswith('1 × (1+3)')
 assert row.locator('.record-programme').get_attribute('open') is None
 row.locator('.record-programme summary').click()
 assert row.locator('.programme-row').count()==2
 assert 'Load not recorded' in row.locator('.record-programme').inner_text()
 assert '55 kg recorded' in row.locator('.record-programme').inner_text()
 assert page.locator('#studio-log-dialog').count()==0
 row.locator('.record-notes summary').focus();page.keyboard.press('Enter')
 assert page.locator('#studio-log-dialog').count()==0
 page.screenshot(path=str(out/'record-programme.png'))
 page.locator('#tabs .tab').nth(1).click()
 # Manual log uses the identical complex editor and normalized Class session.
 page.evaluate("openEditModal("+json.dumps(entry['id'])+")")
 assert page.locator('[data-editor=session]').input_value()=='Coached Class'
 assert page.locator('dialog .studio-component').count()==2
 # Date/session fields must fit the editor at phone widths, including iOS's
 # wider native date value. Exercise the real two-movement editing dialog.
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812})
  date=page.locator('[data-editor=date]').bounding_box()
  session=page.locator('[data-editor=session]').bounding_box()
  dialog=page.locator('#studio-log-dialog').bounding_box()
  assert date['y']+date['height']<session['y'],(width,date,session)
  assert abs(date['height']-session['height'])<=1
  for control in page.locator('#studio-log-dialog input,#studio-log-dialog select').all():
   box=control.bounding_box()
   assert box['x']>=dialog['x'] and box['x']+box['width']<=dialog['x']+dialog['width'],(width,box,dialog)
 page.set_viewport_size({'width':402,'height':812})
 page.screenshot(path=str(out/'edit-complex.png'))
 page.locator('[data-editor=weight]').fill('45')
 page.locator('[data-editor=quality]').select_option('4')
 page.locator('[data-act=editor-save]').click();page.wait_for_function('document.querySelector("#studio-log-dialog")===null')
 assert next(iter(rows.values()))['weight']==45
 assert next(iter(rows.values()))['programme']['stages'][0]['actualWeight'] is None
 # Rating can be revisited, changed, retained by unrelated edits, or cleared.
 assert next(iter(rows.values()))['quality']==4
 page.evaluate("openEditModal("+json.dumps(entry['id'])+")")
 assert page.locator('[data-editor=quality]').input_value()=='4'
 page.locator('[data-editor=quality]').select_option('2')
 page.locator('[data-act=editor-save]').click();page.wait_for_function('document.querySelector("#studio-log-dialog")===null')
 assert next(iter(rows.values()))['quality']==2
 page.evaluate("openEditModal("+json.dumps(entry['id'])+")")
 page.locator('[data-editor=note]').fill('Rating survives a note edit')
 page.locator('[data-act=editor-save]').click();page.wait_for_function('document.querySelector("#studio-log-dialog")===null')
 assert next(iter(rows.values()))['quality']==2
 page.evaluate("openEditModal("+json.dumps(entry['id'])+")")
 page.locator('[data-editor=quality]').select_option('')
 page.locator('[data-act=editor-save]').click();page.wait_for_function('document.querySelector("#studio-log-dialog")===null')
 assert next(iter(rows.values()))['quality'] is None
 page.evaluate('openLogModal()')
 assert page.locator('[data-editor=quality]').input_value()==''
 page.locator('#studio-log-dialog [aria-label=Close]').click()
 # Actual Competition must stay a deliberate session choice.
 page.locator('[data-act=opener]').click()
 for selector,value in [('[data-opener="0-0"]','65'),('[data-opener="0-1"]','68'),('[data-opener="0-2"]','70'),('[data-opener="1-0"]','90')]:page.locator(selector).fill(value)
 page.locator('#build-openers').click();page.locator('[data-act=start]').click()
 assert page.locator('.session-plan-grid').first.locator('li').count()==8
 assert '65' in page.locator('.session-plan-grid').first.inner_text()
 assert '70' in page.locator('.session-plan-grid').first.inner_text()
 assert page.locator('.session-plan-grid [aria-current=step]').count()==1
 assert page.locator('.session-plan-grid').first.is_visible()
 page.locator('.session-loading summary').click()
 assert page.locator('.studio-collar').count()==0
 assert page.locator('[data-actual=weight]').input_value()=='20'
 assert page.locator('[data-actual=quality]').count()==0
 assert 'Empty-bar warm-up · no collars' in page.locator('[data-loading-label]').inner_text()
 page.locator('[data-act=complete]').click()
 page.wait_for_function('PendingLifts.list().length===0')
 warm_id=next(k for k,v in rows.items() if k!=entry['id'])
 assert rows[warm_id]['weight']==20 and 'Warm-up' in rows[warm_id]['notes']
 assert rows[warm_id]['phase']=='warmup' and rows[warm_id]['quality'] is None
 page.wait_for_function('(id)=>getCachedEntries().some(e=>e.id===id)',arg=warm_id)
 page.evaluate('openEditModal('+json.dumps(warm_id)+')')
 assert page.locator('#studio-log-dialog').is_visible()
 assert page.locator('[data-editor=quality]').count()==0
 page.locator('#studio-log-dialog [aria-label=Close]').click()
 # Remove this fixture record so later history assertions keep their one-row setup.
 rows.pop(warm_id);page.evaluate('async()=>await fetchAndRender()')
 page.locator('.session-loading summary').click()
 assert page.locator('.studio-collar').inner_text()=='2.5'
 assert page.locator('.studio-plate').count()>0
 page.locator('[data-actual=weight]').fill('20');page.locator('[data-actual=weight]').blur()
 assert page.locator('.studio-collar').count()==0
 assert 'no collars' in page.locator('[data-loading-label]').inner_text()
 page.locator('[data-actual=weight]').fill('26');page.locator('[data-actual=weight]').blur()
 assert page.locator('.studio-collar').inner_text()=='2.5'
 # Rating returns when the rehearsal reaches a working attempt.
 while page.locator('.studio-current .eyebrow').inner_text().startswith('WARM-UP'):
  assert page.locator('[data-actual=quality]').count()==0
  page.locator('[data-act=skip]').click()
 assert page.locator('[data-actual=quality]').count()==1
 assert page.locator('.session-plan-grid [data-plan-status=skipped]').count()>0
 assert page.locator('[data-clock]').count()==1
 opener=json.loads(page.evaluate("localStorage.getItem('barbell_workout_v3')"));assert opener['loading']=='competition' and opener['session']=='Solo'
 page.screenshot(path=str(out/'opener.png'))
 page.locator('[data-act=exit]').click();page.locator('#keep-draft').click()
 # Paste/photo review path builds an editable draft, not an automatic saved record.
 page.locator('[data-act=import]').click()
 page.locator('#program-text').fill('A) Snatch pull + hang snatch (20 min)\n1 x 1+2 @ 70%\n3 x 1+1 @ 85%')
 page.locator('#build-transcription').click();assert page.locator('.studio-component').count()==2
 assert page.locator('[data-stage=sets]').count()==2
 page.screenshot(path=str(out/'builder.png'))
 page.locator('#tabs .tab').first.click();page.locator('#log-sub-analytics').click()
 assert page.locator('[data-analytics=variant]').is_visible()
 assert page.locator('.analytics-record').count()==1
 # The smooth overlay retains editable actual points and month/year labels.
 page.evaluate("""()=>{window.chartOriginal=getCachedEntries();const base=chartOriginal[0];setCachedEntries([...chartOriginal,...[['2024-12-15',40],['2025-06-01',60],['2026-10-01',50]].map(([date,weight],i)=>({...base,id:'chart-only-'+i,date,weight}))]);renderAnalytics();}""")
 assert page.locator('.analytics-smooth-line').count()==1
 assert page.locator('.analytics-chart [data-record]').count()==4
 assert all(__import__('re').fullmatch(r'[A-Z][a-z]{2} \d{4}',label) for label in page.locator('.analytics-date-tick').all_text_contents())
 page.locator('.analytics-chart [data-record]').first.click()
 assert page.locator('[data-editor=date]').input_value()=='2024-12-15'
 page.locator('#studio-log-dialog [aria-label=Close]').click()
 for width in [320,402,430]:
  page.set_viewport_size({'width':width,'height':812})
  assert page.evaluate('document.documentElement.scrollWidth')<=width
  boxes=[x.bounding_box() for x in page.locator('.analytics-date-tick').all()]
  assert all(b['x']>=0 and b['x']+b['width']<=width for b in boxes)
  assert all(a['x']+a['width']<b['x'] for a,b in zip(boxes,boxes[1:]))
 page.set_viewport_size({'width':402,'height':812})
 page.locator('.analytics-chart').scroll_into_view_if_needed()
 page.screenshot(path=str(out/'analytics-smooth-trend.png'))
 page.evaluate('setCachedEntries(window.chartOriginal);renderAnalytics()')
 # Coaching cards update automatically, explain their evidence and open the
 # existing rehearsal planner without starting or recording a workout.
 assert page.locator('.coaching-notes').count()==1
 page.evaluate("""()=>{window.originalCoachingComp=loadSettings().comp;const d=new Date();d.setDate(d.getDate()+7);const date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');saveSettingsData({...loadSettings(),comp:{name:'Browser meet',date}});renderAnalytics();}""")
 card=page.locator('[data-coaching=meet]')
 assert '7 days to Browser meet' in card.inner_text()
 card.locator('summary').click()
 assert 'within 14 days' in card.inner_text()
 assert card.locator('a').get_attribute('href')=='https://pubmed.ncbi.nlm.nih.gov/35976755/'
 card.scroll_into_view_if_needed();page.screenshot(path=str(out/'coaching-notes.png'))
 card.locator('[data-coaching-action=openers]').click()
 assert page.locator('#build-openers').is_visible()
 page.locator('dialog [aria-label=Close]').click()
 page.evaluate('saveSettingsData({...loadSettings(),comp:window.originalCoachingComp})')
 page.locator('#tabs .tab').first.click();page.locator('#log-sub-analytics').click()
 page.locator('.analytics-record').click();page.locator('[data-act=editor-delete]').click();page.locator('#confirm-delete-set').click()
 page.wait_for_function('document.querySelector("#studio-log-dialog")===null');assert len(rows)==0
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812});page.locator('#tabs .tab').nth(1).click()
  assert page.evaluate('document.documentElement.scrollWidth')<=width
 # Competition planning always floors fractional suggestions and saved inputs.
 page.evaluate("""()=>{saveSettingsData({...loadSettings(),pbs:[{lift:'Snatch',weight:65.5},{lift:'Clean and Jerk',weight:100.5}],meets:[{id:'rounding-meet',name:'Test meet',date:'2025-01-01',snatch:[{weight:70,made:true}],cj:[{weight:110,made:true}]}],comp:{name:'Rounding test',snatch:[64.9,null,null],cj:[null,null,null]}});}""")
 page.locator('#tabs .tab').nth(3).click();page.locator('#comp-sub-plan').click()
 assert page.locator('#cw-snatch-0').input_value()=='64'
 assert page.evaluate('loadSettings().comp.snatch[0]')==64
 assert [page.locator('#cw-snatch-'+str(i)).input_value() for i in [1,2]]==['68','71']
 assert [page.locator('#cw-cj-'+str(i)).input_value() for i in range(3)]==['102','107','112']
 assert page.locator('#compTotal').inner_text()=='183'
 assert page.locator('#cw-snatch-0').get_attribute('step')=='1'
 page.locator('#cp-snatch-0').fill('94.9')
 assert page.locator('#cw-snatch-0').input_value()=='66'
 assert page.evaluate('loadSettings().comp.snatch[0]')==66
 page.locator('#cw-cj-0').fill('103.9');page.locator('#cw-cj-0').blur()
 assert page.locator('#cw-cj-0').input_value()=='103'
 assert page.evaluate('loadSettings().comp.cj[0]')==103
 assert page.locator('#cp-cj-0').input_value()=='93.6'
 page.locator('#comp-sub-warmup').click()
 page.evaluate('syncOpenersFromPlan()')
 assert page.locator('#wu-sn-opener').input_value()=='66'
 assert page.locator('#wu-cj-opener').input_value()=='103'
 assert page.evaluate('buildWarmupLadder(66).every(s=>Number.isInteger(s.kg))')
 page.locator('#comp-sub-plan').click();page.locator('#cw-snatch-0').fill('');page.locator('#cw-snatch-0').blur()
 assert page.evaluate('loadSettings().comp.snatch[0]') is None
 # File backups contain both JSON records and plain-string device/timestamp keys.
 page.locator('#tabs .tab').nth(4).click()
 page.locator('#backup-settings>summary').click()
 with page.expect_download() as download_info:page.locator('[data-act=backup]').click()
 backup=download_info.value;backup_path=out/'roundtrip-backup.json';backup.save_as(str(backup_path))
 exported=json.loads(backup_path.read_text());assert exported['data']['barbell_device_id_v3']
 saved_plan=json.loads(exported['data']['barbell_workout_v3'])
 page.evaluate("localStorage.setItem('barbell_workout_v3','null')")
 page.locator('#restore-file-backup').set_input_files(str(backup_path))
 page.locator('#confirmYes').click();page.wait_for_load_state('domcontentloaded')
 page.wait_for_function("JSON.parse(localStorage.getItem('barbell_workout_v3')||'null')?.id==="+json.dumps(saved_plan['id']))
 assert not errors,errors
 print('PASS: blank Class, arbitrary complex, stable keyboard/rep input, offline queue/reload, confirmed plan backup, templates, discard, normalized editor, opener collars, transcription draft, analytics filters, delete, file backup/restore and 320–430px widths.')
 b.close()
