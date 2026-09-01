import { SimulationRuntime } from '../../../src/core/runtime.js';
import type { Twin, WorldSnapshot } from '../../../src/core/types.js';
import { IgnitionSourceTwin, PipeTwin, TankTwin, WallTwin, WeatherTwin } from '../../../src/twins/process.js';

export class ViewerSimulation {
 runtime:SimulationRuntime; running=false; speed=1; private accumulator=0;
 constructor(){this.runtime=this.makeWorld()}
 private makeWorld(){
  const twins:Twin[]=[new WeatherTwin('WEATHER',3.4,.65)];
  const tankPositions:{id:string,x:number,z:number}[]=[];
  for(let row=0;row<6;row++)for(let col=0;col<8;col++){
   const n=row*8+col+1;const id=`T-${String(n).padStart(3,'0')}`;const x=-88+col*16;const z=-122+row*18;tankPositions.push({id,x,z});twins.push(new TankTwin(id,{x,y:3.6,z}));
  }
  // Dense process pipe racks. P-017 is deliberately placed beside the first cascade cluster.
  for(let i=1;i<=120;i++){
   const row=Math.floor((i-1)/20),col=(i-1)%20;let x=-92+col*9.5,z=-18+row*8;
   if(i===17){x=-82;z=-112}
   twins.push(new PipeTwin(`P-${String(i).padStart(3,'0')}`,{x,y:1.35,z}));
  }
  // ignition sources represent motors/hot-work points distributed across the process area
  twins.push(new IgnitionSourceTwin('M-004',{x:-73,y:1.4,z:-110}));
  twins.push(new IgnitionSourceTwin('M-018',{x:12,y:1.4,z:-8}));
  twins.push(new IgnitionSourceTwin('M-031',{x:72,y:1.4,z:18}));
  for(let i=0;i<12;i++)twins.push(new WallTwin(`W-${String(i+1).padStart(3,'0')}`,{x:-105+i*19,y:2.5,z:48}));
  return new SimulationRuntime(twins);
 }
 reset(){this.runtime=this.makeWorld();this.running=false;this.accumulator=0}
 breakPipe(id='P-017'){this.runtime.emit({type:'fault.pipe_leak',sourceId:'operator',targetId:id,payload:{rateKgS:1.25}});this.running=true}
 suppress(){for(const t of this.runtime.snapshot().twins.filter(t=>t.kind==='fire'&&t.active))this.runtime.emit({type:'suppression.command',sourceId:'operator',targetId:t.id,payload:{strength:12}});this.running=true}
 isolatePipe(id='P-017'){this.runtime.emit({type:'valve.command',sourceId:'operator',payload:{pipeId:id}});this.running=true}
 update(realDt:number){if(!this.running)return;this.accumulator+=Math.min(realDt,.1)*this.speed;while(this.accumulator>=.05){this.runtime.step(.05);this.accumulator-=.05}}
 snapshot():WorldSnapshot{return this.runtime.snapshot()}
}
