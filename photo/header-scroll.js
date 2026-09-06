(function(){
  function init(){
    var topbar=document.querySelector('.topbar');
    if(!topbar) return;
    var meta=topbar.querySelector('.meta');
    function measureMeta(){
      if(meta) topbar.style.setProperty('--meta-height',meta.scrollHeight+'px');
    }
    measureMeta();
    if(meta && 'ResizeObserver' in window) new ResizeObserver(measureMeta).observe(meta);

  var lastY=window.scrollY || 0;
  var ticking=false;
  var threshold=18;
  var cooldownUntil=0;
  var touchY=null;

  function scrollY(){
    return window.pageYOffset || window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function setCompact(compact){
    if(performance.now() < cooldownUntil) return;
    if(topbar.classList.contains('is-compact') === compact) return;
    topbar.classList.toggle('is-compact',compact);
    cooldownUntil=performance.now()+620;
  }

  function update(){
    var y=scrollY();
    var delta=y-lastY;
    var doc=document.documentElement;
    var maxY=Math.max(0,doc.scrollHeight-window.innerHeight);
    if(y <= 2){
      topbar.classList.remove('is-compact');
      cooldownUntil=0;
    }else if(maxY-y < 80){
      /* На нижньому еластичному відскоку Safari може кілька разів
         змінити scrollTop. Не перемикаємо шапку в цій зоні. */
      lastY=y;
    }else if(Math.abs(delta) >= threshold){
      setCompact(delta > 0);
      lastY=y;
    }
    ticking=false;
  }

  function onScroll(){
    if(!ticking){
      window.requestAnimationFrame(update);
      ticking=true;
    }
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  document.addEventListener('scroll',onScroll,{passive:true});
  /* iOS Safari інколи відкладає scroll-подію під час touch-руху.
     Touch fallback перемикає стан за напрямком пальця, не блокуючи
     нативну прокрутку. */
  document.addEventListener('touchstart',function(e){
    if(e.touches.length) touchY=e.touches[0].clientY;
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    if(!e.touches.length || touchY===null) return;
    var nextY=e.touches[0].clientY;
    var delta=touchY-nextY;
    if(Math.abs(delta)>=10){
      var y=scrollY();
      var maxY=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
      if(y<=2) topbar.classList.remove('is-compact');
      else if(maxY-y>=80) setCompact(delta>0);
      touchY=nextY;
    }
  },{passive:true});
  document.addEventListener('touchend',function(){touchY=null;},{passive:true});
    window.addEventListener('resize',function(){
      if(window.innerWidth > 760) topbar.classList.remove('is-compact');
    },{passive:true});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
