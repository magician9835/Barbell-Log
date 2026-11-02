"""Verify flexible rehearsal additions and a compact, fully editable log."""
import json,mimetypes,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'.artifacts/session-cleanup';out.mkdir(parents=True,exist_ok=True)
engine=os.environ.get('BARBELL_BROWSER_ENGINE','chromium')
with sync_playwright() as p:
 b=getattr(p,engine).launch(**({'executable_path':shutil.which('chromium') or None,'args':['--no-sandbox']} if engine=='chromium' else {}))
 page=b.new_page(viewport={'width':402,'height':812},is_mobile=True,has_touch=True);page.set_default_timeout(6000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  path=root/r.request.url.split('localhost:8000/')[-1].split('?')[0]
  if r.request.url.startswith('http://localhost:8000/') and path.is_file():r.fulfill(body=path.read_bytes(),content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
  else:r.abort()
 page.route('**/*',route);page.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded')
 page.locator('#tabs .tab').nth(1).click()
 assert page.get_by_text('Photo / paste a program',exact=True).count()==0
 page.locator('[data-act=opener]').click()
 page.locator('[data-opener="0-0"]').fill('60');page.locator('[data-opener="1-0"]').fill('90');page.locator('#build-openers').click()
 page.locator('[data-w=date]').fill('2026-11-01');page.locator('[data-act=start]').click()
 page.add_style_tag(content=':root{--phone-safe-top:62px;--phone-safe-bottom:34px;}')
 # A rehearsal can finish early; reopening must not demand its unused warm-ups.
 page.locator('[data-act=finish-early]').click()
 assert 'Session complete' in page.locator('#training-root').inner_text()
 page.locator('.studio-heading [data-act=append-sets]').click();page.locator('#add-sets-lift').select_option('new-front')
 page.locator('[data-add-weight="0"]').fill('95')
 for _ in range(3):page.locator('#add-sets-five').click()
 assert page.locator('[data-add-weight]').evaluate_all('(els)=>els.map(e=>Number(e.value))')==[95,100,105,110]
 # Validate rather than silently changing the chosen loading.
 page.locator('[data-add-weight="3"]').fill('111');page.locator('#add-sets-save').click();assert 'gym plates' in page.locator('#add-sets-error').inner_text()
 page.locator('[data-add-weight="3"]').fill('110')
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812})
  assert page.evaluate('document.documentElement.scrollWidth')<=width
  outer=page.locator('#add-sets-dialog').bounding_box();assert outer['y']>=62 and outer['y']+outer['height']<=812
  for control in page.locator('#add-sets-dialog input,#add-sets-dialog select').all():
   box=control.bounding_box();assert box['x']>=outer['x'] and box['x']+box['width']<=outer['x']+outer['width'],(width,box,outer)
 page.set_viewport_size({'width':402,'height':812});page.screenshot(path=str(out/(engine+'-add-front-squats.png')))
 page.locator('#add-sets-save').click()
 assert 'Squat · Front' in page.locator('.studio-current').inner_text()
 assert page.locator('[data-actual=weight]').input_value()=='95'
 assert 'Gym loading' in page.locator('[data-loading-label]').inner_text()
 plan_id=page.evaluate("JSON.parse(localStorage.getItem('barbell_workout_v3')).id")
 for weight in [95,100,105,110]:
  assert float(page.locator('[data-actual=weight]').input_value())==weight
  page.locator('[data-act=complete]').click()
 assert len(page.evaluate('PendingLifts.list()'))==4
 assert 'Session covered' in page.locator('#training-root').inner_text()
 page.locator('[data-act=finish]').click()
 # Warm-ups are retained, but grouped underneath the top working set.
 page.evaluate("""()=>{const w=JSON.parse(localStorage.getItem('barbell_workout_v3'));setCachedEntries([20,40,60,80].map(weight=>({id:'warm-'+weight,date:w.date,workoutId:w.id,base:'Squat',technique:['Front'],session:'Solo',weight,sets:1,reps:3,phase:'warmup'})));renderLog();}""")
 page.locator('#tabs .tab').first.click()
 assert page.locator('#logList .log-entry').count()==1
 card=page.locator('#logList .log-entry');assert 'Squat · Front' in card.inner_text();assert '110' in card.locator('.log-entry-weight').inner_text()
 assert '1 × 1' in card.locator('.record-actual').inner_text() and 'Top set' in card.locator('.record-actual').inner_text()
 assert card.locator('.record-sets').get_attribute('open') is None
 assert card.locator('.record-set-row:visible').count()==0
 page.screenshot(path=str(out/(engine+'-top-set-log.png')))
 card.locator('.record-sets summary').click();assert card.locator('.record-set-row').count()==8
 row=card.locator('.record-set-row').filter(has_text='105 kg');row.click()
 assert page.locator('[data-editor=weight]').input_value()=='105'
 page.locator('[data-editor=quality]').select_option('4');page.locator('[data-act=editor-save]').click()
 page.wait_for_function('document.querySelector("#studio-log-dialog")===null')
 assert page.evaluate("getCachedEntries().find(e=>e.weight===105).quality")==4
 # Collapsed set controls are not the only way to edit the top set.
 page.locator('#logList .log-entry-header').click();assert page.locator('[data-editor=weight]').input_value()=='110'
 page.locator('#studio-log-dialog [aria-label=Close]').click()
 # The new draft/history and pending records survive an offline reload.
 page.reload(wait_until='domcontentloaded');page.locator('#tabs .tab').nth(1).click();page.locator('[data-act=resume]').click()
 assert page.evaluate("JSON.parse(localStorage.getItem('barbell_workout_v3')).id")==plan_id
 page.locator('.studio-heading [data-act=append-sets]').click()
 assert 'Squat · Front' in page.locator('#add-sets-lift option:checked').inner_text()
 assert page.locator('[data-add-weight="0"]').input_value()=='110'
 page.locator('#add-sets-repeat').click();assert page.locator('[data-add-weight]').count()==2
 page.locator('[data-add-remove="1"]').click();page.locator('[data-add-weight="0"]').fill('112.5');page.locator('#add-sets-save').click()
 assert page.locator('[data-actual=weight]').input_value()=='112.5'
 assert page.evaluate('PendingLifts.list().length')==4 # Planned additions are never logged automatically.
 page.add_style_tag(content=':root{--phone-safe-top:62px;--phone-safe-bottom:34px;}')
 page.locator('#pane-planner').evaluate('(e)=>e.scrollTop=0')
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812});assert page.evaluate('document.documentElement.scrollWidth')<=width
 page.set_viewport_size({'width':402,'height':812});page.locator('#pane-planner').evaluate('(e)=>e.scrollTop=0')
 button=page.locator('[data-act=complete]').bounding_box();assert button['y']+button['height']<=page.locator('#tabs').bounding_box()['y']
 # Another movement can still be modified or built into a complex, without
 # making the ordinary four-single entry show the full movement builder.
 page.locator('.studio-heading [data-act=append-sets]').click();page.locator('#add-sets-lift').select_option('new-pull')
 assert page.locator('#add-sets-movement').get_attribute('open') is None
 page.locator('#add-sets-movement>summary').click()
 page.locator('#add-sets-components [data-act=modifier][data-value="Snatch Grip"]').click()
 page.locator('#add-sets-components [data-act=component-add]').click()
 page.locator('#add-sets-components [data-act=modifier][data-value="Hang Above Knee"]').last.click()
 page.locator('[data-add-weight="0"]').fill('55');page.locator('[data-add-reps="0"]').fill('1+2')
 page.locator('#add-sets-save').click()
 added=page.evaluate("JSON.parse(localStorage.getItem('barbell_workout_v3')).blocks.at(-1)")
 assert added['components'][0]['grip']==['Snatch Grip'] and added['components'][1]['position']==['Hang Above Knee']
 assert list(added['stages'][0]['reps'].values())==[1,2]
 assert page.evaluate('PendingLifts.list().length')==4
 # A blank Class also has a direct route, without filling a percentage planner.
 page.locator('[data-act=exit]').click();page.locator('#keep-draft').click();page.locator('[data-act=new-class]').click()
 assert page.locator('[data-act=append-sets]').inner_text()=='Add sets & start'
 page.locator('[data-act=append-sets]').click();assert page.locator('#add-sets-lift').input_value()=='new-sn'
 page.locator('[data-add-weight="0"]').fill('40');page.locator('[data-add-reps="0"]').fill('2');page.locator('#add-sets-save').click()
 assert page.locator('[data-actual=weight]').input_value()=='40'
 assert page.locator('[data-actual-rep]').input_value()=='2'
 assert page.evaluate("JSON.parse(localStorage.getItem('barbell_workout_v3')).session")=='Coached Class'
 assert not errors,errors
 print('PASS:',engine,'finished rehearsal additions, exact 95/100/105/110 singles, gym loading, validation, repeat/+5/remove, original date and workout ID, offline persistence, top-set summary, hidden retained warm-ups, individual edit/feel rating and 320–430px bounds.')
 b.close()
