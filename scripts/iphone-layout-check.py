"""Check phone shell geometry with simulated iPhone safe areas."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],timeout=8000)
 page=b.new_page(viewport={'width':402,'height':874},is_mobile=True,device_scale_factor=1)
 page.set_default_timeout(5000)
 page.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
 def serve(r):
  if r.request.url.startswith('http://localhost:8000/'):
   path=root/r.request.url.split('localhost:8000/')[1].split('?')[0]
   if path.is_file():
    mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}.get(path.suffix)
    if mime:r.fulfill(content_type=mime,body=path.read_text());return
  r.abort()
 page.route('**/*',serve)
 page.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded')
 page.add_style_tag(content=':root{--phone-safe-top:62px;--phone-safe-bottom:34px;}')
 page.evaluate("window.dispatchEvent(new Event('resize'))")
 page.wait_for_timeout(50)
 tabs=page.locator('#tabs').bounding_box();header=page.locator('#header').bounding_box()
 assert abs(tabs['y']+tabs['height']-874)<1,(tabs,header)
 assert abs(tabs['height']-87)<2,tabs
 title=page.locator('#header h1').bounding_box();assert title['y']>=74,title
 content=page.locator('#content').bounding_box();assert content['y']+content['height']<=tabs['y']+1
 assert page.evaluate('document.documentElement.scrollWidth')<=402
 for tab in page.locator('#tabs .tab').all():assert tab.bounding_box()['height']>=44
 out=Path('/workspace/barbell-review/iphone16pro-layout.png');out.parent.mkdir(exist_ok=True)
 page.screenshot(path=str(out))
 # Simulate keyboard viewport changes while a form has focus.
 page.evaluate('TrainingApp.recap()')
 page.locator('#m-weight').focus()
 page.set_viewport_size({'width':402,'height':540});page.wait_for_timeout(50)
 assert page.locator('#app').bounding_box()['height']<=540
 page.set_viewport_size({'width':402,'height':874});page.evaluate('closeLogModal()');page.wait_for_timeout(150)
 assert abs(page.locator('#app').bounding_box()['height']-874)<1
 print('PASS: 402x874, 62px top / 34px bottom safe areas, footer touches viewport bottom, 52px button row, keyboard resize recovery.')
 b.close()
