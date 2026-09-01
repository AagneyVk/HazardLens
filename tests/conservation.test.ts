import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationRuntime } from '../src/core/runtime.js';
import { injectFailures } from '../src/core/failures.js';
import { PipeTwin } from '../src/twins/process.js';
import { ReleaseTwin } from '../src/twins/hazards.js';
import { ViewerSimulation } from '../viewer/src/viewer/sim.js';

test('finite fuel is conserved across source, release and dispersal',()=>{
 const pipe=new PipeTwin('p',{x:0,y:0,z:0});pipe.inventoryKg=1;
 const runtime=new SimulationRuntime([pipe]);injectFailures(runtime,[{twinId:'p',mode:'rupture',severity:1}]);runtime.run(2,.05);
 const release=runtime.snapshot().twins.find(t=>t.kind==='release')!;const twin=runtime.get(release.id) as ReleaseTwin;
 assert.ok(Math.abs(pipe.inventoryKg+twin.receivedKg-1)<1e-10);
 assert.ok(Math.abs(twin.massKg+twin.dispersedKg+twin.burnedKg-twin.receivedKg)<1e-10);
 assert.equal(pipe.inventoryKg,0);
});
test('repeat ruptures do not multiply source streams; isolation stops new mass',()=>{
 const pipe=new PipeTwin('p',{x:0,y:0,z:0}),runtime=new SimulationRuntime([pipe]);
 injectFailures(runtime,[{twinId:'p',mode:'rupture',severity:.5},{twinId:'p',mode:'rupture',severity:1}]);runtime.run(.5,.05);
 assert.equal(runtime.snapshot().twins.filter(t=>t.kind==='release').length,1);
 runtime.emit({type:'valve.command',sourceId:'operator',payload:{pipeId:'p',closed:true}});const before=pipe.inventoryKg;runtime.run(1,.05);
 assert.equal(pipe.inventoryKg,before);
});
test('control outage disables emergency suppression through graph dependencies',()=>{
 const sim=new ViewerSimulation();sim.inject([{twinId:'CTRL-001',mode:'outage',severity:1}]);sim.update(.05);
 assert.throws(()=>sim.suppress(),/unavailable/);
});
