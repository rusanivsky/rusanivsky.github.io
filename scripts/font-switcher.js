(function(){
  var root=document.documentElement;
  var key='kr-font';
  var fonts=['unbounded','playfair','fixel'];
  var labels={unbounded:'Unbounded',playfair:'Playfair Display',fixel:'Fixel'};
  function read(){
    try{
      var saved=localStorage.getItem(key);
      if(fonts.indexOf(saved)!==-1) return saved;
    }catch(e){}
    return 'playfair';
  }
  function setFont(value,save){
    var font=fonts.indexOf(value)!==-1?value:'playfair';
    root.setAttribute('data-font',font);
    document.querySelectorAll('[data-font-toggle]').forEach(function(button){
      var target=button.getAttribute('data-font-toggle');
      var active=font===target;
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label',(active?'Using ':'Switch to ')+labels[target]);
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
