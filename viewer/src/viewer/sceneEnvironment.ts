import * as THREE from 'three';

/** Environment contains only lighting and ground. All facility objects come from twins. */
export function createIndustrialEnvironment(scene: THREE.Scene) {
 scene.background=new THREE.Color(0x07121d);scene.fog=new THREE.FogExp2(0x07121d,.001);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(560,500),new THREE.MeshStandardMaterial({color:0x15242e,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const grid=new THREE.GridHelper(540,54,0x28414e,0x1c303a);grid.position.y=.01;scene.add(grid);
 scene.add(new THREE.HemisphereLight(0xb9e2ff,0x293b3e,2));
 const sun=new THREE.DirectionalLight(0xffecd6,3);sun.position.set(-100,180,80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-220;sun.shadow.camera.right=220;sun.shadow.camera.top=220;sun.shadow.camera.bottom=-220;sun.shadow.camera.far=600;scene.add(sun);
 return {ground};
}
