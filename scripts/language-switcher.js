(function(){
  function sync(){
    var button=document.querySelector('#lang [data-lang]');
    if(!button) return;
    var current=document.documentElement.lang==='uk'?'ua':'en';
    var target=current==='ua'?'en':'ua';
    var ukrainian=current==='ua';
    button.setAttribute('data-lang',target);
    button.textContent=target==='ua'?'UA':'EN';
    button.setAttribute('aria-label',target==='ua'?'Switch to Ukrainian':'Перемкнути на англійську');
    button.setAttribute('aria-pressed','false');
    document.getElementById('lang').setAttribute('aria-label',ukrainian?'Мова':'Language');
    document.querySelectorAll('nav.parts').forEach(function(nav){
      nav.setAttribute('aria-label',ukrainian?'Розділи':'Sections');
    });
    document.querySelectorAll('.foot-meta').forEach(function(meta){
      meta.setAttribute('aria-label',ukrainian?'Місце й місцевий час':'Location and local time');
    });
    var theme=document.getElementById('theme');
    if(theme) theme.setAttribute('aria-label',ukrainian?'Тема':'Theme');
    var rates=document.querySelector('.rates-nav');
    if(rates) rates.setAttribute('aria-label',ukrainian?'На цій сторінці':'On this page');
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
