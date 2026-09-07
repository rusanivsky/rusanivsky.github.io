(function(){
  function relocate(){
    var toggle=document.getElementById('lang');
    var header=toggle&&toggle.parentElement;
    var footer=document.querySelector('.site-foot .foot-bar');
    if(!toggle||!header||!footer) return;
    var mobile=matchMedia('(max-width:640px)');
    function update(){
      var slot=footer.querySelector('.language-slot');
      if(mobile.matches){
        if(!slot){ slot=document.createElement('div'); slot.className='language-slot'; footer.appendChild(slot); }
        slot.appendChild(toggle);
      }else{
        header.appendChild(toggle);
        if(slot) slot.remove();
      }
    }
    mobile.addEventListener('change',update);
    update();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',relocate);
  else relocate();
})();
