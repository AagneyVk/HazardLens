import * as THREE from 'three';

/** Soft procedural sprite, not opaque square particles. */
function spriteTexture(smoke: boolean) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!, gradient = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, smoke ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,1)');
  gradient.addColorStop(.25, smoke ? 'rgba(255,255,255,.5)' : 'rgba(255,210,90,.9)');
  gradient.addColorStop(.65, smoke ? 'rgba(255,255,255,.18)' : 'rgba(255,90,5,.3)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gradient; c.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(canvas);
}
export class FireEffect {
  readonly root = new THREE.Group();
  private flames: THREE.Sprite[] = []; private smoke: THREE.Sprite[] = [];
  private light = new THREE.PointLight(0xff7d2e, 50, 16, 2);
  private fireMap = spriteTexture(false); private smokeMap = spriteTexture(true);
  constructor() {
    for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.fireMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); this.flames.push(s); this.root.add(s); }
    for (let i = 0; i < 20; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeMap, color: 0x303538, depthWrite: false, transparent: true })); this.smoke.push(s); this.root.add(s); }
    this.light.position.y = 2; this.root.add(this.light);
  }
  update(time: number, intensity: number) {
    const strength = Math.min(2, .65 + intensity * .12);
    this.flames.forEach((s, i) => { const age = (time * (.7 + i % 3 * .07) + i / 24) % 1, a = i * 2.399;
      s.position.set(Math.sin(a + time * 2) * (1 - age) * .7, .2 + age * 3.8 * strength, Math.cos(a + time) * (1 - age) * .65);
      s.scale.setScalar((1 - age) * 1.6 * strength + .12); s.material.opacity = Math.sin(age * Math.PI) * .9; s.material.rotation = Math.sin(time + i) * .3;
    });
    this.smoke.forEach((s, i) => { const age = (time * .14 + i / 20) % 1;
      s.position.set(Math.sin(i * 2.4 + age * 3) * age * 1.7, 2 + age * 5.5, Math.cos(i * 2.4) * age * 1.2);
      s.scale.setScalar(1.3 + age * 3); s.material.opacity = Math.sin(age * Math.PI) * .4; s.material.rotation = i + time * .08;
    });
    this.light.intensity = (35 + intensity * 9) * (1 + .12 * Math.sin(time * 17));
  }
  dispose() { this.fireMap.dispose(); this.smokeMap.dispose(); }
}

export class BlastEffect {
  readonly root = new THREE.Group();
  private ring = new THREE.Mesh(new THREE.TorusGeometry(1, .035, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffc18b, transparent: true, depthWrite: false }));
  private flash = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffdc91, transparent: true, depthWrite: false }));
  private light = new THREE.PointLight(0xffbd78, 0, 35);
  private sparks = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffbe73, size: .12, transparent: true, depthWrite: false }));
  constructor() { this.ring.rotation.x = Math.PI / 2; this.ring.position.y = .2; this.root.add(this.ring, this.flash, this.light, this.sparks); this.sparks.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(72 * 3), 3)); }
  update(age: number, radius: number) {
    const progress = Math.min(1, age / 1.1); this.ring.scale.setScalar(Math.max(.01, progress * radius)); this.ring.material.opacity = Math.max(0, 1 - progress);
    this.flash.scale.setScalar(.1 + Math.sin(Math.min(1, age / .8) * Math.PI) * radius * .3); this.flash.material.opacity = Math.max(0, 1 - age / .6); this.light.intensity = Math.max(0, 180 * (1 - age / .5));
    const positions = this.sparks.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < 72; i++) { const a = i * 2.399, velocity = 3 + i % 9; positions.setXYZ(i, Math.sin(a) * age * velocity, Math.max(.05, age * (3 + i % 5) - 4.9 * age * age), Math.cos(a) * age * velocity); }
    positions.needsUpdate = true; this.sparks.material.opacity = Math.max(0, 1 - age / 3);
  }
}

export function createDebris(width: number, height: number, depth: number, column: boolean) {
  const root = new THREE.Group(), material = new THREE.MeshStandardMaterial({ color: column ? 0x48565e : 0x92958d, roughness: .95 });
  const count = column ? 5 : 20;
  for (let i = 0; i < count; i++) {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(column ? .45 : Math.max(.3, width / 5 - .06), height / 4 - .06, Math.max(.2, depth)), material);
    piece.userData.start = new THREE.Vector3((i % 5 - 2) * width / 5, (Math.floor(i / 5) + .5) * height / 4, 0);
    if (column) piece.userData.start.set(0, (i + .5) * height / count, 0);
    piece.castShadow = piece.receiveShadow = true; root.add(piece);
  }
  return root;
}
export function updateDebris(root: THREE.Group, elapsed: number) {
  root.children.forEach((piece, i) => {
    const start = piece.userData.start as THREE.Vector3, flight = Math.sqrt(Math.max(.1, start.y) / 4.9), time = Math.min(elapsed, flight + .8);
    const landing = Math.max(.14, start.y - 4.9 * time * time);
    piece.position.set(start.x + Math.sin(i * 2.4) * Math.min(time, flight) * 1.2, landing + (elapsed > flight ? Math.max(0, .22 * Math.exp(-(elapsed - flight) * 5) * Math.sin((elapsed - flight) * 15)) : 0), Math.cos(i * 2.4) * Math.min(time, flight) * 1.5);
    piece.rotation.set(Math.min(time, flight) * (i % 2 ? 1 : -1), i + time * .2, Math.min(time, flight) * .5);
  });
}
