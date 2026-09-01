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
 const createComposer=()=>{const pipeline=new EffectComposer(renderer);pipeline.addPass(new RenderPass(scene,camera));pipeline.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.25,.4,1.1));pipeline.addPass(new OutputPass());return pipeline};
 let composer=createComposer(),contextLost=false,disposed=false,frameId=0,useEffects=true;
 const disposeComposer=()=>{for(const pass of composer.passes)pass.dispose();composer.dispose()};
 const message=document.createElement('div');message.className='hl-error';message.setAttribute('role','alert');message.hidden=true;document.body.append(message);
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
  reset:()=>{sim.reset();world.clear();world.setGraph(sim.runtime.graph!.snapshot());selectedId=undefined;world.setSelection([]);inspector.show();camera.position.set(40,35,43);controls.target.set(0,1,0);cinematic=false},
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
  if(disposed)return;
  frameId=requestAnimationFrame(frame);
  if(contextLost){last=now;return}
  try{
  const dt=Math.min(.05,(now-last)/1000);last=now;
  sim.update(dt);const snapshot=sim.snapshot();world.sync(snapshot,dt);command.update(snapshot);
  if(selectedId)inspector.show(snapshot.twins.find(t=>t.id===selectedId),sim.runtime.graph);
  if(cinematic){camera.position.lerp(targetPosition,Math.min(1,dt*3));controls.target.lerp(targetLook,Math.min(1,dt*3));if(camera.position.distanceTo(targetPosition)<.5)cinematic=false}
  controls.update();
  if(useEffects){try{composer.render()}catch(error){useEffects=false;renderer.setRenderTarget(null);console.warn('Postprocessing unavailable; using direct rendering.',error);renderer.render(scene,camera)}}
  else renderer.render(scene,camera);
  renderer.domElement.dataset.renderState='ready';
  message.hidden=true;
  }catch(error){sim.running=false;renderer.domElement.dataset.renderState='error';message.textContent=`The 3D view could not render: ${error instanceof Error?error.message:String(error)}. Try Reset.`;message.hidden=false;}
 }
 frameId=requestAnimationFrame(frame);
 const resize=()=>{const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);composer.setSize(width,height)};
 addEventListener('resize',resize);
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;sim.running=false;renderer.domElement.dataset.renderState='recovering';message.textContent='Restoring the 3D graphics. Your incident is preserved.';message.hidden=false});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{
  // Render targets belong to the old context. Rebuild bloom/composer targets and
  // start with direct rendering to keep recovery usable on constrained GPUs.
  disposeComposer();composer=createComposer();useEffects=false;resize();last=performance.now();contextLost=false;
 });
 addEventListener('pageshow',()=>{last=performance.now();resize()});
 addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;cancelAnimationFrame(frameId);controls.dispose();world.clear();disposeComposer();scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.LineSegments){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material]){if('map' in material)(material.map as THREE.Texture|null)?.dispose();material.dispose()}}});renderer.dispose();removeEventListener('resize',resize)});
}
try{boot()}catch(error){const message=document.createElement('div');message.className='hl-error';message.textContent=`Could not start the 3D viewer: ${error instanceof Error?error.message:String(error)}. A browser with WebGL2 support is required.`;document.body.append(message);console.error(error)}
