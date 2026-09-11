(function(){
  var clocks = document.querySelectorAll('.kyiv-clock');
  var zones = document.querySelectorAll('.kyiv-tz');
  if(!clocks.length) return;

  var zone = (function(){
    var names = ['Europe/Kyiv', 'Europe/Kiev'];
    for(var i=0;i<names.length;i++){
      try{
        new Intl.DateTimeFormat('en-GB', {timeZone:names[i]}).format(new Date());
        return names[i];
      }catch(e){}
    }
    return 'UTC';
  })();

  function tick(){
    var now = new Date();
    try{
      var time = new Intl.DateTimeFormat('en-GB', {
        hour:'2-digit', minute:'2-digit', hour12:false, timeZone:zone
      }).format(now);
      clocks.forEach(function(el){ el.textContent = time; });
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone:zone, timeZoneName:'short'
      }).formatToParts(now);
      var short = 'EET';
      parts.forEach(function(part){
        if(part.type === 'timeZoneName') short = part.value.replace('GMT+3','EEST').replace('GMT+2','EET');
      });
      zones.forEach(function(el){ el.textContent = short; });
    }catch(e){}
  }

  var timer;
  function schedule(){
    clearTimeout(timer);
    if(document.hidden) return;
    timer = setTimeout(function(){ tick(); schedule(); }, 60000 - (Date.now() % 60000) + 20);
  }
  function resync(){ tick(); schedule(); }
  resync();
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) resync(); });
  addEventListener('pageshow', resync);
  addEventListener('focus', resync);
})();
