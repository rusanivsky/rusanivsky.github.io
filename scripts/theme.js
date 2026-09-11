/* Тему знову обирає гість — але лише на підсторінках-галереях: фото,
   обкладинки, відеокатегорії. Зелені сторінки цей файл не підключають,
   тож вибір їх не зачіпає. Саме на цьому колись зламався перший
   перемикач: світла тема їхала за гостем по всьому сайту й з'їдала
   зелену палітру головної.
   Файл стоїть у <head> без defer навмисно: data-theme має стати на
   місце до першого малювання, інакше видно спалах чужої теми. Розмітку
   кнопки чіпаємо пізніше, на DOMContentLoaded, — її ще немає. */
(function(){
  var root=document.documentElement;
  var KEY='kr-theme';
  /* тон, до якого примикає обвід браузера на телефоні: верх плити
     кожної з двох палітр */
  var COLOUR={light:'#e8ebe6',night:'#171717'};
  var ORDER=['auto','light','night'];
  var dark=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
  /* іконка показує режим, у якому сторінка зараз, а не той, куди веде
     клік: станів три, і з самої цілі неможливо вгадати, де ти */
  var ICON={
    auto:'<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">'+
      '<circle cx="8" cy="8" r="5.7" fill="none" stroke="currentColor" stroke-width="1.4"/>'+
      '<path d="M8 2.3a5.7 5.7 0 0 1 0 11.4z" fill="currentColor"/></svg>',
    light:'<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">'+
      '<circle cx="8" cy="8" r="3.1"/>'+
      '<path d="M8 1v1.7M8 13.3V15M15 8h-1.7M2.7 8H1M12.95 3.05l-1.2 1.2M4.25 11.75l-1.2 1.2M12.95 12.95l-1.2-1.2M4.25 4.25l-1.2-1.2"/></svg>',
    night:'<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">'+
      '<path d="M13.5 9.9A6 6 0 0 1 6.1 2.5 6 6 0 1 0 13.5 9.9z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  };
  var NAME={
    en:{auto:'auto',light:'light',night:'night'},
    uk:{auto:'авто',light:'світла',night:'нічна'}
  };

  function stored(){
    try{
      var saved=localStorage.getItem(KEY);
      if(saved==='auto'||saved==='light'||saved==='night') return saved;
    }catch(error){}
    return 'auto';
  }
  function resolve(mode){
    return mode==='auto'?(dark&&dark.matches?'night':'light'):mode;
  }
  function paint(mode){
    var theme=resolve(mode);
    root.setAttribute('data-theme',theme);
    /* обидва теги theme-color несуть тепер той самий колір: медіа-умови
       на них лишаються тільки для гостя без JS */
    var metas=document.querySelectorAll('meta[name="theme-color"]');
    for(var i=0;i<metas.length;i++) metas[i].setAttribute('content',COLOUR[theme]);
  }

  var mode=stored();
  paint(mode);

  function follow(){ if(mode==='auto') paint(mode); }
  if(dark&&dark.addEventListener) dark.addEventListener('change',follow);
  else if(dark&&dark.addListener) dark.addListener(follow);

  function bind(){
    var group=document.getElementById('theme');
    if(!group) return;
    var button=group.querySelector('button');
    if(!button) return;

    function render(){
      var ukrainian=root.lang==='uk';
      button.innerHTML=ICON[mode];
      button.setAttribute('aria-label',(ukrainian?'Тема: ':'Theme: ')+NAME[ukrainian?'uk':'en'][mode]);
      group.setAttribute('data-mode',mode);
    }
    function apply(){
      /* Той самий плавний кросовер, що й між сторінками: старий кадр
         згасає поверх нового. Без нього плита міняє колір ривком */
      var still=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(!still&&document.startViewTransition) document.startViewTransition(function(){paint(mode);});
      else paint(mode);
    }

    /* без JS кнопка нічого не робить, тож у розмітці вона схована */
    button.hidden=false;
    render();
    button.addEventListener('click',function(){
      mode=ORDER[(ORDER.indexOf(mode)+1)%ORDER.length];
      try{localStorage.setItem(KEY,mode);}catch(error){}
      apply();
      render();
    });
    /* мову гість міняє без перезавантаження — підпис кнопки має встигати */
    if(window.MutationObserver){
      new MutationObserver(render).observe(root,{attributes:true,attributeFilter:['lang']});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();
