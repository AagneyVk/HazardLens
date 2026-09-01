import type { Twin } from '../core/types.js';
import { FacilityTwinGraph } from './graph.js';
import { PipeTwin, TankTwin, WallTwin, WeatherTwin } from '../twins/process.js';
import { IndustrialTwin, type IndustrialKind } from '../twins/industrial.js';
import { WorkerTwin, ExitTwin } from '../twins/indoor.js';

export function generateIndoorFacility() {
  const twins: Twin[] = [], graph = new FacilityTwinGraph();
  const add = (t: Twin, zone: string, label: string) => { Object.assign(t.state.metadata, { zone, label, indoor: true }); twins.push(t); graph.addNode(t.state, zone); return t; };
  add(new WeatherTwin('WEATHER', .15, 0), 'Hall', 'Ventilation');
  const equipment = (id: string, kind: IndustrialKind, x: number, z: number, label: string) => add(new IndustrialTwin(id, kind, { x, y: 0, z }), 'Process floor', label);
  equipment('CTRL-001', 'control', 18, -11, 'Control desk');
  for (let i = 0; i < 4; i++) {
    const tank = add(new TankTwin(`T-00${i + 1}`, { x: -17 + i * 5, y: 0, z: -10 }), 'Solvent storage', `Solvent vessel ${i + 1}`);
    Object.assign(tank.state.metadata, { widthM: 2.4, depthM: 2.4 });
    const pipe = add(new PipeTwin(`P-00${i + 1}`, { x: -17 + i * 5, y: 1.1, z: -5 }), 'Transfer line', `Transfer pipe ${i + 1}`);
    graph.connect(tank.state.id, pipe.state.id, 'process');
    equipment(`PU-00${i + 1}`, 'pump', -17 + i * 5, -2, `Feed pump ${i + 1}`);
    graph.connect(`PU-00${i + 1}`, pipe.state.id, 'power');
  }
  for (let i = 0; i < 2; i++) {
    equipment(`R-00${i + 1}`, 'reactor', 6 + i * 7, -4, `Mixing reactor ${i + 1}`);
    equipment(`CL-00${i + 1}`, 'cooling', 6 + i * 7, -11, `Cooling skid ${i + 1}`);
    equipment(`CP-00${i + 1}`, 'compressor', -14 + i * 9, 9, `Compressor ${i + 1}`);
    equipment(`ES-00${i + 1}`, 'emergency', -21 + i * 42, 11, `Fire station ${i + 1}`);
    graph.connect(`CL-00${i + 1}`, `R-00${i + 1}`, 'cooling');
    graph.connect('CTRL-001', `R-00${i + 1}`, 'control');
    graph.connect('CTRL-001', `ES-00${i + 1}`, 'control');
  }
  for (let i = 0; i < 4; i++) {
    const wall = add(new WallTwin(`W-00${i + 1}`, { x: -17 + i * 5, y: 0, z: -14 }), 'Structure', `Rear wall bay ${i + 1}`);
    Object.assign(wall.state.metadata, { widthM: 4.8, heightM: 7, depthM: .45 });
  }
  for (let i = 0; i < 3; i++) {
    const wall = add(new WallTwin(`W-00${i + 5}`, { x: 2, y: 0, z: -10 + i * 5 }), 'Structure', `Fire partition ${i + 1}`);
    Object.assign(wall.state.metadata, { widthM: .45, heightM: 4.5, depthM: 4.6 });
  }
  for (let i = 0; i < 4; i++) {
    const column = add(new WallTwin(`COL-00${i + 1}`, { x: -22 + i * 14.5, y: 0, z: -14 }), 'Structure', `Steel column ${i + 1}`);
    Object.assign(column.state.metadata, { widthM: .5, depthM: .5, heightM: 8, role: 'column' });
  }
  add(new ExitTwin('EXIT-W', { x: -24, y: 0, z: 4 }), 'Egress', 'West exit');
  add(new ExitTwin('EXIT-E', { x: 24, y: 0, z: 4 }), 'Egress', 'East exit');
  for (let i = 0; i < 8; i++) add(new WorkerTwin(`OP-00${i + 1}`, { x: -18 + i * 5, y: 0, z: i % 2 ? 5 : 1 }), 'Personnel', `Operator ${i + 1}`);
  graph.validate(twins.map(t => t.state));
  return { twins, graph };
}
