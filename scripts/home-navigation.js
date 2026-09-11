(function(){
  function setup(){
    var header=document.querySelector('header.home-meta');
    if(!header) return;
    var parts=header.querySelector('.parts');
    var button=header.querySelector('.home-menu-toggle');
    var panel=header.querySelector('.home-menu-panel');
    var switches=header.querySelector('.switches');
    if(!parts||!button||!panel||!switches) return;

    var partsSlot=document.createComment('home-navigation');
    header.insertBefore(partsSlot,parts);
    var open=false;

    function updateLabel(){
      var ukrainian=document.documentElement.lang==='uk';
      button.setAttribute('aria-label',open
        ?(ukrainian?'Закрити меню':'Close menu')
        :(ukrainian?'Відкрити меню':'Open menu'));
    }
    function restore(){
      partsSlot.parentNode.insertBefore(parts,partsSlot.nextSibling);
    }
    function closeMenu(focusButton){
      if(!open) return;
      open=false;
      restore();
      header.classList.remove('home-menu-open');
      button.setAttribute('aria-expanded','false');
      panel.setAttribute('aria-hidden','true');
      if(focusButton) button.focus();
      updateLabel();
    }
    button.addEventListener('click',function(){
      open=!open;
      if(open){
        panel.appendChild(parts);
        header.classList.add('home-menu-open');
      }else{
        restore();
        header.classList.remove('home-menu-open');
      }
      button.setAttribute('aria-expanded',String(open));
      panel.setAttribute('aria-hidden',String(!open));
      updateLabel();
      if(open){
        var first=panel.querySelector('a');
        if(first) requestAnimationFrame(function(){first.focus();});
      }
    });
    document.addEventListener('click',function(event){
      if(open&&!header.contains(event.target)) closeMenu(false);
    });
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&open) closeMenu(true);
    });
    var observer=new MutationObserver(function(){updateLabel()});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    addEventListener('resize',function(){
      if(open&&matchMedia('(min-width:601px)').matches) closeMenu(false);
    },{passive:true});
    updateLabel();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
