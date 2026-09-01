import type { SimulationRuntime } from '../core/runtime.js';
import type { WorldSnapshot } from '../core/types.js';

export const MODEL_VERSION = 'hazardlens-reference-0.4.0-spatial';
export function summarize(snapshot: WorldSnapshot) {
  return {
    timeS: snapshot.time,
    assetCount: snapshot.twins.filter(t => !['fire', 'release', 'weather'].includes(t.kind)).length,
    failedAssets: snapshot.twins.filter(t => t.integrity === 0).length,
    offlineAssets: snapshot.twins.filter(t => t.metadata.operating === false).length,
    activeFires: snapshot.twins.filter(t => t.active&&(t.kind === 'fire'||Number(t.metadata.burningCells)>0)).length,
    burningFloorCells: snapshot.twins.reduce((sum,t)=>sum+Number(t.metadata.burningCells??0),0),
    activeReleases: snapshot.twins.filter(t => t.kind === 'release' && t.active).length,
    totalEvents: snapshot.totalEvents ?? snapshot.events.length,
  };
}
export function exportIncident(runtime: SimulationRuntime) {
  const snapshot = runtime.snapshot();
  return { schemaVersion: 1, modelVersion: MODEL_VERSION,
    purpose: 'qualitative training and software research; not operational hazard prediction',
    units: { position: 'm', time: 's', temperature: 'K', heatFlux: 'kW/m2', heatDose: 'kJ/m2' },
    summary: summarize(snapshot), snapshot };
}
export function compareIntervention(runtime: SimulationRuntime, intervention: (branch: SimulationRuntime) => void, horizonS = 10) {
  if (!Number.isFinite(horizonS) || horizonS <= 0 || horizonS > 120) throw new Error('Forecast horizon must be in (0, 120] seconds');
  const baseline = runtime.clone(), candidate = runtime.clone();
  intervention(candidate);
  baseline.run(horizonS, .1); candidate.run(horizonS, .1);
  return { modelVersion: MODEL_VERSION, horizonS, baseline: summarize(baseline.snapshot({ eventLimit: 0 })), candidate: summarize(candidate.snapshot({ eventLimit: 0 })) };
}
