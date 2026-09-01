import type { Twin, Vec3 } from '../core/types.js';
import { WeatherTwin, TankTwin, PipeTwin, IgnitionSourceTwin, WallTwin } from '../twins/process.js';
import { IndustrialTwin, type IndustrialKind } from '../twins/industrial.js';
import { FacilityTwinGraph } from './graph.js';

export interface FacilityConfig { tanks: number; pipes: number; reactors: number; pumps: number; compressors: number; cooling: number; emergency: number; }
export const defaultFacilityConfig: FacilityConfig = { tanks: 60, pipes: 120, reactors: 8, pumps: 12, compressors: 6, cooling: 4, emergency: 8 };
export interface GeneratedFacility { twins: Twin[]; graph: FacilityTwinGraph; config: FacilityConfig; }

export function generateFacility(overrides: Partial<FacilityConfig> = {}): GeneratedFacility {
  const config = { ...defaultFacilityConfig, ...overrides };
  for (const [key, value] of Object.entries(config)) if (!Number.isInteger(value) || value < 1 || value > 500) throw new Error(`Invalid facility count: ${key}`);
  const twins: Twin[] = [], graph = new FacilityTwinGraph();
  const add = (twin: Twin, zone: string) => { twin.state.metadata.zone = zone; twins.push(twin); graph.addNode(twin.state, zone); };
  const id = (prefix: string, n: number) => `${prefix}-${String(n + 1).padStart(3, '0')}`;
  add(new WeatherTwin('WEATHER', 3.4, .65), 'site');
  add(new IndustrialTwin('CTRL-001', 'control', { x: -175, y: 0, z: 90 }), 'operations');
  const equipment = (prefix: string, kind: IndustrialKind, count: number, start: Vec3, columns: number, zone: string) => {
    for (let i = 0; i < count; i++) add(new IndustrialTwin(id(prefix, i), kind, {
      x: start.x + (i % columns) * 18, y: start.y, z: start.z + Math.floor(i / columns) * 22,
    }), zone);
  };
  equipment('CL', 'cooling', config.cooling, { x: 110, y: 0, z: 75 }, 4, 'utilities');
  equipment('PU', 'pump', config.pumps, { x: -88, y: 0, z: 38 }, 6, 'process');
  equipment('CP', 'compressor', config.compressors, { x: 40, y: 0, z: 38 }, 3, 'process');
  equipment('R', 'reactor', config.reactors, { x: 65, y: 0, z: -100 }, 4, 'reactors');
  equipment('ES', 'emergency', config.emergency, { x: -100, y: 0, z: 100 }, 8, 'response');
  for (let i = 0; i < config.tanks; i++) add(new TankTwin(id('T', i), { x: -135 + (i % 10) * 18, y: 0, z: -145 + Math.floor(i / 10) * 18 }), 'storage');
  for (let i = 0; i < config.pipes; i++) add(new PipeTwin(id('P', i), { x: -135 + (i % 20) * 10, y: 1.5, z: -25 + Math.floor(i / 20) * 8 }), 'process');
  for (let i = 0; i < 12; i++) add(new WallTwin(id('W', i), { x: -125 + i * 24, y: 2.5, z: 128 }), 'perimeter');
  for (let i = 0; i < 6; i++) add(new IgnitionSourceTwin(id('M', i), { x: -125 + i * 36, y: 1.5, z: -21 }), 'process');
  for (let i = 0; i < 3; i++) {
    const road = new IndustrialTwin(id('RD', i), 'road', { x: 0, y: .03, z: [-45, 25, 85][i] });
    road.state.metadata.lengthM = 340; road.state.metadata.widthM = 10;
    add(road, 'transport');
  }
  for (let i = 0; i < config.reactors; i++) {
    graph.connect(id('CL', i % config.cooling), id('R', i), 'cooling');
    graph.connect(id('PU', i % config.pumps), id('R', i), 'process');
    graph.connect('CTRL-001', id('R', i), 'control');
  }
  for (let i = 0; i < config.pipes; i++) {
    graph.connect(id('T', i % config.tanks), id('P', i), 'process');
    graph.connect(id('PU', i % config.pumps), id('P', i), 'power');
  }
  for (let i = 0; i < config.emergency; i++) {
    graph.connect('CTRL-001', id('ES', i), 'control');
    graph.connect(id('RD', i % 3), id('ES', i), 'emergency_route');
  }
  graph.validate(twins.map(t => t.state));
  for (const twin of twins) if (twin.metadata) twin.metadata.relationships = graph.providers(twin.state.id).map(targetId => ({ targetId, type: 'depends_on' }));
  return { twins, graph, config };
}
