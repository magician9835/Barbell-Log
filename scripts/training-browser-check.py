"""Local browser integration against a fake API; never writes to Google."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

root=Path(__file__).resolve().parents[1]
artifacts=Path('/workspace/barbell-review/overhaul');artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],timeout=8000)
    page=browser.new_page(viewport={'width':393,'height':852},is_mobile=True)
    page.set_default_timeout(5000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    rows={};bw=[];meets=[]
    def serve(route):
        url=route.request.url
        if url.startswith('http://localhost:8000/api'):
            if route.request.method=='POST':
                payload=json.loads(route.request.post_data)
                if payload['action']=='deleteEntry':rows.pop(payload['id'],None)
                elif payload['action']=='logBW':bw.append(payload['entry'])
                elif payload['action']=='saveMeet':meets.append(payload['meet'])
                else:rows[payload['entry']['id']]=payload['entry']
            route.fulfill(content_type='application/json',body=json.dumps({'entries':list(rows.values()),'bw':bw,'meets':meets}));return
        if url.startswith('http://localhost:8000/'):
            name=url.split('localhost:8000/')[1].split('?')[0]
            path=root/name
            if path.is_file() and path.suffix in ['.html','.js','.css','.json']:
                mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.suffix]
                route.fulfill(content_type=mime,body=path.read_text());return
        route.abort()
    page.route('**/*',serve)
    page.goto('http://localhost:8000/olympic-lifting-tracker.html',wait_until='domcontentloaded')
    page.locator('#open-training').click();page.locator('[data-action="class"]').click()
    for field,value in zip(page.locator('[data-blockfield="reference"]').all(),['60','100','100']):
        field.fill(value);field.press('Tab')
    assert len(page.locator('.train-preview>span').all())==17
    page.screenshot(path=str(artifacts/'class-setup.png'),full_page=True)
    page.locator('[data-action="start"]').click()
    assert page.locator('.train-target strong').inner_text()=='42'
    page.locator('[data-action="complete"]').click()
    assert page.locator('#pending-lifts-button').is_visible()
    assert len(json.loads(page.evaluate("localStorage.getItem('barbell_training_v2')"))['done'])==1
    page.reload(wait_until='domcontentloaded');page.locator('#open-training').click()
    assert '1 / 17' in page.locator('.train-progress').inner_text()
    page.locator('summary',has_text='Adjust today').click()
    ref=page.locator('[data-active-reference]');ref.fill('70');ref.press('Tab')
    assert page.locator('.train-target strong').inner_text()=='52.5'
    workout=json.loads(page.evaluate("localStorage.getItem('barbell_training_v2')"))
    assert list(workout['done'].values())[0]['weight']==42
    page.screenshot(path=str(artifacts/'active-workout.png'))
    page.evaluate("""async()=>{saveSettingsData({...loadSettings(),sheetsUrl:'http://localhost:8000/api'});await syncBoth();}""")
    assert len(rows)==1
    assert '1 Snatch pull + 2 Hang snatch' in next(iter(rows.values()))['notes']
    assert json.loads(page.evaluate("localStorage.getItem('barbell_pending_lifts_v1')"))==[]
    # Exercise the actual edit/delete UI with the fake endpoint.
    entry_id=next(iter(rows))
    page.evaluate('(id)=>openEditModal(id)',entry_id)
    page.locator('#edit-weight').fill('43')
    page.evaluate('saveEditEntry()')
    assert rows[entry_id]['weight']==43
    page.evaluate('(id)=>openEditModal(id)',entry_id);page.evaluate('deleteEditEntry()')
    assert not rows
    # Private lesson route retains existing session values.
    page.evaluate('TrainingApp.recap()')
    assert page.locator('#m-session').input_value()=='1:1 Session'
    page.evaluate('closeLogModal()')
    # Every tab renders without JS errors; navigation stays inside the viewport.
    for index,name in enumerate(['log','planner','pbs','comp','settings']):
        page.evaluate('([name,index])=>switchTab(name,document.querySelectorAll("#tabs .tab")[index])',[name,index])
        page.screenshot(path=str(artifacts/(name+'.png')))
    for width,height in [(320,667),(393,852),(430,932)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(50)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        tabs=page.locator('#tabs').bounding_box();assert abs(tabs['y']+tabs['height']-height)<1
    assert not errors,errors
    print('PASS: 17-set class, daily reference override, offline reload, confirmed sync, real edit/delete, 1:1 route and three phone sizes.',flush=True)
    browser.close()
