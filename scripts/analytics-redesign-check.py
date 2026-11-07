"""Exercise the redesigned analytics with mixed historical records and no backend writes."""
import json,mimetypes,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'.artifacts/analytics-redesign';out.mkdir(parents=True,exist_ok=True)
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
 page.evaluate("""()=>{WorkoutModel.date=()=> '2026-11-07';const sn=(id,date,weight,extra={})=>({id,date,weight,base:'Snatch',session:'Coached Class',sets:1,reps:1,quality:4,position:[],grip:[],technique:[],...extra});
 const rows=[sn('older','2024-12-15',45),sn('first','2026-09-01',50),sn('second','2026-09-08',55),sn('unknown-reps','2026-09-15',52,{reps:null}),sn('third','2026-10-01',57.5,{receiving:'Squat (Full)'}),sn('latest','2026-11-01',60,{structure:[{base:'Snatch',reps:1,position:['Floor'],receiving:''}]}),sn('hang','2026-10-25',65,{position:['Hang Above Knee']}),sn('warm','2026-11-01',90,{phase:'warmup'}),sn('miss','2026-11-02',75,{made:false}),sn('future','2026-11-08',100),sn('front','2026-11-01',110,{base:'Squat',technique:['Front'],session:'Solo'}),sn('back','2026-09-01',125,{base:'Squat',technique:['Back']}),sn('cj','2026-10-02',80,{base:'Clean and Jerk',session:'1:1 Session'})];window.analyticsFixtures=rows;setCachedEntries(rows);saveSettingsData({...loadSettings(),unit:'kg',pbs:[],comp:{name:'Lift Off',date:'2026-11-08'},bwLog:[{date:'2026-11-04',weight:80.2}]});}""")
 page.locator('#log-sub-analytics').click()
 assert page.locator('[data-view=lifts]').get_attribute('aria-pressed')=='true'
 assert page.locator('[data-period="84"]').get_attribute('aria-pressed')=='true'
 assert page.locator('[data-analytics=movement] option:checked').inner_text()=='Snatch'
 assert '60' in page.locator('.progress-big-weight').inner_text()
 assert page.locator('.analytics-chart [data-point]').count()==5
 assert page.locator('.analytics-smooth-line').count()==1
 assert page.locator('.progress-filters').get_attribute('open') is None
 assert page.locator('#studio-log-dialog').count()==0
 page.locator('.analytics-chart [data-point=first]').click()
 assert '1 Sept 2026' in page.locator('#analytics-selection').inner_text() or '1 Sep 2026' in page.locator('#analytics-selection').inner_text()
 assert page.locator('#studio-log-dialog').count()==0
 page.locator('#analytics-selection [data-record]').click();assert page.locator('[data-editor=date]').input_value()=='2026-09-01'
 page.locator('#studio-log-dialog [aria-label=Close]').click()
 # Variants are never silently combined into one strength trend.
 page.locator('[data-analytics=movement]').select_option(label='Compare Snatch variations');assert page.locator('.analytics-chart').count()==0
 assert page.locator('.progress-variation-card').count()==2
 page.locator('.progress-variation-card').filter(has_text='Hang Above Knee').click();assert '65' in page.locator('.progress-big-weight').inner_text()
 page.locator('[data-analytics=movement]').select_option(label='Snatch')
 page.locator('.progress-filters>summary').click();page.locator('[data-analytics=rep]').select_option('1')
 assert page.locator('.analytics-chart [data-point]').count()==4
 page.locator('[data-period="28"]').click();assert page.locator('.analytics-chart [data-point]').count()==1
 assert page.locator('.analytics-smooth-line').count()==0
 page.locator('.progress-filters>summary').click()
 page.locator('[data-analytics=session]').select_option('Competition');assert page.locator('.progress-empty').is_visible()
 page.locator('[data-go=reset-filters]').first.click();page.locator('[data-period=all]').click()
 assert page.locator('.analytics-chart [data-point]').count()==6
 page.locator('[data-go=more-days]').click();assert page.locator('.analytics-record').count()==6
 # Details retain exact dates, units and accessible alternatives to chart points.
 page.add_style_tag(content=':root{--phone-safe-top:62px;--phone-safe-bottom:34px;}')
 def bounds(label):
  for width in [320,375,402,430]:
   page.set_viewport_size({'width':width,'height':812});assert page.evaluate('document.documentElement.scrollWidth')<=width,(label,width)
   for control in page.locator('.analytics-v4 select:visible').all():
    box=control.bounding_box();assert box['x']>=0 and box['x']+box['width']<=width and box['height']>=44,(label,width,box)
   page.locator('#pane-log').evaluate('(e)=>e.scrollTop=0')
   if label=='lifts' and width==402:
    chart=page.locator('.analytics-chart').bounding_box();assert chart['y']+chart['height']<=page.locator('#tabs').bounding_box()['y']
   page.screenshot(path=str(out/(engine+'-'+label+'-'+str(width)+'.png')))
  page.set_viewport_size({'width':402,'height':812})
 if page.locator('.progress-filters').get_attribute('open') is not None:page.locator('.progress-filters>summary').click()
 bounds('lifts')
 assert all('202' in x for x in page.locator('.analytics-date-tick').all_text_contents())
 # Coaching keeps its evidence and sends competition preparation to Plan.
 card=page.locator('[data-coaching=meet]');assert '1 day to Lift Off' in card.inner_text()
 card.locator('summary').click();assert 'within 14 days' in card.inner_text()
 card.locator('[data-coaching-action]').click();assert page.locator('#comp-pane-plan').is_visible();assert page.locator('#build-openers').count()==0
 page.locator('#tabs .tab').first.click();page.locator('#log-sub-analytics').click()
 page.locator('[data-view=training]').click();bounds('training')
 assert page.locator('.progress-weeks').count()==1 and page.locator('.progress-week-track').count()<=8
 assert '110' not in page.locator('.progress-training-stats').inner_text() # Counts, not incomparable loads.
 assert page.locator('.progress-balance').get_by_text('Clean',exact=True).count()==1
 assert page.locator('.progress-balance').get_by_text('Jerk',exact=True).count()==1
 assert '80.2' in page.locator('.progress-bodyweight').inner_text()
 page.locator('.progress-session>summary').first.click();assert page.locator('.progress-session[open] [data-record]').count()>0
 page.locator('.progress-session[open] [data-record]').first.click();assert page.locator('#studio-log-dialog').is_visible();page.locator('#studio-log-dialog [aria-label=Close]').click()
 # Unit changes convert the view without mutating canonical kilograms.
 page.locator('.progress-bodyweight [data-go=bodyweight]').click();assert page.locator('#pane-settings').get_attribute('class').find('active')>=0
 page.locator('#unit-lbs').click();page.locator('#tabs .tab').first.click();page.locator('#log-sub-analytics').click();page.locator('[data-view=lifts]').click()
 assert '132.3' in page.locator('.progress-big-weight').inner_text() and 'lbs' in page.locator('.progress-big-weight').inner_text()
 assert page.evaluate("getCachedEntries().find(e=>e.id==='latest').weight")==60
 assert page.evaluate('PendingLifts.list().length')==0
 page.evaluate('setCachedEntries([]);renderAnalytics()');assert page.locator('.progress-empty [data-go=log]').is_visible()
 page.locator('[data-go=log]').click();assert page.locator('#studio-log-dialog').is_visible()
 assert not errors,errors
 print('PASS:',engine,'working-only daily tops, canonical variants, read-before-edit point selection, periods/reps/session filters, empty/reset/all-time, pagination, month-year dates, whole-log rhythm/complex balance/ratings/bodyweight, evidence/competition Plan, unit conversion without mutations and iPhone safe-area bounds at 320–430px.')
 b.close()
