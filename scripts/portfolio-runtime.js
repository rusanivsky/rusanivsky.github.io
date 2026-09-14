(function(){
  var root=document.documentElement;

  function setLang(value,save){
    var language=value==='ua'?'ua':'en';
    root.lang=language==='ua'?'uk':'en';
    document.querySelectorAll('[data-en]').forEach(function(element){
      var text=element.getAttribute('data-'+language);
      if(text!==null) element.textContent=text;
    });
    document.querySelectorAll('[data-alt-en]').forEach(function(element){
      var alt=element.getAttribute('data-alt-'+language);
      if(alt!==null) element.setAttribute('alt',alt);
    });
    document.querySelectorAll('[data-aria-en]').forEach(function(element){
      var label=element.getAttribute('data-aria-'+language);
      if(label!==null) element.setAttribute('aria-label',label);
    });
    document.querySelectorAll('#lang button').forEach(function(button){
      button.setAttribute('aria-pressed',String(button.dataset.lang===language));
    });
    if(!save) return;
    try{localStorage.setItem('kr-lang',language);}catch(error){}
    try{
      var url=new URL(location.href);
      if(language==='ua') url.searchParams.set('lang','uk');
      else url.searchParams.delete('lang');
      history.replaceState(null,'',url);
    }catch(error){}
  }

  function detectLanguage(){
    if(/^\/ua(?:\/|$)/.test(location.pathname)) return 'ua';
    try{
      var query=new URLSearchParams(location.search).get('lang');
      if(query==='uk'||query==='ua') return 'ua';
      if(query==='en') return 'en';
    }catch(error){}
    try{
      var saved=localStorage.getItem('kr-lang');
      if(saved==='en'||saved==='ua') return saved;
    }catch(error){}
    var browserLanguage=String((navigator.languages&&navigator.languages[0])||navigator.language||'').toLowerCase();
    return browserLanguage.indexOf('uk')===0||browserLanguage.indexOf('ru')===0?'ua':'en';
  }

  document.querySelectorAll('#lang button').forEach(function(button){
    button.addEventListener('click',function(){setLang(button.dataset.lang,true);});
  });
  try{setLang(detectLanguage(),false);}catch(error){setLang('en',false);}

  var nativeTransition=('startViewTransition' in document)&&CSS.supports&&CSS.supports('selector(::view-transition)');
  if(!nativeTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    root.classList.add('pt-js');
    document.addEventListener('click',function(event){
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey) return;
      var anchor=event.target.closest&&event.target.closest('a');
      if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self')) return;
      var href=anchor.getAttribute('href')||'';
      if(/^(mailto:|tel:|#)/.test(href)) return;
      var url;
      try{url=new URL(anchor.href);}catch(error){return;}
      if(url.origin!==location.origin||(url.pathname===location.pathname&&url.search===location.search)) return;
      event.preventDefault();
      root.classList.add('pt-leave');
      setTimeout(function(){location.href=anchor.href;},210);
    });
    addEventListener('pageshow',function(event){if(event.persisted) root.classList.remove('pt-leave');});
  }

  document.addEventListener('click',function(event){
    var facade=event.target.closest&&event.target.closest('.fac[data-pl]');
    if(!facade) return;
    var platform=facade.dataset.pl;
    var id=facade.dataset.id;
    var videoPage=/^(?:\/ua)?\/video(?:\/|$)/.test(location.pathname);
    var source=platform==='yt'
      ?'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&mute=1&playsinline=1&rel=0'+(videoPage?'&iv_load_policy=3':'')
      :'https://player.vimeo.com/video/'+id+'?autoplay=1';
    var frame=document.createElement('iframe');
    frame.src=source;
    frame.title=facade.getAttribute('aria-label')||'';
    ['data-aria-en','data-aria-ua'].forEach(function(attribute){
      var value=facade.getAttribute(attribute);
      if(value!==null) frame.setAttribute(attribute,value);
    });
    frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    frame.setAttribute('allowfullscreen','');
    frame.loading=videoPage&&platform==='yt'?'eager':'lazy';
    facade.replaceWith(frame);
  });
})();
