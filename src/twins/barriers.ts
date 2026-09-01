import type {Twin,Vec3} from '../core/types.js';

/** Segment/AABB test: openings are actual gaps, failed wall bays become permeable. */
export function blockedByWall(a:Vec3,b:Vec3,twins:readonly Twin[],ignoreId?:string):boolean{
 return twins.some(t=>{
  const s=t.state;if(s.kind!=='wall'||s.integrity<.25||s.id===ignoreId)return false;
  const half=[Number(s.metadata.widthM??1)/2,Number(s.metadata.heightM??4)/2,Number(s.metadata.depthM??.3)/2];
  const center=[s.position.x,s.position.y+half[1],s.position.z],start=[a.x,a.y,a.z],end=[b.x,b.y,b.z];let lo=0,hi=1;
  for(let i=0;i<3;i++){const d=end[i]-start[i];if(Math.abs(d)<1e-10){if(start[i]<center[i]-half[i]||start[i]>center[i]+half[i])return false;continue}
   const p=(center[i]-half[i]-start[i])/d,q=(center[i]+half[i]-start[i])/d;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));if(lo>hi)return false;
  }return hi>1e-5&&lo<1-1e-5;
 });
}
