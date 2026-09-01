import type { SimEvent, Twin, TwinContext, Vec3 } from '../core/types.js';
import { BaseTwin } from './base.js';
import { IgnitionSourceTwin, WeatherTwin, PipeTwin } from './process.js';
import {blockedByWall} from './barriers.js';
const distance = (a:Vec3,b:Vec3) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

/** Well-mixed inventory reference model, not a concentration or toxic-dose model. */
export class ReleaseTwin extends BaseTwin {
 age=0;ignited=false;massKg=0;receivedKg=0;dispersedKg=0;burnedKg=0;
 constructor(id:string,position:Vec3,public sourceId:string,public rateKgS:number){
  super({id,kind:'release',position:{...position},fidelity:2,active:true,integrity:1,temperatureK:303,metadata:{radiusM:.5,ignited:false,massKg:0}},
   {physicalProfile:{material:'gas',properties:{rateKgS,model:'inventory-reference-v1'}}});
 }
 onEvent(_event:SimEvent,_context:TwinContext){}
 consumeFuel(requestedKg:number):number{
  if(!Number.isFinite(requestedKg)||requestedKg<=0)return 0;
  const amount=Math.min(this.massKg,requestedKg);this.massKg-=amount;this.burnedKg+=amount;this.syncMass();return amount;
 }
 private syncMass(){Object.assign(this.state.metadata,{massKg:this.massKg,receivedKg:this.receivedKg,dispersedKg:this.dispersedKg,burnedKg:this.burnedKg})}
 tick(dt:number,context:TwinContext){
  const source=context.get(this.sourceId);
  if(source instanceof PipeTwin)this.rateKgS=source.leakRateKgS;
  const supplied=source?.withdrawFuel?.(this.rateKgS*dt)??0;
  this.massKg+=supplied;this.receivedKg+=supplied;
  const dispersed=this.massKg*(1-Math.exp(-.02*dt));this.massKg-=dispersed;this.dispersedKg+=dispersed;this.syncMass();
  this.age+=dt;
  const weather=context.twins().find(t=>t instanceof WeatherTwin) as WeatherTwin|undefined;
  this.state.position.x+=(weather?.windX??0)*dt*.35;this.state.position.z+=(weather?.windZ??0)*dt*.35;
  // Radius is a visual envelope only; it is not an LFL/toxic threat-zone estimate.
  const radius=.5+Math.cbrt(Math.max(0,this.massKg))*2;this.state.metadata.radiusM=radius;
  if(this.massKg<1e-6&&supplied===0){this.state.active=false;return}
  if(!this.ignited&&this.massKg>1e-6)for(const twin of context.twins())if(twin.state.active&&
   ((twin instanceof IgnitionSourceTwin&&twin.enabled)||(twin.state.kind==='fire'&&Number(twin.state.metadata.intensityMw)>0)||(twin.state.kind==='explosion'&&Number(twin.state.metadata.age)<.6))&&distance(this.state.position,twin.state.position)<=radius){
   this.ignited=true;this.state.metadata.ignited=true;
   context.emit({type:'release.ignited',sourceId:twin.state.id,targetId:this.state.id,payload:{releaseId:this.state.id,fuelSourceId:this.sourceId,massKg:this.massKg}});
   break;
  }
 }
 clone():Twin{const copy=new ReleaseTwin(this.state.id,this.state.position,this.sourceId,this.rateKgS);for(const key of ['age','ignited','massKg','receivedKg','dispersedKg','burnedKg'] as const)Object.assign(copy,{[key]:this[key]});Object.assign(copy.state,structuredClone(this.state));return copy}
}

export class FireTwin extends BaseTwin {
 private standaloneFuelKg=200;burnedKg=0;
 constructor(id:string,position:Vec3,public intensityMw:number,public fuelSourceId?:string){
  super({id,kind:'fire',position:{...position},fidelity:3,active:true,integrity:1,temperatureK:1100,metadata:{intensityMw,fuelSourceId:fuelSourceId??''}},
   {physicalProfile:{material:'combustion',properties:{intensityMw,model:'radiation-reference-v2'}}});
 }
 onEvent(event:SimEvent){
  if(event.type!=='suppression.command')return;
  const strength=Number(event.payload.strength??.5);if(!Number.isFinite(strength)||strength<0)return;
  this.intensityMw=Math.max(0,this.intensityMw-strength);this.state.metadata.intensityMw=this.intensityMw;
  if(this.intensityMw===0)this.state.active=false;
 }
 tick(dt:number,context:TwinContext){
  const requested=this.intensityMw*dt/46,source=this.fuelSourceId?context.get(this.fuelSourceId):undefined;
  let consumed:number;
  if(source instanceof ReleaseTwin)consumed=source.consumeFuel(requested);
  else if(source?.withdrawFuel)consumed=source.withdrawFuel(requested);
  else{consumed=Math.min(this.standaloneFuelKg,requested);this.standaloneFuelKg-=consumed}
  this.burnedKg+=consumed;
  const effective=consumed*46/dt;this.state.metadata.intensityMw=effective;
  if(effective<=1e-9){this.state.active=false;return}
  for(const twin of context.twins()){
   if(twin.state.integrity<=0||!['tank','wall','pipe','reactor','pump','compressor','cooling','control','emergency'].includes(twin.state.kind))continue;
   const indoor=twin.state.metadata.indoor===true;
   if(indoor&&blockedByWall({...this.state.position,y:1},{...twin.state.position,y:1},context.twins(),twin.state.id))continue;
   const radius=Math.max(1,distance(this.state.position,twin.state.position)),flux=Math.min(80,effective*(indoor?.3*1000/(4*Math.PI):120)/(radius*radius));
   if(flux>1)context.emit({type:'thermal.exposure',sourceId:this.state.id,targetId:twin.state.id,payload:{heatFluxKwM2:flux,durationS:dt}});
  }
 }
 clone():Twin{const copy=new FireTwin(this.state.id,this.state.position,this.intensityMw,this.fuelSourceId);copy.standaloneFuelKg=this.standaloneFuelKg;copy.burnedKg=this.burnedKg;Object.assign(copy.state,structuredClone(this.state));return copy}
}
