(function(){
  var galleries=Array.prototype.slice.call(document.querySelectorAll('.shots'));
  if(!galleries.length) return;

  var viewport=window.matchMedia('(min-width:641px)');
  var reduceMotion=window.matchMedia('(prefers-reduced-motion:reduce)');
  var overlay=document.createElement('div');
  overlay.className='photo-lightbox';
  overlay.id='photo-viewer';
  overlay.hidden=true;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.innerHTML=[
    '<div class="photo-lightbox__stage">',
      '<button class="photo-lightbox__close" type="button">',
        '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 4l12 12M16 4L4 16"/></svg>',
      '</button>',
      '<button class="photo-lightbox__nav photo-lightbox__prev" type="button">',
        '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M12.5 4.5L7 10l5.5 5.5"/></svg>',
      '</button>',
      '<figure class="photo-lightbox__frame">',
        '<div class="photo-lightbox__media"><img class="photo-lightbox__image" alt="" draggable="false"></div>',
        '<figcaption class="photo-lightbox__counter" aria-live="polite"></figcaption>',
      '</figure>',
      '<button class="photo-lightbox__nav photo-lightbox__next" type="button">',
        '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7.5 4.5L13 10l-5.5 5.5"/></svg>',
      '</button>',
    '</div>'
  ].join('');
  document.body.appendChild(overlay);

  var stage=overlay.querySelector('.photo-lightbox__stage');
  var media=overlay.querySelector('.photo-lightbox__media');
  var image=overlay.querySelector('.photo-lightbox__image');
  var counter=overlay.querySelector('.photo-lightbox__counter');
  var close=overlay.querySelector('.photo-lightbox__close');
  var previous=overlay.querySelector('.photo-lightbox__prev');
  var next=overlay.querySelector('.photo-lightbox__next');
  var activePhotos=[];
  var activeIndex=0;
  var previousFocus=null;
  var changeToken=0;
  var closeTimer=0;
  var pointers=new Map();
  var swipeStart=null;
  var state={scale:1,x:0,y:0,startScale:1,startX:0,startY:0,startDistance:0,startCenter:null,lastX:0,lastY:0};

  function isUkrainian(){return document.documentElement.lang==='uk';}
  function words(){
    return isUkrainian()?{
      viewer:'Перегляд фото',close:'Закрити фото',previous:'Попереднє фото',next:'Наступне фото',open:'Відкрити фото'
    }:{
      viewer:'Photo viewer',close:'Close photo',previous:'Previous photo',next:'Next photo',open:'Open photo'
    };
  }
  function localizeControls(){
    var copy=words();
    overlay.setAttribute('aria-label',copy.viewer);
    close.setAttribute('aria-label',copy.close);
    previous.setAttribute('aria-label',copy.previous);
    next.setAttribute('aria-label',copy.next);
  }
  function labelPhoto(photo){
    var label=words().open;
    photo.setAttribute('aria-label',photo.alt?label+': '+photo.alt:label);
  }
  function syncAvailability(){
    if(!viewport.matches&&!overlay.hidden) shut(true);
    galleries.forEach(function(gallery){
      gallery.querySelectorAll('img').forEach(function(photo){
        if(viewport.matches){
          photo.tabIndex=0;
          photo.setAttribute('role','button');
          photo.setAttribute('aria-haspopup','dialog');
          photo.setAttribute('aria-controls',overlay.id);
          labelPhoto(photo);
        }else{
          if(photo===previousFocus&&document.activeElement===photo) photo.tabIndex=-1;
          else photo.removeAttribute('tabindex');
          photo.removeAttribute('role');
          photo.removeAttribute('aria-haspopup');
          photo.removeAttribute('aria-controls');
          photo.removeAttribute('aria-label');
        }
      });
    });
  }
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function center(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function limitPan(){
    var width=image.offsetWidth||0;
    var height=image.offsetHeight||0;
    var maxX=Math.max(0,(width*state.scale-(window.innerWidth-32))/2);
    var maxY=Math.max(0,(height*state.scale-(window.innerHeight-32))/2);
    state.x=clamp(state.x,-maxX,maxX);
    state.y=clamp(state.y,-maxY,maxY);
  }
  function render(){
    limitPan();
    image.style.transform='translate3d('+state.x+'px,'+state.y+'px,0) scale('+state.scale+')';
    overlay.classList.toggle('is-zoomed',state.scale>1.01);
  }
  function reset(){
    state.scale=1;state.x=0;state.y=0;pointers.clear();swipeStart=null;
    media.classList.remove('is-leaving','is-entering');
    render();
  }
  function number(value){return String(value).padStart(2,'0');}
  function updateCounter(){
    counter.textContent=number(activeIndex+1)+' / '+number(activePhotos.length);
    var multiple=activePhotos.length>1;
    previous.hidden=!multiple;
    next.hidden=!multiple;
    counter.hidden=!multiple;
  }
  function photoSource(photo){return photo.currentSrc||photo.src;}
  function preloadAround(){
    if(activePhotos.length<2) return;
    [-1,1].forEach(function(step){
      var nearby=activePhotos[(activeIndex+step+activePhotos.length)%activePhotos.length];
      var preload=new Image();
      preload.src=photoSource(nearby);
    });
  }
  function applyPhoto(photo){
    image.src=photoSource(photo);
    image.alt=photo.alt||'';
    updateCounter();
    preloadAround();
  }
  function show(index,direction,immediate){
    if(!activePhotos.length) return;
    activeIndex=(index+activePhotos.length)%activePhotos.length;
    reset();
    var photo=activePhotos[activeIndex];
    var token=++changeToken;
    if(immediate||reduceMotion.matches){applyPhoto(photo);return;}

    var loader=new Image();
    loader.src=photoSource(photo);
    function swap(){
      if(token!==changeToken) return;
      overlay.style.setProperty('--photo-direction',String(direction||1));
      media.classList.add('is-leaving');
      window.setTimeout(function(){
        if(token!==changeToken) return;
        media.classList.remove('is-leaving');
        media.classList.add('is-entering');
        applyPhoto(photo);
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){media.classList.remove('is-entering');});
        });
      },140);
    }
    if(loader.complete) swap();
    else{loader.onload=swap;loader.onerror=swap;}
  }
  function open(photo,gallery){
    if(!viewport.matches) return;
    window.clearTimeout(closeTimer);
    overlay.classList.remove('is-closing');
    activePhotos=Array.prototype.slice.call(gallery.querySelectorAll('img'));
    activeIndex=Math.max(0,activePhotos.indexOf(photo));
    previousFocus=photo;
    localizeControls();
    applyPhoto(photo);
    reset();
    overlay.hidden=false;
    document.body.classList.add('lightbox-open');
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        overlay.classList.add('is-open');
        close.focus({preventScroll:true});
      });
    });
  }
  function finishShut(){
    overlay.hidden=true;
    overlay.classList.remove('is-closing');
    image.removeAttribute('src');
    media.classList.remove('is-leaving','is-entering');
    activePhotos=[];
  }
  function shut(immediate){
    if(overlay.hidden) return;
    ++changeToken;
    overlay.classList.remove('is-open');
    overlay.classList.add('is-closing');
    document.body.classList.remove('lightbox-open');
    window.clearTimeout(closeTimer);
    if(immediate||reduceMotion.matches) finishShut();
    else closeTimer=window.setTimeout(finishShut,300);
    if(previousFocus&&previousFocus.focus) previousFocus.focus({preventScroll:true});
  }
  function move(step){show(activeIndex+step,step,false);}

  galleries.forEach(function(gallery){
    gallery.querySelectorAll('img').forEach(function(photo){
      photo.addEventListener('click',function(){open(photo,gallery);});
      photo.addEventListener('keydown',function(event){
        if(event.key==='Enter'||event.key===' '){event.preventDefault();open(photo,gallery);}
      });
      photo.addEventListener('focus',function(){if(viewport.matches) labelPhoto(photo);});
    });
  });

  close.addEventListener('click',function(){shut(false);});
  previous.addEventListener('click',function(){move(-1);});
  next.addEventListener('click',function(){move(1);});
  stage.addEventListener('click',function(event){if(event.target===stage) shut(false);});
  document.addEventListener('keydown',function(event){
    if(overlay.hidden) return;
    if(event.key==='Escape'){event.preventDefault();shut(false);}
    else if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
    else if(event.key==='ArrowRight'){event.preventDefault();move(1);}
    else if(event.key==='Tab'){
      var controls=Array.prototype.slice.call(overlay.querySelectorAll('button:not([hidden])'));
      if(!controls.length) return;
      var first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  image.addEventListener('dblclick',function(event){
    event.preventDefault();
    state.scale=state.scale>1.01?1:2;
    if(state.scale===1){state.x=0;state.y=0;}
    render();
  });
  image.addEventListener('pointerdown',function(event){
    event.preventDefault();
    image.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===1){
      state.lastX=event.clientX;state.lastY=event.clientY;
      swipeStart={x:event.clientX,y:event.clientY,time:Date.now()};
    }
    if(pointers.size===2){
      var pair=Array.from(pointers.values());
      state.startDistance=distance(pair[0],pair[1]);
      state.startScale=state.scale;state.startX=state.x;state.startY=state.y;
      state.startCenter=center(pair[0],pair[1]);swipeStart=null;
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
      overlay.classList.add('is-dragging');render();
    }else if(pointers.size===1&&state.scale>1.01){
      state.x+=event.clientX-state.lastX;state.y+=event.clientY-state.lastY;
      state.lastX=event.clientX;state.lastY=event.clientY;
      overlay.classList.add('is-dragging');render();
    }
  });
  function release(event){
    var end=pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    if(pointers.size===1){
      var remaining=Array.from(pointers.values())[0];state.lastX=remaining.x;state.lastY=remaining.y;
    }
    if(!pointers.size){
      overlay.classList.remove('is-dragging');
      if(state.scale<=1.01&&swipeStart&&end&&Date.now()-swipeStart.time<700){
        var dx=end.x-swipeStart.x,dy=end.y-swipeStart.y;
        if(Math.abs(dx)>56&&Math.abs(dx)>Math.abs(dy)*1.25) move(dx<0?1:-1);
      }
      swipeStart=null;
    }
  }
  image.addEventListener('pointerup',release);
  image.addEventListener('pointercancel',release);
  window.addEventListener('resize',function(){if(!overlay.hidden) render();});
  if(viewport.addEventListener) viewport.addEventListener('change',syncAvailability);
  else viewport.addListener(syncAvailability);
  new MutationObserver(function(){
    if(viewport.matches) syncAvailability();
    if(!overlay.hidden) localizeControls();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  syncAvailability();
})();
