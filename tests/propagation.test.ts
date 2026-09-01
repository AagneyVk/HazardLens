import test from 'node:test';
import assert from 'node:assert/strict';
import {SimulationRuntime} from '../src/core/runtime.js';
import {PipeTwin,TankTwin} from '../src/twins/process.js';
import {FireTwin,ReleaseTwin} from '../src/twins/hazards.js';
import {ExplosionTwin} from '../src/twins/indoor.js';

test('a nearby fire ignites accumulated gas once, conserving flash fuel',()=>{
 const pipe=new PipeTwin('pipe',{x:0,y:0,z:0});pipe.leakRateKgS=2;
 const release=new ReleaseTwin('gas',pipe.state.position,'pipe',2);
 const runtime=new SimulationRuntime([pipe,release]);runtime.run(2,.05);
 runtime.add(new FireTwin('spark',{x:1,y:0,z:0},1));runtime.run(.2,.05);
 const events=runtime.snapshot().events;
 assert.equal(events.filter(e=>e.type==='release.ignited').length,1);
 const ignition=events.find(e=>e.type==='release.ignited')!;assert.equal(ignition.sourceId,'spark');assert.equal(ignition.targetId,'gas');
 assert.ok(events.some(e=>e.type==='explosion.created'&&e.causedBy===ignition.id));
 assert.ok(events.some(e=>e.type==='fire.created'&&e.causedBy===ignition.id));
 assert.ok(Math.abs(release.receivedKg-release.massKg-release.burnedKg-release.dispersedKg)<1e-8);
 const clone=runtime.clone();runtime.run(.5,.05);clone.run(.5,.05);assert.deepEqual(clone.snapshot(),runtime.snapshot());
});
test('blast ruptures nearby containment, leaves distant assets intact and ignites resulting leak',()=>{
 const tank=new TankTwin('near',{x:2,y:0,z:0}),far=new TankTwin('far',{x:100,y:0,z:0});
 const runtime=new SimulationRuntime([tank,far,new ExplosionTwin('blast',{x:0,y:0,z:0},1)]);runtime.run(.3,.05);
 assert.equal(tank.state.integrity,0);assert.equal(far.state.integrity,1);
 assert.ok(runtime.snapshot().twins.some(t=>t.kind==='release'));
 assert.ok(runtime.snapshot().twins.some(t=>t.kind==='fire'));
 const fault=runtime.snapshot().events.find(e=>e.type==='fault.asset'&&e.targetId==='near')!;
 assert.ok(runtime.snapshot().events.some(e=>e.type==='asset.failed'&&e.causedBy===fault.id));
});
test('distant fire does not ignite gas and isolated empty pipes do not invent fuel',()=>{
 const pipe=new PipeTwin('pipe',{x:0,y:0,z:0});pipe.isolated=true;
 const gas=new ReleaseTwin('gas',pipe.state.position,'pipe',2);
 const runtime=new SimulationRuntime([pipe,gas,new FireTwin('fire',{x:100,y:0,z:0},1)]);runtime.run(1,.05);
 assert.equal(gas.ignited,false);assert.equal(gas.receivedKg,0);assert.equal(runtime.snapshot().events.filter(e=>e.type==='release.ignited').length,0);
});
