
// ---------------- panel controls: reusable switch / button components + panel state model ----------------
// Every physical control registers itself in PANEL. Its mutable state lives in PANEL.state[id] (so the whole
// cockpit can be reset, saved or inspected as one object); geometry is in panel units (the 1520 x 250 panel space).
// To add a switch later: new ToggleSwitch({id,x,y,w,h,labels:['ON','OFF'],key:'KeyF',onChange(pos){...}}).
const PANEL={state:{},controls:[],byId:{},HOLD_MS:700,
  reset(){for(const c of this.controls)c.reset();},
  update(now){for(const c of this.controls)c.update(now);},
  draw(c,now,surface='main'){for(const k of this.controls)if(k.surface===surface)k.draw(c,now);},
  at(x,y,surface='main'){return this.controls.find(k=>k.surface===surface&&k.hit(x,y))||null;},
  click(x,y,surface='main'){const k=this.at(x,y,surface);if(k){k.click(performance.now());return true;}return false;},
  keyDown(code){const k=this.controls.find(k=>k.key===code);if(!k)return false;k.keyDown(performance.now());return true;},
  keyUp(code){const k=this.controls.find(k=>k.key===code);if(k)k.keyUp(performance.now());},
  log:[]};
function clack(vol=0.05){if(!AC||!au)return;noiseBurst(AC.currentTime,0.05,vol,3200);beep(180,0.03,vol*0.8);}
class PanelControl{
  constructor(o){this.surface='main';Object.assign(this,o);PANEL.controls.push(this);PANEL.byId[this.id]=this;this.reset();}
  get st(){return PANEL.state[this.id];}
  initState(){return {};}
  reset(){PANEL.state[this.id]=this.initState();}
  hit(x,y){return x>=this.x&&x<=this.x+this.w&&y>=this.y&&y<=this.y+this.h;}
  isEnabled(){return this.enabled?!!this.enabled():true;}
  emit(ev){PANEL.log.push({t:+S.t.toFixed(2),id:this.id,ev});console.info('[panel]',this.id,ev);}
  update(now){} click(now){} keyDown(now){} keyUp(now){} draw(c,now){}
}
// Guarded pushbutton: first click (or key down) lifts the guard, second click (or holding the key) presses it.
class GuardedPushButton extends PanelControl{
  initState(){return {cover:'closed',coverT:0,pressed:false,holdT:0,denyT:0};}
  open(now){const s=this.st;if(s.cover!=='open'){s.cover='open';clack(0.04);this.emit('guard-open');}s.coverT=now;}
  press(now){const s=this.st;if(s.pressed||!this.isEnabled())return;s.cover='open';s.pressed=true;s.holdT=0;clack(0.08);this.emit('pressed');this.onPress&&this.onPress();}
  deny(now){this.st.denyT=now;this.emit('disabled');}
  click(now){if(!this.isEnabled()&&!this.st.pressed)return this.deny(now);if(this.st.cover!=='open')this.open(now);else this.press(now);}
  keyDown(now){if(!this.isEnabled()&&!this.st.pressed)return this.deny(now);this.open(now);this.st.holdT=now;}
  keyUp(now){const s=this.st;if(s.holdT&&now-s.holdT>=PANEL.HOLD_MS)this.press(now);s.holdT=0;}
  update(now){const s=this.st;if(s.holdT&&now-s.holdT>=PANEL.HOLD_MS)this.press(now);
    if(s.cover==='open'&&!s.pressed&&!s.holdT&&now-s.coverT>6000){s.cover='closed';this.emit('guard-closed');}}
  draw(c,now){const {x,y,w,h}=this,s=this.st,en=this.isEnabled()||s.pressed;
    rr(c,x,y,w,h,5);c.fillStyle='#1b1d1a';c.fill();c.strokeStyle='#0c0d0b';c.lineWidth=2;c.stroke();
    const d=s.pressed?2:0,bx=x+11,by=y+16+d,bw=w-22,bh=h-36;
    rr(c,bx-3,by-3-d,bw+6,bh+6+d,4);c.fillStyle='#0a0b0a';c.fill();
    const lit=s.pressed&&(this.steady||(now%900<620));
    const g=c.createLinearGradient(0,by,0,by+bh);
    if(lit){g.addColorStop(0,this.litColor);g.addColorStop(1,this.litColor2||this.litColor);}else{g.addColorStop(0,'#6a5e52');g.addColorStop(1,'#3e3630');}
    rr(c,bx,by,bw,bh,3);c.fillStyle=g;c.fill();if(lit){c.shadowColor=this.litColor;c.shadowBlur=18;c.fill();c.shadowBlur=0;}
    c.strokeStyle=s.pressed?'#000':'#a99d8c';c.lineWidth=1;c.stroke();
    this.lines.forEach((t,i)=>label(c,t,x+w/2,by+bh/2+5+(i-(this.lines.length-1)/2)*14,t.length>6?12:14,lit?'#fff8ec':'#e8e0cf'));
    // guard
    if(s.cover==='closed'){rr(c,x+5,y+9,w-10,h-26,5);c.fillStyle='rgba(176,34,24,0.62)';c.fill();
      c.save();rr(c,x+5,y+9,w-10,h-26,5);c.clip();c.strokeStyle='rgba(255,255,255,0.10)';c.lineWidth=5;
      for(let k=-h;k<w;k+=12){c.beginPath();c.moveTo(x+k,y+h);c.lineTo(x+k+h,y);c.stroke();}c.restore();
      rr(c,x+5,y+9,w-10,h-26,5);c.strokeStyle='#e8d6c8';c.lineWidth=1.5;c.stroke();
      c.fillStyle='#d9dcd4';c.fillRect(x+12,y+5,w-24,5);label(c,'GUARD',x+w/2,y+h-26,8,'rgba(255,240,230,0.85)');}
    else{const gg=c.createLinearGradient(0,y+1,0,y+12);gg.addColorStop(0,'#e05040');gg.addColorStop(1,'#6a1810');
      c.beginPath();c.moveTo(x+3,y+13);c.lineTo(x+w-3,y+13);c.lineTo(x+w-9,y+1);c.lineTo(x+9,y+1);c.closePath();c.fillStyle=gg;c.fill();
      c.fillStyle='#d9dcd4';c.fillRect(x+12,y+11,w-24,4);}
    // key hint + hold progress
    const hint=s.pressed?'ENGAGED':(TOUCH_UI?'TAP ×2 · LIFT GUARD, PRESS':`[${this.keyLabel}] HOLD · CLICK ×2`);label(c,hint,x+w/2,y+h-7,8.5,s.pressed?'#ffb08a':'#aab0a2');
    if(s.holdT){const k=clamp((now-s.holdT)/PANEL.HOLD_MS,0,1);c.fillStyle='#ffb02c';c.fillRect(x+8,y+h-19,(w-16)*k,3);}
    if(!en){rr(c,x,y,w,h,5);c.fillStyle='rgba(10,12,10,0.55)';c.fill();}
    if(now-s.denyT<500){rr(c,x,y,w,h,5);c.strokeStyle='#ff5a3a';c.lineWidth=2;c.stroke();}
  }
}
// Two- or three-position toggle (lever) switch. Used on the fold-out switch panel; the manual-switch cockpit will reuse it.
// Options: labels (top to bottom), title, key/keyLabel, onChange(pos), flag() -> short text for a red indicator, or null.
class ToggleSwitch extends PanelControl{
  initState(){return {pos:this.initial||0};}
  set(pos){const s=this.st;pos=clamp(pos,0,this.labels.length-1);if(pos===s.pos)return;s.pos=pos;clack(0.05);this.emit('pos '+this.labels[pos]);this.onChange&&this.onChange(pos);}
  click(now){if(!this.isEnabled())return;this.set((this.st.pos+1)%this.labels.length);}
  keyDown(now){this.click(now);}
  hit(x,y){return x>=this.x-6&&x<=this.x+this.w+44&&y>=this.y-16&&y<=this.y+this.h+14;}
  draw(c,now){const {x,y,w,h}=this,s=this.st,n=this.labels.length,cx=x+w/2,cy=y+h/2;
    if(this.title)label(c,this.title,cx+14,y-6,8.5);
    rr(c,x,y,w,h,4);c.fillStyle='#161816';c.fill();c.strokeStyle='#060706';c.lineWidth=1.5;c.stroke();
    const ty=y+9+(h-18)*s.pos/Math.max(1,n-1);
    const g=c.createRadialGradient(cx-2,cy-2,0,cx,cy,8);g.addColorStop(0,'#e6e8e0');g.addColorStop(1,'#62675e');c.fillStyle=g;c.beginPath();c.arc(cx,cy,7.5,0,7);c.fill();
    c.strokeStyle='#cfd2c8';c.lineWidth=4.5;c.lineCap='round';c.beginPath();c.moveTo(cx,cy);c.lineTo(cx,ty);c.stroke();c.lineCap='butt';
    c.fillStyle='#f2f3ee';c.beginPath();c.arc(cx,ty,4.6,0,7);c.fill();
    this.labels.forEach((l,i)=>label(c,l,x+w+4,y+12+(h-18)*i/Math.max(1,n-1),8.5,i===s.pos?'#ffffff':'#7f8577','left'));
    const f=this.flag&&this.flag();if(f){const on=now%600<380;rr(c,x+w+4,cy-6,30,12,2);c.fillStyle=on?'#ff4a2a':'#4a1410';c.fill();label(c,f,x+w+19,cy+3.5,8,on?'#fff':'#a86a60');}
    if(this.keyLabel)label(c,`[${this.keyLabel}]`,cx,y+h+11,8.5,'#aab0a2');}
}
const abortBtn=new GuardedPushButton({id:'abort',x:1408,y:30,w:94,h:94,lines:['ABORT'],key:'KeyB',keyLabel:'B',litColor:'#ff6a3a',litColor2:'#c02a14',
  enabled:()=>S.mode==='fly'&&!S.abort,onPress:()=>doAbort()});
const abortStageBtn=new GuardedPushButton({id:'abortStage',x:1408,y:136,w:94,h:98,lines:['ABORT','STAGE'],key:'KeyN',keyLabel:'N',litColor:'#ff4a2a',litColor2:'#a01a0c',steady:true,
  enabled:()=>S.mode==='fly'&&!S.staged,onPress:()=>doAbortStage()});
