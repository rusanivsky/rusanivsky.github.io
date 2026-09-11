(function(){
  function setup(){
    var header=document.querySelector('.topbar > .meta, header.home-meta');
    if(!header) return;
    var back=header.querySelector('.back');
    var parts=header.querySelector('.parts');
    var switches=header.querySelector('.switches');
    if(!parts||!switches) return;
    var alwaysCompact=header.matches('header.home-meta');

    var switchesSlot=document.createComment('header-switches');
    header.insertBefore(switchesSlot,switches);

    var button=document.createElement('button');
    button.className='header-menu-toggle';
    button.type='button';
    button.hidden=true;
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls','header-menu-panel');
    button.innerHTML='<span aria-hidden="true"></span>';

    var panel=document.createElement('div');
    panel.className='header-menu-panel';
    panel.id='header-menu-panel';
    panel.setAttribute('aria-hidden','true');
    header.appendChild(button);
    header.appendChild(panel);

    var compact=false;
    var open=false;
    var neededWidth=0;
    var frame=0;
    function focusWithoutScroll(element){
      try{element.focus({preventScroll:true});}
      catch(error){element.focus();}
    }

    function number(value){return parseFloat(value)||0;}
    function outerWidth(element,useScrollWidth){
      var style=getComputedStyle(element);
      var width=useScrollWidth?Math.max(element.scrollWidth,element.getBoundingClientRect().width):element.getBoundingClientRect().width;
      return width+number(style.marginLeft)+number(style.marginRight);
    }
    function availableWidth(){
      var style=getComputedStyle(header);
      return header.clientWidth-number(style.paddingLeft)-number(style.paddingRight);
    }
    function requiredWidth(){
      var style=getComputedStyle(header);
      var gap=number(style.columnGap);
      var items=[back,parts,switches].filter(Boolean);
      return items.reduce(function(total,item){
        return total+outerWidth(item,item===parts);
      },0)+gap*Math.max(0,items.length-1);
    }
    function updateLabel(){
      var ukrainian=document.documentElement.lang==='uk';
      button.setAttribute('aria-label',open
        ?(ukrainian?'Закрити меню':'Close menu')
        :(ukrainian?'Відкрити меню':'Open menu'));
    }
    function closeMenu(focusButton){
      if(!open) return;
      open=false;
      header.classList.remove('header-menu-open');
      button.setAttribute('aria-expanded','false');
      panel.setAttribute('aria-hidden','true');
      updateLabel();
      if(focusButton) button.focus();
    }
    function restore(){
      switchesSlot.parentNode.insertBefore(switches,switchesSlot.nextSibling);
    }
    function setCompact(value){
      if(value===compact) return;
      compact=value;
      closeMenu(false);
      if(compact){
        panel.appendChild(switches);
        header.classList.add('header-menu-mode');
        button.hidden=false;
      }else{
        restore();
        header.classList.remove('header-menu-mode');
        button.hidden=true;
      }
    }
    function update(){
      frame=0;
      if(alwaysCompact){
        if(!compact) setCompact(true);
      }else if(!compact){
        neededWidth=requiredWidth();
        if(neededWidth>availableWidth()+1) setCompact(true);
      }else if(availableWidth()>=neededWidth+24){
        setCompact(false);
        schedule();
      }
    }
    function schedule(){
      if(frame) cancelAnimationFrame(frame);
      frame=requestAnimationFrame(update);
    }

    button.addEventListener('click',function(){
      open=!open;
      header.classList.toggle('header-menu-open',open);
      button.setAttribute('aria-expanded',String(open));
      panel.setAttribute('aria-hidden',String(!open));
      updateLabel();
      if(open){
        var first=panel.querySelector('a,button');
        if(first) requestAnimationFrame(function(){focusWithoutScroll(first);});
      }
    });
    panel.addEventListener('click',function(event){
      if(event.target.closest('a')) closeMenu(false);
      schedule();
    });
    document.addEventListener('click',function(event){
      if(open&&!header.contains(event.target)) closeMenu(false);
    });
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&open) closeMenu(true);
    });

    var rootObserver=new MutationObserver(function(mutations){
      for(var i=0;i<mutations.length;i++){
        if(mutations[i].attributeName==='lang') updateLabel();
      }
      schedule();
    });
    rootObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    if(window.ResizeObserver){
      var resizeObserver=new ResizeObserver(schedule);
      resizeObserver.observe(header);
      resizeObserver.observe(parts);
      resizeObserver.observe(switches);
    }else{
      addEventListener('resize',schedule,{passive:true});
    }
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(schedule);
    updateLabel();
    schedule();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
