(function(){
  var root=document.documentElement;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
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

  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  if(reduce.addEventListener) reduce.addEventListener('change',schedule);
  else if(reduce.addListener) reduce.addListener(schedule);
  update();
})();
