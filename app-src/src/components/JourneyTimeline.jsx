import { motion } from "framer-motion";
import { downloadCompletion } from "../utils/completionCard";
export default function JourneyTimeline({data}) {
 const milestones=data.books.flatMap(b=>b.parts.flatMap(p=>p.topics.filter(t=>t.status==="done" && t.dateCompleted).map(t=>({title:t.title,date:t.dateCompleted,book:b.name,color:b.color,num:t.num})))).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
 const finished=data.books.filter(b=>b.parts.every(p=>p.topics.every(t=>t.status==="done")));
 return <section className="journey-timeline card"><div className="eyebrow">YOUR EXPEDITION LOG</div><h2>Chapters in your story.</h2>{milestones.length===0?<p className="empty-hint">Your first completed chapter will appear here.</p>:<ol>{milestones.map((m,i)=><motion.li key={`${m.book}-${m.num}`} initial={{opacity:0,x:-10}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:i*.03}} style={{"--milestone-color":m.color}}><time dateTime={m.date}>{new Date(m.date).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</time><div><strong>{m.title}</strong><span>{m.book}</span></div></motion.li>)}</ol>}{finished.map(b=><button key={b.id} className="btn-secondary" onClick={()=>downloadCompletion({title:b.name,subtitle:"Every chapter explored"})}>Save {b.name} completion card</button>)}</section>;
}
