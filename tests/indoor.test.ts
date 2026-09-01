import test from 'node:test';
import assert from 'node:assert/strict';
import { generateIndoorFacility } from '../src/facility/indoor.js';
import { SimulationRuntime } from '../src/core/runtime.js';
import { injectFailures } from '../src/core/failures.js';

const world = () => { const { twins, graph } = generateIndoorFacility(); return new SimulationRuntime(twins, graph); };
test('indoor scene is a bounded equipment hall with people and exits', () => {
 const runtime=world(); const s=runtime.snapshot(); assert.ok(s.twins.length<60);
 assert.equal(s.twins.filter(t=>t.kind==='worker').length,8);assert.equal(s.twins.filter(t=>t.kind==='route').length,2);
 assert.doesNotThrow(()=>runtime.graph!.validate(s.twins));
});
test('igniting a vessel creates a visible fire and automatically starts evacuation', () => {
 const runtime=world();injectFailures(runtime,[{twinId:'T-001',mode:'fire',severity:.6}]);runtime.step(.05);
 assert.ok(runtime.snapshot().twins.some(t=>t.kind==='fire'&&t.active));
 assert.ok(runtime.snapshot().twins.filter(t=>t.kind==='worker').every(t=>t.metadata.status==='evacuating'));
});
test('blast impulse damages adjacent walls only once and expires', () => {
 const runtime=world();injectFailures(runtime,[{twinId:'T-001',mode:'explosion',severity:1}]);runtime.run(.1,.05);
 assert.equal(runtime.get('W-001')!.state.integrity,0);
 const damage=runtime.snapshot().events.filter(e=>e.sourceId.startsWith('blast-')&&e.type==='fault.asset').length;
 runtime.run(4,.05);assert.equal(runtime.snapshot().events.filter(e=>e.sourceId.startsWith('blast-')&&e.type==='fault.asset').length,damage);
 assert.ok(runtime.snapshot().twins.filter(t=>t.kind==='explosion').every(t=>!t.active));
});
test('workers reach available exits and report blocked when both exits are closed', () => {
 const runtime=world();runtime.emit({type:'evacuation.command',sourceId:'operator',payload:{}});runtime.run(40,.1);
 assert.equal(runtime.snapshot().twins.filter(t=>t.kind==='worker'&&t.metadata.status==='safe').length,8);
 const blocked=world();injectFailures(blocked,['EXIT-W','EXIT-E'].map(twinId=>({twinId,mode:'structural_damage',severity:1})));
 blocked.emit({type:'evacuation.command',sourceId:'operator',payload:{}});blocked.run(1,.1);
 assert.ok(blocked.snapshot().twins.filter(t=>t.kind==='worker').every(t=>t.metadata.status==='blocked'));
});
test('indoor dynamics remain deterministic when cloned mid-incident', () => {
 const runtime=world();injectFailures(runtime,[{twinId:'T-001',mode:'fire',severity:.4}]);runtime.run(.5,.05);
 const clone=runtime.clone();runtime.run(2,.05);clone.run(2,.05);assert.deepEqual(clone.snapshot(),runtime.snapshot());
});
