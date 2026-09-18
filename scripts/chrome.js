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
     самим сповільненням, що й решта руху на сайті. */
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
      /* Повний останній екран з'являється саме тут, а не сам собою: доти
         під контактами не має бути порожнього поля. Клас ставиться до
         першого виміру, щоб ціль рахувалась уже по новій висоті. */
      if(slide.classList.contains('contact-slab')) slide.classList.add('is-landing');
      var from = window.scrollY;
      /* Ціль рахується щокадру, а не один раз на клік: на довгій сторінці
         картинки нижче добирають свою висоту вже під час ходу, і знята
         наперед відстань приводила б не туди. scrollY + top — це
         абсолютне місце блоку в документі, і воно саме себе виправляє. */
      /* scroll-margin-top блоку — це його власне поле під липкою шапкою;
         браузер його враховує при звичайному переході за якорем, і рахунок
         тут має робити те саме. */
      function target(){
        var limit = Math.max(0, page.scrollHeight - window.innerHeight);
        var inset = parseFloat(getComputedStyle(slide).scrollMarginTop) || 0;
        return Math.min(limit, Math.max(0, window.scrollY + slide.getBoundingClientRect().top - inset));
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
        try{ history.replaceState(null, '', '#' + id); }catch(err){}
        slide.setAttribute('tabindex', '-1');
        try{ slide.focus({preventScroll:true}); }catch(err){ slide.focus(); }
        settle();
        dropLandingOnLeave(slide);
      }
      if(matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(to - from) < 2){
        window.scrollTo(0, to); land(); return;
      }
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

  /* Останній екран сторінки належить замовленню: блок стає під верх
     екрана, а підвал сідає на низ, і разом вони займають рівно вікно.
     Щоб це було саме вікно, блокові бракує висоти підвала під ним —
     а її знає тільки браузер, і залежить вона від ширини: у вузькому
     рядку підвал розкладається на три рядки замість одного. Тож міру
     віддає сюди ResizeObserver, а решту рахує CSS. */
  function sizeLastScreen(){
    var foot=document.querySelector('.site-foot');
    var bar=document.querySelector('.topbar');
    if(!foot) return;
    function height(box){ return box ? Math.round(box.getBoundingClientRect().height) : 0; }
    function measure(){
      /* Липка шапка стоїть над сторінкою, тож верх екрана для блоку
         починається під нею. На сторінках без неї міра нульова. */
      var stuck = bar && /^(sticky|fixed)$/.test(getComputedStyle(bar).position) ? bar : null;
      var root = document.documentElement;
      root.style.setProperty('--foot-h', height(foot) + 'px');
      root.style.setProperty('--topbar-h', height(stuck) + 'px');
    }
    measure();
    if(window.ResizeObserver){
      var watch = new ResizeObserver(measure);
      watch.observe(foot);
      if(bar) watch.observe(bar);
    }else{
      addEventListener('resize', measure, {passive:true});
    }
  }

  /* Той самий екран має відкриватись і з чужого посилання на /#order:
     туди приходять із тим самим наміром, що й натиском на заклик. */
  function openFromHash(){
    var id=(location.hash||'').slice(1);
    var slide=id&&document.getElementById(id);
    if(!slide||!slide.classList.contains('contact-slab')) return;
    slide.classList.add('is-landing');
    requestAnimationFrame(function(){ slide.scrollIntoView(); dropLandingOnLeave(slide); });
  }

  /* Порожній екран живе рівно доти, доки на нього дивляться. Щойно
     людина піднялась вище — і блок замовлень разом із пустотою й підвалом
     пішов під нижній край вікна, — зайва висота знімається, і вниз
     сторінка вертається вже звичайною: підвал одразу під контактами.

     Момент вибрано саме там, і не раніше: усе, що при цьому міняється,
     лежить за екраном. Знімеш висоту, поки блок ще видно, — підвал
     стрибне вгору просто під пальцем, а сторінка, ставши коротшою за
     поточну прокрутку, потягне за собою й те, що людина читає.

     Міряємо не сам блок, а його вміст: пустота починається там, де
     вміст закінчився, тож поки його нижній край не пішов за нижній край
     вікна — дивляться ще на блок.

     Перше, чого чекає ця сторожа, — щоб блок таки з'явився на екрані. До
     того нижній край вмісту так само лежить під вікном, і без цієї умови
     вона зняла б висоту просто в дорозі: на довгій сторінці картинки
     нижче добирають свою висоту вже під час ходу, і хід триває довше за
     один кадр. */
  function dropLandingOnLeave(slide){
    if(!slide.classList.contains('is-landing')) return;
    var inner=slide.querySelector('.foot-in')||slide;
    var arrived=false;
    function check(){
      if(!slide.classList.contains('is-landing')){ removeEventListener('scroll',check); return; }
      if(inner.getBoundingClientRect().bottom < window.innerHeight){ arrived=true; return; }
      if(!arrived) return;
      slide.classList.remove('is-landing');
      removeEventListener('scroll',check);
    }
    addEventListener('scroll',check,{passive:true});
    /* Перший погляд — одразу, а не з першою подією прокрутки: якщо хід до
       блоку закінчився рівно там, де треба, прокрутка більше не
       ворухнеться, і сторожа інакше лишилась би незарядженою. */
    requestAnimationFrame(function(){ requestAnimationFrame(check); });
  }

  function setup(){
    sizeLastScreen();
    openFromHash();
    setupFooterSwitches();
    setupAnchorScroll();
    revealActivePart();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
