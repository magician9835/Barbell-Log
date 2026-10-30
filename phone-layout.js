(() => {
  let frame=0;
  const standalone=()=>!!navigator.standalone||matchMedia('(display-mode: standalone)').matches;
  function measure(){
    const focused=document.activeElement?.matches('input,textarea,select');
    // In standalone mode innerHeight includes the complete content viewport;
    // explicit height avoids WebKit resolving fixed bottom against another inset.
    // Use the visible viewport when a keyboard is actually covering a form.
    const visible=window.visualViewport;
    const height=focused&&visible?Math.min(innerHeight,visible.height):standalone()?innerHeight:(visible?.height||innerHeight);
    document.documentElement.style.setProperty('--phone-height',Math.round(height)+'px');
    frame=0;
    const report=document.getElementById('layout-report');
    if(report)report.textContent=JSON.stringify(details(),null,2);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(measure);}
  function details(){
    const style=getComputedStyle(document.documentElement),shell=document.getElementById('app')?.getBoundingClientRect(),tabs=document.getElementById('tabs')?.getBoundingClientRect();
    return {version:'2026-10-30.13',standalone:standalone(),screen:[screen.width,screen.height],viewport:[innerWidth,innerHeight],visible:visualViewport?[visualViewport.width,visualViewport.height,visualViewport.offsetTop]:null,safeTop:style.getPropertyValue('--phone-safe-top').trim(),safeBottom:style.getPropertyValue('--phone-safe-bottom').trim(),shell:shell?[Math.round(shell.top),Math.round(shell.bottom)]:null,tabs:tabs?[Math.round(tabs.top),Math.round(tabs.bottom)]:null,userAgent:navigator.userAgent};
  }
  function install(){measure();const section=document.createElement('details');section.className='layout-details';section.innerHTML='<summary>Phone layout details</summary><pre id="layout-report"></pre><button class="train-secondary" id="copy-layout-report">Copy layout details</button>';document.getElementById('pane-settings').appendChild(section);section.ontoggle=measure;document.getElementById('copy-layout-report').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(details(),null,2));showToast('Layout details copied','success');}catch{showToast('Layout details are displayed above','');}};measure();}
  window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);window.addEventListener('pageshow',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);document.addEventListener('focusin',schedule);document.addEventListener('focusout',()=>setTimeout(schedule,100));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
