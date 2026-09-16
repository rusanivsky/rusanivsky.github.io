(function(){
  var root=document.documentElement;
  var storageKey='kr-font';

  function wordMusicIsActive(){
    return root.classList.contains('font-wordmusic');
  }

  function sync(button){
    var active=wordMusicIsActive();
    var ukrainian=root.lang==='uk';
    button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',active
      ?(ukrainian?'Повернути шрифт Fixel':'Use Fixel headings')
      :(ukrainian?'Приміряти шрифт Word Music':'Try Word Music headings'));
    button.title=button.getAttribute('aria-label');
  }

  function setup(){
    var language=document.getElementById('lang');
    if(!language||document.getElementById('font')) return;

    var group=document.createElement('div');
    group.className='tgl';
    group.id='font';
    group.setAttribute('role','group');
    var button=document.createElement('button');
    button.type='button';
    button.textContent='F';
    group.appendChild(button);
    language.parentNode.insertBefore(group,language);

    sync(button);
    button.addEventListener('click',function(){
      var active=!wordMusicIsActive();
      root.classList.toggle('font-wordmusic',active);
      try{localStorage.setItem(storageKey,active?'wordmusic':'fixel');}catch(error){}
      sync(button);
      dispatchEvent(new Event('resize'));
    });
    new MutationObserver(function(){sync(button);}).observe(root,{attributes:true,attributeFilter:['lang']});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
