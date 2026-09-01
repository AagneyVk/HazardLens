import type { TwinState, Vec3 } from '../core/types.js';

export type ConnectionKind = 'process' | 'power' | 'cooling' | 'control' | 'emergency_route';
export interface FacilityEdge { from: string; to: string; kind: ConnectionKind; }
export interface FacilityNode { id: string; kind: TwinState['kind']; position: Vec3; zone: string; }
export interface FacilityGraphSnapshot { nodes: FacilityNode[]; edges: FacilityEdge[]; }

/** Directed facility topology. Physical adjacency and service dependency are distinct. */
export class FacilityTwinGraph {
  private readonly nodesById = new Map<string, FacilityNode>();
  private readonly links: FacilityEdge[] = [];
  private readonly incoming = new Map<string, FacilityEdge[]>();
  private readonly outgoing = new Map<string, FacilityEdge[]>();

  addNode(state: Pick<TwinState, 'id' | 'kind' | 'position'>, zone: string): void {
    if (this.nodesById.has(state.id)) throw new Error(`Duplicate graph node: ${state.id}`);
    if (![state.position.x, state.position.y, state.position.z].every(Number.isFinite)) throw new Error('Invalid node position');
    this.nodesById.set(state.id, { id: state.id, kind: state.kind, position: { ...state.position }, zone });
  }
  connect(from: string, to: string, kind: ConnectionKind): void {
    if (!this.nodesById.has(from) || !this.nodesById.has(to)) throw new Error(`Unknown graph endpoint: ${from} -> ${to}`);
    if (from === to) throw new Error('Self-connections are not allowed');
    if (this.links.some(e => e.from === from && e.to === to && e.kind === kind)) throw new Error('Duplicate connection');
    const edge = { from, to, kind };
    this.links.push(edge);
    this.incoming.set(to, [...(this.incoming.get(to) ?? []), edge]);
    this.outgoing.set(from, [...(this.outgoing.get(from) ?? []), edge]);
  }
  providers(id: string, kind?: ConnectionKind): string[] {
    return (this.incoming.get(id) ?? []).filter(e => !kind || e.kind === kind).map(e => e.from);
  }
  dependents(id: string, kind?: ConnectionKind): string[] {
    return (this.outgoing.get(id) ?? []).filter(e => !kind || e.kind === kind).map(e => e.to);
  }
  reachable(id: string, kind: ConnectionKind): string[] {
    const seen = new Set([id]), queue = [id];
    for (let i = 0; i < queue.length; i++) for (const next of this.dependents(queue[i], kind)) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    return queue.slice(1);
  }
  snapshot(): FacilityGraphSnapshot { return structuredClone({ nodes: [...this.nodesById.values()], edges: this.links }); }
  clone(): FacilityTwinGraph {
    const copy = new FacilityTwinGraph();
    for (const node of this.nodesById.values()) copy.addNode(node, node.zone);
    for (const edge of this.links) copy.connect(edge.from, edge.to, edge.kind);
    return copy;
  }
  validate(twins: readonly TwinState[]): void {
    const ids = new Set(twins.map(t => t.id));
    if (ids.size !== twins.length) throw new Error('Duplicate twin IDs');
    for (const id of this.nodesById.keys()) if (!ids.has(id)) throw new Error(`Graph node has no twin: ${id}`);
    for (const id of ids) if (!this.nodesById.has(id)) throw new Error(`Twin has no graph node: ${id}`);
  }
}
