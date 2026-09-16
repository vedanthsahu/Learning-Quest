import { usePreferences } from "../utils/preferences";
import { motion } from "framer-motion";
export default function ChapterMap({part,bookId,color,onOpenReader}) {
 const {reduced}=usePreferences();
 const width=900,rowHeight=145,columns=3;
 const points=part.topics.map((t,i)=>{const row=Math.floor(i/columns),col=i%columns;return {t,x:150+(row%2?2-col:col)*300,y:55+row*rowHeight};});
 const height=Math.max(150,Math.ceil(points.length/columns)*rowHeight);
 return <div className="chapter-map" style={{height,"--map-color":color}}>
  <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">{points.slice(1).map((p,i)=>{const prev=points[i];return <motion.path key={p.t.num} d={`M${prev.x} ${prev.y} C${prev.x} ${(prev.y+p.y)/2+40} ${p.x} ${(prev.y+p.y)/2-40} ${p.x} ${p.y}`} fill="none" stroke={prev.t.status==="done"?color:"#425149"} strokeWidth="2" strokeDasharray={prev.t.status==="done"?undefined:"5 7"} initial={reduced ? false : {pathLength:0}} whileInView={{pathLength:1}} viewport={{once:true}} transition={{duration:reduced ? 0 : .8}}/>})}</svg>
  {points.map(({t,x,y})=><button key={t.num} className={`map-node ${t.status}`} style={{left:`${x/width*100}%`,top:y}} onClick={()=>onOpenReader({scope:"book",bookId,partIndex:part.partIndex,topicIndex:t.topicIndex})}><span>{t.status==="done"?"\u2713":t.num}</span><strong>{t.title}</strong><small>{t.status==="done"?"Completed":`${t.estMinutes} min`}</small></button>)}
 </div>;
}
