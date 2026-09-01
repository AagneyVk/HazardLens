import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewerSimulation } from './sim.js';
import { WorldRenderer } from './worldRenderer.js';
import { TwinInspector } from './inspector.js';
import { createIndustrialEnvironment } from './sceneEnvironment.js';
import { CommandCenter } from './commandCenter.js';

const app=document.getElementById('app')!;
const scene=new THREE.Scene();createIndustrialEnvironment(scene);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,1500);camera.position.set(155,125,185);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=THREE.SRGBColorSpace;app.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,-35);controls.enableDamping=true;controls.dampingFactor=.055;controls.maxDistance=430;controls.minDistance=10;controls.maxPolarAngle=Math.PI*.48;
const sim=new ViewerSimulation();const world=new WorldRenderer(scene);const inspector=new TwinInspector();const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
const cameraTarget={p:new THREE.Vector3(155,125,185),t:new THREE.Vector3(0,0,-35)};let cinematic=false;let selectedId:string|undefined;
const command=new CommandCenter({inject:requests=>sim.inject(requests),isolate:ids=>ids.forEach(id=>sim.isolatePipe(id)),toggle:()=>sim.toggleRunning(),suppress:()=>sim.suppress(),reset:()=>{sim.reset();selectedId=undefined;inspector.show()},overview:()=>{cameraTarget.p.set(155,125,185);cameraTarget.t.set(0,0,-35);cinematic=true},incident:()=>{cameraTarget.p.set(-48,30,-65);cameraTarget.t.set(-80,1,-112);cinematic=true}});
renderer.domElement.addEventListener('pointerdown',e=>{if((e.target as HTMLElement).tagName!=='CANVAS')return;pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;const snap=sim.snapshot();const selected=world.pick(raycaster,camera,pointer,snap);selectedId=selected?.id;inspector.show(selected);if(selected)command.selectTwin(selected.id,e.ctrlKey||e.metaKey||e.shiftKey)});
let last=performance.now();function frame(now:number){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;sim.update(dt);const snap=sim.snapshot();world.sync(snap,dt);command.update(snap);if(selectedId)inspector.show(snap.twins.find(t=>t.id===selectedId));if(cinematic){camera.position.lerp(cameraTarget.p,Math.min(1,dt*2.4));controls.target.lerp(cameraTarget.t,Math.min(1,dt*2.4));if(camera.position.distanceTo(cameraTarget.p)<.5)cinematic=false}controls.update();renderer.render(scene,camera)}requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

