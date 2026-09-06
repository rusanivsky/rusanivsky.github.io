(function(){
  function init(){
    var topbar=document.querySelector('.topbar');
    if(!topbar) return;

  var lastY=window.scrollY || 0;
  var ticking=false;
  var threshold=8;
  var cooldownUntil=0;

  function update(){
    var y=window.scrollY || 0;
    var delta=y-lastY;
    var doc=document.documentElement;
    var maxY=Math.max(0,doc.scrollHeight-window.innerHeight);
    if(y <= 2){
      topbar.classList.remove('is-compact');
      cooldownUntil=0;
    }else if(maxY-y < 28){
      /* На нижньому еластичному відскоку Safari може кілька разів
         змінити scrollTop. Не перемикаємо шапку в цій зоні. */
      lastY=y;
    }else if(Math.abs(delta) >= threshold){
      var compact=delta > 0;
      if(performance.now() >= cooldownUntil && topbar.classList.contains('is-compact') !== compact){
        topbar.classList.toggle('is-compact', compact);
        cooldownUntil=performance.now()+480;
      }
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
    window.addEventListener('resize',function(){
      if(window.innerWidth > 760) topbar.classList.remove('is-compact');
    },{passive:true});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
