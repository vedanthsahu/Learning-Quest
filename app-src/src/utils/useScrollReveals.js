import { useEffect } from "react";
import { usePreferences } from "./preferences";
export function useScrollReveals(key) {
 const {reduced}=usePreferences();
 useEffect(()=>{
  if(reduced)return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("revealed");observer.unobserve(entry.target)}}),{threshold:.06});
  const nodes=[...document.querySelectorAll(".quest-part,.tactile-book,.profile-stats-grid .stat-card,.achievement-card,.revision-card")];
  nodes.forEach(el=>{el.classList.add("scroll-reveal");observer.observe(el)});
  return()=>{observer.disconnect();nodes.forEach(el=>el.classList.remove("scroll-reveal"))};
 },[key,reduced]);
}
