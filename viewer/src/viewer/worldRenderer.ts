import * as THREE from 'three';
import type { TwinState, WorldSnapshot } from '../../../src/core/types.js';
import { tankAsset, pipeAsset, wallAsset, ignitionAsset } from './assets.js';
import { getVisualCondition } from './renderState.js';

type FX={root:THREE.Group;flame?:THREE.Points;smoke?:THREE.Points;light?:THREE.PointLight;gas?:THREE.Mesh};

export class WorldRenderer {
 private objects=new Map<string,THREE.Object3D>();
 private effects=new Map<string,FX>();
 private clock=0;
 constructor(private scene:THREE.Scene){}
 sync(snapshot:WorldSnapshot,dt=.016){
  this.clock+=dt;const alive=new Set<string>();
  for(const twin of snapshot.twins){alive.add(twin.id);let o=this.objects.get(twin.id);if(!o){o=this.create(twin);this.objects.set(twin.id,o);this.scene.add(o)}this.update(o,twin,dt)}
  for(const [id,o] of this.objects)if(!alive.has(id)){this.scene.remove(o);this.objects.delete(id);this.effects.delete(id)}
 }
 private create(t:TwinState):THREE.Object3D{
  let o:THREE.Object3D;
  switch(t.kind){case'tank':o=tankAsset();break;case'pipe':o=pipeAsset();break;case'wall':o=wallAsset();break;case'ignition':o=ignitionAsset();break;case'fire':o=this.fireEffect(t);break;case'release':o=this.gasEffect(t);break;default:o=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.8),new THREE.MeshStandardMaterial({color:0xd2b04d}))}
  o.userData.twinId=t.id;return o;
 }
 private fireEffect(t:TwinState){
  const root=new THREE.Group(),count=220,pos=new Float32Array(count*3);
  for(let i=0;i<count;i++){const r=Math.random()*.9,a=Math.random()*Math.PI*2;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=Math.random()*4;pos[i*3+2]=Math.sin(a)*r}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));const flame=new THREE.Points(geo,new THREE.PointsMaterial({color:0xff8a22,size:.8,transparent:true,opacity:.88,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(flame);
  const spos=new Float32Array(150*3);for(let i=0;i<150;i++){spos[i*3]=(Math.random()-.5)*2;spos[i*3+1]=2+Math.random()*7;spos[i*3+2]=(Math.random()-.5)*2}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(spos,3));const smoke=new THREE.Points(sg,new THREE.PointsMaterial({color:0x31383d,size:1.7,transparent:true,opacity:.34,depthWrite:false}));root.add(smoke);
  const light=new THREE.PointLight(0xff5b18,22,32,2);light.position.y=2.5;root.add(light);this.effects.set(t.id,{root,flame,smoke,light});return root;
 }
 private gasEffect(t:TwinState){
  const root=new THREE.Group();const gas=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshPhysicalMaterial({color:0x75cbd0,transparent:true,opacity:.13,roughness:.85,depthWrite:false,side:THREE.DoubleSide}));root.add(gas);
  const count=140,pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*2;pos[i*3+1]=(Math.random()-.5)*.8;pos[i*3+2]=(Math.random()-.5)*2}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));root.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xb8f1ed,size:.16,transparent:true,opacity:.25,depthWrite:false})));this.effects.set(t.id,{root,gas});return root;
 }
 private update(o:THREE.Object3D,t:TwinState,dt:number){
  o.position.set(t.position.x,t.position.y,t.position.z);o.visible=t.active||['tank','pipe','wall','ignition'].includes(t.kind);
  if(t.kind==='release'){const r=Number(t.metadata.radiusM??1);o.scale.set(Math.max(.4,r*1.8),Math.max(.25,r*.48),Math.max(.4,r));o.rotation.y=.18*Math.sin(this.clock*.7)}
  if(t.kind==='fire'){const i=Number(t.metadata.intensityMw??1),fx=this.effects.get(t.id);o.scale.setScalar(Math.max(.7,.72+i*.09));if(fx?.flame){fx.flame.rotation.y+=dt*.7;fx.flame.position.y=.18*Math.sin(this.clock*5)}if(fx?.smoke){fx.smoke.rotation.y-=dt*.08;fx.smoke.position.x=Math.sin(this.clock*.35)*.5}if(fx?.light)fx.light.intensity=18+i*2+Math.sin(this.clock*13)*4}
  if(['tank','pipe','wall'].includes(t.kind)){
   const condition=getVisualCondition(t.integrity);o.userData.condition=condition;const heat=Math.min(1,Math.max(0,(t.temperatureK-303)/240));
   o.traverse(c=>{if(c instanceof THREE.Mesh&&c.material instanceof THREE.MeshStandardMaterial){c.material.emissive.setRGB(heat*.75,heat*.08,0);c.material.emissiveIntensity=heat*2.4;if(condition==='damaged'||condition==='critical')c.material.roughness=.78;if(condition==='destroyed'){c.material.color.multiplyScalar(.38);c.material.roughness=1}}});
   if(t.integrity<.55)o.rotation.z+=(1-t.integrity)*dt*.03;
  }
 }
 pick(raycaster:THREE.Raycaster,camera:THREE.Camera,pointer:THREE.Vector2,snapshot?:WorldSnapshot){
  raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...this.objects.values()],true);
  for(const hit of hits){let n:THREE.Object3D|null=hit.object;while(n&&!n.userData.twinId)n=n.parent;if(n?.userData.twinId)return snapshot?.twins.find(t=>t.id===n!.userData.twinId)}return undefined;
 }
 getObject(id:string){return this.objects.get(id)}
}
