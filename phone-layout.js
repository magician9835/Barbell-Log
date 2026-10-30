// Keep app controls inside the actual visible native web view. A taller
// physical screen does not establish that WebKit can paint in the difference.
function appViewportGeometry(m){
  const visible=m.visibleHeight||m.viewportHeight;
  const keyboard=m.focused&&(visible<m.viewportHeight-80||m.viewportHeight<m.screenHeight-m.safeTop-150);
  // The screenshot confirms the native view clips at its reported visible
  // boundary. Never place navigation outside it, even when screen is taller.
  return {height:Math.round(Math.min(m.viewportHeight,visible)),statusBarCompensated:false,keyboard};
}

(() => {
  let frame=0;
  const standalone=()=>!!navigator.standalone||matchMedia('(display-mode: standalone)').matches;
  function measure(){
    const focused=document.activeElement?.matches('input,textarea,select');
    const visible=window.visualViewport;
    const safeTop=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--phone-safe-top'))||0;
    const geometry=appViewportGeometry({standalone:standalone(),width:innerWidth,viewportHeight:innerHeight,visibleHeight:visible?.height,screenWidth:screen.width,screenHeight:screen.height,safeTop,focused,scale:visible?.scale||1});
    document.documentElement.style.setProperty('--phone-height',geometry.height+'px');
    document.documentElement.dataset.statusBarCompensated=String(geometry.statusBarCompensated);
    frame=0;
    const report=document.getElementById('layout-report');
    if(report)report.textContent=JSON.stringify(details(),null,2);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(measure);}
  function cssViewportSizes(){const result={};for(const unit of ['vh','svh','lvh','dvh']){const probe=document.createElement('div');probe.style.cssText='position:fixed;top:0;width:1px;visibility:hidden;pointer-events:none;height:100'+unit;document.body.appendChild(probe);result[unit]=Math.round(probe.getBoundingClientRect().height);probe.remove();}return result;}
  function details(){
    const style=getComputedStyle(document.documentElement),shell=document.getElementById('app')?.getBoundingClientRect(),tabs=document.getElementById('tabs')?.getBoundingClientRect();
    return {version:'2026-10-30.15',statusBarCompensated:document.documentElement.dataset.statusBarCompensated==='true',scale:window.visualViewport?.scale||1,standalone:standalone(),screen:[screen.width,screen.height],available:[screen.availWidth,screen.availHeight],outer:[outerWidth,outerHeight],documentClient:[document.documentElement.clientWidth,document.documentElement.clientHeight],scrollY:window.scrollY,cssViewport:cssViewportSizes(),viewport:[innerWidth,innerHeight],visible:visualViewport?[visualViewport.width,visualViewport.height,visualViewport.offsetTop]:null,safeTop:style.getPropertyValue('--phone-safe-top').trim(),safeBottom:style.getPropertyValue('--phone-safe-bottom').trim(),shell:shell?[Math.round(shell.top),Math.round(shell.bottom)]:null,tabs:tabs?[Math.round(tabs.top),Math.round(tabs.bottom)]:null,userAgent:navigator.userAgent};
  }
  function install(){measure();const section=document.createElement('details');section.className='layout-details';section.innerHTML='<summary>Phone layout details</summary><pre id="layout-report"></pre><button class="train-secondary" id="copy-layout-report">Copy layout details</button>';document.getElementById('pane-settings').appendChild(section);section.ontoggle=measure;document.getElementById('copy-layout-report').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(details(),null,2));showToast('Layout details copied','success');}catch{showToast('Layout details are displayed above','');}};measure();}
  window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);window.addEventListener('pageshow',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);document.addEventListener('focusin',schedule);document.addEventListener('focusout',()=>setTimeout(schedule,100));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
