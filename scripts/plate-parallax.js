(function(){
  var root=document.documentElement;
  /* Chromium композитить SVG feTurbulence у soft-light інакше за Safari.
     Позначаємо його до першого малювання, щоб CSS міг окремо підлаштувати
     зерно й тон плити, не змінюючи Safari та мобільні браузери. */
  if(/(?:Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent)){
    root.classList.add('is-chromium');
    if(window.matchMedia('(min-width:900px) and (hover:hover) and (pointer:fine)').matches){
      root.style.setProperty('--plate-factor','.90');
    }
  }

  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  var cssTimeline=window.CSS&&CSS.supports&&CSS.supports('animation-timeline:scroll()');
  var distance=900;
  var frame=0;

  function update(){
    frame=0;
    if(reduce.matches){
      root.style.removeProperty('--plate-shift');
      root.style.removeProperty('--plate-brightness');
      return;
    }
    var y=Math.max(0,window.scrollY||window.pageYOffset||0);
    var progress=Math.min(1,y/distance);
    root.style.setProperty('--plate-shift',(-64*progress).toFixed(3)+'px');
    root.style.setProperty('--plate-brightness',(1.15-.2*progress).toFixed(4));
  }

  function schedule(){
    if(!frame) frame=requestAnimationFrame(update);
  }

  if(!cssTimeline){
    addEventListener('scroll',schedule,{passive:true});
    addEventListener('resize',schedule,{passive:true});
  }
  if(reduce.addEventListener) reduce.addEventListener('change',schedule);
  else if(reduce.addListener) reduce.addListener(schedule);
  if(!cssTimeline) update();
})();
