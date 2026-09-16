import {worldFor} from "../data/worlds";
export default function WorldArt({bookId}) {
 const w=worldFor(bookId);
 return <svg className={`world-art world-${w.kind}`} viewBox="0 0 240 150" fill="none" aria-hidden="true" style={{color:w.color}}>
  <ellipse cx="120" cy="128" rx="85" ry="12" stroke="currentColor" opacity=".15"/>
  {w.kind==="city"?<g stroke="currentColor" strokeWidth="1.2">{[0,1,2,3,4].map((n)=><g key={n} transform={`translate(${40+n*34},${50+(n%2)*20})`}><path d="m0 0 18-10 18 10-18 10Z" fill="currentColor" opacity=".3"/><path d="M0 0v48l18 10 18-10V0M18 10v48"/>{[15,25,35].map(y=><path key={y} d={`M4 ${y}l10 5m8 0 10-5`} opacity=".4"/>)}</g>)}</g>
  :w.kind==="neural"?<g stroke="currentColor">{[0,1,2,3,4,5,6,7].map((n)=>{const x=120+Math.cos(n*Math.PI/4)*70,y=75+Math.sin(n*Math.PI/4)*48;return <g key={n}><path d={`M120 75 ${x} ${y}`} opacity=".5"/><circle cx={x} cy={y} r={n%2?5:9} fill="currentColor" opacity=".6"/></g>})}<circle cx="120" cy="75" r="21" fill="currentColor" opacity=".18"/><circle cx="120" cy="75" r="10"/></g>
  :w.kind==="islands"?<g stroke="currentColor">{[0,1,2].map(n=><g key={n} transform={`translate(${35+n*60},${55+(n%2)*25})`}><path d="m0 0 30-13 30 13-30 17Z" fill="currentColor" opacity=".4"/><path d="m0 0 30 40L60 0M30 17v23"/><path d="M20-5v-20h17v20"/></g>)}</g>
  :w.kind==="tree"?<g stroke="currentColor" strokeWidth="2"><path d="M120 120V80M120 80 65 48M120 80l55-32M65 48 40 24M65 48 90 24M175 48 150 24M175 48l25-24"/>{[[120,120],[120,80],[65,48],[175,48],[40,24],[90,24],[150,24],[200,24]].map(([x,y])=><circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill="currentColor"/>)}</g>
  :w.kind==="engine"?<g stroke="currentColor"><circle cx="120" cy="75" r="49" strokeDasharray="8 9" strokeWidth="8"/><circle cx="120" cy="75" r="30"/><path d="m120 45 26 15v30l-26 15-26-15V60Z" fill="currentColor" opacity=".18"/><path d="m94 60 26 15 26-15m-26 15v30"/></g>
  :<g stroke="currentColor"><ellipse cx="120" cy="75" rx="66" ry="46"/><ellipse cx="120" cy="75" rx="27" ry="46"/><path d="M54 75h132M65 50h110M65 100h110"/><path d="m157 38 6-17 7 17-7 7Z" fill="currentColor"/><circle cx="83" cy="88" r="7" fill="currentColor"/></g>}
 </svg>;
}
