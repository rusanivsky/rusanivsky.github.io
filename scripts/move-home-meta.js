(function(){
  function relocate(){
    var header=document.querySelector('header.meta');
    var cols=header&&header.querySelector('.cols');
    var slot=document.querySelector('.mobile-meta-slot');
    if(!header||!cols||!slot) return;
    var mobile=matchMedia('(max-width:640px)');
    var root=document.documentElement;
    function update(){
      if(mobile.matches||root.lang==='en'||root.lang==='uk'){
        slot.appendChild(cols);
      }else{
        header.insertBefore(cols,header.querySelector('.switches'));
      }
    }
    mobile.addEventListener('change',update);
    new MutationObserver(update).observe(root,{attributes:true,attributeFilter:['lang']});
    update();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',relocate);
  else relocate();
})();
