(function(){
  var root=document.documentElement;
  var key='kr-font';
  function read(){
    try{
      var saved=localStorage.getItem(key);
      if(saved==='prata'||saved==='unbounded') return saved;
    }catch(e){}
    return 'prata';
  }
  function setFont(value,save){
    var font=value==='unbounded'?'unbounded':'prata';
    root.setAttribute('data-font',font);
    document.querySelectorAll('[data-font-toggle]').forEach(function(button){
      button.setAttribute('aria-pressed',String(font==='unbounded'));
      button.setAttribute('aria-label',font==='unbounded'?'Use Prata font':'Use Unbounded font');
    });
    if(save) try{ localStorage.setItem(key,font); }catch(e){}
  }
  function bind(){
    document.querySelectorAll('[data-font-toggle]').forEach(function(button){
      button.addEventListener('click',function(){
        setFont(root.getAttribute('data-font')==='unbounded'?'prata':'unbounded',true);
      });
    });
    setFont(read(),false);
  }
  setFont(read(),false);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();
