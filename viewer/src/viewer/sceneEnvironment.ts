import * as THREE from 'three';

const mat=(color:number,metalness=0,roughness=.8)=>new THREE.MeshStandardMaterial({color,metalness,roughness});

export function createIndustrialEnvironment(scene:THREE.Scene){
 scene.background=new THREE.Color(0x071018);
 scene.fog=new THREE.FogExp2(0x071018,.0018);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(520,420),mat(0x182126,0,.95));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const grid=new THREE.GridHelper(500,100,0x31414a,0x202c32);grid.position.y=.015;scene.add(grid);
 const roadMat=mat(0x252a2d,0,.98);
 for(const z of [-72,0,72]){const r=new THREE.Mesh(new THREE.BoxGeometry(500,.04,11),roadMat);r.position.set(0,.025,z);scene.add(r)}
 for(const x of [-112,0,112]){const r=new THREE.Mesh(new THREE.BoxGeometry(11,.04,400),roadMat);r.position.set(x,.026,0);scene.add(r)}
 const curb=mat(0xb9a85c,0,.7);
 for(let x=-235;x<=235;x+=12){for(const z of [-77,-67,-5,5,67,77]){const c=new THREE.Mesh(new THREE.BoxGeometry(5,.09,.18),curb);c.position.set(x,.07,z);scene.add(c)}}
 const fenceMat=mat(0x687780,.6,.5);
 for(const z of [-195,195]){const rail=new THREE.Mesh(new THREE.BoxGeometry(500,.12,.12),fenceMat);rail.position.set(0,1.2,z);scene.add(rail)}
 for(const x of [-245,245]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,390),fenceMat);rail.position.set(x,1.2,0);scene.add(rail)}
 const buildingMat=mat(0x263640,.25,.65);
 const buildings=[[-175,3,120,48,6,34],[-175,4,65,42,8,28],[165,5,125,62,10,36],[175,4,-125,48,8,32]];
 for(const [x,y,z,w,h,d] of buildings){const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),buildingMat);b.position.set(x,y,z);b.castShadow=b.receiveShadow=true;scene.add(b)}
 for(let i=0;i<10;i++){const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.8,2.5,18+i%3*5,20),mat(0x586873,.65,.38));tower.position.set(78+(i%5)*14,9+(i%3)*2.5,-42+Math.floor(i/5)*30);tower.castShadow=true;scene.add(tower);const cap=new THREE.Mesh(new THREE.ConeGeometry(2.2,3,20),mat(0x73818a,.55,.35));cap.position.set(tower.position.x,tower.position.y*2+.5,tower.position.z);scene.add(cap)}
 const hemi=new THREE.HemisphereLight(0xa9d7ff,0x172026,1.35);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xfff0d2,3.1);sun.position.set(-90,140,70);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-180;sun.shadow.camera.right=180;sun.shadow.camera.top=180;sun.shadow.camera.bottom=-180;scene.add(sun);
 const ambient=new THREE.AmbientLight(0x6f8da0,.32);scene.add(ambient);
 return {ground};
}
