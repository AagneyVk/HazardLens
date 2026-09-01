import * as THREE from 'three';
import type { TwinState } from '../../../src/core/types.js';

const metal = (color: number, roughness = .4) => new THREE.MeshStandardMaterial({ color, metalness: .65, roughness });
const paint = (color: number) => new THREE.MeshStandardMaterial({ color, metalness: .2, roughness: .65 });
function box(group: THREE.Group, size: number[], position: number[], material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), material);
  mesh.position.set(...position as [number, number, number]); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function cylinder(group: THREE.Group, radius: number, height: number, position: number[], material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material);
  mesh.position.set(...position as [number, number, number]); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function label(text: string, color = '#9ed4e4') {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const c = canvas.getContext('2d')!; c.fillStyle = '#152c37'; c.fillRect(0, 0, 256, 64); c.strokeStyle = color; c.lineWidth = 3; c.strokeRect(2, 2, 252, 60);
  c.fillStyle = color; c.font = '600 30px monospace'; c.textAlign = 'center'; c.fillText(text, 128, 43);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true })); sprite.scale.set(2.8, .7, 1); return sprite;
}
export function indoorAsset(t: TwinState): THREE.Group {
  const group = new THREE.Group(), steel = metal(0xb4c2c5, .25), dark = metal(0x36434a), teal = paint(0x35767d), orange = paint(0xc9833f);
  if (t.kind === 'tank' || t.kind === 'reactor') {
    const height = t.kind === 'tank' ? 3.5 : 4.8, radius = t.kind === 'tank' ? 1.15 : 1.45;
    cylinder(group, radius, height, [0, height / 2 + .5, 0], steel);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12), steel); cap.scale.y = .3; cap.position.y = height + .5; group.add(cap);
    for (const y of [1, height - .4]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + .03, .065, 8, 32), dark); ring.rotation.x = Math.PI / 2; ring.position.y = y; group.add(ring); }
    for (const x of [-.75, .75]) box(group, [.16, .7, .16], [x, .35, 0], dark);
    const gauge = cylinder(group, .18, .12, [0, 2.7, radius + .04], paint(0xeceee4)); gauge.rotation.x = Math.PI / 2;
    cylinder(group, .15, .8, [0, height + 1, 0], dark);
    const plate = label(t.id); plate.position.set(0, 1.8, radius + .1); plate.scale.set(1.4, .35, 1); group.add(plate);
  } else if (t.kind === 'pipe') {
    const pipe = cylinder(group, .18, 3.6, [0, .1, 0], steel); pipe.rotation.x = Math.PI / 2;
    for (const z of [-1.5, 1.5]) { const flange = cylinder(group, .3, .15, [0, .1, z], dark); flange.rotation.x = Math.PI / 2; }
    const valve = new THREE.Mesh(new THREE.TorusGeometry(.34, .055, 8, 20), orange); valve.rotation.x = Math.PI / 2; valve.position.y = .7; group.add(valve);
    box(group, [.12, .6, .12], [0, .4, 0], dark);
  } else if (t.kind === 'pump' || t.kind === 'compressor') {
    box(group, [t.kind === 'pump' ? 1.8 : 3.5, .25, 1.5], [0, .15, 0], dark);
    const motor = cylinder(group, t.kind === 'pump' ? .45 : .7, t.kind === 'pump' ? 1.3 : 2.5, [0, .8, 0], teal); motor.rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) { const rib = cylinder(group, t.kind === 'pump' ? .5 : .75, .07, [-.5 + i * .25, .8, 0], dark); rib.rotation.z = Math.PI / 2; }
    box(group, [.6, .4, .6], [0, 1.4, 0], teal);
  } else if (t.kind === 'cooling') {
    box(group, [3.5, 2.4, 2], [0, 1.2, 0], paint(0x6a8e93));
    for (const x of [-1, 1]) { const fan = cylinder(group, .65, .1, [x, 2.45, 0], dark); fan.name = 'fan'; for (let i = 0; i < 3; i++) { const blade = box(group, [1.1, .05, .15], [x, 2.52, 0], steel); blade.rotation.y = i * Math.PI / 3; } }
    for (let i = 0; i < 9; i++) box(group, [3, .045, .1], [0, .3 + i * .21, 1.01], dark);
  } else if (t.kind === 'control') {
    box(group, [4, 1.2, 1.8], [0, .6, 0], dark);
    for (const x of [-1.2, 0, 1.2]) { box(group, [1, .8, .1], [x, 1.7, -.2], paint(0x0d2934)); box(group, [.85, .6, .05], [x, 1.7, -.1], new THREE.MeshStandardMaterial({ color: 0x286278, emissive: 0x286278, emissiveIntensity: .6 })); }
  } else if (t.kind === 'emergency') {
    box(group, [.8, 1.8, .6], [0, .9, 0], paint(0xb63327)); const hose = new THREE.Mesh(new THREE.TorusGeometry(.24, .045, 8, 20), dark); hose.position.set(0, 1.1, .34); group.add(hose);
    const sign = label('FIRE', '#ffb5a6'); sign.position.y = 2.4; sign.scale.set(1.3, .33, 1); group.add(sign);
  } else if (t.kind === 'route') {
    box(group, [.15, 3, 2.7], [0, 1.5, 0], paint(0x237a65));
    const sign = label('EXIT →', '#93ffd0'); sign.position.y = 3.6; group.add(sign);
  } else if (t.kind === 'wall') {
    const width = Number(t.metadata.widthM), height = Number(t.metadata.heightM), depth = Number(t.metadata.depthM);
    if (t.metadata.role === 'column') {
      box(group, [.18, height, .6], [0, height / 2, 0], dark); for (const z of [-.3, .3]) box(group, [.6, height, .1], [0, height / 2, z], dark);
      box(group, [.9, .14, .9], [0, .07, 0], steel);
    } else {
      box(group, [width, height, depth], [0, height / 2, 0], paint(0x9a9b92));
      box(group, [width + .02, .2, depth + .02], [0, 1.2, 0], paint(0xc79646));
      for (let y = 1; y < height; y += 1) box(group, [width + .01, .018, depth + .01], [0, y, 0], paint(0x727a78));
    }
  } else if (t.kind === 'worker') {
    const jacket = paint(0xdac34e), trousers = paint(0x263a4a), skin = paint(0xb68b6b);
    box(group, [.42, .6, .25], [0, 1.02, 0], jacket);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), skin); head.position.y = 1.55; group.add(head);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(.19, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf4e3a2)); helmet.position.y = 1.62; group.add(helmet);
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.name = side < 0 ? 'armL' : 'armR'; arm.position.set(side * .27, 1.26, 0); box(arm, [.13, .5, .14], [0, -.23, 0], jacket); group.add(arm);
      const leg = new THREE.Group(); leg.name = side < 0 ? 'legL' : 'legR'; leg.position.set(side * .12, .78, 0); box(leg, [.16, .66, .18], [0, -.31, 0], trousers); box(leg, [.2, .13, .29], [0, -.64, .05], dark); group.add(leg);
    }
  }
  group.traverse(child => { if (child instanceof THREE.Mesh) { child.castShadow = child.receiveShadow = true; if (child.material instanceof THREE.MeshStandardMaterial) child.userData.originalColor = child.material.color.clone(); } });
  return group;
}
