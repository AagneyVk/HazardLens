import type { FacilityTwinGraph } from '../facility/graph.js';
import type { SimEvent, Twin, TwinContext, WorldSnapshot, Vec3 } from './types.js';
import { FireTwin, ReleaseTwin } from '../twins/hazards.js';
import { ExplosionTwin } from '../twins/indoor.js';
import {FloorGasTwin} from '../twins/floorGas.js';
import {applyResponse,type ResponseMode} from './responses.js';

export interface SnapshotOptions { eventLimit?: number; includeGraph?: boolean; significantOnly?: boolean; }
export class SimulationRuntime {
  private readonly registry = new Map<string, Twin>();
  private readonly queue: SimEvent[] = [];
  private readonly history: SimEvent[] = [];
  private sequence = 0;
  private processedEvents = 0;
  time = 0;
  readonly historyLimit = 20000;

  constructor(twins: Twin[] = [], readonly graph?: FacilityTwinGraph) { for (const twin of twins) this.add(twin); }
  add(twin: Twin): void {
    if (this.registry.has(twin.state.id)) throw new Error(`Duplicate twin ${twin.state.id}`);
    this.registry.set(twin.state.id, twin);
  }
  get(id: string): Twin | undefined { return this.registry.get(id); }
  emit<T extends Record<string, unknown>>(event: Omit<SimEvent<T>, 'id' | 'time'>): void {
    this.queue.push(structuredClone({ ...event, id: `evt-${++this.sequence}`, time: this.time }));
  }
  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(this.time + dt)) throw new Error('dt must be finite and positive');
    this.drainEvents();
    const context = this.context();
    for (const twin of [...this.registry.values()]) if (twin.state.active){
      const cooling=Math.max(0,Number(twin.state.metadata.coolingRemainingS??0));
      if(cooling>0){twin.state.temperatureK=Math.max(303,twin.state.temperatureK-5*Math.min(dt,cooling));twin.state.metadata.coolingRemainingS=Math.max(0,cooling-dt)}
      twin.tick(dt, context);
    }
    this.time += dt;
    this.drainEvents();
  }
  run(duration: number, dt = .25): void {
    if (!Number.isFinite(duration) || duration < 0 || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(this.time + duration)) throw new Error('Invalid simulation duration or timestep');
    const end = this.time + duration;
    while (this.time + 1e-9 < end) this.step(Math.min(dt, end - this.time));
  }
  snapshot(options: SnapshotOptions = {}): WorldSnapshot {
    const eventLimit = options.eventLimit ?? this.historyLimit;
    if (!Number.isInteger(eventLimit) || eventLimit < 0) throw new Error('Invalid event limit');
    const selectedHistory = options.significantOnly ? this.history.filter(e => e.type !== 'thermal.exposure') : this.history;
    const events = eventLimit === 0 ? [] : selectedHistory.slice(-eventLimit);
    return { time: this.time, twins: [...this.registry.values()].map(t => structuredClone(t.state)),
      events: structuredClone(events), totalEvents: this.processedEvents,
      historyTruncated: this.processedEvents > events.length,
      ...(this.graph && options.includeGraph !== false ? { graph: this.graph.snapshot() } : {}) };
  }
  clone(): SimulationRuntime {
    const copy = new SimulationRuntime([...this.registry.values()].map(t => {
      const twin = t.clone();
      if (t.metadata && twin.metadata) Object.assign(twin.metadata, structuredClone(t.metadata));
      return twin;
    }), this.graph?.clone());
    copy.time = this.time; copy.sequence = this.sequence; copy.processedEvents = this.processedEvents;
    copy.history.push(...structuredClone(this.history)); copy.queue.push(...structuredClone(this.queue));
    return copy;
  }
  private context(causedBy?:string): TwinContext {
    return { graph: this.graph, now: this.time, get: id => this.registry.get(id),
      twins: () => [...this.registry.values()], emit: event => this.emit({...event,causedBy:event.causedBy??causedBy}) };
  }
  private materialize(event: SimEvent): void {
    if(event.type==='response.command'){applyResponse(this,event.targetId??'',event.payload.mode as ResponseMode,event.id);return}
    if(event.type==='release.ignited'){
      const release=this.get(String(event.payload.releaseId));
      if(!(release instanceof ReleaseTwin))return;
      if(release instanceof FloorGasTwin){if(!release.state.metadata.alarmSent){release.state.metadata.alarmSent=true;this.emit({type:'evacuation.command',sourceId:release.state.id,causedBy:event.id,payload:{}})}return}
      // Ignition alone is not evidence of destructive overpressure.
      this.emit({type:'fire.created',sourceId:release.state.id,causedBy:event.id,payload:{origin:{...release.state.position},intensityMw:Math.max(.5,release.rateKgS*8)}});
      return;
    }
    if (event.type === 'fault.asset' && ['fire', 'explosion'].includes(String(event.payload.mode))) {
      const target = this.get(event.targetId ?? '');
      const severity = Number(event.payload.severity);
      if (!target || !Number.isFinite(severity) || severity <= 0 || severity > 1) return;
      if (event.payload.mode === 'fire') this.emit({ type: 'fire.created', sourceId: target.state.id, causedBy: event.id, payload: { origin: { ...target.state.position }, intensityMw: 1 + 8 * severity } });
      else if ((target.withdrawFuel?.(2 * severity) ?? 0) > 0) this.emit({ type: 'explosion.created', sourceId: target.state.id, causedBy: event.id, payload: { origin: { ...target.state.position }, severity } });
      return;
    }
    if (event.type === 'explosion.created') {
      const origin = event.payload.origin as Vec3, severity = Number(event.payload.severity);
      if (!origin || ![origin.x, origin.y, origin.z, severity].every(Number.isFinite) || severity <= 0 || severity > 1) throw new Error('Invalid blast');
      this.add(new ExplosionTwin(`blast-${event.id}`, origin, severity)); return;
    }
    if (event.type !== 'release.created' && event.type !== 'fire.created') return;
    const origin = event.payload.origin as Vec3 | undefined;
    if (!origin || ![origin.x, origin.y, origin.z].every(Number.isFinite)) throw new Error('Hazard requires a finite origin');
    const id = `${event.type === 'release.created' ? 'release' : 'fire'}-${event.id}`;
    if (event.type === 'release.created') {
      const rate = Number(event.payload.rateKgS);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid release rate');
      // A source owns one evolving release; repeat faults update its rate instead of multiplying supply.
      const existing = [...this.registry.values()].find(t => t instanceof ReleaseTwin && t.sourceId === event.sourceId && t.state.active) as ReleaseTwin | undefined;
      if (existing) { existing.rateKgS = rate; return; }
      this.add(this.get(event.sourceId)?.state.metadata.indoor===true?new FloorGasTwin(id,origin,event.sourceId,rate):new ReleaseTwin(id, origin, event.sourceId, rate));
    } else {
      const intensity = Number(event.payload.intensityMw);
      if (!Number.isFinite(intensity) || intensity <= 0) throw new Error('Invalid fire intensity');
      const existing=[...this.registry.values()].find(t=>t instanceof FireTwin&&t.state.active&&t.fuelSourceId===event.sourceId);
      if(existing)return;
      this.add(new FireTwin(id, origin, intensity, event.sourceId));
    }
  }
  private drainEvents(): void {
    let processed = 0;
    while (this.queue.length) {
      if (++processed > 10000) throw new Error('Event cascade exceeded safety limit');
      const event = this.queue.shift()!;
      this.history.push(event); this.processedEvents++;
      this.materialize(event);
      const context = this.context(event.id);
      if (event.targetId) this.registry.get(event.targetId)?.onEvent(event, context);
      else for (const twin of [...this.registry.values()]) twin.onEvent(event, context);
    }
    if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit);
  }
}
