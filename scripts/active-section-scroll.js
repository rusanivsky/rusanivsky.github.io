(function(){
  var rail=document.querySelector('.secs');
  var active=rail&&rail.querySelector('[aria-current]');
  if(!rail||!active) return;
  function revealActive(){
    var offset=active.offsetLeft-(parseFloat(getComputedStyle(rail).paddingLeft)||0)-16;
    if(offset>0&&rail.scrollWidth>rail.clientWidth) rail.scrollLeft=offset;
  }
  requestAnimationFrame(revealActive);
  addEventListener('pageshow',revealActive);
})();
