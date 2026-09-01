import type { SimEvent, Twin, TwinContext, Vec3 } from '../core/types.js';
import { BaseTwin } from './base.js';

/** A one-shot qualitative blast impulse, deliberately not a blast-pressure solver. */
export class ExplosionTwin extends BaseTwin {
  age = 0;
  private emitted = false;
  constructor(id: string, position: Vec3, public severity: number) {
    super({ id, kind: 'explosion', position: { ...position }, fidelity: 2, active: true,
      integrity: 1, temperatureK: 1200, metadata: { age: 0, radiusM: 3 + severity * 12, severity } });
  }
  onEvent() {}
  tick(dt: number, context: TwinContext) {
    if (!this.emitted) {
      this.emitted = true;
      for (const twin of context.twins()) {
        if (twin.state.integrity<=0||!['tank','pipe','wall', 'reactor', 'pump', 'compressor', 'cooling','control','emergency'].includes(twin.state.kind)) continue;
        const distance = Math.hypot(twin.state.position.x - this.state.position.x, twin.state.position.z - this.state.position.z);
        const damage = Math.min(1, 2 * this.severity / (1 + (distance / 5) ** 2));
        if (distance > Number(this.state.metadata.radiusM) || damage < .1) continue;
        context.emit({ type: 'fault.asset', sourceId: this.state.id, targetId: twin.state.id,
          payload: { mode: ['tank','pipe'].includes(twin.state.kind)?'rupture':'structural_damage', severity: damage, mechanism:'blast' } });
      }
    }
    this.age += dt; this.state.metadata.age = this.age;
    if (this.age >= 3) this.state.active = false;
  }
  clone(): Twin { const copy = new ExplosionTwin(this.state.id, this.state.position, this.severity); copy.age = this.age; copy.emitted = this.emitted; Object.assign(copy.state, structuredClone(this.state)); return copy; }
}

export class ExitTwin extends BaseTwin {
  constructor(id: string, position: Vec3) {
    super({ id, kind: 'route', position: { ...position }, fidelity: 1, active: true,
      integrity: 1, temperatureK: 293, metadata: { label: 'Emergency exit', available: true } });
  }
  onEvent(event: SimEvent) {
    if (event.targetId === this.state.id && event.type === 'fault.asset') {
      this.state.integrity = Math.max(0, this.state.integrity - Number(event.payload.severity));
      this.state.metadata.available = this.state.integrity > 0;
    }
  }
  tick() {}
  clone(): Twin { const copy = new ExitTwin(this.state.id, this.state.position); Object.assign(copy.state, structuredClone(this.state)); return copy; }
}

/** Grid navigation avoids equipment and standing/collapsed partitions; no injury model. */
export function evacuationPath(start: Vec3, context: TwinContext): Vec3[] {
  const step = 2, cols = 25, rows = 17;
  const cell = (p: Vec3) => ({ x: Math.max(0, Math.min(cols - 1, Math.round((p.x + 24) / step))), z: Math.max(0, Math.min(rows - 1, Math.round((p.z + 16) / step))) });
  const point = (index: number): Vec3 => ({ x: index % cols * step - 24, y: 0, z: Math.floor(index / cols) * step - 16 });
  const index = (p: Vec3) => { const c = cell(p); return c.z * cols + c.x; };
  const targets = new Set(context.twins().filter(t => t.state.kind === 'route' && t.state.metadata.available === true).map(t => index(t.state.position)));
  if (!targets.size) return [];
  const obstacles = context.twins().filter(t => t.state.kind === 'wall' || ['tank', 'reactor', 'compressor'].includes(t.state.kind));
  const blocked = (p: Vec3) => obstacles.some(t => {
    const width = Number(t.state.metadata.widthM ?? 2.5), depth = Number(t.state.metadata.depthM ?? 2.5);
    return Math.abs(t.state.position.x - p.x) < width / 2 + .35 && Math.abs(t.state.position.z - p.z) < depth / 2 + .35;
  });
  const origin = index(start), queue = [origin], previous = new Map<number, number>([[origin, -1]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (targets.has(current)) {
      const path: Vec3[] = []; let cursor = current;
      while (cursor !== origin) { path.unshift(point(cursor)); cursor = previous.get(cursor)!; }
      return path.length ? path : [point(current)];
    }
    const x = current % cols, z = Math.floor(current / cols);
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nx = x + dx, nz = z + dz, next = nz * cols + nx;
      if (nx < 0 || nx >= cols || nz < 0 || nz >= rows || previous.has(next) || blocked(point(next))) continue;
      previous.set(next, current); queue.push(next);
    }
  }
  return [];
}

export class WorkerTwin extends BaseTwin {
  private path: Vec3[] = [];
  private replan = 0;
  constructor(id: string, position: Vec3) {
    super({ id, kind: 'worker', position: { ...position }, fidelity: 1, active: true,
      integrity: 1, temperatureK: 310, metadata: { status: 'working', heading: 0, speed: 0, label: `Operator ${id.slice(-2)}` } });
  }
  onEvent(event: SimEvent) {
    if (['fire.created', 'explosion.created', 'evacuation.command'].includes(event.type) && this.state.metadata.status !== 'safe') {
      this.state.metadata.status = 'evacuating'; this.replan = 0;
    }
  }
  tick(dt: number, context: TwinContext) {
    if (!['evacuating', 'blocked'].includes(String(this.state.metadata.status))) return;
    this.replan -= dt;
    if (this.replan <= 0) { this.path = evacuationPath(this.state.position, context); this.replan = 1; }
    if (!this.path.length) { this.state.metadata.status = 'blocked'; this.state.metadata.speed = 0; return; }
    this.state.metadata.status = 'evacuating';
    const target = this.path[0], dx = target.x - this.state.position.x, dz = target.z - this.state.position.z;
    const distance = Math.hypot(dx, dz), travel = Math.min(distance, dt * 1.8);
    if (distance > 0) { this.state.position.x += dx / distance * travel; this.state.position.z += dz / distance * travel; this.state.metadata.heading = Math.atan2(dx, dz); }
    this.state.metadata.speed = travel / dt;
    if (distance < .15) this.path.shift();
    if (context.twins().some(t => t.state.kind === 'route' && t.state.metadata.available === true && Math.hypot(t.state.position.x - this.state.position.x, t.state.position.z - this.state.position.z) < 1)) {
      this.state.metadata.status = 'safe'; this.state.metadata.speed = 0;
      context.emit({ type: 'worker.safe', sourceId: this.state.id, payload: {} });
    }
  }
  clone(): Twin { const copy = new WorkerTwin(this.state.id, this.state.position); copy.path = structuredClone(this.path); copy.replan = this.replan; Object.assign(copy.state, structuredClone(this.state)); return copy; }
}
