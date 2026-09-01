import { injectFailures, type FailureRequest } from '../../../src/core/failures.js';
import { SimulationRuntime } from '../../../src/core/runtime.js';
import type { WorldSnapshot } from '../../../src/core/types.js';
import { generateIndoorFacility } from '../../../src/facility/indoor.js';
import { compareIntervention, exportIncident } from '../../../src/facility/report.js';

export class ViewerSimulation {
  runtime: SimulationRuntime;
  running = false;
  speed = 1;
  private accumulator = 0;
  constructor() { this.runtime = this.makeWorld(); }
  private makeWorld() {
    const { twins, graph } = generateIndoorFacility();
    return new SimulationRuntime(twins, graph);
  }
  reset() { this.runtime = this.makeWorld(); this.running = false; this.accumulator = 0; }
  inject(requests: readonly FailureRequest[]) { injectFailures(this.runtime, requests); if (requests.length) this.running = true; }
  breakPipe(id = 'P-017') { this.inject([{ twinId: id, mode: 'rupture', severity: .5 }]); }
  toggleRunning() { this.running = !this.running; return this.running; }
  evacuate() { this.runtime.emit({ type: 'evacuation.command', sourceId: 'operator', payload: {} }); this.running = true; }
  private applySuppression(runtime: SimulationRuntime): number {
    const snapshot = runtime.snapshot({ eventLimit: 0, includeGraph: false });
    const available = snapshot.twins.filter(t => t.kind === 'emergency' && t.integrity > 0 && t.metadata.available === true &&
      [...(runtime.graph?.providers(t.id, 'control') ?? []), ...(runtime.graph?.providers(t.id, 'emergency_route') ?? [])]
        .every(id => { const p = runtime.get(id)?.state; return p && p.integrity > 0 && p.metadata.available === true; }));
    if (!available.length) throw new Error('Emergency response is unavailable. Check control and access-road twins.');
    let count = 0;
    for (const fire of snapshot.twins.filter(t => t.active&&(t.kind === 'fire'||Number(t.metadata.burningCells)>0))) {
      runtime.emit({ type: 'suppression.command', sourceId: available[0].id, targetId: fire.id, payload: { strength: available.length * 2 } });
      count++;
    }
    return count;
  }
  suppress() { const count = this.applySuppression(this.runtime); this.running = true; return count; }
  isolatePipe(id = 'P-017') {
    if (this.runtime.get(id)?.state.kind !== 'pipe') throw new Error('Isolation requires a pipe twin');
    this.runtime.emit({ type: 'valve.command', sourceId: 'operator', payload: { pipeId: id, closed: true } });
    this.running = true;
  }
  forecast() { return compareIntervention(this.runtime, branch => this.applySuppression(branch), 10); }
  exportReport() { return exportIncident(this.runtime); }
  update(realDt: number) {
    if (!Number.isFinite(realDt) || realDt < 0) throw new Error('Invalid frame duration');
    if (!Number.isFinite(this.speed) || this.speed <= 0 || this.speed > 10) throw new Error('Simulation speed must be in (0, 10]');
    if (!this.running) return;
    this.accumulator += Math.min(realDt, .1) * this.speed;
    while (this.accumulator >= .05) { this.runtime.step(.05); this.accumulator -= .05; }
  }
  snapshot(): WorldSnapshot { return this.runtime.snapshot({ eventLimit: 80, includeGraph: false, significantOnly: true }); }
}
