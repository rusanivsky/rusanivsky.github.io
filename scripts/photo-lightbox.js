(function(){
  var photos=[];
  document.querySelectorAll('.shots').forEach(function(gallery){
    photos=photos.concat(Array.prototype.slice.call(gallery.querySelectorAll('img')));
  });
  if(!photos.length) return;
  if(window.matchMedia('(max-width:640px)').matches) return;

  var overlay=document.createElement('div');
  overlay.className='photo-lightbox';
  overlay.hidden=true;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  var isUkrainian=document.documentElement.lang==='uk';
  overlay.setAttribute('aria-label',isUkrainian?'Перегляд фото':'Photo viewer');
  overlay.innerHTML='<div class="photo-lightbox__stage"><button class="photo-lightbox__close" type="button" aria-label="Close photo">×</button><img class="photo-lightbox__image" alt="" draggable="false"></div>';
  document.body.appendChild(overlay);

  var image=overlay.querySelector('.photo-lightbox__image');
  var close=overlay.querySelector('.photo-lightbox__close');
  close.setAttribute('aria-label',isUkrainian?'Закрити фото':'Close photo');
  var pointers=new Map();
  var state={scale:1,x:0,y:0,startScale:1,startX:0,startY:0,startDistance:0,startCenter:null,lastX:0,lastY:0};
  var previousFocus=null;

  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function center(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function limitPan(){
    var width=image.offsetWidth||0, height=image.offsetHeight||0;
    var maxX=Math.max(0,(width*state.scale-window.innerWidth)/2+24);
    var maxY=Math.max(0,(height*state.scale-window.innerHeight)/2+24);
    state.x=clamp(state.x,-maxX,maxX);
    state.y=clamp(state.y,-maxY,maxY);
  }
  function render(){
    limitPan();
    image.style.transform='translate3d('+state.x+'px,'+state.y+'px,0) scale('+state.scale+')';
    overlay.classList.toggle('is-zoomed',state.scale>1.01);
  }
  function reset(){
    state.scale=1;state.x=0;state.y=0;pointers.clear();render();
  }
  function open(photo){
    previousFocus=document.activeElement;
    image.src=photo.currentSrc||photo.src;
    image.alt=photo.alt||'';
    overlay.hidden=false;
    document.body.classList.add('lightbox-open');
    reset();
    requestAnimationFrame(function(){render();close.focus({preventScroll:true});});
  }
  function shut(){
    overlay.hidden=true;
    document.body.classList.remove('lightbox-open');
    image.removeAttribute('src');
    if(previousFocus&&previousFocus.focus) previousFocus.focus({preventScroll:true});
  }

  photos.forEach(function(photo){
    photo.tabIndex=0;
    photo.setAttribute('role','button');
    photo.setAttribute('aria-haspopup','dialog');
    photo.setAttribute('aria-label',photo.alt?('Open photo: '+photo.alt):'Open photo');
    photo.addEventListener('click',function(){open(photo);});
    photo.addEventListener('keydown',function(event){
      if(event.key==='Enter'||event.key===' '){event.preventDefault();open(photo);}
    });
  });

  close.addEventListener('click',shut);
  document.addEventListener('keydown',function(event){
    if(!overlay.hidden&&event.key==='Escape') shut();
  });
  image.addEventListener('dblclick',function(event){
    event.preventDefault();
    state.scale=state.scale>1.01?1:2; if(state.scale===1){state.x=0;state.y=0;} render();
  });
  image.addEventListener('pointerdown',function(event){
    event.preventDefault();
    image.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===1){state.lastX=event.clientX;state.lastY=event.clientY;}
    if(pointers.size===2){
      var pair=Array.from(pointers.values());
      state.startDistance=distance(pair[0],pair[1]);
      state.startScale=state.scale;state.startX=state.x;state.startY=state.y;
      state.startCenter=center(pair[0],pair[1]);
    }
  });
  image.addEventListener('pointermove',function(event){
    if(!pointers.has(event.pointerId)) return;
    event.preventDefault();
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){
      var pair=Array.from(pointers.values());
      var nextDistance=distance(pair[0],pair[1]);
      var nextCenter=center(pair[0],pair[1]);
      state.scale=clamp(state.startScale*(nextDistance/Math.max(1,state.startDistance)),1,4);
      state.x=state.startX+nextCenter.x-state.startCenter.x;
      state.y=state.startY+nextCenter.y-state.startCenter.y;
    }else if(pointers.size===1&&state.scale>1.01){
      state.x+=event.clientX-state.lastX;state.y+=event.clientY-state.lastY;
      state.lastX=event.clientX;state.lastY=event.clientY;
    }
    overlay.classList.add('is-dragging');render();
  });
  function release(event){
    pointers.delete(event.pointerId);
    if(pointers.size===1){
      var remaining=Array.from(pointers.values())[0];state.lastX=remaining.x;state.lastY=remaining.y;
    }
    if(!pointers.size) overlay.classList.remove('is-dragging');
  }
  image.addEventListener('pointerup',release);
  image.addEventListener('pointercancel',release);
  window.addEventListener('resize',function(){if(!overlay.hidden) render();});
})();
