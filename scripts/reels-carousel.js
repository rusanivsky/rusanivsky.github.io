(function(){
  var track=document.querySelector('.short-form-grid');
  var next=document.querySelector('.carousel-next');
  if(!track||!next) return;
  function update(){
    var atEnd=track.scrollWidth<=track.clientWidth+1||track.scrollLeft+track.clientWidth>=track.scrollWidth-2;
    next.classList.toggle('is-end',atEnd);
    next.setAttribute('aria-hidden',String(atEnd));
    next.tabIndex=atEnd?-1:0;
  }
  next.addEventListener('click',function(){
    var card=track.querySelector('.v');
    if(!card) return;
    var gap=parseFloat(getComputedStyle(track).columnGap)||0;
    track.scrollBy({left:card.getBoundingClientRect().width+gap,behavior:'smooth'});
  });
  track.addEventListener('scroll',update,{passive:true});
  addEventListener('resize',update);
  update();
})();
