import test from 'node:test';import assert from 'node:assert/strict';
import {SimulationRuntime} from '../src/core/runtime.js';
import {queueResponses} from '../src/core/responses.js';
import {FireTwin} from '../src/twins/hazards.js';
import {TankTwin,PipeTwin} from '../src/twins/process.js';
import {IndustrialTwin} from '../src/twins/industrial.js';
import {compareIntervention} from '../src/facility/report.js';
const pos={x:0,y:0,z:0};const station=()=>new IndustrialTwin('station','emergency',{x:15,y:0,z:0});
test('destroyed or missing equipment stops its attached fire without consuming phantom fuel',()=>{
 const tank=new TankTwin('tank',pos),fire=new FireTwin('fire',pos,3,'tank');const rt=new SimulationRuntime([tank,fire]);rt.step(.05);
 rt.emit({type:'fault.asset',sourceId:'operator',targetId:'tank',payload:{mode:'rupture',severity:1}});rt.step(.05);
 assert.equal(fire.state.active,false);assert.equal(fire.state.metadata.intensityMw,0);assert.equal(fire.state.metadata.stopReason,'source-destroyed');assert.ok(rt.snapshot().twins.some(t=>t.kind==='release'));
 const orphan=new FireTwin('orphan',pos,3,'missing');const r2=new SimulationRuntime([orphan]);r2.step(.05);assert.equal(orphan.state.active,false);assert.equal(orphan.burnedKg,0);
});
test('targeted isolation and suppression do not rebuild damaged pipe or affect unrelated fire',()=>{
 const pipe=new PipeTwin('pipe',pos);pipe.leakRateKgS=2;pipe.state.integrity=.4;
 const fire=new FireTwin('fire',pos,4,'pipe'),other=new FireTwin('other',{x:20,y:0,z:0},1);
 const rt=new SimulationRuntime([pipe,fire,other,station()]);queueResponses(rt,['pipe'],'isolate');queueResponses(rt,['pipe'],'suppress');rt.step(.05);
 assert.equal(pipe.isolated,true);assert.equal(pipe.state.integrity,.4);assert.equal(fire.state.active,false);assert.equal(other.state.active,true);
 assert.equal(rt.snapshot().events.filter(e=>e.type==='response.applied').length,2);
});
test('cooling limits heat and cloned preview does not mutate live incident',()=>{
 const tank=new TankTwin('tank',pos);tank.state.metadata.indoor=true;tank.state.temperatureK=500;
 const rt=new SimulationRuntime([tank,new FireTwin('fire',pos,8),station()]);const before=rt.snapshot();
 compareIntervention(rt,b=>queueResponses(b,['tank'],'cool'),2);assert.deepEqual(rt.snapshot(),before);
 const cooled=rt.clone();queueResponses(cooled,['tank'],'cool');rt.run(2,.05);cooled.run(2,.05);assert.ok(cooled.get('tank')!.state.temperatureK<tank.state.temperatureK);
});
test('restoration is gated and invalid batches enqueue nothing',()=>{
 const pump=new IndustrialTwin('pump','pump',pos);pump.state.metadata.available=false;
 const rt=new SimulationRuntime([pump]);assert.throws(()=>queueResponses(rt,['pump','missing'],'restore'));rt.step(.05);assert.equal(pump.state.metadata.available,false);
 queueResponses(rt,['pump'],'restore');rt.step(.05);assert.equal(pump.state.metadata.available,true);
 pump.state.integrity=0;assert.throws(()=>queueResponses(rt,['pump'],'restore'));
 pump.state.integrity=1;rt.add(new FireTwin('fire',pos,1));assert.throws(()=>queueResponses(rt,['pump'],'restore'));
 assert.throws(()=>queueResponses(rt,['pump'],'cool'));
});
