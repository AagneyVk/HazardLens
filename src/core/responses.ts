import type {SimulationRuntime} from './runtime.js';
import type {TwinState} from './types.js';
export type ResponseMode='isolate'|'cool'|'suppress'|'shutdown'|'restore';
export const responseModes:Record<string,readonly ResponseMode[]>={pipe:['isolate','suppress'],tank:['cool','suppress'],reactor:['cool','suppress','shutdown','restore'],pump:['shutdown','restore'],compressor:['shutdown','restore'],cooling:['shutdown','restore'],control:['restore'],emergency:['restore'],release:['suppress'],fire:['suppress']};
export function responseIssue(runtime:SimulationRuntime,id:string,mode:ResponseMode):string|undefined{
 const target=runtime.get(id)?.state;if(!target||!responseModes[target.kind]?.includes(mode))return 'Unsupported response for this target.';
 const snapshot=runtime.snapshot({eventLimit:0,includeGraph:false});
 if(['cool','suppress'].includes(mode)&&!snapshot.twins.some(t=>t.kind==='emergency'&&t.integrity>0&&t.metadata.available===true&&(runtime.graph?.providers(t.id,'control')??[]).every(p=>runtime.get(p)?.state.metadata.available===true&&runtime.get(p)!.state.integrity>0)))return 'Emergency response is unavailable.';
 if(mode==='cool'&&target.integrity<=0)return 'A destroyed vessel cannot be cooled back into service.';
 if(mode==='restore'){
  if(target.integrity<.8||target.temperatureK>360)return 'Restoration requires intact, cool equipment; destroyed assets need replacement.';
  if(snapshot.twins.some(t=>hazardNear(t,target)))return 'Active fire or gas nearby: stabilize the incident before restoration.';
 }
 return undefined;
}
function hazardNear(t:TwinState,target:TwinState){if(!t.active)return false;if(t.gasCells)return t.gasCells.some(c=>c.volumeFraction>.001&&Math.hypot(c.x-target.position.x,c.z-target.position.z)<8);return ['fire','release','explosion'].includes(t.kind)&&Math.hypot(t.position.x-target.position.x,t.position.z-target.position.z)<8}
export function queueResponses(runtime:SimulationRuntime,ids:readonly string[],mode:ResponseMode){if(!ids.length)throw new Error('Select a target first.');for(const id of ids){const issue=responseIssue(runtime,id,mode);if(issue)throw new Error(issue)}for(const id of new Set(ids))runtime.emit({type:'response.command',sourceId:'operator',targetId:id,payload:{mode}})}
export function applyResponse(runtime:SimulationRuntime,id:string,mode:ResponseMode,causedBy:string){const issue=responseIssue(runtime,id,mode);if(issue){runtime.emit({type:'response.rejected',sourceId:id,causedBy,payload:{mode,reason:issue}});return}
 const state=runtime.get(id)!.state;
 if(mode==='isolate')runtime.emit({type:'valve.command',sourceId:'operator',causedBy,payload:{pipeId:id,closed:true}});
 if(mode==='cool')state.metadata.coolingRemainingS=30;
 if(mode==='shutdown'){state.metadata.available=false;state.metadata.operating=false;state.metadata.status='offline'}
 if(mode==='restore'){state.metadata.available=true;state.metadata.status='restored'}
 if(mode==='suppress')for(const t of runtime.snapshot({eventLimit:0,includeGraph:false}).twins){const twin=runtime.get(t.id)!;const owner='sourceId' in twin?String(twin.sourceId):t.metadata.fuelSourceId;if(t.id===id||owner===id)if(t.kind==='fire'||t.kind==='release')runtime.emit({type:'suppression.command',sourceId:'operator',targetId:t.id,causedBy,payload:{strength:100}})}
 runtime.emit({type:'response.applied',sourceId:id,causedBy,payload:{mode}});
}
