/* THAOS cinematic cursor-parallax. Light touch, disabled for coarse pointers/reduced motion. */
(()=>{
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fine=window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  if(reduced||!fine) return;
  const items=[['.home-hero','.home-hero__illustration'],['.auth-shell','.auth-visual__image']];
  for(const [containerSelector,imageSelector] of items){
    const area=document.querySelector(containerSelector), image=document.querySelector(imageSelector);
    if(!area||!image) continue;
    let x=0,y=0,targetX=0,targetY=0,frame=0,visible=true;
    function animate(){
      frame=0;if(!visible)return;
      x+=(targetX-x)*.075;y+=(targetY-y)*.075;
      image.style.setProperty('--art-move-x',x.toFixed(2)+'px');
      image.style.setProperty('--art-move-y',y.toFixed(2)+'px');
      if(Math.abs(x-targetX)>.08||Math.abs(y-targetY)>.08)frame=requestAnimationFrame(animate);
    }
    function request(){if(!frame&&visible)frame=requestAnimationFrame(animate)}
    area.addEventListener('pointermove',ev=>{
      if(ev.pointerType==='touch')return;
      const r=area.getBoundingClientRect();
      if(!r.width||!r.height)return;
      targetX=(.5-(ev.clientX-r.left)/r.width)*13;
      targetY=(.5-(ev.clientY-r.top)/r.height)*10;
      request();
    },{passive:true});
    area.addEventListener('pointerleave',()=>{targetX=0;targetY=0;request()},{passive:true});
    document.addEventListener('visibilitychange',()=>{
      visible=!document.hidden;
      if(!visible&&frame){cancelAnimationFrame(frame);frame=0;}
      if(visible) request();
    });
  }
})();
