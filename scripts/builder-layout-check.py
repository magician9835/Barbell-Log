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
 assert not errors,errors
 print('PASS:',engine,'native date/select bounds, equal heights, stacked metadata, blank-plan actions, complex fields and separate competition loading at 320–430px.')
 browser.close()
