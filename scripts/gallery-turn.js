/* Розділи галереї перегортаються як сторінки.

   Дійшов до самого низу й тягнеш далі — відкривається наступна вкладка
   того самого напрямку; вперся у верх і тягнеш угору — попередня. Порядок
   і адреси беремо з того самого переліку вкладок, що стоїть у шапці, тож
   скрипт нічого не знає ні про фото, ні про відео окремо.

   Сторінки лишаються сторінками: нічого не дописується в поточну й нічого
   не тримається в пам'яті понад те, що читач бачить. У розділі буває понад
   сотню світлин — зшита з усіх розділів стрічка з'їдала б пам'ять і кеш
   телефона, а перехід лишає браузерові звичну роботу.

   Випадково перегорнути не можна, і сторожів тут два.

   Перший: сторінку спершу треба почитати. Доки читач не відгорнув її
   бодай на екран, не перегортається нічого — ні вниз, ні вгору. Без цього
   правила щойно відкрита сторінка перегорталася б сама: інерція
   коліщатка долітає ще з попередньої сторінки, приходить уже сюди й
   застає прокрутку на самому верху.

   Другий: дотик до краю сам по собі теж нічого не робить, після нього
   має бути окрема навмисна дія. Для коліщатка це пауза й новий рух —
   хвіст довгого кидка проходить повз, бо паузи в ньому немає; для
   пальця — протяг по склу вже після того, як сторінці нікуди їхати, а
   після кидка палець уже не на склі. */
(function(){
  var rail=document.querySelector('.secs');
  if(!rail) return;

  var tabs=Array.prototype.slice.call(rail.querySelectorAll('a.sec'));
  var open=rail.querySelector('a.sec[aria-current]');
  var at=tabs.indexOf(open);
  /* Напрямок з однією вкладкою (дизайн) перегортати нікуди. */
  if(tabs.length<2||at<0) return;

  var page=document.documentElement;
  var gone=false, read=false, armed=false, seen=0, push=0, held=null;

  addEventListener('scroll',function(){
    if(window.scrollY>200) read=true;
  },{passive:true});

  /* Чи вперлась сторінка тим краєм, у який тягнуть. Питаємо саме про
     напрямок: коротка сторінка стоїть обома краями одразу, і без цього
     вона завжди вважалася б притиснутою до верху. */
  function stuck(side){
    var limit=Math.max(0,page.scrollHeight-window.innerHeight);
    return side>0 ? window.scrollY>=limit-1 : window.scrollY<=1;
  }

  function turn(side){
    var tab=tabs[at+side];
    if(gone||!read||!tab) return;
    gone=true;
    /* Клацаємо саме по вкладці, а не міняємо адресу руками: на посиланні
       вже висить перехід між сторінками, і перегортання виглядає так само,
       як звичайний клац по тій самій вкладці. */
    tab.click();
  }

  addEventListener('wheel',function(event){
    var now=performance.now();
    var pause=now-seen;
    seen=now;
    var side=event.deltaY>0?1:-1;
    if(!event.deltaY||!tabs[at+side]||!stuck(side)){
      armed=false;
      push=0;
      return;
    }
    /* Пауза між рухами — ознака того, що це вже нова дія читача, а не
       хвіст попередньої. Доти лічильник не рухається зовсім. */
    if(pause>250){ armed=true; push=0; }
    if(!armed) return;
    push+=Math.abs(event.deltaY);
    if(push>=120) turn(side);
  },{passive:true});

  addEventListener('touchstart',function(event){
    held=event.touches[0].clientY;
  },{passive:true});

  addEventListener('touchmove',function(event){
    var y=event.touches[0].clientY;
    if(held===null){ held=y; return; }
    var side=y<held?1:-1;
    /* Поки сторінці є куди їхати, точка відліку їде разом із пальцем:
       рахувати протяг має сенс лише від тієї миті, коли вона вперлась. */
    if(!tabs[at+side]||!stuck(side)){ held=y; return; }
    if((side>0?held-y:y-held)>110) turn(side);
  },{passive:true});
})();
