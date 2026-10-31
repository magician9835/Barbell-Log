"""Verify overall medals while keeping competition/training records separate."""
import json,mimetypes,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'.artifacts/records';out.mkdir(parents=True,exist_ok=True)
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
 page.evaluate('''()=>{const rows=[{id:'old-clean-100',date:'2025-12-18',base:'Clean',session:'Coached Class',weight:100,receiving:'Squat (Full)',position:[],technique:[],reps:1},{id:'recent-clean-95',date:'2026-10-29',base:'Clean',session:'Coached Class',weight:95,receiving:'',position:[],technique:[],reps:1,structure:[{base:'Clean',position:[],technique:[],receiving:'',reps:1}]},{id:'solo-tie-100',date:'2026-10-30',base:'Clean',session:'Solo',weight:100,reps:2},{id:'hang-snatch-65',date:'2026-10-25',base:'Snatch',session:'1:1 Session',weight:65,position:['Hang Above Knee'],technique:[],reps:1},{id:'full-snatch-60',date:'2026-10-20',base:'Snatch',session:'Coached Class',weight:60,position:[],technique:[],reps:1},{id:'training-cj-75',date:'2026-10-25',base:'Clean and Jerk',session:'Solo',weight:75,position:[],technique:[],receiving:'Split',reps:1}];setCachedEntries(rows);saveSettingsData({...loadSettings(),pbs:[],meets:[{id:'meet',name:'Previous meet',date:'2026-01-01',snatch:[{weight:61,made:true},{weight:80,made:false}],cj:[{weight:80,made:true}]}]});rebuildPBsFromEntries(rows);renderLog();}''')
 for id in ['recent-clean-95','solo-tie-100','full-snatch-60','training-cj-75']:assert page.locator('[data-entry-id="'+id+'"] [data-record-badge]').count()==0,id
 assert page.locator('[data-entry-id=old-clean-100] [data-record-badge]').count()==1
 assert page.locator('[data-entry-id=hang-snatch-65] [data-record-badge]').count()==1
 # Filters must not manufacture a smaller record.
 page.locator('.filter-chip').filter(has_text='Clean').filter(has_text='Clean').first.click()
 assert page.locator('[data-entry-id=recent-clean-95] [data-record-badge]').count()==0
 page.screenshot(path=str(out/(engine+'-clean-history.png')))
 # A real best in 1:1 beats all Class/Solo records without writing any history.
 page.evaluate("setCachedEntries([...getCachedEntries(),{id:'new-clean-105',date:'2026-10-31',base:'Clean',session:'1:1 Session',weight:105,structure:[{base:'Clean',reps:1,receiving:'Squat (Full)',position:['Floor']}]}]);renderLog()")
 assert page.locator('[data-entry-id=new-clean-105] [data-record-badge]').count()==1
 assert page.locator('[data-entry-id=old-clean-100] [data-record-badge]').count()==0
 page.locator('#tabs .tab').nth(2).click()
 main=page.locator('#pbMainCard').inner_text();assert 'competition' in main.lower() and 'training' in main.lower() and '61' in main and '65' in main and '75' in main and '80' in main and 'Hang Above Knee' in main,main
 page.screenshot(path=str(out/(engine+'-separate-records.png')))
 assert page.evaluate('PendingLifts.list().length')==0
 assert not errors,errors
 print('PASS:',engine,'95kg legacy/structured regression, session-independent maxima, no extra tie medals, successful meet baselines, real variation records, filters, new overall best and unchanged Competition/Training record panels.')
 b.close()
