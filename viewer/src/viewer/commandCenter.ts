import { failureModes, type FailureMode, type FailureRequest } from '../../../src/core/failures.js';
import type { WorldSnapshot } from '../../../src/core/types.js';

export class CommandCenter {
 readonly root=document.createElement('div');private status=document.createElement('div');private timeline=document.createElement('div');private stats=document.createElement('div');private actions=document.createElement('div');
 private assetSelect=document.createElement('select');
 private modeSelect=document.createElement('select');
 private severity=document.createElement('input');
 private feedback=document.createElement('div');
 private injectButton=document.createElement('button');
 private pauseButton=document.createElement('button');
 private latest?:WorldSnapshot;
 private assetKey='';
 constructor(actions:{inject:(requests:FailureRequest[])=>void,isolate:(ids:string[])=>void,suppress:()=>void,reset:()=>void,overview:()=>void,incident:()=>void,toggle:()=>boolean}){
  const style=document.createElement('style');style.textContent=`*{box-sizing:border-box}html,body,#app{margin:0;width:100%;height:100%;overflow:hidden;background:#071018;font-family:Inter,ui-sans-serif,system-ui;color:#e9f4f8}button{font:inherit}.hl-glass{background:linear-gradient(145deg,rgba(8,19,27,.9),rgba(8,19,27,.68));border:1px solid rgba(136,184,204,.18);box-shadow:0 16px 50px rgba(0,0,0,.28);backdrop-filter:blur(18px)}.hl-btn{border:1px solid #365160;background:#10232d;color:#dff5ff;padding:9px 12px;border-radius:9px;cursor:pointer;letter-spacing:.03em}.hl-btn:disabled{opacity:.45;cursor:not-allowed}.hl-btn:hover{background:#183542}.hl-danger{border-color:#8c3f34;background:#3b1916}.hl-accent{color:#65d6e8}.hl-muted{color:#78909c}.hl-kpi{font-size:24px;font-weight:650}.hl-event{padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:11px}.hl-pill{display:inline-block;padding:3px 7px;border-radius:99px;background:#15313c;color:#75d8e5;font-size:10px;letter-spacing:.08em}`;document.head.appendChild(style);
  this.root.innerHTML=`<div class="hl-glass" style="position:fixed;left:18px;top:18px;width:min(330px,calc(100vw - 36px));max-height:calc(100vh - 36px);border-radius:14px;overflow:auto;z-index:10"><div style="padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08)"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:18px;font-weight:700;letter-spacing:.14em">HAZARDLENS</div><div class="hl-muted" style="font-size:10px;letter-spacing:.16em;margin-top:4px">INDUSTRIAL TWIN COMMAND</div></div><span class="hl-pill">LIVE</span></div></div></div>`;
  document.body.appendChild(this.root);const card=this.root.firstElementChild as HTMLElement;this.status.style.cssText='padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.07)';this.stats.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:14px 18px';this.actions.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 18px 16px';card.append(this.status,this.stats,this.actions);
  const faultPanel=document.createElement('div');faultPanel.style.cssText='padding:0 18px 16px;display:grid;gap:8px';
  const label=(text:string,control:HTMLElement)=>{const l=document.createElement('label');l.textContent=text;l.style.cssText='font-size:12px;display:grid;gap:5px';l.appendChild(control);faultPanel.appendChild(l)};
  this.assetSelect.multiple=true;this.assetSelect.size=5;this.assetSelect.className='hl-btn';this.assetSelect.setAttribute('aria-label','Target assets');
  label('Target assets · Ctrl/Cmd-click for multiple',this.assetSelect);
  this.assetSelect.onchange=()=>this.refreshModes();
  this.modeSelect.className='hl-btn';this.modeSelect.setAttribute('aria-label','Failure mode');label('Failure mode',this.modeSelect);
  this.severity.type='range';this.severity.min='1';this.severity.max='100';this.severity.value='50';this.severity.setAttribute('aria-label','Failure severity');
  const severityLabel=document.createElement('label');const severityText=document.createElement('span');
  const updateSeverity=()=>severityText.textContent=`Severity · ${this.severity.value}%`;updateSeverity();this.severity.oninput=updateSeverity;
  severityLabel.append(severityText,this.severity);severityLabel.style.cssText='display:grid;gap:5px;font-size:12px';faultPanel.appendChild(severityLabel);
  this.feedback.setAttribute('role','status');this.feedback.style.cssText='font-size:11px;color:#a9d5df;min-height:16px';faultPanel.appendChild(this.feedback);card.insertBefore(faultPanel,this.actions);
  const add=(label:string,fn:()=>void,cls='')=>{const b=document.createElement('button');b.className=`hl-btn ${cls}`;b.textContent=label;b.onclick=fn;this.actions.appendChild(b);return b};
  this.injectButton=add('INJECT FAILURE',()=>{
   try{
    const ids=this.selectedIds();if(!ids.length)throw new Error('Select at least one asset');
    actions.inject(ids.map(twinId=>({twinId,mode:this.modeSelect.value as FailureMode,severity:Number(this.severity.value)/100})));
    this.feedback.textContent=`Queued ${ids.length} asset disturbance${ids.length===1?'':'s'}.`;this.pauseButton.textContent='PAUSE';
   }catch(error){this.feedback.textContent=error instanceof Error?error.message:String(error)}
  },'hl-danger');
  add('ISOLATE PIPES',()=>{const ids=this.selectedIds().filter(id=>this.latest?.twins.find(t=>t.id===id)?.kind==='pipe');if(!ids.length){this.feedback.textContent='Select one or more pipes to isolate.';return}actions.isolate(ids);this.feedback.textContent=`Isolation queued for ${ids.length} pipe(s).`;this.pauseButton.textContent='PAUSE'});
  add('SUPPRESS FIRES',()=>{actions.suppress();this.pauseButton.textContent='PAUSE'});
  add('RESET WORLD',()=>{actions.reset();this.feedback.textContent='World reset.';this.pauseButton.textContent='RESUME'});
  this.pauseButton=add('RESUME',()=>{this.pauseButton.textContent=actions.toggle()?'PAUSE':'RESUME'});
  add('OVERVIEW',actions.overview);add('INCIDENT CAM',actions.incident);
  this.timeline.className='hl-glass';this.timeline.style.cssText='position:fixed;right:18px;bottom:18px;width:330px;max-height:240px;overflow:hidden;border-radius:14px;padding:14px 16px;z-index:9';document.body.appendChild(this.timeline);
 }
 private selectedIds(){return Array.from(this.assetSelect.selectedOptions,o=>o.value)}
 private refreshModes(){
  const ids=this.selectedIds(),previous=this.modeSelect.value;
  const modes=ids.length?(failureModes[this.latest!.twins.find(t=>t.id===ids[0])!.kind]??[]).filter(mode=>ids.every(id=>failureModes[this.latest!.twins.find(t=>t.id===id)!.kind]?.includes(mode))):[];
  this.modeSelect.replaceChildren(...modes.map(mode=>{const option=document.createElement('option');option.value=mode;option.textContent=mode.replaceAll('_',' ');return option}));
  if(modes.includes(previous as FailureMode))this.modeSelect.value=previous;
  this.injectButton.disabled=!modes.length;
  this.feedback.textContent=!ids.length?'Select assets in the list or click an asset in 3D.':!modes.length?'These asset types have no shared failure mode.':`${ids.length} asset(s) selected.`;
 }
 selectTwin(id:string,additive=false){
  if(!Array.from(this.assetSelect.options).some(o=>o.value===id))return;
  for(const option of this.assetSelect.options)option.selected=option.value===id||(additive&&option.selected);
  this.refreshModes();
 }
 update(s:WorldSnapshot){
 this.latest=s;
 const assets=s.twins.filter(t=>failureModes[t.kind]&&t.active&&t.integrity>0),key=assets.map(t=>t.id).join('|');
 if(key!==this.assetKey){const selected=this.selectedIds();this.assetKey=key;this.assetSelect.replaceChildren(...assets.map(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=`${t.id} · ${t.kind}`;o.selected=selected.includes(t.id);return o}));this.refreshModes()}
 const fires=s.twins.filter(t=>t.kind==='fire'&&t.active).length,releases=s.twins.filter(t=>t.kind==='release'&&t.active).length,critical=s.twins.filter(t=>t.integrity<.5&&['tank','pipe','wall'].includes(t.kind)).length;this.status.innerHTML=`<div style="display:flex;justify-content:space-between"><span class="hl-muted">FACILITY STATUS</span><b class="${fires?'':'hl-accent'}">${fires||releases||critical?'INCIDENT ACTIVE':'NOMINAL'}</b></div><div style="margin-top:7px;font-size:12px">Simulation T+ ${s.time.toFixed(1)} s · ${s.twins.length} live digital twins</div>`;this.stats.innerHTML=`<div><div class="hl-kpi">${fires}</div><div class="hl-muted" style="font-size:10px">FIRES</div></div><div><div class="hl-kpi">${releases}</div><div class="hl-muted" style="font-size:10px">PLUMES</div></div><div><div class="hl-kpi">${critical}</div><div class="hl-muted" style="font-size:10px">CRITICAL</div></div>`;const events=s.events.slice(-8).reverse();this.timeline.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:8px"><b>CAUSAL TIMELINE</b><span class="hl-muted">${s.events.length} EVENTS</span></div>${events.map(e=>`<div class="hl-event"><span class="hl-muted">${e.time.toFixed(1)}s</span> &nbsp; <b>${e.type}</b><br/><span class="hl-muted">${e.sourceId}${e.targetId?` → ${e.targetId}`:''}</span></div>`).join('')||'<div class="hl-muted" style="font-size:12px">Inject a fault to begin the causal replay.</div>'}`}
}

