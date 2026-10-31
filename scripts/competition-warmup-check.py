"""Exercise competition-day setup, attempt changes and recovery with isolated data."""
import json,mimetypes,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'.artifacts/competition';out.mkdir(parents=True,exist_ok=True)
engine=os.environ.get('BARBELL_BROWSER_ENGINE','chromium')
with sync_playwright() as p:
 b=getattr(p,engine).launch(**({'executable_path':shutil.which('chromium') or None,'args':['--no-sandbox']} if engine=='chromium' else {}))
 page=b.new_page(viewport={'width':402,'height':812},is_mobile=True,has_touch=True,locale='en-GB');page.set_default_timeout(6000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 legacy={'wu-start-time':{'value':'09:30'},'wu-total-lifters':{'value':'10'},'wu-pace':{'value':'1.5'},'wu-sn-opener':{'value':'65'},'wu-cj-opener':{'value':'95'},'wu-lifters-sn':{'value':'0'},'wu-lifters-cj':{'value':'4'},'wu-cj-start-override':{'value':'11:15'}}
 page.add_init_script("if(!localStorage.getItem('audit-seeded')){localStorage.setItem('barbell_settings_v1',"+json.dumps(json.dumps({'comp':{'name':'Lift Off','date':'2026-11-08'},'compWarmup':legacy}))+ ");localStorage.setItem('audit-seeded','1');}")
 def serve(r):
  path=root/r.request.url.split('localhost:8000/')[-1].split('?')[0]
  if r.request.url.startswith('http://localhost:8000/') and path.is_file():r.fulfill(body=path.read_bytes(),content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
  else:r.abort()
 page.route('**/*',serve);page.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded')
 page.locator('#tabs .tab').nth(3).click();page.locator('#comp-sub-warmup').click()
 assert page.locator('#wu-start-time').input_value()=='09:30';assert page.locator('#wu-cj-start-override').input_value()=='11:15';assert page.locator('#wu-sn-opener').input_value()=='65'
 assert page.locator('#cw-session').get_attribute('open') is None
 page.locator('#cw-session>summary').click();page.locator('.cw-preferences>summary').click();page.locator('#wu-pace').fill('1');page.locator('#cw-next-lifts').click()
 assert page.locator('#cw-session').get_attribute('open') is None
 for k in ['sn','cj']:
  page.locator('#cw-setup [data-cw-lift='+k+']').click();assert page.locator('#wu-'+k+'-opener').is_visible()
 page.locator('#cw-setup [data-cw-lift=sn]').click()
 # A custom, repeatable ladder, with validation and no fabricated completion.
 page.locator('[data-cw-edit=sn]').click();page.locator('[data-step="1"][data-key=weight]').fill('65');page.locator('#cw-save-ladder').click();assert page.locator('#cw-edit-error').inner_text()
 page.locator('[data-step="1"][data-key=weight]').fill('30');page.locator('#cw-add-step').click()
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812})
  for control in page.locator('dialog input').all():
   bounds=control.bounding_box();outer=page.locator('dialog').bounding_box();assert bounds['x']>=outer['x'] and bounds['x']+bounds['width']<=outer['x']+outer['width']
 page.set_viewport_size({'width':402,'height':812});page.locator('#cw-save-ladder').click()
 assert page.locator('dialog[open]').count()==0
 page.locator('#cw-setup [data-cw-mode=day]').click();assert page.locator('#cw-day').is_visible()
 assert page.locator('#cw-ladder li').count()==7
 assert 'no collars' in page.locator('#cw-ladder').inner_text()
 # The action must be reachable in the actual iPhone safe-area geometry.
 page.add_style_tag(content=':root{--phone-safe-top:62px;--phone-safe-bottom:34px;}')
 page.locator('#pane-comp').evaluate('(e)=>e.scrollTop=0')
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812})
  assert page.evaluate('document.documentElement.scrollWidth')<=width
  if width==402:
   c=page.locator('#cw-complete').bounding_box();tabs=page.locator('#tabs').bounding_box();assert c['y']+c['height']<tabs['y'],(c,tabs)
  page.screenshot(path=str(out/(engine+'-day-'+str(width)+'.png')))
 page.set_viewport_size({'width':402,'height':812})
 page.locator('#cw-set-count').click();page.locator('#cw-remaining').fill('0');page.locator('#cw-confirm-count').click();assert 'Follow the platform call' in page.locator('#cw-next').inner_text();assert page.locator('#cw-complete').count()==0
 page.locator('#cw-set-count').click();page.locator('#cw-remaining').fill('18');page.locator('#cw-confirm-count').click()
 assert page.locator('.cw-counter-controls strong').inner_text()=='18'
 count=page.evaluate("loadSettings().competitionWarmupV1.lifts.sn.live.remaining")
 page.locator('#cw-complete').click();first_done=page.evaluate("Object.keys(loadSettings().competitionWarmupV1.lifts.sn.done)[0]")
 assert page.locator('.cw-ladder-list [data-undo="'+first_done+'"]').inner_text()=='✓ Done'
 page.locator('[data-live-add="-1"]').click();assert page.locator('.cw-counter-controls strong').inner_text()=='17'
 page.locator('[data-live-add="1"]').click();assert page.locator('.cw-counter-controls strong').inner_text()=='18'
 assert page.evaluate("Object.keys(loadSettings().competitionWarmupV1.lifts.sn.done).length")==1
 assert page.evaluate('PendingLifts.list().length')==0
 page.reload(wait_until='domcontentloaded');page.locator('#tabs .tab').nth(3).click();page.locator('#comp-sub-warmup').click()
 assert page.locator('#cw-day').is_visible();assert page.locator('.cw-counter-controls strong').inner_text()=='18'
 assert page.locator('[data-undo="'+first_done+'"]').inner_text()=='✓ Done'
 page.locator('#cw-skip').click();assert page.evaluate("Object.values(loadSettings().competitionWarmupV1.lifts.sn.done).some(x=>x.skipped)")
 page.locator('[data-undo="'+first_done+'"]').click();assert not page.evaluate("loadSettings().competitionWarmupV1.lifts.sn.done["+json.dumps(first_done)+"]")
 page.locator('#cw-day [data-cw-lift=cj]').click();assert 'Clean & jerk' in page.locator('#cw-next').inner_text();assert page.locator('.cw-counter-controls strong').inner_text()=='—'
 page.locator('#cw-day [data-cw-lift=sn]').click();assert page.locator('.cw-counter-controls strong').inner_text()=='18'
 page.locator('.cw-mode [data-cw-mode=setup]').click();page.locator('#cw-setup [data-cw-lift=cj]').click();assert '11:15' in page.locator('#cw-setup-summary-cj').inner_text()
 page.screenshot(path=str(out/(engine+'-setup.png')))
 # Settings snapshots include the new day progress, separate from actual meets.
 snapshot=page.evaluate('CloudBackup.snapshot()');assert snapshot['data']['barbell_settings_v1']['competitionWarmupV1']['lifts']['sn']['live']['remaining']==18
 page.locator('.cw-mode [data-cw-mode=day]').click();page.locator('.cw-delay>summary').click();page.locator('#cw-reset-progress').click();page.locator('#confirmYes').click();assert page.locator('.cw-counter-controls strong').inner_text()=='—'
 assert page.evaluate("loadSettings().competitionWarmupV1.lifts.sn.live.remaining")==18
 assert not errors,errors
 print('PASS:',engine,'shared session setup, separate lift plans, legacy values, editable ladder/validation, full visible build-up, reachable day action with iPhone safe areas, live count changes, done/skip/undo, reload, independent C&J and backed-up state.')
 b.close()
