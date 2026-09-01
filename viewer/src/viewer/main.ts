import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ViewerSimulation } from './sim.js';
import { WorldRenderer } from './worldRenderer.js';
import { TwinInspector } from './inspector.js';
import { createIndustrialEnvironment } from './sceneEnvironment.js';
import { CommandCenter } from './commandCenter.js';
import './style.css';

function boot(){
 const app=document.getElementById('app')!;
 const scene=new THREE.Scene();createIndustrialEnvironment(scene);
 const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,250);camera.position.set(40,35,43);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.outputColorSpace=THREE.SRGBColorSpace;app.append(renderer.domElement);
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.25,.4,1.1));composer.addPass(new OutputPass());
 renderer.domElement.setAttribute('aria-label','Live industrial facility');
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.maxDistance=110;controls.minDistance=5;controls.maxPolarAngle=Math.PI*.47;
 const sim=new ViewerSimulation(),world=new WorldRenderer(scene),inspector=new TwinInspector();
 world.setGraph(sim.runtime.graph!.snapshot());
 let selectedId:string|undefined,cinematic=false;
 const targetPosition=new THREE.Vector3(40,35,43),targetLook=new THREE.Vector3(0,1,0);
 const focus=(id:string)=>{const t=sim.runtime.get(id);if(!t)return;targetLook.set(t.state.position.x,t.state.position.y+1.5,t.state.position.z);targetPosition.copy(targetLook).add(new THREE.Vector3(11,9,14));cinematic=true};
 const command=new CommandCenter({
  inject:requests=>sim.inject(requests),isolate:ids=>ids.forEach(id=>sim.isolatePipe(id)),suppress:()=>sim.suppress(),evacuate:()=>sim.evacuate(),
  toggle:()=>sim.toggleRunning(),speed:value=>{sim.speed=value},
  reset:()=>{sim.reset();world.clear();world.setGraph(sim.runtime.graph!.snapshot());selectedId=undefined;world.setSelection([]);inspector.show()},
  overview:()=>{targetPosition.set(40,35,43);targetLook.set(0,1,0);cinematic=true},focus,
  select:ids=>{world.setSelection(ids);selectedId=ids.at(-1);inspector.show(selectedId?sim.runtime.get(selectedId)?.state:undefined,sim.runtime.graph)},
  graph:()=>world.toggleGraph(),forecast:()=>sim.forecast(),
  export:()=>{const blob=new Blob([JSON.stringify(sim.exportReport(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hazardlens-incident.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},
 });
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down={x:0,y:0};
 renderer.domElement.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY}});
 renderer.domElement.addEventListener('pointerup',event=>{
  if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>5)return;
  pointer.set(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1);
  const selected=world.pick(raycaster,camera,pointer,sim.snapshot());
  if(selected){selectedId=selected.id;command.selectTwin(selected.id,event.ctrlKey||event.metaKey||event.shiftKey);inspector.show(selected,sim.runtime.graph)}
 });
 let last=performance.now();
 function frame(now:number){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  sim.update(dt);const snapshot=sim.snapshot();world.sync(snapshot,dt);command.update(snapshot);
  if(selectedId)inspector.show(snapshot.twins.find(t=>t.id===selectedId),sim.runtime.graph);
  if(cinematic){camera.position.lerp(targetPosition,Math.min(1,dt*3));controls.target.lerp(targetLook,Math.min(1,dt*3));if(camera.position.distanceTo(targetPosition)<.5)cinematic=false}
  controls.update();composer.render();requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight)});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();sim.running=false;const message=document.createElement('div');message.className='hl-error';message.textContent='The graphics context was lost. Reload to restore the facility.';document.body.append(message)});
}
try{boot()}catch(error){const message=document.createElement('div');message.className='hl-error';message.textContent=`Could not start the 3D viewer: ${error instanceof Error?error.message:String(error)}. A browser with WebGL2 support is required.`;document.body.append(message);console.error(error)}
