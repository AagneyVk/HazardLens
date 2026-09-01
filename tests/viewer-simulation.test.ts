import test from 'node:test';
import assert from 'node:assert/strict';
import { ViewerSimulation } from '../viewer/src/viewer/sim.js';

test('viewer supports repeated batches on arbitrary assets, pause, and reset', () => {
  const sim = new ViewerSimulation();
  const initial = sim.snapshot();
  sim.inject(['P-001', 'P-002', 'P-120'].map(twinId => ({ twinId, mode: 'rupture', severity: .2 })));
  sim.update(.05);
  assert.equal(sim.snapshot().twins.filter(t => t.kind === 'release').length, 3);
  sim.inject([{ twinId: 'T-048', mode: 'rupture', severity: .8 }]);
  sim.update(.05);
  assert.equal(sim.snapshot().twins.find(t => t.id === 'T-048')?.integrity, 0);
  assert.equal(sim.snapshot().twins.filter(t => t.kind === 'release').length, 4);
  const time = sim.snapshot().time;
  assert.equal(sim.toggleRunning(), false);
  sim.update(.1);
  assert.equal(sim.snapshot().time, time);
  sim.reset();
  assert.equal(sim.running, false);
  assert.deepEqual(sim.snapshot(), initial);
});

test('invalid viewer injections do not start the simulation', () => {
  const sim = new ViewerSimulation();
  assert.throws(() => sim.inject([{ twinId: 'missing', mode: 'rupture', severity: 1 }]));
  assert.equal(sim.running, false);
  assert.equal(sim.snapshot().events.length, 0);
});
