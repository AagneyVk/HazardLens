import type {SimEvent,Twin,TwinContext,Vec3} from '../core/types.js';
import {ReleaseTwin} from './hazards.js';
import {PipeTwin,WeatherTwin} from './process.js';
import {blockedByWall} from './barriers.js';

export const FLOOR_GAS={step:2,cols:27,rows:19,depth:.5,diffusivity:1,ventilation:.02,density:1.83,lfl:.021,ufl:.095,heatOfCombustion:46};
/** Positivity-preserving finite-volume reference transport; NOT CFD or a pressure solver. */
export class FloorGasTwin extends ReleaseTwin{
 masses=new Float64Array(FLOOR_GAS.cols*FLOOR_GAS.rows);
 private ignitedAt=new Map<number,number>();
  private burning=new Set<number>();
  private suppressedUntil=0;
  override onEvent(event:SimEvent,context:TwinContext){if(event.type==='suppression.command'&&Number(event.payload.strength)>0){this.suppressedUntil=context.now+5;this.burning.clear();this.publish()}}
 constructor(id:string,position:Vec3,sourceId:string,rate:number){super(id,position,sourceId,rate);this.state.metadata.model='floor-gas-fv-v1';this.state.metadata.indoor=true;this.state.metadata.chemical='propane';this.publish()}
 point(i:number):Vec3{return{x:i%FLOOR_GAS.cols*2-26,y:.25,z:Math.floor(i/FLOOR_GAS.cols)*2-18}}
 index(p:Vec3){return Math.max(0,Math.min(18,Math.round((p.z+18)/2)))*27+Math.max(0,Math.min(26,Math.round((p.x+26)/2)))}
 fraction(i:number){return this.masses[i]/(FLOOR_GAS.density*FLOOR_GAS.step**2*FLOOR_GAS.depth)}
 override consumeFuel(request:number){let consumed=0;const total=this.massKg;if(total<=0||!Number.isFinite(request)||request<=0)return 0;const ratio=Math.min(1,request/total);for(let i=0;i<this.masses.length;i++){const amount=this.masses[i]*ratio;this.masses[i]-=amount;consumed+=amount}this.burnedKg+=consumed;this.publish();return consumed}
 override tick(dt:number,context:TwinContext){
  const source=context.get(this.sourceId);if(source instanceof PipeTwin)this.rateKgS=source.leakRateKgS;
  const twins=context.twins(),weather=twins.find(t=>t instanceof WeatherTwin) as WeatherTwin|undefined;
  const vx=weather?.windX??0,vz=weather?.windZ??0;
  // Outflow sum <= .8: positivity for diffusion + upwind advection at any caller dt.
  const steps=Math.max(1,Math.ceil(dt*(4*FLOOR_GAS.diffusivity/4+(Math.abs(vx)+Math.abs(vz))/2)/.8)),h=dt/steps;
  const edges:Array<[number,number,number]>=[],neighbors=Array.from({length:this.masses.length},()=>[] as number[]);
  for(let i=0;i<this.masses.length;i++)for(const [j,v] of [[i%27<26?i+1:-1,vx],[i<27*18?i+27:-1,vz]])if(j>=0&&!blockedByWall(this.point(i),this.point(j),twins)){edges.push([i,j,v]);neighbors[i].push(j);neighbors[j].push(i)}
  for(let sub=0;sub<steps;sub++){
   const supplied=source?.withdrawFuel?.(Math.max(0,this.rateKgS)*h)??0;this.masses[this.index(this.state.position)]+=supplied;this.receivedKg+=supplied;
   const delta=new Float64Array(this.masses.length);
   for(const [i,j,v] of edges){const flux=h*(FLOOR_GAS.diffusivity*(this.masses[i]-this.masses[j])/4+(v>=0?v*this.masses[i]:v*this.masses[j])/2);delta[i]-=flux;delta[j]+=flux}
   for(let i=0;i<this.masses.length;i++){this.masses[i]+=delta[i];const removed=this.masses[i]*(1-Math.exp(-FLOOR_GAS.ventilation*h));this.masses[i]-=removed;this.dispersedKg+=removed}
  }
  this.age+=dt;
  const hot=twins.filter(t=>t.state.active&&((t.state.kind==='fire'&&Number(t.state.metadata.intensityMw)>0)||(t.state.kind==='explosion'&&Number(t.state.metadata.age)<.6)||(t.state.kind==='ignition'&&t.state.metadata.enabled===true)));
  const fields=twins.filter(t=>t instanceof FloorGasTwin) as FloorGasTwin[];
  const nextBurning=new Set<number>();
  const heatByTarget=new Map<string,number>();
  for(let i=0;i<this.masses.length;i++){
   const concentration=fields.reduce((sum,f)=>sum+f.fraction(i),0),point=this.point(i);
   if(context.now<this.suppressedUntil||this.masses[i]<1e-10||concentration<FLOOR_GAS.lfl||concentration>FLOOR_GAS.ufl)continue;
   const sourceFire=hot.find(t=>Math.hypot(t.state.position.x-point.x,t.state.position.z-point.z)<2.5&&!blockedByWall({...t.state.position,y:.25},point,twins));
   const neighbor=neighbors[i].some(n=>fields.some(f=>f.burning.has(n)&&context.now-(f.ignitedAt.get(n)??context.now)>=.5));
   if(!this.burning.has(i)&&!sourceFire&&!neighbor)continue;
   if(!this.burning.has(i)){
    this.ignitedAt.set(i,context.now);this.ignited=true;
    context.emit({type:'release.ignited',sourceId:sourceFire?.state.id??this.state.id,targetId:this.state.id,payload:{releaseId:this.state.id,cellIndex:i,mechanism:'floor-flame-front',origin:point}});
   }
   nextBurning.add(i);
   // 1/s consumption time scale; actual heat is limited by available local fuel.
   const burned=this.masses[i]*(1-Math.exp(-dt));this.masses[i]-=burned;this.burnedKg+=burned;
   const mw=burned*FLOOR_GAS.heatOfCombustion/dt;
   for(const target of twins){if(target.state.integrity<=0||!['tank','pipe','wall','reactor','pump','compressor','cooling','control','emergency'].includes(target.state.kind))continue;
    const end={...target.state.position,y:1};if(blockedByWall(point,end,twins,target.state.id))continue;
    const r=Math.max(1,Math.hypot(point.x-end.x,point.z-end.z));const flux=.3*mw*1000/(4*Math.PI*r*r);
    if(flux>.1)heatByTarget.set(target.state.id,(heatByTarget.get(target.state.id)??0)+flux);
   }
  }
  for(const [targetId,flux] of heatByTarget)context.emit({type:'thermal.exposure',sourceId:this.state.id,targetId,payload:{heatFluxKwM2:flux,durationS:dt,contributingCells:nextBurning.size}});
  this.burning=nextBurning;this.publish();
 }
 private publish(){this.massKg=this.masses.reduce((a,b)=>a+b,0);Object.assign(this.state.metadata,{massKg:this.massKg,receivedKg:this.receivedKg,dispersedKg:this.dispersedKg,burnedKg:this.burnedKg,ignited:this.ignited,burningCells:this.burning.size});this.state.gasCells=[];for(let i=0;i<this.masses.length;i++)if(this.masses[i]>1e-7){const p=this.point(i);this.state.gasCells.push({index:i,x:p.x,z:p.z,massKg:this.masses[i],volumeFraction:this.fraction(i),burning:this.burning.has(i)})}}
 override clone():Twin{const copy=new FloorGasTwin(this.state.id,this.state.position,this.sourceId,this.rateKgS);copy.suppressedUntil=this.suppressedUntil;copy.masses=this.masses.slice();copy.ignitedAt=new Map(this.ignitedAt);copy.burning=new Set(this.burning);for(const key of ['age','ignited','massKg','receivedKg','dispersedKg','burnedKg'] as const)Object.assign(copy,{[key]:this[key]});Object.assign(copy.state,structuredClone(this.state));return copy}
}
