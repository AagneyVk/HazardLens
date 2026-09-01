import type { TwinState } from '../../../src/core/types.js';
import type { FacilityTwinGraph } from '../../../src/facility/graph.js';
export class TwinInspector {
 private panel=document.createElement('section');private last='';
 constructor(){this.panel.className='hl-inspector';this.panel.setAttribute('aria-label','Twin inspector');this.panel.hidden=true;document.body.append(this.panel)}
 show(t?:TwinState,graph?:FacilityTwinGraph){
  if(!t){this.panel.hidden=true;this.last='';return}const key=JSON.stringify(t);if(key===this.last)return;this.last=key;this.panel.hidden=false;this.panel.replaceChildren();
  const title=document.createElement('h2');title.textContent=t.id;const subtitle=document.createElement('p');subtitle.textContent=`${t.kind.toUpperCase()} · ${t.metadata.zone??'hazard'}`;
  const values=document.createElement('dl');for(const [label,value] of [['Integrity',`${(t.integrity*100).toFixed(1)}%`],['Temperature',`${t.temperatureK.toFixed(1)} K`],['State',String(t.metadata.status??(t.active?'active':'inactive'))],['Fidelity',`F${t.fidelity}`]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;values.append(dt,dd)}
  const dependencies=document.createElement('p');dependencies.textContent=`Depends on: ${graph?.providers(t.id).join(', ')||'none'}`;
  if(t.gasCells){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent='Burning cells';dd.textContent=String(t.metadata.burningCells??0);values.append(dt,dd);const note=document.createElement('p');note.textContent=`Propane floor-layer estimate · ${Number(t.metadata.massKg).toFixed(2)} kg remaining · not CFD`;this.panel.append(note)}
  if(t.kind==='tank'){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent='Shell condition';dd.textContent=String(t.metadata.damageState??(t.integrity===0?'ruptured':'normal'));values.append(dt,dd)}
  const dependents=document.createElement('p');dependents.textContent=`Supplies: ${graph?.dependents(t.id).join(', ')||'none'}`;
  this.panel.append(title,subtitle,values,dependencies,dependents);
 }
}
