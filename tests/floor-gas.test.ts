import test from 'node:test';import assert from 'node:assert/strict';
import {FloorGasTwin,FLOOR_GAS} from '../src/twins/floorGas.js';
import {FireTwin} from '../src/twins/hazards.js';
import {PipeTwin,WallTwin,TankTwin} from '../src/twins/process.js';
import {SimulationRuntime} from '../src/core/runtime.js';
const seed=(gas:FloorGasTwin,x:number,z:number,mass:number)=>{gas.masses[gas.index({x,y:0,z})]+=mass;gas.receivedKg+=mass};
test('finite-volume transport conserves mass, stays positive and agrees across timesteps',()=>{
 const run=(dt:number)=>{const gas=new FloorGasTwin('gas',{x:0,y:0,z:0},'absent',0);seed(gas,0,0,4);const runtime=new SimulationRuntime([gas]);runtime.run(2,dt);assert.ok(gas.masses.every(m=>m>=-1e-12));assert.ok(Math.abs(gas.receivedKg-gas.massKg-gas.dispersedKg-gas.burnedKg)<1e-9);return gas};
 const a=run(.05),b=run(.025);assert.ok(Math.abs(a.massKg-4*Math.exp(-FLOOR_GAS.ventilation*2))<1e-9);
 assert.ok(a.masses.reduce((sum,m,i)=>sum+Math.abs(m-b.masses[i]),0)<.06);
 const large=run(2);assert.ok(large.masses.every(m=>m>=0));
});
test('a wall blocks transport and a failed bay permits transport',()=>{
 const gas=new FloorGasTwin('gas',{x:-2,y:0,z:0},'absent',0);seed(gas,-2,0,2);
 const wall=new WallTwin('wall',{x:0,y:0,z:0});Object.assign(wall.state.metadata,{widthM:.4,heightM:4,depthM:40});
 const runtime=new SimulationRuntime([gas,wall]);runtime.run(2,.05);
 const across=()=>gas.masses.reduce((sum,m,i)=>sum+(gas.point(i).x>0?m:0),0);
 assert.equal(across(),0);wall.state.integrity=0;runtime.run(2,.05);assert.ok(across()>.01);
});
test('local ignition follows fuel cells, burns mass and does not create an explosion',()=>{
 const gas=new FloorGasTwin('gas',{x:-4,y:0,z:0},'absent',0);for(const x of [-4,-2,0,2,4])for(const z of [-2,0,2])seed(gas,x,z,.25);
 const runtime=new SimulationRuntime([gas,new FireTwin('flame',{x:-4,y:0,z:0},1)]);runtime.run(2,.05);
 assert.ok(gas.burnedKg>0);assert.ok(runtime.snapshot().events.some(e=>e.type==='release.ignited'&&Number((e.payload.origin as {x:number}).x)>=0));
 assert.equal(runtime.snapshot().events.some(e=>e.type==='explosion.created'),false);
 assert.ok(Math.abs(gas.receivedKg-gas.massKg-gas.dispersedKg-gas.burnedKg)<1e-8);
 const clone=runtime.clone();runtime.run(.5,.05);clone.run(.5,.05);assert.deepEqual(runtime.snapshot(),clone.snapshot());
});
test('rich or lean gas does not ignite and isolated feed supplies no new fuel',()=>{
 for(const mass of [.001,10]){const pipe=new PipeTwin('pipe',{x:0,y:0,z:0});pipe.isolated=true;pipe.leakRateKgS=2;
 const gas=new FloorGasTwin('gas',pipe.state.position,'pipe',2);seed(gas,0,0,mass);const runtime=new SimulationRuntime([pipe,gas,new FireTwin('flame',pipe.state.position,1)]);runtime.step(.001);
 assert.equal(gas.receivedKg,mass);assert.equal(gas.burnedKg,0)}
});
test('indoor steel shell heating matches heat capacity and failure releases fuel without automatic ignition',()=>{
 const tank=new TankTwin('tank',{x:0,y:0,z:0});tank.state.metadata.indoor=true;const runtime=new SimulationRuntime([tank]);
 runtime.emit({type:'thermal.exposure',sourceId:'heat',targetId:'tank',payload:{heatFluxKwM2:10,durationS:1}});runtime.step(.000001);
 assert.ok(Math.abs(tank.state.temperatureK-(303+7/23.55))<1e-6);
 runtime.emit({type:'thermal.exposure',sourceId:'heat',targetId:'tank',payload:{heatFluxKwM2:12000,durationS:1}});runtime.step(.05);
 assert.equal(tank.state.integrity,0);assert.ok(runtime.snapshot().twins.some(t=>t.kind==='release'&&t.gasCells));assert.equal(runtime.snapshot().twins.some(t=>t.kind==='fire'),false);
});
