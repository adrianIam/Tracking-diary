import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHoldRecorder,formatHeldTime} from '../dist/recorder.js';
class Button extends EventTarget {
 disabled=false;captured=null;
 focus(){}
 setPointerCapture(id){this.captured=id;}
 hasPointerCapture(id){return this.captured===id;}
 releasePointerCapture(){this.captured=null;}
}
const event=(target,type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);target.dispatchEvent(e);return e;};
function setup(){const button=new Button(),life=new EventTarget(),visibility=new EventTarget();let now=Date.parse('2026-11-14T10:00:00Z');const completed=[],started=[];let cancelled=0;const controller=createHoldRecorder({button,lifecycleTarget:life,visibilityTarget:visibility,clock:()=>now,onStart:t=>started.push(t),onComplete:e=>completed.push(e),onCancel:()=>cancelled++});return{button,life,visibility,completed,started,controller,advance:ms=>now+=ms,get cancelled(){return cancelled;}};}
test('a pointer hold records exact press and release timestamps, including sub-second duration',()=>{const t=setup();event(t.button,'pointerdown',{pointerId:1,button:0,isPrimary:true});t.advance(2350);event(t.button,'pointerup',{pointerId:1});assert.equal(Date.parse(t.completed[0].endedAt)-Date.parse(t.completed[0].startedAt),2350);assert.equal(t.button.captured,null);event(t.button,'lostpointercapture',{pointerId:1});assert.equal(t.completed.length,1);assert.equal(t.cancelled,0);});
test('another finger or mouse button cannot finish or restart the active hold',()=>{const t=setup();event(t.button,'pointerdown',{pointerId:1,button:0});t.advance(1000);event(t.button,'pointerdown',{pointerId:2,button:0,isPrimary:false});event(t.button,'pointerup',{pointerId:2});assert.equal(t.completed.length,0);t.advance(1000);event(t.button,'pointerup',{pointerId:1});assert.equal(t.started.length,1);assert.equal(Date.parse(t.completed[0].endedAt)-Date.parse(t.completed[0].startedAt),2000);});
test('pointer cancellation, lost capture, blur and hidden tab cancel without creating an episode',()=>{for(const reason of ['pointercancel','lostpointercapture','blur','visibilitychange']){const t=setup();event(t.button,'pointerdown',{pointerId:1,button:0});t.advance(2000);if(reason==='visibilitychange'){t.visibility.hidden=true;event(t.visibility,reason);}else event(reason==='blur'?t.life:t.button,reason,{pointerId:1});event(t.button,'pointerup',{pointerId:1});assert.equal(t.cancelled,1,reason);assert.equal(t.completed.length,0,reason);}});
test('controller teardown cancels an active hold without a late save',()=>{const t=setup();event(t.button,'pointerdown',{pointerId:1,button:0});t.advance(1000);t.controller.destroy();event(t.button,'pointerup',{pointerId:1});assert.equal(t.completed.length,0);assert.equal(t.cancelled,1);});
test('right click and disabled controls do not begin recording',()=>{const t=setup();event(t.button,'pointerdown',{pointerId:1,button:2});t.button.disabled=true;event(t.button,'pointerdown',{pointerId:1,button:0});assert.equal(t.started.length,0);});
test('duration display handles fractions and hour boundaries',()=>{assert.equal(formatHeldTime(2350),'00:02.3');assert.equal(formatHeldTime(60000),'01:00.0');assert.equal(formatHeldTime(3600100),'1:00:00.1');});

test('sequential holds capture distinct intervals and cancelled holds leave earlier bursts intact',()=>{
 const t=setup();
 event(t.button,'pointerdown',{pointerId:1,button:0});t.advance(1200);event(t.button,'pointerup',{pointerId:1});
 t.advance(5000);
 event(t.button,'pointerdown',{pointerId:2,button:0});t.advance(500);event(t.button,'pointercancel',{pointerId:2});
 t.advance(1000);
 event(t.button,'pointerdown',{pointerId:3,button:0});t.advance(2300);event(t.button,'pointerup',{pointerId:3});
 assert.equal(t.completed.length,2);assert.equal(t.cancelled,1);
 assert.equal(Date.parse(t.completed[0].endedAt)-Date.parse(t.completed[0].startedAt),1200);
 assert.equal(Date.parse(t.completed[1].endedAt)-Date.parse(t.completed[1].startedAt),2300);
 assert.ok(Date.parse(t.completed[1].startedAt)>Date.parse(t.completed[0].endedAt));
});
