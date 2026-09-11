(function(){
  var tracks=[].slice.call(document.querySelectorAll('.secs'));
  if(!tracks.length)return;

  tracks.forEach(function(track){
    var frame=0;

    function edges(){
      frame=0;
      var max=Math.max(0,track.scrollWidth-track.clientWidth);
      var fade=Math.min(44,Math.max(24,track.clientWidth*.07));
      var left=Math.min(1,Math.max(0,track.scrollLeft/fade));
      var right=Math.min(1,Math.max(0,(max-track.scrollLeft)/fade));
      track.style.setProperty('--secs-fade-left',String(1-left));
      track.style.setProperty('--secs-fade-right',String(1-right));
    }

    function update(){
      if(!frame)frame=requestAnimationFrame(edges);
    }

    track.addEventListener('scroll',update,{passive:true});
    addEventListener('resize',update,{passive:true});
    if(window.ResizeObserver){
      var resizeObserver=new ResizeObserver(update);
      resizeObserver.observe(track);
    }
    if(window.MutationObserver){
      new MutationObserver(update).observe(track,{childList:true,subtree:true});
    }
    update();
  });
})();
