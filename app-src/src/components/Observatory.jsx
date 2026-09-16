import { useEffect, useRef, useState } from "react";
import { usePreferences } from "../utils/preferences";
export default function Observatory({books,onOpen}) {
 const host=useRef(null), callbacks=useRef(onOpen);callbacks.current=onOpen;const [failed,setFailed]=useState(false);const {reduced}=usePreferences();
 const signature=JSON.stringify(books.map(({id,color})=>({id,color})));
 useEffect(()=>{
  let disposed=false,cleanup=()=>{};
  import("three").then(T=>{
   if(disposed)return;const el=host.current;if(!el)return;let renderer;try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});}catch{setFailed(true);return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));el.appendChild(renderer.domElement);renderer.domElement.setAttribute("aria-hidden","true");
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,100);camera.position.set(0,.6,6);
   scene.add(new T.HemisphereLight(0xe2ffcf,0x253448,2));const sun=new T.DirectionalLight(0xe1ffb0,4);sun.position.set(-3,4,5);scene.add(sun);
   const group=new T.Group();scene.add(group);const core=new T.Mesh(new T.IcosahedronGeometry(1.12,3),new T.MeshStandardMaterial({color:0xa2cb78,roughness:.55,metalness:.3,flatShading:true}));group.add(core);
   const cage=new T.Mesh(new T.IcosahedronGeometry(1.14,1),new T.MeshBasicMaterial({color:0xe2ffbd,wireframe:true,transparent:true,opacity:.2}));group.add(cage);
   const ring=new T.Mesh(new T.TorusGeometry(1.65,.012,8,100),new T.MeshBasicMaterial({color:0xbde993,transparent:true,opacity:.5}));ring.rotation.x=1.15;ring.rotation.y=.3;group.add(ring);
   const satellites=JSON.parse(signature).map(b=>{const sphere=new T.Mesh(new T.IcosahedronGeometry(.13,1),new T.MeshStandardMaterial({color:b.color,emissive:b.color,emissiveIntensity:.4,metalness:.4,roughness:.3}));sphere.userData.bookId=b.id;group.add(sphere);return sphere;});
   const ray=new T.Raycaster(),pointer=new T.Vector2(5,5);let hovering=false,visible=true,tick=0,frame=0;
   function resize(){const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
   function draw(){satellites.forEach((s,i)=>{const a=i/satellites.length*Math.PI*2+(reduced?0:tick*.12);s.position.set(Math.cos(a)*2.2,Math.sin(a)*1.3,Math.sin(a)*.7);});renderer.render(scene,camera);}
   function loop(){frame=requestAnimationFrame(loop);if(document.hidden||!visible||reduced)return;tick+=.012;core.rotation.y+=.002;cage.rotation.y=core.rotation.y;group.rotation.y+=(pointer.x*.08-group.rotation.y)*.025;group.rotation.x+=(-pointer.y*.04-group.rotation.x)*.025;if(!hovering)pointer.set(0,0);draw();}
   function move(e){const r=el.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);hovering=true;ray.setFromCamera(pointer,camera);el.style.cursor=ray.intersectObjects(satellites).length?"pointer":"default";}
   function click(){ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(satellites)[0];if(hit)callbacks.current(hit.object.userData.bookId);}
   function leave(){hovering=false;pointer.set(0,0);}
   function lost(e){e.preventDefault();setFailed(true);cancelAnimationFrame(frame);}
   renderer.domElement.addEventListener("webglcontextlost",lost);el.addEventListener("pointermove",move);el.addEventListener("click",click);el.addEventListener("pointerleave",leave);
   const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(el);const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting});intersection.observe(el);resize();if(!reduced)loop();
   cleanup=()=>{cancelAnimationFrame(frame);resizeObserver.disconnect();intersection.disconnect();el.removeEventListener("pointermove",move);el.removeEventListener("click",click);el.removeEventListener("pointerleave",leave);renderer.domElement.removeEventListener("webglcontextlost",lost);scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.domElement.remove();};
  }).catch(()=>{if(!disposed)setFailed(true)});
  return()=>{disposed=true;cleanup();};
 },[signature,reduced]);
 return <div className="observatory"><div className="observatory-canvas" ref={host}>{failed&&<div className="observatory-fallback" aria-hidden="true"><span/></div>}</div><div className="observatory-caption">YOUR UNIVERSE OF KNOWLEDGE</div><div className="satellite-links" aria-label="Explore handbook planets">{books.map((b,i)=><button key={b.id} title={b.name} aria-label={`Explore ${b.name}`} onClick={()=>onOpen(b.id)} style={{"--satellite":b.color}}>{String(i+1).padStart(2,"0")}</button>)}</div></div>;
}
