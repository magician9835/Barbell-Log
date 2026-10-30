// iOS standalone can report innerHeight without the status-bar safe area even
// when the document is full-bleed. Correct only that exact measured mismatch.
function appViewportGeometry(m){
  const visible=m.visibleHeight||m.viewportHeight;
  const keyboard=m.focused&&(visible<m.viewportHeight-80||m.viewportHeight<m.screenHeight-m.safeTop-150);
  const insetViewport=m.standalone&&!keyboard&&m.scale===1&&m.safeTop>0&&
    m.screenHeight>m.screenWidth&&Math.abs(m.width-m.screenWidth)<=1&&
    Math.abs(m.screenHeight-m.viewportHeight-m.safeTop)<=2&&Math.abs(visible-m.viewportHeight)<=2;
  return {height:Math.round(keyboard?Math.min(m.viewportHeight,visible):insetViewport?m.viewportHeight+m.safeTop:m.standalone?m.viewportHeight:visible),statusBarCompensated:insetViewport,keyboard};
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
  function details(){
    const style=getComputedStyle(document.documentElement),shell=document.getElementById('app')?.getBoundingClientRect(),tabs=document.getElementById('tabs')?.getBoundingClientRect();
    return {version:'2026-10-30.14',statusBarCompensated:document.documentElement.dataset.statusBarCompensated==='true',scale:window.visualViewport?.scale||1,standalone:standalone(),screen:[screen.width,screen.height],viewport:[innerWidth,innerHeight],visible:visualViewport?[visualViewport.width,visualViewport.height,visualViewport.offsetTop]:null,safeTop:style.getPropertyValue('--phone-safe-top').trim(),safeBottom:style.getPropertyValue('--phone-safe-bottom').trim(),shell:shell?[Math.round(shell.top),Math.round(shell.bottom)]:null,tabs:tabs?[Math.round(tabs.top),Math.round(tabs.bottom)]:null,userAgent:navigator.userAgent};
  }
  function install(){measure();const section=document.createElement('details');section.className='layout-details';section.innerHTML='<summary>Phone layout details</summary><pre id="layout-report"></pre><button class="train-secondary" id="copy-layout-report">Copy layout details</button>';document.getElementById('pane-settings').appendChild(section);section.ontoggle=measure;document.getElementById('copy-layout-report').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(details(),null,2));showToast('Layout details copied','success');}catch{showToast('Layout details are displayed above','');}};measure();}
  window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);window.addEventListener('pageshow',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);document.addEventListener('focusin',schedule);document.addEventListener('focusout',()=>setTimeout(schedule,100));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
