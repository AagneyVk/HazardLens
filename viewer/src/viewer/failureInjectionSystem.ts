export type FailureMode =
  | "rupture"
  | "overpressure"
  | "overheat"
  | "ignition"
  | "structural_damage"
  | "manual_damage";

export interface FailureInjectionRequest {
  twinId: string;
  mode: FailureMode;
  severity: number;
  timestamp: number;
}

export interface FailurePropagationEvent {
  sourceTwinId: string;
  affectedTwinId: string;
  mechanism: string;
  severity: number;
}

/**
 * Free-form incident foundation.
 *
 * HazardLens does not depend on predefined scenarios. A user can inject
 * a disturbance into any twin, then the simulation engine decides the
 * resulting propagation through relationships and behavior models.
 */
export class FailureInjectionSystem {
  private readonly queue: FailureInjectionRequest[] = [];

  inject(request: FailureInjectionRequest): void {
    this.queue.push(request);
  }

  drain(): FailureInjectionRequest[] {
    const events = [...this.queue];
    this.queue.length = 0;
    return events;
  }
}
