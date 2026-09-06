(function(){
  function init(){
    var topbar=document.querySelector('.topbar');
    if(!topbar) return;

  var lastY=window.scrollY || 0;
  var ticking=false;
  var threshold=8;

  function update(){
    var y=window.scrollY || 0;
    var delta=y-lastY;
    if(y <= 2){
      topbar.classList.remove('is-compact');
    }else if(Math.abs(delta) >= threshold){
      topbar.classList.toggle('is-compact', delta > 0);
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
