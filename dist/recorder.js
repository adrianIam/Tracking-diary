// One press owns a recording. Only its matching release can complete it.
export function createHoldRecorder({button,onStart,onComplete,onCancel,clock=Date.now,lifecycleTarget=window,visibilityTarget=document}) {
  let active=null;
  const listeners=[];
  const listen=(target,type,fn)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
  function end(cancelled=false) {
    if(!active)return;
    const held=active;active=null;
    if(held.pointerId!==undefined && button.hasPointerCapture?.(held.pointerId)) button.releasePointerCapture(held.pointerId);
    if(cancelled)onCancel?.();
    else onComplete({startedAt:new Date(held.start).toISOString(),endedAt:new Date(Math.max(held.start,clock())).toISOString()});
  }
  const begin=input=>{if(active||button.disabled)return;active={...input,start:clock()};onStart(active.start);};
  listen(button,'pointerdown',e=>{
    if(e.button!==0||e.isPrimary===false||active)return;
    e.preventDefault();button.focus();begin({pointerId:e.pointerId});
    try{button.setPointerCapture(e.pointerId);}catch{end(true);}
  });
  listen(button,'pointerup',e=>{if(active?.pointerId===e.pointerId){e.preventDefault();end();}});
  listen(button,'pointercancel',e=>{if(active?.pointerId===e.pointerId)end(true);});
  listen(button,'lostpointercapture',e=>{if(active?.pointerId===e.pointerId)end(true);});
  listen(button,'contextmenu',e=>e.preventDefault());
  listen(lifecycleTarget,'blur',()=>end(true));
  listen(visibilityTarget,'visibilitychange',()=>{if(visibilityTarget.hidden)end(true);});
  return {cancel:()=>end(true),destroy:()=>{listeners.forEach(remove=>remove());end(true);}};
}
export function formatHeldTime(milliseconds) {
  const tenths=Math.floor(Math.max(0,milliseconds)/100);
  const seconds=Math.floor(tenths/10);
  const minutes=Math.floor(seconds/60);
  const hours=Math.floor(minutes/60);
  return `${hours?`${hours}:`:''}${String(hours?minutes%60:minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}.${tenths%10}`;
}
