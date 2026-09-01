export type AssetState =
  | "HEALTHY"
  | "WARNING"
  | "DAMAGED"
  | "CRITICAL"
  | "DESTROYED";

export type AssetKind =
  | "tank"
  | "pipe"
  | "valve"
  | "pump"
  | "reactor"
  | "building";

export interface AssetVariant {
  healthy: string;
  damaged?: string;
  destroyed?: string;
}

export interface IndustrialAssetDefinition {
  id: string;
  kind: AssetKind;
  state: AssetState;
  position: { x: number; y: number; z: number };
  variant: AssetVariant;
}

export class AssetRegistry {
  private assets = new Map<string, IndustrialAssetDefinition>();

  register(asset: IndustrialAssetDefinition) {
    this.assets.set(asset.id, asset);
  }

  get(id: string) {
    return this.assets.get(id);
  }

  all() {
    return [...this.assets.values()];
  }

  updateState(id: string, state: AssetState) {
    const asset = this.assets.get(id);
    if (asset) asset.state = state;
  }
}
