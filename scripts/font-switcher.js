(function(){
  var root=document.documentElement;
  var key='kr-font';
  function read(){
    try{
      var saved=localStorage.getItem(key);
      if(saved==='unbounded'||saved==='playfair') return saved;
    }catch(e){}
    return 'playfair';
  }
  function setFont(value,save){
    var font=value==='unbounded'?'unbounded':'playfair';
    root.setAttribute('data-font',font);
    document.querySelectorAll('[data-font-toggle]').forEach(function(button){
      var target=font==='unbounded'?'playfair':'unbounded';
      button.setAttribute('data-font-toggle',target);
      button.textContent=target==='unbounded'?'U':'P';
      button.setAttribute('aria-pressed','false');
      button.setAttribute('aria-label',target==='unbounded'?'Switch to Unbounded':'Switch to Playfair Display');
    });
    if(save) try{ localStorage.setItem(key,font); }catch(e){}
  }
  function bind(){
    document.querySelectorAll('[data-font-toggle]').forEach(function(button){
      button.addEventListener('click',function(){
        var target=button.getAttribute('data-font-toggle');
        setFont(target,true);
      });
    });
    setFont(read(),false);
  }
  setFont(read(),false);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();
