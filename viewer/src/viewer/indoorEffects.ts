import * as THREE from 'three';
import type {TwinState} from '../../../src/core/types.js';

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

function fieldMaterial(smoke:boolean){return new THREE.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:smoke?THREE.NormalBlending:THREE.AdditiveBlending,
 vertexShader:`varying vec2 vUv; varying float seed; void main(){vUv=uv;seed=instanceMatrix[3].x*.37+instanceMatrix[3].z*.71;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform float time;varying vec2 vUv;varying float seed;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){vec2 uv=vUv;float n=noise(uv*5.+vec2(seed,-time*${smoke?'0.5':'2.4'}));n+=.5*noise(uv*11.+vec2(-seed,-time*3.));
 ${smoke?'float edge=1.-smoothstep(.2,.52,length(uv-.5));float alpha=edge*smoothstep(.2,1.2,n)*.17;vec3 color=vec3(.48,.73,.76);':'float sway=sin(uv.y*7.-time*4.+seed)*.08*uv.y;float width=(1.-uv.y)*.45;float edge=1.-smoothstep(width*.3,width+.03,abs(uv.x-.5+sway));float alpha=edge*smoothstep(.12,.65,n-uv.y*.45)*(1.-smoothstep(.72,1.,uv.y));vec3 color=mix(vec3(1.,.13,.015),vec3(1.,.85,.24),clamp((1.-uv.y)*n,0.,1.));'}
 gl_FragColor=vec4(color,alpha);}`})}
/** Layered instanced wisps and crossed turbulent flames; every visible cell follows state. */
export class FloorGasEffect{
 readonly root=new THREE.Group();
 private gas=new THREE.InstancedMesh(new THREE.PlaneGeometry(2.3,2.3),fieldMaterial(true),1539);
 private flame=new THREE.InstancedMesh(new THREE.PlaneGeometry(2,3),fieldMaterial(false),1026);
 constructor(){this.gas.frustumCulled=this.flame.frustumCulled=false;this.root.add(this.gas,this.flame)}
 update(twin:TwinState,time:number){const pose=new THREE.Object3D();let gasCount=0,fireCount=0;
  this.gas.material.uniforms.time.value=this.flame.material.uniforms.time.value=time;
  for(const cell of twin.gasCells??[]){if(cell.volumeFraction<.001&&!cell.burning)continue;
   for(let layer=0;layer<3;layer++){pose.position.set(cell.x+Math.sin(time*.6+cell.index+layer)*.1,.08+layer*.17,cell.z+Math.cos(time*.4+cell.index)*.1);pose.rotation.set(-Math.PI/2,0,layer*.8);pose.scale.setScalar(.85+layer*.07);pose.updateMatrix();this.gas.setMatrixAt(gasCount++,pose.matrix)}
   if(cell.burning){const height=.5+Math.min(2,cell.massKg*5),flicker=1+.13*Math.sin(time*13+cell.index);for(let side=0;side<2;side++){pose.position.set(cell.x,height*.75,cell.z);pose.rotation.set(0,side*Math.PI/2,0);pose.scale.set(1,height*.5*flicker,1);pose.updateMatrix();this.flame.setMatrixAt(fireCount++,pose.matrix)}}
  }this.gas.count=gasCount;this.flame.count=fireCount;this.gas.instanceMatrix.needsUpdate=this.flame.instanceMatrix.needsUpdate=true;if(this.gas.instanceColor)this.gas.instanceColor.needsUpdate=true;
 }
}

export function createVesselDebris(radius:number,height:number){const root=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:0x59666b,metalness:.7,roughness:.65,side:THREE.DoubleSide});
 for(let i=0;i<8;i++){const angle=i*Math.PI/4;const piece=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,8,1,true,angle,Math.PI/4*.9),material);piece.userData.start=new THREE.Vector3(Math.sin(angle)*.5,height/2,Math.cos(angle)*.5);piece.castShadow=piece.receiveShadow=true;root.add(piece)}return root;
}

export function createDebris(width: number, height: number, depth: number, column: boolean) {
  const root = new THREE.Group(), material = new THREE.MeshStandardMaterial({ color: column ? 0x48565e : 0x92958d, roughness: .95 });
  const count = column ? 5 : 20;
  const span = Math.max(width, depth), thickness = Math.min(width, depth);
  if (!column && depth > width) root.rotation.y = Math.PI / 2;
  for (let i = 0; i < count; i++) {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(column ? .45 : Math.max(.3, span / 5 - .06), height / 4 - .06, Math.max(.2, thickness)), material);
    piece.userData.start = new THREE.Vector3((i % 5 - 2) * span / 5, (Math.floor(i / 5) + .5) * height / 4, 0);
    if (column) piece.userData.start.set(0, (i + .5) * height / count, 0);
    piece.castShadow = piece.receiveShadow = true; root.add(piece);
  }
  return root;
}
export function updateDebris(root: THREE.Group, elapsed: number) {
  root.children.forEach((piece, i) => {
    const start = piece.userData.start as THREE.Vector3, flight = Math.sqrt(Math.max(.1, start.y) / 4.9), time = Math.min(elapsed, flight + .8);
    const landing = Math.max(.14, start.y - 4.9 * time * time);
    piece.position.set(start.x + Math.sin(i * 2.4) * Math.min(time, flight) * 1.2, landing + (elapsed > flight ? Math.max(0, .22 * Math.exp(-(elapsed - flight) * 5) * Math.sin((elapsed - flight) * 15)) : 0), start.z+Math.cos(i * 2.4) * Math.min(time, flight) * 1.5);
    piece.rotation.set(Math.min(time, flight) * (i % 2 ? 1 : -1), i + time * .2, Math.min(time, flight) * .5);
  });
}
