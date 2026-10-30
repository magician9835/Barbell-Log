"""Reproduce the owner's reported 402x812 viewport in a 402x874 screen."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess
root=Path(__file__).resolve().parents[1]
old_layout=subprocess.check_output(['git','show','d5d514e:phone-layout.js'],cwd=root,text=True)
out=Path('/workspace/barbell-review/measured-iphone');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],timeout=8000)
 for before in [True,False]:
  page=b.new_page(viewport={'width':402,'height':874},screen={'width':402,'height':874},is_mobile=True)
  page.add_init_script("Object.defineProperty(navigator,'standalone',{value:true});Object.defineProperty(window,'innerHeight',{get:()=>812});Object.defineProperty(window.visualViewport,'height',{get:()=>812});")
  def serve(r):
   if r.request.url.startswith('http://localhost:8000/'):
    path=root/r.request.url.split('localhost:8000/')[1].split('?')[0];mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}.get(path.suffix)
    if path.is_file() and mime:
     text=old_layout if before and path.name=='phone-layout.js' else path.read_text()
     if path.suffix=='.html':text=text.replace('</head>','<style>:root{--phone-safe-top:62px!important;--phone-safe-bottom:34px!important;}</style></head>')
     r.fulfill(content_type=mime,body=text);return
   r.abort()
  page.route('**/*',serve);page.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded')
  shell=page.locator('#app').bounding_box();tabs=page.locator('#tabs').bounding_box()
  expected=812 if before else 874
  assert round(shell['height'])==expected,shell
  assert round(tabs['y']+tabs['height'])==expected,tabs
  page.screenshot(path=str(out/('before.png' if before else 'after.png')))
  print(('Before' if before else 'After')+': viewport reports 812px; shell/footer ends at '+str(expected)+'px',flush=True)
  page.close()
 b.close()
