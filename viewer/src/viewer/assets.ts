import * as THREE from 'three';

const material=(color:number,metalness=.58,roughness=.34)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const shadows=(o:THREE.Object3D)=>{o.traverse(c=>{if(c instanceof THREE.Mesh){c.castShadow=true;c.receiveShadow=true}});return o};

export function tankAsset(){
 const g=new THREE.Group(); const steel=material(0x778895,.72,.27); const dark=material(0x29343b,.72,.35);
 const shell=new THREE.Mesh(new THREE.CylinderGeometry(3.25,3.25,7.2,32),steel);shell.position.y=3.6;
 const roof=new THREE.Mesh(new THREE.SphereGeometry(3.25,32,12,0,Math.PI*2,0,Math.PI/2),steel);roof.position.y=7.18;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(3.32,.09,8,48),dark);ring.rotation.x=Math.PI/2;ring.position.y=6.4;
 const valve=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,1.2,12),material(0xc0cbd1,.7,.25));valve.position.y=8.3;
 const ladder=new THREE.Mesh(new THREE.BoxGeometry(.08,6.8,.08),dark);ladder.position.set(3.3,3.4,0);
 g.add(shell,roof,ring,valve,ladder);return shadows(g);
}

export function pipeAsset(){
 const g=new THREE.Group();const m=material(0x9ba6ad,.72,.27);const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,9,14),m);pipe.rotation.z=Math.PI/2;
 const a=new THREE.Mesh(new THREE.TorusGeometry(.42,.1,8,18),m);a.rotation.y=Math.PI/2;a.position.x=-4.2;const b=a.clone();b.position.x=4.2;g.add(pipe,a,b);return shadows(g);
}

export function wallAsset(){return shadows(new THREE.Mesh(new THREE.BoxGeometry(10,5,.5),material(0x59636a,.05,.9)))}

export function ignitionAsset(){const g=new THREE.Group();const base=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.6,2.2),material(0x303b42,.55,.4));base.position.y=.8;const motor=new THREE.Mesh(new THREE.CylinderGeometry(.65,.65,2.4,18),material(0x53636d,.7,.32));motor.rotation.z=Math.PI/2;motor.position.y=1.8;g.add(base,motor);return shadows(g)}

export function reactorAsset(height=14){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(2.3,2.8,height,24),material(0x6c7b84,.72,.3));body.position.y=height/2;const top=new THREE.Mesh(new THREE.SphereGeometry(2.3,24,10,0,Math.PI*2,0,Math.PI/2),material(0x82909a,.7,.28));top.position.y=height;g.add(body,top);return shadows(g)}


export function compressorAsset() {
 const group=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(7,3,4),material(0x4f7a88));body.position.y=1.8;group.add(body);
 for(const x of [-2,2]){const fan=new THREE.Mesh(new THREE.TorusGeometry(1,.18,8,20),material(0xa6bbc6));fan.position.set(x,2,2.1);group.add(fan)}return shadows(group);
}
export function coolingAsset() {
 const group=new THREE.Group();const tower=new THREE.Mesh(new THREE.CylinderGeometry(3.5,5,11,20),material(0x718f9a,.2,.7));tower.position.y=5.5;
 const rim=new THREE.Mesh(new THREE.TorusGeometry(3.5,.3,8,24),material(0xa5bdc8));rim.rotation.x=Math.PI/2;rim.position.y=11;group.add(tower,rim);return shadows(group);
}
export function controlAsset() {
 const group=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(24,8,15),material(0x314a5a,.2,.7));body.position.y=4;group.add(body);
 const windows=new THREE.Mesh(new THREE.BoxGeometry(20,2,.1),material(0x69cad9,.5,.2));windows.position.set(0,5,7.55);group.add(windows);
 const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,8,8),material(0xb1c6d0));antenna.position.set(7,12,0);group.add(antenna);return shadows(group);
}
export function emergencyAsset() {
 const group=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),material(0xb64030,.3,.6));body.position.y=1.5;group.add(body);
 const beacon=new THREE.Mesh(new THREE.SphereGeometry(.45,12,8),material(0xffce65));beacon.position.y=3.5;group.add(beacon);
 const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,2,10),material(0xd6e1e5));nozzle.rotation.z=Math.PI/3;nozzle.position.set(1,3,0);group.add(nozzle);return shadows(group);
}
export function roadAsset(length=340,width=10) {
 const group=new THREE.Group();const surface=new THREE.Mesh(new THREE.BoxGeometry(length,.05,width),material(0x29353d,0,.95));surface.receiveShadow=true;group.add(surface);
 const marks=new THREE.InstancedMesh(new THREE.BoxGeometry(4,.06,.15),material(0xb9a874,0,.7),Math.floor(length/10));const matrix=new THREE.Matrix4();
 for(let i=0;i<marks.count;i++){matrix.makeTranslation(-length/2+5+i*10,.05,0);marks.setMatrixAt(i,matrix)}group.add(marks);return group;
}
