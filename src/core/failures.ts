import type { TwinKind } from './types.js';
import type { SimulationRuntime } from './runtime.js';

export type FailureMode = 'rupture' | 'overheat' | 'structural_damage' | 'ignition';
export interface FailureRequest { twinId: string; mode: FailureMode; severity: number; }

export const failureModes: Partial<Record<TwinKind, readonly FailureMode[]>> = {
  pipe: ['rupture', 'overheat'],
  tank: ['rupture', 'overheat'],
  wall: ['structural_damage', 'overheat'],
  ignition: ['ignition'],
};

/** Validate the whole batch before queuing any operator commands. */
export function injectFailures(runtime: SimulationRuntime, requests: readonly FailureRequest[]): void {
  for (const request of requests) {
    const twin = runtime.get(request.twinId);
    if (!twin) throw new Error(`Unknown twin: ${request.twinId}`);
    if (!twin.state.active || twin.state.integrity <= 0) throw new Error(`Twin is unavailable: ${request.twinId}`);
    if (!failureModes[twin.state.kind]?.includes(request.mode)) throw new Error(`Unsupported failure ${request.mode} for ${twin.state.kind}`);
    if (!Number.isFinite(request.severity) || request.severity <= 0 || request.severity > 1) throw new Error('Severity must be greater than 0 and at most 1');
  }
  for (const request of requests) runtime.emit({
    type: 'fault.asset', sourceId: 'operator', targetId: request.twinId,
    payload: { mode: request.mode, severity: request.severity },
  });
}
