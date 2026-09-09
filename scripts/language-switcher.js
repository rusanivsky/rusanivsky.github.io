(function(){
  function sync(){
    var button=document.querySelector('#lang [data-lang]');
    if(!button) return;
    var current=document.documentElement.lang==='uk'?'ua':'en';
    var target=current==='ua'?'en':'ua';
    button.setAttribute('data-lang',target);
    button.textContent=target==='ua'?'UA':'EN';
    button.setAttribute('aria-label',target==='ua'?'Switch to Ukrainian':'Switch to English');
    button.setAttribute('aria-pressed','false');
  }
  function bind(){
    var group=document.getElementById('lang');
    if(!group) return;
    sync();
    group.addEventListener('click',function(){ setTimeout(sync,0); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();
