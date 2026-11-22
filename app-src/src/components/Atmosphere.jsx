import { useEffect, useRef, useState } from "react";
import { usePreferences } from "../utils/preferences";
import { useDialog } from "../utils/useDialog";
import Companion from "./Companion";
export default function Atmosphere() {
  const [open,setOpen] = useState(false);
  return <><button className="atmosphere-launch" onClick={()=>setOpen(true)} aria-label="Personalize atmosphere"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--bg)"/><circle cx="16" cy="17" r="3" fill="var(--bg)"/></svg> Atmosphere</button>{open && <Settings onClose={()=>setOpen(false)}/>}<Ambience/></>;
}
function Settings({onClose}) {
 const {prefs,update} = usePreferences(); const ref=useDialog(onClose);
 return <div className="settings-backdrop" onClick={onClose}><section ref={ref} role="dialog" aria-modal="true" aria-label="Personalize atmosphere" tabIndex={-1} className="settings-panel" onClick={e=>e.stopPropagation()}><button className="settings-close icon-btn" aria-label="Close atmosphere" onClick={onClose}>&times;</button><h2>Your space. Your rhythm.</h2><p>Small details that make learning feel like you.</p><label>Palette<select aria-label="Palette" value={prefs.theme} onChange={e=>update({theme:e.target.value})}><option value="orbital">Orbital flight deck</option><option value="forest">Forest observatory</option><option value="nebula">Violet nebula</option><option value="ember">Amber twilight</option></select></label><label>Motion<select aria-label="Motion" value={prefs.motion} onChange={e=>update({motion:e.target.value})}><option value="full">Lively</option><option value="quiet">Quiet</option></select></label><p className="settings-hint">Your device's reduced-motion preference always takes priority.</p><label>Ambient sound<select aria-label="Ambient sound" value={prefs.ambience} onChange={e=>update({ambience:e.target.value})}><option value="off">Off</option><option value="rain">Soft rain</option><option value="space">Deep space</option></select></label><fieldset><legend>Your companion</legend><div className="companion-choices">{["owl","fox","otter","cloud","squirrel"].map(kind=><button key={kind} aria-label={`Choose ${kind}`} aria-pressed={prefs.companion===kind} onClick={()=>update({companion:kind})}><Companion kind={kind} size={62}/><span>{kind}</span></button>)}</div></fieldset><div className="settings-saved" role="status">Preferences saved on this device.</div></section></div>;
}
function Ambience() {
 const {prefs} = usePreferences(); const audio=useRef(null); const [activated,setActivated]=useState(false);
 useEffect(()=>{const start=()=>setActivated(true);window.addEventListener("pointerdown",start,{once:true});window.addEventListener("keydown",start,{once:true});return()=>{window.removeEventListener("pointerdown",start);window.removeEventListener("keydown",start)}},[]);
 useEffect(()=>{
  if(!activated || prefs.ambience==="off") return;
  const Audio=window.AudioContext || window.webkitAudioContext;if(!Audio)return;
  const ctx=new Audio();audio.current=ctx;const gain=ctx.createGain();gain.gain.value=.035;gain.connect(ctx.destination);
  const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=prefs.ambience==="rain"?1500:220;source.connect(filter);filter.connect(gain);source.start();ctx.resume().catch(()=>{});
  const visibility=()=>{if(document.hidden)ctx.suspend().catch(()=>{});else ctx.resume().catch(()=>{})};document.addEventListener("visibilitychange",visibility);visibility();
  return()=>{document.removeEventListener("visibilitychange",visibility);source.stop();ctx.close().catch(()=>{});audio.current=null;};
 },[prefs.ambience,activated]);return null;
}
