"""Page/control audit with isolated local fixtures; never contacts a live account."""
import json,mimetypes,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'.artifacts/audit';out.mkdir(parents=True,exist_ok=True)
engine=os.environ.get('BARBELL_BROWSER_ENGINE','chromium')
with sync_playwright() as p:
 browser=getattr(p,engine).launch(**({'executable_path':shutil.which('chromium') or None,'args':['--no-sandbox']} if engine=='chromium' else {}))
 page=browser.new_page(viewport={'width':402,'height':812},is_mobile=True,has_touch=True,locale='en-GB');page.set_default_timeout(6000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));coverage=[]
 def route(r):
  path=root/r.request.url.split('localhost:8000/')[-1].split('?')[0]
  if r.request.url.startswith('http://localhost:8000/') and path.is_file():r.fulfill(body=path.read_bytes(),content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
  else:r.abort()
 page.route('**/*',route)
 page.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded')
 page.evaluate('''()=>{const entries=['Snatch','Clean and Jerk','Clean','Jerk','Squat','Pull','Pendlay Row','Barbell Row','Deadlift','Bench Press'].flatMap((base,i)=>[0,1,2].map(n=>({id:'audit-'+i+'-'+n,date:'2026-'+['08','09','10'][n]+'-20',session:['Coached Class','1:1 Session','Solo'][n],base,position:base==='Snatch'?['Hang Above Knee']:[],grip:[],technique:base==='Squat'?['Front']:[],receiving:'',weight:50+i*5+n*2.5,sets:3,reps:2,quality:4,notes:'Audit fixture'})));setCachedEntries(entries);rebuildPBsFromEntries(entries);saveSettingsData({...loadSettings(),athleteBW:80,bwLog:[{date:'2026-10-30',weight:80}],comp:{name:'Lift Off Autumn',date:'2026-11-08',location:'London'}});renderLog();renderCountdown();}''')
 def tab(name):page.locator('#tabs .tab').nth(['log','planner','pbs','comp','settings'].index(name)).click()
 def check(name):
  assert not page.evaluate('''()=>[...document.querySelectorAll('[onclick],[oninput],[onchange]')].flatMap(el=>[...el.attributes].filter(a=>/^on/.test(a.name)).flatMap(a=>{try{new Function('event',a.value);return []}catch(e){return [el.outerHTML]}}))'''),name+' invalid inline control'
  for width in [320,375,402,430]:
   page.set_viewport_size({'width':width,'height':812})
   assert page.evaluate('document.documentElement.scrollWidth')<=width,name+' page overflow'
   issues=page.evaluate('''()=>[...document.querySelectorAll('.tab-pane.active input:not([type=file]):not([type=checkbox]),.tab-pane.active select,.modal-overlay.open input,dialog[open] input,dialog[open] select')].filter(e=>e.getClientRects().length).flatMap(e=>{const r=e.getBoundingClientRect(),outer=e.closest('dialog,.modal,.tab-pane').getBoundingClientRect();return r.x<outer.x-1||r.right>outer.right+1||r.height<43?[{id:e.id,html:e.outerHTML,rect:r.toJSON()}]:[]})''')
   assert not issues,(engine,name,width,issues)
  page.set_viewport_size({'width':402,'height':812});coverage.append(name)
  page.screenshot(path=str(out/(engine+'-'+name+'.png')))
 check('log')
 for chip in page.locator('#log-pane-entries .filter-chip').all():chip.click()
 page.locator('#log-pane-entries .filter-chip').first.click()
 assert page.locator('#logList .log-entry').count()==30
 page.locator('#logList .log-entry-header').first.click();assert page.locator('#studio-log-dialog').is_visible();page.locator('#studio-log-dialog [aria-label=Close]').click()
 page.locator('#log-sub-analytics').click();check('analytics')
 for field in ['base','variant','session','period']:
  values=page.locator('[data-analytics='+field+'] option').evaluate_all('(els)=>els.map(e=>e.value)')
  for value in values:page.locator('[data-analytics='+field+']').select_option(value)
  page.locator('[data-analytics='+field+']').select_option(values[0])
 tab('pbs');check('records');page.locator('#pbs-sub-goals').click();check('goals')
 page.locator('.goal-custom-input').first.fill('0.75');page.locator('.goal-custom-input').first.blur();assert page.evaluate("loadSettings().standards.Snatch[0].multiple")==0.75
 custom=page.locator('#goalsContent input[onchange^=saveCustomGoal]').first;custom.fill('70');custom.blur();assert page.evaluate("loadSettings().customGoals.Snatch")==70
 tab('comp');check('meet-history');page.locator('#comp-sub-plan').click();check('competition-plan')
 assert page.locator('#comp-details').get_attribute('open') is None
 assert page.locator('#compAttempts').bounding_box()['y']<450
 page.locator('#comp-details>summary').click()
 field=page.locator('#comp-name');field.evaluate('(x)=>window.auditName=x');field.fill('Test meet');assert field.evaluate('(x)=>x===window.auditName')
 page.locator('#comp-location').fill('London');page.locator('#comp-date').fill('2026-11-08')
 for key in ['snatch','cj']:
  for i in range(3):
   weight=page.locator('#cw-'+key+'-'+str(i));weight.fill('66.9');weight.blur();assert weight.input_value()=='66'
   pct=page.locator('#cp-'+key+'-'+str(i));pct.fill('95');pct.blur();assert float(weight.input_value()).is_integer()
 page.locator('#comp-pane-plan button[onclick="resetComp()"] ').click();assert page.locator('#confirmOverlay').is_visible();page.locator('#confirmOverlay [onclick="hideConfirm()"]').click();assert page.evaluate('loadSettings().comp.snatch[0]') is not None
 page.locator('#comp-pane-plan button[onclick="resetComp()"] ').click();page.locator('#confirmYes').click();assert page.evaluate('loadSettings().comp.snatch[0]') is None
 page.locator('#comp-sub-warmup').click();check('competition-warmup')
 for key,value in [('wu-sn-opener','60'),('wu-cj-opener','80'),('wu-start-time','09:30'),('wu-total-lifters','10'),('wu-lifters-sn','2'),('wu-lifters-cj','3'),('wu-break','10'),('wu-pace','1.5'),('wu-cj-start-override','11:15')]:page.locator('#'+key).fill(value)
 assert page.evaluate("loadSettings().compWarmup['wu-start-time'].value")=='09:30'
 page.locator('[onclick="clearCJOverride()"] ').click();assert page.locator('#wu-cj-start-override').input_value()==''
 assert page.evaluate("addMinutes('09:00',59.6)")=='10:00'
 assert page.evaluate("addMinutes('00:00',-0.6)")=='23:59'
 assert page.evaluate('new Set(buildWarmupLadder(25).map(x=>x.kg)).size===buildWarmupLadder(25).length')
 tab('comp');page.locator('#comp-sub-history').click();page.locator('[onclick="openMeetModal()"] ').click();check('meet-form')
 page.locator('#mm-name').fill('Audit meet');page.locator('#mm-sn-w1').fill('60.8');page.locator('#mm-sn-w1').blur();assert page.locator('#mm-sn-w1').input_value()=='60'
 count=page.evaluate('getMeets().length');page.locator('[onclick="saveMeet()"] ').click();assert page.locator('#meetModal').is_visible();assert page.evaluate('getMeets().length')==count
 page.locator('#mm-sn-r1-good').click();assert page.locator('#mm-sn-r1-good').get_attribute('aria-pressed')=='true'
 page.locator('#mm-cj-w1').fill('80');page.locator('#mm-cj-r1-miss').click();page.locator('[onclick="saveMeet()"] ').click();assert page.locator('#meetModal').is_hidden();assert page.evaluate('getMeets().length')==count+1
 page.locator('#meetEditBtn').click();page.locator('.meet-delete-btn').first.click();page.locator('#confirmYes').click();assert page.evaluate('getMeets().length')==count
 tab('settings');check('settings')
 assert page.evaluate("document.querySelector('#pane-settings').children[0].id")=='display-settings'
 assert page.locator('#backup-settings').get_attribute('open') is None
 rows=page.locator('#pane-settings>details').evaluate_all('(els)=>els.map(e=>({x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width,height:e.querySelector("summary").getBoundingClientRect().height,font:getComputedStyle(e.querySelector("summary")).font}))')
 assert len(rows)==3 and len({json.dumps(r) for r in rows})==1,rows
 page.locator('#settings-footer').scroll_into_view_if_needed();page.screenshot(path=str(out/(engine+'-settings-maintenance.png')))
 page.locator('#unit-lbs').click();assert page.evaluate('getUnit()')=='lbs';tab('log');page.locator('#log-sub-analytics').click();assert 'lbs' in page.locator('.analytics-stats').inner_text();assert 'lbs' in page.locator('.analytics-chart').text_content()
 tab('settings');page.locator('#unit-kg').click();page.locator('.settings-weight-class>summary').click();assert 'IWF' in page.locator('#weight-class-detail').inner_text();page.locator('.settings-weight-class>summary').click();page.locator('#setting-bw').fill('81');page.locator('[onclick="logBWFromField()"] ').click();assert page.evaluate('loadSettings().athleteBW')==81
 weigh_in_id=page.evaluate('loadSettings().bwLog[0].id');page.locator('#setting-bw').fill('81.1');page.locator('[onclick="logBWFromField()"]').click();assert page.evaluate('loadSettings().bwLog[0].id')==weigh_in_id
 page.locator('#bw-date').fill('2026-10-28');page.locator('#bw-entry').fill('80.5');page.locator('[onclick="logBodyweight()"] ').click();assert page.evaluate("PendingLifts.list().some(x=>x.action==='logBW'&&x.entry.date==='2026-10-28')")
 page.locator('.settings-import>summary').click()
 page.locator('#bw-csv-import').set_input_files({'name':'weights.csv','mimeType':'text/csv','buffer':b'Date,Weight\n2026-10-25,80.1\n2026-02-30,77\n2026-10-25,80.1\n'})
 page.wait_for_function("loadSettings().bwLog.some(e=>e.date==='2026-10-25')")
 assert page.evaluate("PendingLifts.list().filter(x=>x.action==='logBW'&&x.entry.date==='2026-10-25').length")==1
 assert not page.evaluate("loadSettings().bwLog.some(e=>e.date==='2026-02-30')")
 page.locator('.settings-advanced>summary').click();check('settings-advanced');page.locator('.coeff-input').first.fill('0.8');page.locator('[onclick="saveCoefficients()"] ').click();assert page.evaluate('getCoefficients().position[Object.keys(getCoefficients().position)[0]]')==0.8
 page.locator('[onclick="resetCoefficients()"] ').click();page.locator('.settings-advanced>summary').click()
 page.locator('#backup-settings>summary').click();check('settings-backup')
 dimensions=page.locator('.settings-backup-actions button').evaluate_all('(els)=>els.map(e=>({height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width,font:getComputedStyle(e).fontSize}))');assert len({json.dumps(d) for d in dimensions})==1,dimensions
 with page.expect_download() as dl:page.locator('#export-lift-csv').click()
 dl.value.save_as(str(out/'audit-lifts.csv'));assert 'audit-0-0' in (out/'audit-lifts.csv').read_text()
 with page.expect_download() as dl:page.locator('[data-act=backup]').click()
 dl.value.save_as(str(out/'audit-backup.json'));assert json.loads((out/'audit-backup.json').read_text())['format']=='barbell-log-backup'
 with page.expect_file_chooser():page.locator('#restore-backup-button').click()
 page.locator('#restore-file-backup').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{}'});assert page.locator('#confirmOverlay').is_hidden()
 page.locator('#restore-file-backup').set_input_files(out/'audit-backup.json');page.locator('#confirmOverlay [onclick="hideConfirm()"]').click()
 page.locator('[data-act=recover]').click();assert page.locator('#toast').inner_text()
 page.locator('.layout-details>summary').click();assert 'safeTop' in page.locator('#layout-report').inner_text();page.locator('#copy-layout-report').click()
 # Persistence of competition timing and units after a full reload.
 page.reload(wait_until='domcontentloaded');tab('comp');page.locator('#comp-sub-warmup').click();assert page.locator('#wu-start-time').input_value()=='09:30';assert page.locator('#wu-total-lifters').input_value()=='10'
 tab('planner');check('train-home');page.locator('[data-act=new-solo]').click();check('train-blank');page.locator('[data-act=add-block]').click();check('train-builder')
 # Exercise every base selector, available modifier, and complex composition control.
 for base in page.locator('[data-comp=base] option').evaluate_all('(els)=>els.map(e=>e.value)'):
  page.locator('[data-comp=base]').select_option(base)
  for key in page.locator('[data-act=modifier]').evaluate_all('(els)=>els.map(e=>({group:e.dataset.group,value:e.dataset.value}))'):
   selector='[data-act=modifier][data-group='+json.dumps(key['group'])+'][data-value='+json.dumps(key['value'])+']'
   page.locator(selector).click();page.locator(selector).click()
 page.locator('[data-comp=base]').select_option('Snatch')
 page.locator('[data-act=component-copy]').click();assert page.locator('.studio-component').count()==2
 page.locator('[data-act=component-up]').last.click();page.locator('[data-act=component-down]').first.click();page.locator('[data-act=component-remove]').last.click()
 page.locator('[data-act=component-add]').click();page.locator('[data-act=component-remove]').last.click()
 for value in ['competition','gym']:page.locator('[data-w=loading]').select_option(value)
 for value in page.locator('[data-block-field=referenceLift] option').evaluate_all('(els)=>els.map(e=>e.value)'):page.locator('[data-block-field=referenceLift]').select_option(value)
 for value in ['no','yes']:page.locator('[data-block-field=warmups]').select_option(value)
 for value in ['kg','percent']:page.locator('[data-stage=mode]').select_option(value)
 page.locator('[data-act=stage-add]').click();assert page.locator('.studio-stage').count()==2;page.locator('[data-act=stage-remove]').last.click()
 old_id=page.evaluate("JSON.parse(localStorage.getItem('barbell_workout_v3')).id")
 page.locator('[data-act=switch]').click();page.locator('[data-act=new-class]').click();page.locator('[data-act=switch]').click();page.locator('[data-act=resume-draft][data-id='+json.dumps(old_id)+']').click();assert page.evaluate("JSON.parse(localStorage.getItem('barbell_workout_v3')).id")==old_id
 check('resumed-train-draft')
 page.locator('[data-act=switch]').click();page.locator('[data-act=lesson]').click();page.locator('#lesson-log').click();assert page.locator('[data-editor=session]').input_value()=='1:1 Session';page.locator('#studio-log-dialog [aria-label=Close]').click()
 page.locator('[data-act=import]').click();assert page.locator('#read-photo').is_disabled()
 with page.expect_file_chooser():page.locator('#choose-program-photo').click()
 page.locator('#program-text').fill('unrecognised programme');page.locator('#build-transcription').click();assert page.locator('#ocr-status').inner_text()
 page.locator('#program-text').fill('A) Snatch (20 min)\n3 x 2 @ 75');page.locator('#build-transcription').click();assert page.locator('.studio-component').count()==1
 check('imported-programme')
 page.evaluate('TrainingApp.opener()');check('opener-dialog');page.locator('dialog [aria-label=Close]').click()
 page.evaluate('openLogModal()');check('log-editor');page.locator('#studio-log-dialog [aria-label=Close]').click()
 assert not errors,errors
 (out/(engine+'-coverage.json')).write_text(json.dumps({'pages':coverage,'javascriptErrors':errors},indent=2))
 print('PASS:',engine,len(coverage),'page states; filters, selectors, goals, attempt planning/reset, timing persistence, meet validation/results/delete, units, bodyweight/import, estimates, backup/export/restore, layout report and bounds 320–430px.')
 browser.close()
