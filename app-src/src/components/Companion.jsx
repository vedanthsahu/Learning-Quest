import { usePreferences } from "../utils/preferences";
import { useId, useState } from "react";

const PALETTES = {
  owl: ["#d7f7aa", "#718b55", "#d3ecad"],
  fox: ["#ffcfac", "#bf715d", "#ffc5ad"],
  otter: ["#b0ece0", "#4b8e88", "#b8f9ec"],
  cloud: ["#d5eaff", "#7796c5", "#c6e6ff"],
  squirrel: ["#e4d3ff", "#8d70b2", "#e2caff"],
};

// Shared vector construction keeps the companions crisp at every size. All idle
// and reaction motion is CSS driven, including the reduced-motion alternative.
export default function Companion({ kind = "owl", level = 1, mood = "idle", size = 140 }) {
  const {reduced} = usePreferences();
  const [look,setLook] = useState({x:0,y:0});
  const id = useId().replace(/:/g, "");
  const [greet, setGreet] = useState(false);
  const [light, shade, glow] = PALETTES[kind] || PALETTES.owl;
  const happy = greet || mood === "happy" || mood === "levelup";
  return (
    <div className={`companion companion-${kind} ${happy ? "is-happy" : ""} ${mood === "sleepy" ? "is-sleepy" : mood === "focus" ? "is-focused" : ""}`}
      style={{ width: size, height: size, "--companion-glow": glow }}
      onPointerMove={e => { if(reduced)return;const r=e.currentTarget.getBoundingClientRect();setLook({x:(e.clientX-r.left-r.width/2)/r.width*7,y:(e.clientY-r.top-r.height/2)/r.height*5}); }} onPointerEnter={() => setGreet(true)} onPointerLeave={() => {setGreet(false);setLook({x:0,y:0});}}
      role="img" aria-label={`${kind} learning companion${happy ? ", celebrating" : mood === "sleepy" ? ", resting" : mood === "focus" ? ", concentrating" : ""}`}>
      <svg viewBox="0 0 220 220" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-body`} cx="32%" cy="20%" r="85%"><stop stopColor={light}/><stop offset=".6" stopColor={shade}/><stop offset="1" stopColor="#253936"/></radialGradient>
          <linearGradient id={`${id}-glass`} x2=".8" y2="1"><stop stopColor="#344a4d"/><stop offset="1" stopColor="#101e27"/></linearGradient>
          <radialGradient id={`${id}-halo`}><stop stopColor={glow} stopOpacity=".16"/><stop offset="1" stopColor={glow} stopOpacity="0"/></radialGradient>
        </defs>
        <circle cx="110" cy="108" r="105" fill={`url(#${id}-halo)`}/>
        <ellipse className="companion-shadow" cx="110" cy="192" rx="44" ry="7" fill="#000" opacity=".25"/>
        <ellipse cx="110" cy="179" rx="77" ry="20" fill="none" stroke={glow} strokeOpacity=".18" strokeDasharray="3 7"/>
        <g className="companion-float">
          {kind === "fox" || kind === "owl" ? <g fill={`url(#${id}-body)`} stroke={light} strokeOpacity=".3"><path d="M53 81 49 28Q75 32 87 65Z"/><path d="M133 65Q152 32 172 28L165 85Z"/></g> : kind === "cloud" ? <g fill={light} opacity=".85"><circle cx="71" cy="70" r="25"/><circle cx="109" cy="53" r="29"/><circle cx="148" cy="72" r="25"/></g> : <g fill={shade} stroke={light} strokeWidth="5"><circle cx="60" cy="66" r={kind === "squirrel" ? 22 : 17}/><circle cx="160" cy="66" r={kind === "squirrel" ? 22 : 17}/></g>}
          <ellipse className="companion-wing left" cx="47" cy="132" rx="14" ry="30" fill={shade}/>
          <ellipse className="companion-wing right" cx="173" cy="132" rx="14" ry="30" fill={shade}/>
          <rect x="48" y="56" width="124" height="121" rx="53" fill={`url(#${id}-body)`} stroke={light} strokeOpacity=".35"/>
          <path d="M66 78Q107 52 147 77" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".28"/>
          <rect x="60" y="82" width="100" height="62" rx="29" fill={`url(#${id}-glass)`} stroke={light} strokeOpacity=".45" strokeWidth="2"/>
          <path d="M73 91Q103 82 134 90" stroke="#fff" opacity=".12" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <g style={{translate:`${look.x}px ${look.y}px`}}><g className="companion-eyes" fill={glow}>
            {happy ? <g fill="none" stroke={glow} strokeWidth="5" strokeLinecap="round"><path d="M78 113Q86 99 94 113"/><path d="M126 113Q134 99 142 113"/></g> : <><rect x="81" y="102" width="11" height="19" rx="5.5"/><rect x="128" y="102" width="11" height="19" rx="5.5"/></>}
          </g>
          </g>
          <ellipse cx="76" cy="124" rx="7" ry="3" fill="#f7b3a4" opacity=".5"/><ellipse cx="144" cy="124" rx="7" ry="3" fill="#f7b3a4" opacity=".5"/>
          <path d="M103 125Q110 132 117 125" stroke={glow} strokeWidth="2" strokeLinecap="round" fill="none"/>
          <path d="m110 149 4 6 7 2-7 3-4 6-4-6-7-3 7-2Z" fill={light}/>
          {level >= 3 && <g fill={glow}>{Array.from({length: Math.min(5, Math.floor(level / 2))}, (_, i) => <circle key={i} cx={94 + i * 8} cy="170" r="2"/>)}</g>}
          {level >= 5 && <path d="m89 48 3-16 12 8 7-16 7 16 12-8 2 16Z" fill="#efce85"/>}
        </g>
        <g className="companion-spark" fill={glow}><path d="m184 60 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><circle cx="32" cy="100" r="3"/><circle cx="174" cy="166" r="2"/></g>
      </svg>
    </div>
  );
}
