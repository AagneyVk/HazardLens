import * as THREE from 'three';
import type { TwinState, WorldSnapshot } from '../../../src/core/types.js';
import { indoorAsset } from './indoorAssets.js';
import { FireEffect, BlastEffect, createDebris, updateDebris } from './indoorEffects.js';
export class WorldRenderer {
  private objects = new Map<string, THREE.Group>();
  private fires = new Map<string, FireEffect>();
  private blasts = new Map<string, BlastEffect>();
  private collapsed = new Map<string, { root: THREE.Group; started: number }>();
  private selected = new Set<string>();
  private graphLines?: THREE.LineSegments;
  constructor(private scene: THREE.Scene) {}
  setSelection(ids: string[]) { this.selected = new Set(ids); }
  setGraph(graph: import('../../../src/facility/graph.js').FacilityGraphSnapshot) {
    if (this.graphLines) { this.scene.remove(this.graphLines); this.graphLines.geometry.dispose(); (this.graphLines.material as THREE.Material).dispose(); }
    const nodes = new Map(graph.nodes.map(n => [n.id, n])), points: THREE.Vector3[] = [];
    for (const e of graph.edges) { const a = nodes.get(e.from)!, b = nodes.get(e.to)!; points.push(new THREE.Vector3(a.position.x, .1, a.position.z), new THREE.Vector3(b.position.x, .1, b.position.z)); }
    this.graphLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x86d8dd, transparent: true, opacity: .6 })); this.graphLines.visible = false; this.scene.add(this.graphLines);
  }
  toggleGraph() { if (this.graphLines) this.graphLines.visible = !this.graphLines.visible; return this.graphLines?.visible ?? false; }
  clear() {
    for (const object of this.objects.values()) { this.scene.remove(object); this.disposeObject(object); }
    for (const { root } of this.collapsed.values()) { this.scene.remove(root); this.disposeObject(root); }
    for (const effect of this.fires.values()) effect.dispose();
    this.objects.clear(); this.fires.clear(); this.blasts.clear(); this.collapsed.clear();
  }
  private disposeObject(object: THREE.Object3D) {
    object.traverse(c => { if (c instanceof THREE.Mesh || c instanceof THREE.Points || c instanceof THREE.Sprite) { if ('geometry' in c) c.geometry.dispose(); for (const m of Array.isArray(c.material) ? c.material : [c.material]) { if ('map' in m) (m.map as THREE.Texture | null)?.dispose(); m.dispose(); } } });
  }
  sync(snapshot: WorldSnapshot, _dt = .016) {
    for (const twin of snapshot.twins) {
      if (twin.kind === 'weather') continue;
      let object = this.objects.get(twin.id);
      if (!object) {
        if (twin.kind === 'fire') { const fx = new FireEffect(); this.fires.set(twin.id, fx); object = fx.root; }
        else if (twin.kind === 'explosion') { const fx = new BlastEffect(); this.blasts.set(twin.id, fx); object = fx.root; }
        else if (twin.kind === 'release') { object = new THREE.Group(); object.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xa7bbad, transparent: true, opacity: .1, depthWrite: false }))); }
        else object = indoorAsset(twin);
        object.userData.twinId = twin.id; this.objects.set(twin.id, object); this.scene.add(object);
      }
      object.position.set(twin.position.x, twin.position.y, twin.position.z);
      object.visible = twin.active || !['fire', 'explosion', 'release'].includes(twin.kind);
      if (twin.kind === 'fire') {
        // Render at the vessel surface; do not move the model's radiation origin.
        const source = snapshot.twins.find(t => t.id === twin.metadata.fuelSourceId);
        object.position.y += source?.kind === 'tank' ? 3.8 : source?.kind === 'reactor' ? 5.1 : .4;
        this.fires.get(twin.id)!.update(snapshot.time, Number(twin.metadata.intensityMw));
      }
      else if (twin.kind === 'explosion') this.blasts.get(twin.id)!.update(Number(twin.metadata.age), Number(twin.metadata.radiusM));
      else if (twin.kind === 'release') { const r = Number(twin.metadata.radiusM); object.scale.set(r, Math.min(2, r * .5), r); }
      else if (twin.kind === 'worker') {
        object.rotation.y = Number(twin.metadata.heading); const moving = Number(twin.metadata.speed) > .01, phase = snapshot.time * 9 + Number(twin.id.slice(-1));
        for (const [name, direction] of [['armL', 1], ['armR', -1], ['legL', -1], ['legR', 1]] as const) object.getObjectByName(name)!.rotation.x = moving ? Math.sin(phase) * .55 * direction : Math.sin(snapshot.time * 1.4) * .03;
      } else if (twin.kind === 'wall' && twin.integrity < .25) {
        object.visible = false; let debris = this.collapsed.get(twin.id);
        if (!debris) { const root = createDebris(Number(twin.metadata.widthM), Number(twin.metadata.heightM), Number(twin.metadata.depthM), twin.metadata.role === 'column'); root.position.copy(object.position); root.userData.twinId = twin.id; this.scene.add(root); debris = { root, started: snapshot.time }; this.collapsed.set(twin.id, debris); }
        updateDebris(debris.root, snapshot.time - debris.started);
      } else {
        object.traverse(child => {
          if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.MeshStandardMaterial)) return;
          const material = child.material; if (child.userData.originalColor) material.color.copy(child.userData.originalColor);
          const heat = Math.max(0, Math.min(1, (twin.temperatureK - 320) / 220)); material.emissive.setRGB(heat * .75, heat * .1, 0); material.emissiveIntensity = heat;
          if (this.selected.has(twin.id)) { material.emissive.setHex(0x388a96); material.emissiveIntensity = .5; }
          if (twin.integrity < .7) material.color.multiplyScalar(.4 + .6 * twin.integrity);
          if (twin.metadata.operating === false) material.color.multiplyScalar(.7);
        });
      }
    }
  }
  pick(raycaster: THREE.Raycaster, camera: THREE.Camera, pointer: THREE.Vector2, snapshot?: WorldSnapshot) {
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObjects([...this.objects.values(), ...[...this.collapsed.values()].map(c => c.root)], true)) {
      let object: THREE.Object3D | null = hit.object; let visible = true;
      while (object && !object.userData.twinId) { visible &&= object.visible; object = object.parent; }
      if (visible && object?.visible && object.userData.twinId) return snapshot?.twins.find(t => t.id === object!.userData.twinId);
    }
    return undefined;
  }
  getObject(id: string) { return this.objects.get(id); }
}
