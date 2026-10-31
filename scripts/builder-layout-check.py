"""Check native form bounds in Chromium locally and WebKit in CI."""
import json,mimetypes,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=root/'.artifacts'/'builder';out.mkdir(parents=True,exist_ok=True)
engine=os.environ.get('BARBELL_BROWSER_ENGINE','chromium')
with sync_playwright() as p:
 browser=getattr(p,engine).launch(**({'executable_path':os.environ.get('BARBELL_BROWSER_PATH') or shutil.which('chromium') or None,'args':['--no-sandbox']} if engine=='chromium' else {}))
 page=browser.new_page(viewport={'width':402,'height':812},is_mobile=True,has_touch=True,locale='en-GB')
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  path=root/r.request.url.split('localhost:8000/')[-1].split('?')[0]
  if r.request.url.startswith('http://localhost:8000/') and path.is_file():r.fulfill(body=path.read_bytes(),content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
  else:r.abort()
 page.route('**/*',route)
 page.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded')
 page.locator('#tabs .tab').nth(1).click();page.locator('[data-act=new-class]').click()
 assert page.locator('[data-act=start]').count()==0
 def bounds():
  issues=page.locator('#training-root').evaluate('''root=>{const outer=root.getBoundingClientRect();return [...root.querySelectorAll('input,select')].flatMap(e=>{const r=e.getBoundingClientRect(),label=e.closest('label').getBoundingClientRect();return r.x<label.x-1||r.right>label.right+1||r.x<outer.x||r.right>outer.right?[{name:e.outerHTML,rect:r.toJSON(),label:label.toJSON()}]:[]})}''')
  assert not issues,(engine,issues)
  assert page.evaluate('document.documentElement.scrollWidth')<=page.viewport_size['width']
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812})
  date=page.locator('[data-w=date]').bounding_box();session=page.locator('[data-w=session]').bounding_box()
  assert date['y']+date['height']<session['y']
  assert abs(date['height']-session['height'])<=1
  bounds()
  if width==402:page.screenshot(path=str(out/(engine+'-blank.png')))
 page.locator('[data-act=add-block]').click()
 assert page.locator('[data-act=start]').is_visible()
 page.locator('[data-act=component-add]').click()
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812});bounds()
  if width==402:page.screenshot(path=str(out/(engine+'-complex.png')))
 page.locator('[data-w=loading]').select_option('competition')
 assert '5 kg collars' in page.locator('.studio-session-card').inner_text()
 assert page.locator('[data-w=session]').input_value()=='Coached Class'
 # Rehearsal and manual-log dialogs are top-layer elements, outside Train.
 # They must reject horizontal movement while retaining vertical scrolling.
 for mode in ['opener','log']:
  page.evaluate('TrainingApp.opener()' if mode=='opener' else 'openLogModal()')
  dialog=page.locator('dialog').last
  for width in [320,375,402,430]:
   page.set_viewport_size({'width':width,'height':812})
   metrics=dialog.evaluate("""d=>{const s=getComputedStyle(d);return{width:d.clientWidth,scrollWidth:d.scrollWidth,overflowX:s.overflowX,touchAction:s.touchAction,overscrollX:s.overscrollBehaviorX}}""")
   assert metrics['scrollWidth']<=metrics['width']+1,(engine,mode,width,metrics)
   assert metrics['overflowX']=='hidden' and metrics['touchAction']=='pan-y' and metrics['overscrollX']=='none',(engine,mode,width,metrics)
   dialog.evaluate('(d)=>{d.scrollLeft=100;d.scrollTop=0}')
   assert dialog.evaluate('(d)=>d.scrollLeft')==0
  if engine=='chromium':
   dialog.hover(position={'x':dialog.bounding_box()['width']-10,'y':100});page.mouse.wheel(160,0);page.wait_for_timeout(100)
   assert dialog.evaluate('(d)=>d.scrollLeft')==0
   dialog.hover(position={'x':20,'y':80});page.mouse.wheel(0,400)
  else:
   # Playwright mobile WebKit does not implement mouse-wheel input. Native
   # bounds/gesture CSS and scrollability are still checked in that engine.
   dialog.evaluate('(d)=>d.scrollBy(160,0)')
   assert dialog.evaluate('(d)=>d.scrollLeft')==0
   dialog.evaluate('(d)=>d.scrollBy(0,400)')
  page.wait_for_function('document.querySelector("dialog[open]").scrollTop>0',timeout=3000)
  if mode=='opener':
   page.locator('[data-opener="0-0"]').fill('65')
   assert page.locator('[data-opener="0-0"]').input_value()=='65'
  else:
   page.locator('[data-editor=weight]').fill('55')
   assert page.locator('[data-editor=weight]').input_value()=='55'
  page.set_viewport_size({'width':402,'height':812})
  dialog.evaluate('(d)=>d.scrollTop=0')
  page.screenshot(path=str(out/(engine+'-'+mode+'-vertical.png')))
  dialog.locator('[aria-label=Close]').click()
 page.locator('#tabs .tab').first.click()
 assert page.locator('.filter-bar').first.evaluate('(e)=>{e.scrollLeft=100;return e.scrollLeft>0}')
 assert page.evaluate('window.scrollX')==0
 # Recording keeps the current build-up visible with one clear next action.
 page.evaluate('TrainingApp.open();TrainingApp.opener()')
 for selector,value in [('[data-opener="0-0"]','65'),('[data-opener="0-1"]','68'),('[data-opener="0-2"]','70'),('[data-opener="1-0"]','90')]:page.locator(selector).fill(value)
 page.locator('#build-openers').click();page.locator('[data-act=start]').click()
 assert page.locator('.session-plan-grid').first.locator('li').count()==8
 assert page.locator('.session-plan-grid [aria-current=step]').count()==1
 assert page.locator('[data-actual=quality]').count()==0
 assert page.locator('[data-clock]').count()==1
 assert page.locator('.session-set-note').get_attribute('open') is None
 for width in [320,375,402,430]:
  page.set_viewport_size({'width':width,'height':812});bounds()
  assert page.locator('.session-plan-grid').first.is_visible()
  assert page.locator('.session-plan').first.bounding_box()['y']<page.locator('.session-record-card').bounding_box()['y']
 page.set_viewport_size({'width':402,'height':812})
 page.locator('#pane-planner').evaluate('(e)=>e.scrollTop=0')
 assert page.locator('[data-act=complete]').bounding_box()['y']+page.locator('[data-act=complete]').bounding_box()['height']<=page.locator('#tabs').bounding_box()['y']
 field=page.locator('[data-actual-rep]');field.evaluate('(e)=>window.recordingRepInput=e');field.fill('3')
 assert field.evaluate('(e)=>e===window.recordingRepInput')
 page.locator('#pane-planner').evaluate('(e)=>e.scrollTop=0')
 page.screenshot(path=str(out/(engine+'-recording-plan.png')))
 # Keep the primary action reachable with the measured iPhone safe areas.
 page.evaluate("document.documentElement.style.setProperty('--phone-safe-top','62px');document.documentElement.style.setProperty('--phone-safe-bottom','34px')")
 page.locator('#pane-planner').evaluate('(e)=>e.scrollTop=0')
 assert page.locator('[data-act=complete]').bounding_box()['y']+page.locator('[data-act=complete]').bounding_box()['height']<=page.locator('#tabs').bounding_box()['y']
 # Editing/deleting a completed tile must not leave a ghost Done marker.
 page.locator('[data-act=complete]').click()
 assert page.locator('.session-plan-grid [data-plan-status=done]').count()==1
 page.locator('[data-act=edit-completed]').first.click()
 assert page.locator('#studio-log-dialog').is_visible()
 page.locator('[data-act=editor-delete]').click();page.locator('#confirm-delete-set').click()
 page.wait_for_function('document.querySelector("#studio-log-dialog")===null')
 assert page.locator('.session-plan-grid [data-plan-status=done]').count()==0
 assert page.locator('.session-plan-grid [data-plan-status=skipped]').count()==1
 assert page.locator('.session-plan-grid [aria-current=step]').count()==1
 while page.locator('.studio-current .eyebrow').inner_text().startswith('WARM-UP'):
  page.locator('[data-act=skip]').click()
 assert page.locator('[data-actual=quality]').is_visible()
 page.locator('#pane-planner').evaluate('(e)=>e.scrollTop=0')
 assert page.locator('[data-act=complete]').bounding_box()['y']+page.locator('[data-act=complete]').bounding_box()['height']<=page.locator('#tabs').bounding_box()['y']
 page.screenshot(path=str(out/(engine+'-recording-attempt.png')))
 assert not errors,errors
 print('PASS:',engine,'native date/select bounds, equal heights, stacked metadata, blank-plan actions, complex fields separate competition loading, vertical-only dialogs and horizontal filter scrolling at 320–430px.')
 browser.close()
