(function(){
  function relocate(){
    var header=document.querySelector('header.meta');
    var cols=header&&header.querySelector('.cols');
    var slot=document.querySelector('.mobile-meta-slot');
    if(!header||!cols||!slot) return;
    var mobile=matchMedia('(max-width:640px)');
    function update(){
      if(mobile.matches){
        slot.appendChild(cols);
      }else{
        header.insertBefore(cols,header.querySelector('.switches'));
      }
    }
    mobile.addEventListener('change',update);
    update();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',relocate);
  else relocate();
})();
