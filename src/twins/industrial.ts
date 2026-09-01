import type { SimEvent, Twin, TwinContext, TwinKind, Vec3 } from '../core/types.js';
import { BaseTwin } from './base.js';

export type IndustrialKind = Extract<TwinKind, 'reactor' | 'pump' | 'compressor' | 'cooling' | 'control' | 'emergency' | 'road'>;

/** Qualitative service/equipment model; constants are disclosed in the model registry. */
export class IndustrialTwin extends BaseTwin {
  constructor(id: string, kind: IndustrialKind, position: Vec3) {
    super({ id, kind, position: { ...position }, fidelity: 1, active: true, integrity: 1,
      temperatureK: kind === 'reactor' ? 340 : 303,
      metadata: { available: true, operating: true, status: 'operational', model: 'equipment-reference-v1' } },
    { physicalProfile: { material: kind === 'road' ? 'asphalt' : 'steel', properties: {} } });
  }
  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.targetId !== this.state.id || this.state.integrity === 0) return;
    if (event.type === 'fault.asset') {
      const severity = Number(event.payload.severity);
      if (!Number.isFinite(severity) || severity <= 0 || severity > 1) return;
      this.record(event, `operator ${event.payload.mode}`);
      if (event.payload.mode === 'overheat') this.state.temperatureK += 250 * severity;
      else if (event.payload.mode === 'outage') this.state.metadata.available = false;
      else this.state.integrity = Math.max(0, this.state.integrity - severity);
      this.checkFailure(context, event.id);
    }
    if (event.type === 'thermal.exposure') {
      const dose = Number(event.payload.heatFluxKwM2) * Number(event.payload.durationS ?? 1);
      if (!Number.isFinite(dose) || dose < 0) return;
      this.state.temperatureK += dose * .02;
      this.state.integrity = Math.max(0, this.state.integrity - dose * .0001);
      this.checkFailure(context, event.id);
    }
  }
  private checkFailure(context: TwinContext, causedBy?: string): void {
    if (this.state.temperatureK >= 520 || this.state.integrity <= 0) {
      this.state.integrity = 0;
      this.state.metadata.available = false;
      this.state.metadata.operating = false;
      this.state.metadata.status = 'failed';
      context.emit({ type: 'asset.failed', sourceId: this.state.id, causedBy, payload: { kind: this.state.kind, mode: 'equipment-failure' } });
      if (this.state.kind === 'reactor') context.emit({ type: 'release.created', sourceId: this.state.id, causedBy,
        payload: { origin: { ...this.state.position }, rateKgS: 1.5 } });
    }
  }
  tick(dt: number, context: TwinContext): void {
    if (this.state.integrity <= 0) return;
    const graph = context.graph;
    const providers = [...(graph?.providers(this.state.id, 'power') ?? []), ...(graph?.providers(this.state.id, 'control') ?? [])];
    const operating = this.state.metadata.available === true && providers.every(id => {
      const provider = context.get(id);
      return provider?.state.integrity !== 0 && provider?.state.metadata.available === true;
    });
    if (operating !== this.state.metadata.operating) context.emit({ type: 'service.changed', sourceId: this.state.id, payload: { operating } });
    this.state.metadata.operating = operating;
    this.state.metadata.status = operating ? 'operational' : 'offline';
    if (this.state.kind === 'reactor') {
      const cooling = graph?.providers(this.state.id, 'cooling') ?? [];
      const cooled = cooling.length > 0 && cooling.every(id => context.get(id)?.state.metadata.operating === true);
      this.state.metadata.coolingAvailable = cooled;
      // A disabled reactor retains residual heat; loss of cooling still matters.
      this.state.temperatureK = Math.max(303, this.state.temperatureK + (cooled ? -3 : operating ? 12 : 4) * dt);
      this.checkFailure(context);
    }
  }
  clone(): Twin {
    const copy = new IndustrialTwin(this.state.id, this.state.kind as IndustrialKind, this.state.position);
    Object.assign(copy.state, structuredClone(this.state));
    Object.assign(copy.metadata, structuredClone(this.metadata));
    return copy;
  }
}
