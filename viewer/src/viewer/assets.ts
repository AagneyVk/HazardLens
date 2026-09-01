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
