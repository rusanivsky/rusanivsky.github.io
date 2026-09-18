/* Хром сторінки: те, що однакове на кожній сторінці й нікуди більше не
   належить — мова в підвалі та якірний хід до блоку замовлень.

   Бургера тут більше немає: шапка тримає рівно три речі — «назад»,
   розділи й заклик замовити послугу, — і на найвужчому екрані вони
   стоять одним рядком. Ховати стало нічого. */
(function(){
  /* Обидва перемикачі — тема й мова — живуть у підвалі, а не в шапці, і на
     будь-якій ширині. Стоять парою: тема ліворуч, мова праворуч; на
     десктопі пара замикає праву групу за «Приватністю», на телефоні йде
     в тому ж рядку, що й вона. Геометрію задає CSS підвалу, а сюди
     належить лише сам перенос.

     Переносимо самі групи, а не копії: на них уже висять обробники
     перемикачів, і клонована кнопка мовчала б. У розмітці вони лишаються
     в шапці — звідти їх ставить білд, і без скрипта вони видимі там. */
  function setupFooterSwitches(){
    var lang=document.getElementById('lang');
    var theme=document.getElementById('theme');
    var left=document.querySelector('.foot-bar .footer-left');
    var bar=left||document.querySelector('.foot-bar');
    if(!lang||!bar) return;
    var holder=document.createElement('div');
    holder.className='footer-lang';
    if(theme) holder.appendChild(theme);
    holder.appendChild(lang);
    bar.appendChild(holder);
  }

  /* Якір на блок цієї ж сторінки. Браузерна плавність прив'язана до
     відстані: стрибок із першого екрана до контактів тягнеться близько
     секунди й читається як гальмо. Тут тривалість стала — 520 мс, із тим
     самим сповільненням, що й решта руху на сайті.

     На час ходу знімається прив'язка слайдів: інакше кожен проміжний
     кадр виглядає для неї новою зупинкою й тягне сторінку назад. На
     сторінках розділів прив'язки немає зовсім, і рядок нічого не
     зачіпає. */
  function setupAnchorScroll(){
    var page=document.documentElement;
    function eased(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
    document.addEventListener('click', function(e){
      if(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if(!a) return;
      var id = a.getAttribute('href').slice(1);
      var slide = id && document.getElementById(id);
      if(!slide) return;
      e.preventDefault();
      var from = window.scrollY;
      /* Ціль рахується щокадру, а не один раз на клік: на довгій сторінці
         картинки нижче добирають свою висоту вже під час ходу, і знята
         наперед відстань приводила б не туди. scrollY + top — це
         абсолютне місце блоку в документі, і воно саме себе виправляє. */
      function target(){
        var limit = Math.max(0, page.scrollHeight - window.innerHeight);
        return Math.min(limit, Math.max(0, window.scrollY + slide.getBoundingClientRect().top));
      }
      var to = target();
      /* Сторінка може дорости вже після приземлення — картинки нижче
         добирають висоту з запізненням, і блок від'їжджає з екрана. Ще
         секунду після ходу позиція підтягується; будь-який дотик до
         прокрутки цю опіку одразу знімає — далі веде людина, не скрипт. */
      function settle(){
        var quit = false, tries = 0;
        var events = ['wheel','touchstart','keydown','pointerdown'];
        function drop(){
          for(var i = 0; i < events.length; i++) removeEventListener(events[i], halt);
        }
        function halt(){ quit = true; drop(); }
        for(var i = 0; i < events.length; i++) addEventListener(events[i], halt, {passive:true});
        (function again(){
          if(quit) return;
          var want = target();
          if(Math.abs(want - window.scrollY) > 2) window.scrollTo(0, want);
          if(++tries < 8) setTimeout(again, 120); else drop();
        })();
      }
      function land(){
        page.style.scrollSnapType = '';
        try{ history.replaceState(null, '', '#' + id); }catch(err){}
        slide.setAttribute('tabindex', '-1');
        try{ slide.focus({preventScroll:true}); }catch(err){ slide.focus(); }
        settle();
      }
      if(matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(to - from) < 2){
        window.scrollTo(0, to); land(); return;
      }
      page.style.scrollSnapType = 'none';
      var began = performance.now();
      requestAnimationFrame(function step(now){
        var t = Math.min(1, (now - began) / 520);
        to = target();
        window.scrollTo(0, from + (to - from) * eased(t));
        if(t < 1) requestAnimationFrame(step); else { window.scrollTo(0, target()); land(); }
      });
    });
  }

  /* Вузький рядок шапки може не вмістити три розділи поряд із закликом —
     тоді вони гортаються всередині своєї колонки. Поточний розділ у такому
     рядку має бути видимим завжди, інакше сторінка відкривається зрізаним
     словом саме на тому, де ти стоїш. Та сама робота, що й у
     active-section-scroll.js для переліку категорій нижче, — але цей рядок
     є на кожній сторінці, тож живе тут. */
  function revealActivePart(){
    var rail=document.querySelector('.meta .parts');
    var active=rail&&rail.querySelector('[aria-current]');
    if(!rail||!active) return;
    function reveal(){
      if(rail.scrollWidth<=rail.clientWidth) return;
      var offset=active.offsetLeft-16;
      if(offset>0) rail.scrollLeft=offset;
    }
    requestAnimationFrame(reveal);
    addEventListener('pageshow',reveal);
  }

  function setup(){
    setupFooterSwitches();
    setupAnchorScroll();
    revealActivePart();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
