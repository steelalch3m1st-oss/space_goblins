(function(){
 var HOSTED=false; try{ HOSTED=window.parent!==window; }catch(e){}
 var T0=0;
 window.MG3={
  hosted:HOSTED,
  start:function(){ T0=performance.now(); },
  report:function(win,perfect,skipped){
   var detail={win:!!win,perfect:!!perfect};
   try{ window.dispatchEvent(new CustomEvent('forpost:minigame-complete',{detail:detail})); }catch(e){}
   if(typeof window.FORPOST_MINIGAME_DONE==='function'){ try{ window.FORPOST_MINIGAME_DONE({win:!!win,perfect:!!perfect}); }catch(e){} }
   if(HOSTED&&(win||skipped)){
    var d={win:!!win,perfect:!!perfect}; if(win&&T0) d.seconds=(performance.now()-T0)/1000;
    try{ window.parent.postMessage({type:'forpost:minigame-complete',detail:d},'*'); }catch(e){}
   }
  },
  /* утримувані кнопки: миша/дотик/клавіатура */
  holdButtons:function(keys){
   document.querySelectorAll('[data-k]').forEach(function(b){
    var k=b.getAttribute('data-k');
    var on=function(e){ e.preventDefault(); keys[k]=true; }, off=function(){ keys[k]=false; };
    b.addEventListener('pointerdown',on); b.addEventListener('pointerup',off); b.addEventListener('pointerleave',off); b.addEventListener('pointercancel',off);
   });
   var map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
   window.addEventListener('keydown',function(e){ var k=map[e.key]; if(k){ e.preventDefault(); keys[k]=true; } });
   window.addEventListener('keyup',function(e){ var k=map[e.key]; if(k){ keys[k]=false; } });
   window.addEventListener('blur',function(){ for(var k in keys) keys[k]=false; });
  }
 };
})();
