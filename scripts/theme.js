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
  var COLOUR={light:'#e8ebe6',night:'#242424'};
  var ORDER=['auto','light','night'];
  var dark=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
  /* Іконки лежать у розмітці всі три, а показує потрібну CSS за
     data-theme-mode. Інакше кнопка мусила б чекати на DOMContentLoaded,
     щоб отримати свій SVG, — і шапка стрибала б на кожному завантаженні */
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
    /* цей же атрибут проявляє кнопку: без JS її немає зовсім */
    root.setAttribute('data-theme-mode',mode);
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
      button.setAttribute('aria-label',(ukrainian?'Тема: ':'Theme: ')+NAME[ukrainian?'uk':'en'][mode]);
    }
    function apply(){
      /* Той самий кросовер, що й між сторінками, тільки довший: клас
         theme-shift піднімає тривалість, поки триває перефарбування.
         Без View Transitions тон міняється миттєво — анімувати градієнт
         плити через transition браузер не вміє */
      var still=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(still||!document.startViewTransition){ paint(mode); return; }
      root.classList.add('theme-shift');
      var shift=document.startViewTransition(function(){paint(mode);});
      shift.finished.then(clear,clear);
      function clear(){ root.classList.remove('theme-shift'); }
    }

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
