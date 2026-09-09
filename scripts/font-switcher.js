(function(){
  var root=document.documentElement;
  var key='kr-font';
  function read(){
    try{
      var saved=localStorage.getItem(key);
      if(saved==='prata'||saved==='unbounded'||saved==='playfair') return saved;
    }catch(e){}
    return 'prata';
  }
  function setFont(value,save){
    var font=value==='unbounded'||value==='playfair'?value:'prata';
    root.setAttribute('data-font',font);
    document.querySelectorAll('[data-font-toggle]').forEach(function(button){
      var target=button.getAttribute('data-font-toggle');
      button.setAttribute('aria-pressed',String(font===target));
      button.setAttribute('aria-label',target==='unbounded'?'Unbounded font':'Playfair Display font');
    });
    if(save) try{ localStorage.setItem(key,font); }catch(e){}
  }
  function bind(){
    document.querySelectorAll('[data-font-toggle]').forEach(function(button){
      button.addEventListener('click',function(){
        var target=button.getAttribute('data-font-toggle');
        setFont(root.getAttribute('data-font')===target?'prata':target,true);
      });
    });
    setFont(read(),false);
  }
  setFont(read(),false);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();
