import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationRuntime } from '../src/core/runtime.js';
import { injectFailures } from '../src/core/failures.js';
import { PipeTwin, TankTwin, WallTwin, IgnitionSourceTwin } from '../src/twins/process.js';

const origin = { x: 0, y: 0, z: 0 };
test('simultaneous faults preserve every release and resulting fire', () => {
  const runtime = new SimulationRuntime([
    new PipeTwin('p1', origin), new PipeTwin('p2', origin), new IgnitionSourceTwin('spark', origin),
  ]);
  injectFailures(runtime, ['p1', 'p2'].map(twinId => ({ twinId, mode: 'rupture', severity: .5 })));
  runtime.step(.1);
  const snapshot = runtime.snapshot();
  assert.equal(snapshot.twins.filter(t => t.kind === 'release').length, 2);
  assert.equal(snapshot.twins.filter(t => t.kind === 'fire').length, 2);
  assert.equal(new Set(snapshot.twins.map(t => t.id)).size, snapshot.twins.length);
  const faults = snapshot.events.filter(e => e.type === 'fault.asset');
  assert.ok(snapshot.events.filter(e => e.type === 'release.created').every(e => faults.some(f => f.id === e.causedBy)));
});

test('invalid batches queue no partial failures', () => {
  const runtime = new SimulationRuntime([new PipeTwin('p', origin)]);
  for (const severity of [0, -1, 1.1, NaN, Infinity]) {
    assert.throws(() => injectFailures(runtime, [{ twinId: 'p', mode: 'rupture', severity }]));
  }
  assert.throws(() => injectFailures(runtime, [
    { twinId: 'p', mode: 'rupture', severity: 1 },
    { twinId: 'missing', mode: 'rupture', severity: 1 },
  ]));
  assert.throws(() => injectFailures(runtime, [{ twinId: 'p', mode: 'ignition', severity: 1 }]));
  runtime.step(.1);
  assert.equal(runtime.snapshot().events.length, 0);
});

test('tank rupture releases material without inventing ignition', () => {
  const tank = new TankTwin('tank', origin);
  const runtime = new SimulationRuntime([tank]);
  injectFailures(runtime, [{ twinId: 'tank', mode: 'rupture', severity: .5 }]);
  runtime.step(.1);
  assert.equal(tank.failed, true);
  assert.equal(runtime.snapshot().twins.filter(t => t.kind === 'release').length, 1);
  assert.equal(runtime.snapshot().twins.filter(t => t.kind === 'fire').length, 0);
  assert.throws(() => injectFailures(runtime, [{ twinId: 'tank', mode: 'rupture', severity: 1 }]));
});

test('structural damage and heat affect only requested assets', () => {
  const wall = new WallTwin('wall', origin), pipe = new PipeTwin('pipe', origin);
  const runtime = new SimulationRuntime([wall, pipe]);
  injectFailures(runtime, [{ twinId: 'wall', mode: 'structural_damage', severity: .4 }]);
  runtime.step(.1);
  assert.equal(wall.state.integrity, .6);
  assert.equal(pipe.state.integrity, 1);
  injectFailures(runtime, [{ twinId: 'pipe', mode: 'overheat', severity: .2 }]);
  runtime.step(.1);
  assert.ok(pipe.state.temperatureK > 303);
});

test('cloning a queued multi-fault world preserves deterministic outcomes', () => {
  const runtime = new SimulationRuntime([new PipeTwin('p1', origin), new PipeTwin('p2', origin)]);
  injectFailures(runtime, ['p1', 'p2'].map(twinId => ({ twinId, mode: 'rupture', severity: .5 })));
  const clone = runtime.clone();
  runtime.run(1); clone.run(1);
  assert.deepEqual(clone.snapshot(), runtime.snapshot());
});

test('runtime rejects non-finite time inputs without corrupting time', () => {
  const runtime = new SimulationRuntime();
  for (const dt of [0, -1, NaN, Infinity]) {
    assert.throws(() => runtime.step(dt));
    assert.throws(() => runtime.run(1, dt));
  }
  for (const duration of [-1, NaN, Infinity]) assert.throws(() => runtime.run(duration));
  assert.equal(runtime.time, 0);
});
