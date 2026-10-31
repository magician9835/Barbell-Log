"""Exercise live competition-plan links without contacting real accounts."""
import json,mimetypes,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'.artifacts/rehearsal-link';out.mkdir(parents=True,exist_ok=True)
engine=os.environ.get('BARBELL_BROWSER_ENGINE','chromium')
with sync_playwright() as p:
 browser=getattr(p,engine).launch(**({'executable_path':shutil.which('chromium') or None,'args':['--no-sandbox']} if engine=='chromium' else {}))
 page=browser.new_page(viewport={'width':402,'height':812},is_mobile=True,has_touch=True,locale='en-GB');page.set_default_timeout(6000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  path=root/r.request.url.split('localhost:8000/')[-1].split('?')[0]
  if r.request.url.startswith('http://localhost:8000/') and path.is_file():r.fulfill(body=path.read_bytes(),content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
  else:r.abort()
 page.route('**/*',route);page.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded')
 page.evaluate("saveSettingsData({...loadSettings(),meets:[],pbs:[{lift:'Snatch',weight:70},{lift:'Clean and Jerk',weight:100}],comp:{name:'Lift Off',date:'2026-11-08',snatch:[60,63,65],cj:[85,90,95]}});TrainingApp.open();TrainingApp.opener()")
 page.locator('#opener-date').fill('2026-11-01');page.locator('#opener-use-plan').click()
 assert page.locator('[data-opener="0-0"]').input_value()=='60'
 assert page.locator('[data-opener="1-2"]').input_value()=='95'
 assert page.locator('#opener-keep-linked').is_checked()
 assert page.locator('[data-opener]').evaluate_all('(els)=>els.every(e=>e.readOnly)')
 page.locator('#build-openers').click()
 def workout():return page.evaluate("JSON.parse(localStorage.getItem('barbell_workout_v3'))")
 w=workout();assert w['date']=='2026-11-01' and w['competitionLink']['date']=='2026-11-08'
 ids=[s['id'] for s in w['blocks'][0]['stages']]
 assert page.locator('[data-rehearsal-attempt]').evaluate_all('(els)=>els.every(e=>e.readOnly)')
 page.locator('[data-act=open-comp-plan]').click();page.locator('#cw-snatch-0').fill('61');page.locator('#cw-snatch-0').blur()
 assert workout()['blocks'][0]['stages'][0]['value']==61
 page.locator('#tabs .tab').nth(1).click();assert page.locator('[data-rehearsal-attempt="1"]').first.input_value()=='61'
 assert [s['id'] for s in workout()['blocks'][0]['stages']]==ids
 assert page.evaluate('PendingLifts.list().length')==0
 page.screenshot(path=str(out/(engine+'-linked-setup.png')))
 page.locator('[data-act=start]').click();page.locator('[data-act=complete]').click();page.wait_for_function("Object.keys(JSON.parse(localStorage.getItem('barbell_workout_v3')).done).length===1")
 before=workout();warm=[(s['key'],s['weight']) for s in page.evaluate("WorkoutModel.expand(JSON.parse(localStorage.getItem('barbell_workout_v3')).blocks[0],'competition').filter(s=>s.phase==='warmup')")]
 page.evaluate("saveSettingsData({...loadSettings(),comp:{...loadSettings().comp,snatch:[62,65,68],cj:[87,92,97]}})")
 assert workout()['done']==before['done']
 assert warm==[(s['key'],s['weight']) for s in page.evaluate("WorkoutModel.expand(JSON.parse(localStorage.getItem('barbell_workout_v3')).blocks[0],'competition').filter(s=>s.phase==='warmup')")]
 # Background plan updates do not replace a focused actual input.
 actual=page.locator('[data-actual=weight]');actual.fill('30');actual.evaluate('(e)=>window.linkActualInput=e')
 page.evaluate("saveSettingsData({...loadSettings(),comp:{...loadSettings().comp,cj:[88,92,97]}})")
 assert workout()['blocks'][1]['stages'][0]['value']==87
 assert actual.evaluate('(e)=>e===window.linkActualInput')
 actual.blur();page.wait_for_function("JSON.parse(localStorage.getItem('barbell_workout_v3')).blocks[1].stages[0].value===88")
 assert page.locator('[data-actual=weight]').input_value()=='30'
 # Complete the opener with an actual load different from the plan.
 while page.locator('[data-act=complete]').inner_text()=='Log warm-up':page.locator('[data-act=skip]').click()
 page.locator('[data-actual=weight]').fill('63');page.locator('[data-act=complete]').click();page.wait_for_function("Object.keys(JSON.parse(localStorage.getItem('barbell_workout_v3')).done).length===2")
 recorded=workout()['done']
 page.evaluate("saveSettingsData({...loadSettings(),comp:{...loadSettings().comp,snatch:[64,67,70]}})")
 assert workout()['done']==recorded and workout()['blocks'][0]['stages'][1]['value']==67
 assert page.evaluate('PendingLifts.list().length')==2
 # A rename retains the link; another competition pauses it until explicitly pulled.
 page.evaluate("saveSettingsData({...loadSettings(),comp:{...loadSettings().comp,name:'Lift Off Autumn'}})");assert workout()['competitionLink']['name']=='Lift Off Autumn'
 previous=[s['value'] for s in workout()['blocks'][0]['stages']]
 page.evaluate("saveSettingsData({...loadSettings(),comp:{...loadSettings().comp,date:'2026-11-15',snatch:[65,68,71]}})")
 assert 'Competition changed' in workout()['competitionLink']['status']
 assert [s['value'] for s in workout()['blocks'][0]['stages']]==previous
 page.locator('.studio-details>summary').filter(has_text='Session options').click();page.locator('[data-act=link-plan]').click()
 assert workout()['competitionLink']['date']=='2026-11-15' and workout()['done']==recorded
 page.locator('.studio-details>summary').filter(has_text='Session options').click();page.locator('[data-act=unlink-plan]').click()
 independent=[s['value'] for s in workout()['blocks'][0]['stages']]
 page.evaluate("saveSettingsData({...loadSettings(),comp:{...loadSettings().comp,snatch:[66,69,72]}})")
 assert 'competitionLink' not in workout() and [s['value'] for s in workout()['blocks'][0]['stages']]==independent
 # Pull, then opt out: edits remain a rehearsal-only copy.
 page.evaluate('TrainingApp.opener()');page.locator('#opener-use-plan').click();page.locator('#opener-keep-linked').uncheck();page.locator('[data-opener="0-0"]').fill('58');page.locator('#build-openers').click()
 assert 'competitionLink' not in workout() and workout()['blocks'][0]['stages'][0]['value']==58
 assert page.evaluate('loadSettings().comp.snatch[0]')==66
 # Calculated suggestions match exactly what Comp Plan displays.
 page.evaluate("saveSettingsData({...loadSettings(),comp:{...loadSettings().comp,snatch:[null,null,null],cj:[null,null,null]}});switchTab('comp',document.querySelectorAll('#tabs .tab')[3]);switchCompSub('plan')")
 expected=[page.locator('#cw-'+key+'-'+str(i)).input_value() for key in ['snatch','cj'] for i in range(3)]
 page.evaluate('TrainingApp.opener()');page.locator('#opener-use-plan').click()
 assert [page.locator('[data-opener="'+str(k)+'-'+str(i)+'"]').input_value() for k in range(2) for i in range(3)]==expected
 page.locator('#build-openers').click();page.reload(wait_until='domcontentloaded');page.locator('#tabs .tab').nth(1).click();page.locator('[data-act=resume]').click()
 assert workout()['competitionLink']['status']=='linked'
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812});assert page.evaluate('document.documentElement.scrollWidth')<=width
 assert not errors,errors
 print('PASS:',engine,'competition pull, exact shown suggestions, linked edits, stable IDs, separate dates, recorded-history/build-up preservation, active updates, competition-change pause, explicit relink, one-off copy, reload and mobile widths.')
 browser.close()
