import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFacility } from '../src/facility/generator.js';
import { FacilityTwinGraph } from '../src/facility/graph.js';
import { SimulationRuntime } from '../src/core/runtime.js';
import { injectFailures } from '../src/core/failures.js';
import { FireTwin } from '../src/twins/hazards.js';
import { TankTwin } from '../src/twins/process.js';
import { compareIntervention, exportIncident } from '../src/facility/report.js';

test('generated facility has 60 tanks and every requested asset category linked to a twin', () => {
 const a=generateFacility(), b=generateFacility();
 assert.equal(a.twins.filter(t=>t.state.kind==='tank').length,60);
 for(const kind of ['reactor','pump','compressor','cooling','control','road','emergency'])assert.ok(a.twins.some(t=>t.state.kind===kind));
 assert.deepEqual(a.graph.snapshot(),b.graph.snapshot());
 assert.doesNotThrow(()=>a.graph.validate(a.twins.map(t=>t.state)));
 assert.equal(a.graph.providers('R-001','cooling')[0],'CL-001');
 assert.throws(()=>generateFacility({tanks:NaN}));
});
test('graph rejects dangling and duplicate edges and clones without shared mutation', () => {
 const {graph}=generateFacility();
 assert.throws(()=>graph.connect('missing','R-001','cooling'));
 assert.throws(()=>graph.connect('CL-001','R-001','cooling'));
 const clone=graph.clone();clone.connect('CL-002','R-001','cooling');
 assert.equal(graph.providers('R-001','cooling').length,1);
 assert.equal(clone.providers('R-001','cooling').length,2);
 const empty=new FacilityTwinGraph();assert.throws(()=>empty.validate(generateFacility().twins.map(t=>t.state)));
});
test('loss of a cooling twin changes connected reactor behavior and can trigger failure', () => {
 const {twins,graph}=generateFacility(),runtime=new SimulationRuntime(twins,graph);
 injectFailures(runtime,[{twinId:'CL-001',mode:'outage',severity:1}]);
 runtime.run(16,.1);
 assert.equal(runtime.get('R-001')!.state.integrity,0);
 assert.ok(runtime.get('R-002')!.state.integrity>0);
 assert.ok(runtime.snapshot().events.some(e=>e.type==='asset.failed'&&e.sourceId==='R-001'));
});
test('thermal dose integrates elapsed seconds, independent of the tick count', () => {
 const run=(dt:number)=>{const tank=new TankTwin('t',{x:10,y:0,z:0});const rt=new SimulationRuntime([tank,new FireTwin('f',{x:0,y:0,z:0},1)]);rt.run(2,dt);return tank;};
 const a=run(.05),b=run(.25);
 assert.ok(Math.abs(a.heatDose-b.heatDose)<1e-9);
 assert.ok(Math.abs(a.state.temperatureK-b.state.temperatureK)<1e-9);
 assert.ok(Math.abs(a.heatDose-2.4)<1e-9);
});
test('counterfactuals leave live state unchanged and incident exports include provenance', () => {
 const {twins,graph}=generateFacility(),runtime=new SimulationRuntime(twins,graph);
 const before=runtime.snapshot();
 const comparison=compareIntervention(runtime,branch=>injectFailures(branch,[{twinId:'CL-001',mode:'outage',severity:1}]),16);
 assert.ok(comparison.candidate.failedAssets>comparison.baseline.failedAssets);
 assert.deepEqual(runtime.snapshot(),before);
 const report=exportIncident(runtime);assert.equal(report.schemaVersion,1);assert.ok(report.snapshot.graph);
});
