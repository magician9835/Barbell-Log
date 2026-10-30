// Keep the installed training UI at one page scale. Pan gestures still scroll.
// Safari may ignore viewport zoom limits, so also cancel its pinch gestures.
(() => {
  const preventZoom=event=>event.preventDefault();
  document.addEventListener('gesturestart',preventZoom,{passive:false});
  document.addEventListener('gesturechange',preventZoom,{passive:false});
  document.addEventListener('dblclick',event=>{
    if(!event.target.closest('input,textarea,select,[contenteditable="true"]'))event.preventDefault();
  },{passive:false});
})();
