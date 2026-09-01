import type { FacilityTwinGraph, FacilityGraphSnapshot } from '../facility/graph.js';
export type TwinKind =
  | "tank" | "pipe" | "valve" | "ignition" | "wall" | "weather"
  | "reactor" | "pump" | "compressor" | "cooling" | "control" | "emergency" | "road"
  | "release" | "fire" | "explosion" | "suppression" | "worker" | "route";

export type Fidelity = 0 | 1 | 2 | 3 | 4;

export interface Vec3 { x: number; y: number; z: number; }

export interface PhysicalProfile {
  material?: string;
  dimensions?: Vec3;
  properties: Record<string, string | number | boolean>;
}

export interface TwinRelationship {
  targetId: string;
  type: "connected" | "nearby" | "depends_on" | "contained_by";
}

export interface TwinHistoryEntry {
  time: number;
  eventType: EventType;
  summary: string;
}

export interface BehaviorModel {
  update(state: TwinState, dt: number, context: TwinContext): void;
}

export interface TwinState {
  id:string;
  kind:TwinKind;
  position:Vec3;
  fidelity:Fidelity;
  active:boolean;
  integrity:number;
  temperatureK:number;
  metadata:Record<string,string|number|boolean>;
  gasCells?:Array<{index:number;x:number;z:number;massKg:number;volumeFraction:number;burning:boolean}>;
}

export interface TwinMetadata {
  physicalProfile?: PhysicalProfile;
  relationships?: TwinRelationship[];
  history?: TwinHistoryEntry[];
}

export type EventType = "response.command"|"response.applied"|"response.rejected"|"explosion.created"|"evacuation.command"|"worker.safe"|"service.changed"|"fault.asset"|"fault.pipe_leak"|"release.created"|"release.updated"|"release.ignited"|"fire.created"|"thermal.exposure"|"asset.failed"|"valve.command"|"suppression.command";

export interface SimEvent<T extends Record<string,unknown> = Record<string,unknown>> {
  id:string;
  type:EventType;
  time:number;
  sourceId:string;
  targetId?:string;
  payload:T;
  causedBy?:string;
}

export interface WorldSnapshot { time:number; twins:TwinState[]; events:SimEvent[]; totalEvents?:number; historyTruncated?:boolean; graph?:FacilityGraphSnapshot; }

export interface TwinContext {
  graph?:FacilityTwinGraph;
  now:number;
  get(id:string):Twin|undefined;
  twins():readonly Twin[];
  emit<T extends Record<string,unknown>>(event:Omit<SimEvent<T>,"id"|"time">):void;
}

export interface Twin {
  readonly state:TwinState;
  readonly metadata?:TwinMetadata;
  readonly behavior?:BehaviorModel;
  onEvent(event:SimEvent,context:TwinContext):void;
  tick(dt:number,context:TwinContext):void;
  clone():Twin;
  withdrawFuel?(requestedKg:number):number;
}
