import { AssetRegistry } from "./assetRegistry";

export interface FacilityGenerationConfig {
  tankCount: number;
  pipeCount: number;
  pumpCount: number;
  reactorCount: number;
}

export function generateIndustrialFacility(
  registry: AssetRegistry,
  config: FacilityGenerationConfig = {
    tankCount: 24,
    pipeCount: 80,
    pumpCount: 12,
    reactorCount: 4,
  },
) {
  for (let i = 0; i < config.tankCount; i++) {
    registry.register({
      id: `TANK-${String(i + 1).padStart(3, "0")}`,
      kind: "tank",
      state: "HEALTHY",
      position: {
        x: (i % 6) * 35,
        y: Math.floor(i / 6) * 35,
        z: 0,
      },
      variant: {
        healthy: "tank.glb",
        damaged: "tank-damaged.glb",
        destroyed: "tank-destroyed.glb",
      },
    });
  }

  for (let i = 0; i < config.pipeCount; i++) {
    registry.register({
      id: `PIPE-${String(i + 1).padStart(3, "0")}`,
      kind: "pipe",
      state: "HEALTHY",
      position: {
        x: (i % 10) * 20,
        y: 120 + Math.floor(i / 10) * 10,
        z: 4,
      },
      variant: {
        healthy: "pipe.glb",
        damaged: "pipe-leaking.glb",
      },
    });
  }

  return registry.all();
}
