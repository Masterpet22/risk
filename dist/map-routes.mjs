export function routeGeometry(a,b,territories){
  const x1=a.x*10,y1=a.y*8,x2=b.x*10,y2=b.y*8,dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy)||1;
  const segmentDistance=p=>{const u=Math.max(0,Math.min(1,((p.x*10-x1)*dx+(p.y*8-y1)*dy)/(length*length)));return Math.hypot(p.x*10-(x1+dx*u),p.y*8-(y1+dy*u))};
  const blockers=territories.filter(territory=>territory.id!==a.id&&territory.id!==b.id&&segmentDistance(territory)<62);
  let cx=(x1+x2)/2,cy=(y1+y2)/2,curved=false;
  if(blockers.length){
    const nx=-dy/length,ny=dx/length,candidates=[58,-58,82,-82,108,-108,138,-138];let best=null;
    for(const offset of candidates){
      const tx=(x1+x2)/2+nx*offset,ty=(y1+y2)/2+ny*offset;let clearance=Infinity;
      for(const territory of territories){if(territory.id===a.id||territory.id===b.id)continue;for(let step=1;step<12;step++){const q=step/12,u=1-q,px=u*u*x1+2*u*q*tx+q*q*x2,py=u*u*y1+2*u*q*ty+q*q*y2;clearance=Math.min(clearance,Math.hypot(px-territory.x*10,py-territory.y*8))}}
      const edgePenalty=(tx<28||tx>972||ty<28||ty>732)?45:0,score=clearance-Math.abs(offset)*.16-edgePenalty;if(!best||score>best.score)best={score,cx:tx,cy:ty};
    }
    cx=best.cx;cy=best.cy;curved=true;
  }
  const point=t=>{const u=1-t;return curved?{x:u*u*x1+2*u*t*cx+t*t*x2,y:u*u*y1+2*u*t*cy+t*t*y2}:{x:x1+dx*t,y:y1+dy*t}};
  return{d:curved?`M ${x1} ${y1} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`:`M ${x1} ${y1} L ${x2} ${y2}`,point,curved};
}
