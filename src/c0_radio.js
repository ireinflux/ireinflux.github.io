
// ---------------- radio: real Apollo 11 clips, synth fallback ----------------
let voiceMode=1; // 0 = off, 1 = real Apollo audio (default), 2 = real audio + synth for unmatched callouts
const VOICE_NAMES=['off','real Apollo audio','real audio + synth'];
const radioBuf={}; const radioState={busyUntil:0,srcs:[]};
const radioLog=[]; window.__radioLog=radioLog;
function rlog(ev,name,x){radioLog.push(Object.assign({t:+(S.t||0).toFixed(2),ev,name},x||{}));console.info('[radio]',ev,name);}
function decodeClips(){let ok=0,bad=0;const keys=Object.keys(RADIO);
  for(const k of keys){let p;try{const bin=atob(RADIO[k].d),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);p=AC.decodeAudioData(u.buffer);}catch(e){p=Promise.reject(e);}
    p.then(b=>{radioBuf[k]=b;ok++;},()=>{radioBuf[k]=null;bad++;}).finally(()=>{if(ok+bad===keys.length)rlog(`decoded ${ok}/${keys.length} clips`+(bad?`, ${bad} failed (synth fallback)`:''),'*');});}}
function radioBusy(){return !!AC&&AC.currentTime<radioState.busyUntil;}
function speak(text,who){if(!window.speechSynthesis)return;const u=new SpeechSynthesisUtterance(text.replace(/½/g,' and a half').replace(/\([^)]*\)/g,''));u.rate=1.08;u.pitch=who==='CAPCOM'?0.85:1.0;speechSynthesis.speak(u);}
function noiseBurst(at,dur,vol,f=1800){if(!AC||!au)return;const s=AC.createBufferSource();s.buffer=au.wb;const hp=AC.createBiquadFilter();hp.type='bandpass';hp.frequency.value=f;hp.Q.value=0.6;
  const g=AC.createGain();g.gain.setValueAtTime(vol,at);g.gain.exponentialRampToValueAtTime(0.0005,at+dur);s.connect(hp).connect(g).connect(au.master);s.start(at,Math.random());s.stop(at+dur+0.05);}
// play a clip on the single radio channel; returns true if real audio was used
function radio(name,who,text,priority){
  if(voiceMode===0||!AC||!au)return false;
  const b=radioBuf[name];
  if(!b){rlog(b===null?'fallback-synth':'not-decoded-synth',name);speak(text,who);return false;}
  const now=AC.currentTime,cap=who==='CAPCOM';let start=now+(cap?0.3:0.05);
  if(radioState.busyUntil>now){if(!priority){rlog('skipped-busy',name);return false;}start=Math.max(start,radioState.busyUntil+(cap?0.4:0.2));}
  if(cap)beep(2525,0.25,0.05,start-0.28);
  const src=AC.createBufferSource();src.buffer=b;const g=AC.createGain();g.gain.value=1.15;src.connect(g).connect(au.master);src.start(start);
  radioState.srcs.push(src);src.onended=()=>{const i=radioState.srcs.indexOf(src);if(i>=0)radioState.srcs.splice(i,1);};
  radioState.busyUntil=start+b.duration;
  if(cap)beep(2475,0.22,0.04,start+b.duration+0.03);else noiseBurst(start+b.duration,0.12,0.06);
  rlog(start>now+0.35?'queued':'play',name,{start:+start.toFixed(3),end:+(start+b.duration).toFixed(3)});return true;
}
function radioStop(){for(const s of radioState.srcs){try{s.stop();}catch(e){}}radioState.srcs.length=0;radioState.busyUntil=0;if(window.speechSynthesis)speechSynthesis.cancel();}
// Aldrin's real callouts, matched against the player's altitude / descent rate
const CALLOUTS=Object.entries(RADIO).filter(([k,c])=>c.alt).map(([k,c])=>({clip:k,alt:c.alt,rate:c.rate,text:c.text}));
function matchCallout(altFt,downFps){let best=null,bs=1e9;
  for(const c of CALLOUTS){if(S.usedClips.has(c.clip))continue;const ta=Math.max(12,0.07*c.alt),da=Math.abs(altFt-c.alt);if(da>ta)continue;
    let sc=da/ta;if(c.rate!=null){const tr=Math.max(4,0.6*c.rate),dr=Math.abs(downFps-c.rate);if(dr>tr)continue;sc+=dr/tr;}
    if(sc<bs){bs=sc;best=c;}}
  return best;}
