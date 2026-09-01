import type { SimEvent, Twin, TwinContext, TwinState } from "../core/types.js";
import { BaseTwin } from "./base.js";

function applyOperatorFault(twin: BaseTwin, event: SimEvent, context: TwinContext): boolean {
 if(event.type!=="fault.asset"||event.targetId!==twin.state.id)return false;
 const severity=Number(event.payload.severity);
 if(!Number.isFinite(severity)||severity<=0||severity>1)return true;
 if(event.payload.mode==="overheat")context.emit({type:"thermal.exposure",sourceId:twin.state.id,targetId:twin.state.id,causedBy:event.id,payload:{heatFluxKwM2:1000*severity}});
 return true;
}

const cloneState=(s:TwinState):TwinState=>structuredClone(s);

const physical=(material:string, properties:Record<string,string|number|boolean>)=>({
  physicalProfile:{material, properties},
  relationships:[],
  history:[]
});

export class WeatherTwin extends BaseTwin {
 constructor(id:string,public windX=2,public windZ=0){super({id,kind:"weather",position:{x:0,y:0,z:0},fidelity:1,active:true,integrity:1,temperatureK:303,metadata:{}}, physical("atmosphere",{windX,windZ}));}
 onEvent():void{} tick():void{}
 clone():Twin{const c=new WeatherTwin(this.state.id,this.windX,this.windZ);Object.assign(c.state,cloneState(this.state));return c}
}

export class PipeTwin extends BaseTwin {
 leakRateKgS=0; failed=false; isolated=false; inventoryKg=1000; withdrawnKg=0;
 constructor(id:string,position:TwinState["position"],public chemical="propane"){
  super({id,kind:"pipe",position,fidelity:1,active:true,integrity:1,temperatureK:303,metadata:{chemical}},physical("steel",{chemical}));
 }
 onEvent(event:SimEvent,context:TwinContext):void{
  this.record(event,`processed ${event.type}`);
  if(applyOperatorFault(this,event,context)){
   if(event.payload.mode==='structural_damage'){this.state.integrity=Math.max(0,this.state.integrity-Number(event.payload.severity));if(this.state.integrity<=.5){this.failed=true;this.release(context,2.5*Number(event.payload.severity),event.id)}}
   if(event.payload.mode==="rupture"&&this.state.active)this.release(context,2.5*Number(event.payload.severity),event.id);
   return;
  }
  if(event.type==="fault.pipe_leak"&&event.targetId===this.state.id)this.release(context,Number(event.payload.rateKgS??.3));
  if(event.type==="thermal.exposure"&&event.targetId===this.state.id){const flux=Number(event.payload.heatFluxKwM2??0)*Number(event.payload.durationS??1);this.state.temperatureK+=flux*.025;this.state.integrity=Math.max(0,this.state.integrity-flux*.00045);if(!this.failed&&(this.state.integrity<=.55||this.state.temperatureK>=390)){this.failed=true;context.emit({type:"asset.failed",sourceId:this.state.id,payload:{kind:"pipe",mode:"thermal-rupture"}});this.release(context,Math.max(.8,this.leakRateKgS*2.5));}}
  if(event.type==="valve.command"&&event.payload.pipeId===this.state.id){this.isolated=event.payload.closed!==false;if(this.isolated)this.leakRateKgS=0;this.state.metadata.isolated=this.isolated;}
 }
 private release(context:TwinContext,rate:number,causedBy?:string){if(!Number.isFinite(rate)||rate<=0||this.isolated)return;this.leakRateKgS=Math.max(this.leakRateKgS,rate);this.state.integrity=Math.max(0,this.state.integrity-.15);context.emit({type:"release.created",sourceId:this.state.id,causedBy,payload:{chemical:this.chemical,rateKgS:this.leakRateKgS,origin:{...this.state.position}}});}
 withdrawFuel(requestedKg:number){if(this.isolated||this.state.metadata.operating===false||!Number.isFinite(requestedKg)||requestedKg<=0)return 0;const amount=Math.min(this.inventoryKg,requestedKg);this.inventoryKg-=amount;this.withdrawnKg+=amount;this.state.metadata.inventoryKg=this.inventoryKg;return amount}
 tick(_dt:number,context:TwinContext):void{const pumps=context.graph?.providers(this.state.id,"power")??[];this.state.metadata.operating=pumps.every(id=>context.get(id)?.state.metadata.operating===true)}
 clone():Twin{const c=new PipeTwin(this.state.id,{...this.state.position},this.chemical);c.leakRateKgS=this.leakRateKgS;c.failed=this.failed;c.isolated=this.isolated;c.inventoryKg=this.inventoryKg;c.withdrawnKg=this.withdrawnKg;Object.assign(c.state,cloneState(this.state));return c}
}

export class IgnitionSourceTwin extends BaseTwin {
 constructor(id:string,position:TwinState["position"],public enabled=true){super({id,kind:"ignition",position,fidelity:1,active:true,integrity:1,temperatureK:650,metadata:{enabled}},physical("ignition-source",{enabled}));}
 onEvent(event:SimEvent):void{if(event.type==="fault.asset"&&event.targetId===this.state.id&&event.payload.mode==="ignition"){this.enabled=true;this.state.metadata.enabled=true;this.record(event,"ignition source enabled");}} tick():void{}
 clone():Twin{const c=new IgnitionSourceTwin(this.state.id,{...this.state.position},this.enabled);Object.assign(c.state,cloneState(this.state));return c}
}

export class TankTwin extends BaseTwin {
 heatDose=0; failed=false; inventoryKg=5000; withdrawnKg=0;
 constructor(id:string,position:TwinState["position"],public chemical="propane"){
  super({id,kind:"tank",position,fidelity:1,active:true,integrity:1,temperatureK:303,metadata:{chemical,failureRisk:0}},physical("steel",{chemical,capacity:5000}));
 }
 onEvent(event:SimEvent,context:TwinContext):void{
 if(this.failed)return;
 if(this.state.metadata.indoor===true&&event.type==='thermal.exposure'&&event.targetId===this.state.id){
  const dose=Number(event.payload.heatFluxKwM2)*Number(event.payload.durationS??1);
  if(!Number.isFinite(dose)||dose<0)return;
  // 6 mm steel shell: rho * thickness * cp = 23.55 kJ/(m² K).
  const capacity=23.55;this.heatDose+=dose;this.state.temperatureK+=.7*dose/capacity;
  this.state.metadata.shellHeatCapacityKjM2K=capacity;this.state.metadata.absorbedHeatKjM2=.7*this.heatDose;
  this.state.metadata.failureRisk=Math.min(1,Math.max(0,(this.state.temperatureK-303)/(650-303)));
  this.state.metadata.damageState=this.state.temperatureK>500?'buckling':this.state.temperatureK>380?'heat-stressed':'normal';
  if(this.state.temperatureK>=650){this.failed=true;this.state.integrity=0;this.state.active=false;this.state.metadata.damageState='ruptured';
   context.emit({type:'asset.failed',sourceId:this.state.id,causedBy:event.id,payload:{kind:'tank',mode:'thermal-shell-failure',temperatureK:this.state.temperatureK}});
   context.emit({type:'release.created',sourceId:this.state.id,causedBy:event.id,payload:{chemical:this.chemical,rateKgS:2.4,origin:{...this.state.position}}});
  }return;
 }
 if(applyOperatorFault(this,event,context)){
  this.record(event,"operator disturbance");
  if(event.payload.mode==='structural_damage')this.state.integrity=Math.max(0,this.state.integrity-Number(event.payload.severity));
  if(event.payload.mode==="rupture"||(event.payload.mode==='structural_damage'&&this.state.integrity<=.4)){
   this.failed=true;this.state.active=false;this.state.integrity=0;
   context.emit({type:"asset.failed",sourceId:this.state.id,causedBy:event.id,payload:{kind:"tank",mode:"rupture"}});
   context.emit({type:"release.created",sourceId:this.state.id,causedBy:event.id,payload:{chemical:this.chemical,rateKgS:2.4*Number(event.payload.severity),origin:{...this.state.position}}});
  }
  return;
 }
 if(event.type!=="thermal.exposure"||event.targetId!==this.state.id||this.failed)return;this.record(event,"thermal exposure received");const flux=Number(event.payload.heatFluxKwM2??0)*Number(event.payload.durationS??1);this.heatDose+=flux;this.state.temperatureK+=flux*.018;this.state.integrity=Math.max(0,this.state.integrity-flux*.00008);this.state.metadata.failureRisk=Math.min(.99,this.heatDose/16000);if(this.heatDose>=900||this.state.temperatureK>=520||this.state.integrity<=.65){this.failed=true;this.state.active=false;this.state.integrity=0;context.emit({type:"asset.failed",sourceId:this.state.id,payload:{kind:"tank",mode:"thermal-rupture",heatDose:this.heatDose}});context.emit({type:"release.created",sourceId:this.state.id,payload:{chemical:this.chemical,rateKgS:2.4,origin:{...this.state.position}}});context.emit({type:"fire.created",sourceId:this.state.id,payload:{origin:{...this.state.position},intensityMw:7}})}}
 withdrawFuel(requestedKg:number){if(!Number.isFinite(requestedKg)||requestedKg<=0)return 0;const amount=Math.min(this.inventoryKg,requestedKg);this.inventoryKg-=amount;this.withdrawnKg+=amount;this.state.metadata.inventoryKg=this.inventoryKg;return amount}
 tick(dt:number):void{if(this.state.metadata.indoor!==true)return;const t=this.state.temperatureK;const loss=Math.max(0,.01*(t-303)+.7*5.670374419e-11*(t**4-303**4));this.state.temperatureK=Math.max(303,t-loss*dt/23.55)}
 clone():Twin{const c=new TankTwin(this.state.id,{...this.state.position},this.chemical);c.heatDose=this.heatDose;c.failed=this.failed;c.inventoryKg=this.inventoryKg;c.withdrawnKg=this.withdrawnKg;Object.assign(c.state,cloneState(this.state));return c}
}

export class WallTwin extends BaseTwin {
 constructor(id:string,position:TwinState["position"]){super({id,kind:"wall",position,fidelity:0,active:true,integrity:1,temperatureK:303,metadata:{damageState:"normal"}},physical("concrete",{}));}
 onEvent(event:SimEvent,context:TwinContext):void{
 if(applyOperatorFault(this,event,context)){
  this.record(event,"operator disturbance");
  if(event.payload.mode==="structural_damage"){
   const previous=this.state.integrity;
   this.state.integrity=Math.max(0,previous-Number(event.payload.severity));
   this.state.metadata.damageState=this.state.integrity===0?"destroyed":this.state.integrity<.55?"severe":"damaged";
   if(previous>0&&this.state.integrity===0)context.emit({type:"asset.failed",sourceId:this.state.id,causedBy:event.id,payload:{kind:"wall",mode:"structural_damage"}});
  }
  return;
 }
 if(event.type!=="thermal.exposure"||event.targetId!==this.state.id)return;this.record(event,"wall thermal exposure");const flux=Number(event.payload.heatFluxKwM2??0)*Number(event.payload.durationS??1);this.state.temperatureK+=flux*.01;this.state.integrity=Math.max(0,this.state.integrity-flux*.00004);this.state.metadata.damageState=this.state.integrity<.55?"severe":this.state.integrity<.8?"damaged":"normal"}
 tick():void{}
 clone():Twin{const c=new WallTwin(this.state.id,{...this.state.position});Object.assign(c.state,cloneState(this.state));return c}
}
