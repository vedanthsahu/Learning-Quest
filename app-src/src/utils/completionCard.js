export function downloadCompletion({title,subtitle="A learning milestone",date=new Date().toISOString()}) {
 const canvas=document.createElement("canvas");canvas.width=1600;canvas.height=1000;const c=canvas.getContext("2d");if(!c)return;
 c.fillStyle="#14201b";c.fillRect(0,0,1600,1000);c.strokeStyle="#98b678";c.lineWidth=2;c.strokeRect(45,45,1510,910);c.strokeStyle="#43563b";c.strokeRect(60,60,1480,880);
 for(let i=0;i<8;i++){c.beginPath();c.arc(1350,190,80+i*25,0,Math.PI*2);c.stroke();}
 c.fillStyle="#c4e9a0";c.font="20px sans-serif";c.fillText("LEARNING QUEST / CERTIFICATE OF COMPLETION",110,150);
 c.fillStyle="#f0f5e9";c.font="62px sans-serif";c.fillText("Curiosity, followed through.",110,280);c.font="42px sans-serif";
 const words=title.split(/\s+/);let line="",y=410;for(const word of words){if(c.measureText(line+word).width>1250){c.fillText(line.trim(),110,y);y+=62;line="";}line+=word+" ";}c.fillText(line.trim(),110,y);
 c.fillStyle="#aabd9e";c.font="25px sans-serif";c.fillText(subtitle,110,Math.max(610,y+90));c.fillText(`Completed ${new Date(date).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})}`,110,800);c.font="18px sans-serif";c.fillText("One chapter at a time. A whole new horizon.",110,875);
 const a=document.createElement("a");a.download=`learning-quest-${title.replace(/[^a-z0-9]+/gi,"-").slice(0,65)}.png`;a.href=canvas.toDataURL("image/png");a.click();
}
