import { failureModes, type FailureMode, type FailureRequest } from '../../../src/core/failures.js';
import type { WorldSnapshot } from '../../../src/core/types.js';
import type { compareIntervention } from '../../../src/facility/report.js';

interface Actions {
 inject(requests: FailureRequest[]): void; isolate(ids: string[]): void; suppress(): number;
 reset(): void; overview(): void; focus(id: string): void; toggle(): boolean; speed(value: number): void;
 select(ids: string[]): void; graph(): boolean; export(): void;
 forecast(): ReturnType<typeof compareIntervention>;
}
const button = (label: string, action: () => void, className = '') => {
 const element = document.createElement('button'); element.type = 'button'; element.textContent = label;
 element.className = `hl-button ${className}`; element.onclick = action; return element;
};

export class CommandCenter {
 readonly root = document.createElement('aside');
 private readonly stats = document.createElement('div');
 private readonly clock = document.createElement('span');
 private readonly assetSelect = document.createElement('select');
 private readonly search = document.createElement('input');
 private readonly modeSelect = document.createElement('select');
 private readonly severity = document.createElement('input');
 private readonly severityText = document.createElement('span');
 private readonly feedback = document.createElement('div');
 private readonly timeline = document.createElement('section');
 private readonly forecastPanel = document.createElement('section');
 private readonly injectButton: HTMLButtonElement;
 private readonly pauseButton: HTMLButtonElement;
 private readonly selected = new Set<string>();
 private latest?: WorldSnapshot;
 private assetKey = '';
 private lastEventCount = -1;
 private lastSummary = '';
 private graphButton: HTMLButtonElement;

 constructor(private readonly actions: Actions) {
  this.root.className = 'hl-console'; this.root.setAttribute('aria-label', 'Industrial command center');
  const header = document.createElement('header');header.className='hl-brand';
  header.innerHTML='<span class="hl-logomark">H</span><div><h1>HazardLens</h1><p>INDUSTRIAL TWIN PLATFORM</p></div><span class="hl-badge">LAB</span>';
  const intro=document.createElement('p');intro.className='hl-intro';intro.textContent='One facility. Connected consequences. Explore failures across the live twin network.';
  this.stats.className='hl-stats';this.stats.setAttribute('aria-label','Facility metrics');
  const transport=document.createElement('div');transport.className='hl-transport';
  this.pauseButton=button('Resume',()=>{this.pauseButton.textContent=actions.toggle()?'Pause':'Resume'});
  const speed=document.createElement('select');speed.setAttribute('aria-label','Simulation speed');
  for(const value of [1,2,5,10])speed.add(new Option(`${value}× speed`,String(value)));
  speed.onchange=()=>actions.speed(Number(speed.value));
  this.clock.className='hl-clock';transport.append(this.pauseButton,speed,this.clock);
  const heading=document.createElement('h2');heading.textContent='01 / Select assets';
  this.search.type='search';this.search.placeholder='Search ID, asset type, or zone';this.search.setAttribute('aria-label','Search assets');
  this.search.oninput=()=>this.renderAssets();
  this.assetSelect.multiple=true;this.assetSelect.size=6;this.assetSelect.setAttribute('aria-label','Target assets');
  this.assetSelect.onchange=()=>{for(const option of this.assetSelect.options){if(option.selected)this.selected.add(option.value);else this.selected.delete(option.value)}this.refreshModes();};
  const selectionTools=document.createElement('div');selectionTools.className='hl-selection-tools';
  selectionTools.append(button('Focus',()=>{const id=[...this.selected].at(-1);if(id)actions.focus(id)}),button('Select visible',()=>{for(const o of this.assetSelect.options){o.selected=true;this.selected.add(o.value)}this.refreshModes()}),button('Clear',()=>{this.selected.clear();this.renderAssets();this.refreshModes()}));
  const hint=document.createElement('p');hint.className='hl-hint';hint.textContent='Ctrl/Cmd-click selects multiple. Click a 3D asset to inspect; Shift-click adds it.';
  const failureHeading=document.createElement('h2');failureHeading.textContent='02 / Apply disturbance';
  const modeLabel=document.createElement('label');modeLabel.textContent='Failure mode';modeLabel.append(this.modeSelect);this.modeSelect.setAttribute('aria-label','Failure mode');
  this.modeSelect.onchange=()=>this.updateSeverity();
  this.severity.type='range';this.severity.min='1';this.severity.max='100';this.severity.value='50';this.severity.setAttribute('aria-label','Failure severity');this.severity.oninput=()=>this.updateSeverity();
  const severityLabel=document.createElement('label');severityLabel.append(this.severityText,this.severity);this.updateSeverity();
  this.feedback.className='hl-feedback';this.feedback.setAttribute('role','status');
  this.injectButton=button('Inject failure',()=>this.execute(()=>{actions.inject([...this.selected].map(twinId=>({twinId,mode:this.modeSelect.value as FailureMode,severity:Number(this.severity.value)/100})));return `Queued disturbances for ${this.selected.size} assets.`},true),'hl-danger');
  this.injectButton.disabled=true;
  const interventions=document.createElement('div');interventions.className='hl-action-grid';
  interventions.append(button('Isolate selected pipes',()=>this.execute(()=>{const ids=[...this.selected].filter(id=>this.latest?.twins.find(t=>t.id===id)?.kind==='pipe');if(!ids.length)throw new Error('Select at least one pipe.');actions.isolate(ids);return `${ids.length} pipe(s) isolated.`},true)),button('Suppress fires',()=>this.execute(()=>`${actions.suppress()} fire(s) targeted.`,true)));
  const footer=document.createElement('div');footer.className='hl-action-grid';
  this.graphButton=button('Show connections',()=>{this.graphButton.textContent=actions.graph()?'Hide connections':'Show connections'});
  footer.append(button('Overview',actions.overview),this.graphButton,button('Export incident JSON',actions.export),button('Reset facility',()=>{actions.reset();this.selected.clear();this.assetKey='';this.lastEventCount=-1;this.forecastPanel.hidden=true;this.pauseButton.textContent='Resume';this.graphButton.textContent='Show connections';this.feedback.textContent='Facility restored.';}));
  const forecast=button('Compare suppression · 10s',()=>{this.feedback.textContent='Comparing two isolated copies of the live world…';setTimeout(()=>this.execute(()=>{this.showForecast(actions.forecast());return 'Comparison ready. Live state was not changed.';}),0)});
  const note=document.createElement('p');note.className='hl-model-note';note.textContent='Reference model · qualitative training and research. Not a validated emergency-response forecast.';
  this.root.append(header,intro,this.stats,transport,heading,this.search,this.assetSelect,selectionTools,hint,failureHeading,modeLabel,severityLabel,this.injectButton,this.feedback,interventions,forecast,footer,note);
  document.body.append(this.root);
  this.timeline.className='hl-timeline';this.timeline.setAttribute('aria-label','Causal event timeline');document.body.append(this.timeline);
  this.forecastPanel.className='hl-forecast';this.forecastPanel.hidden=true;document.body.append(this.forecastPanel);
 }
 private execute(action:()=>string,running=false){try{this.feedback.textContent=action();if(running)this.pauseButton.textContent='Pause'}catch(error){this.feedback.textContent=error instanceof Error?error.message:String(error)}}
 private updateSeverity(){const binary=['outage','ignition'].includes(this.modeSelect.value);this.severity.disabled=binary;this.severityText.textContent=binary?'Binary action · on/off':`Severity · ${this.severity.value}%`}
 private renderAssets(){
  if(!this.latest)return;const query=this.search.value.toLowerCase();
  this.assetSelect.replaceChildren(...this.latest.twins.filter(t=>failureModes[t.kind]&&t.active&&t.integrity>0&&`${t.id} ${t.kind} ${t.metadata.zone}`.toLowerCase().includes(query)).map(t=>{const o=new Option(`${t.id} · ${t.kind}`,t.id);o.selected=this.selected.has(t.id);return o}));
 }
 private refreshModes(){
  if(!this.latest)return;const ids=[...this.selected],previous=this.modeSelect.value;
  const kinds=ids.map(id=>this.latest!.twins.find(t=>t.id===id)?.kind);
  const modes=kinds[0]?(failureModes[kinds[0]]??[]).filter(mode=>kinds.every(kind=>kind&&failureModes[kind]?.includes(mode))):[];
  this.modeSelect.replaceChildren(...modes.map(mode=>new Option(mode.replaceAll('_',' '),mode)));
  if(modes.includes(previous as FailureMode))this.modeSelect.value=previous;
  this.injectButton.disabled=!modes.length;this.updateSeverity();
  this.feedback.textContent=!ids.length?'Select one or more assets to begin.':!modes.length?'Selected assets have no common failure mode.':`${ids.length} assets selected.`;
  this.actions.select(ids);
 }
 selectTwin(id:string,additive=false){
  if(!this.latest?.twins.some(t=>t.id===id&&failureModes[t.kind]&&t.integrity>0&&t.active))return;
  if(!additive)this.selected.clear();this.selected.add(id);this.renderAssets();this.refreshModes();
 }
 private showForecast(result:ReturnType<typeof compareIntervention>){
  this.forecastPanel.hidden=false;this.forecastPanel.replaceChildren();
  const title=document.createElement('h2');title.textContent='Suppression comparison · 10s horizon';
  const table=document.createElement('table');const header=document.createElement('tr');for(const text of ['Outcome','No intervention','Suppression']){const th=document.createElement('th');th.textContent=text;header.append(th)}table.append(header);
  for(const [label,key] of [['Failed assets','failedAssets'],['Active fires','activeFires'],['Offline equipment','offlineAssets']] as const){const row=document.createElement('tr');for(const text of [label,String(result.baseline[key]),String(result.candidate[key])]){const td=document.createElement('td');td.textContent=text;row.append(td)}table.append(row)}
  const note=document.createElement('p');note.textContent='Same starting state and reference models. This is a comparison, not a safety recommendation.';
  this.forecastPanel.append(title,table,note,button('Close',()=>{this.forecastPanel.hidden=true}));
 }
 update(snapshot:WorldSnapshot){
  this.latest=snapshot;this.clock.textContent=`T+ ${snapshot.time.toFixed(1)}s`;
  const assets=snapshot.twins.filter(t=>failureModes[t.kind]&&t.active&&t.integrity>0),key=assets.map(t=>t.id).join('|');
  if(key!==this.assetKey){this.assetKey=key;const available=new Set(assets.map(t=>t.id));for(const id of this.selected)if(!available.has(id))this.selected.delete(id);this.renderAssets();this.refreshModes()}
  const fires=snapshot.twins.filter(t=>t.kind==='fire'&&t.active).length,releases=snapshot.twins.filter(t=>t.kind==='release'&&t.active).length,failed=snapshot.twins.filter(t=>t.integrity===0).length,assetCount=snapshot.twins.filter(t=>!['fire','release','weather'].includes(t.kind)).length;
  const summary=`${assetCount}/${fires}/${releases}/${failed}`;
  if(summary!==this.lastSummary){this.lastSummary=summary;this.stats.replaceChildren();for(const [value,label] of [[assetCount,'ASSETS'],[fires,'FIRES'],[releases,'RELEASES'],[failed,'FAILED']]){const stat=document.createElement('div'),strong=document.createElement('strong'),caption=document.createElement('span');strong.textContent=String(value);caption.textContent=String(label);stat.dataset.metric=String(label).toLowerCase();stat.append(strong,caption);this.stats.append(stat)}}
  const total=snapshot.totalEvents??snapshot.events.length;
  if(total!==this.lastEventCount){this.lastEventCount=total;const title=document.createElement('h2');title.textContent=`Event trace · ${total}`;this.timeline.replaceChildren(title);
   const significant=snapshot.events.filter(e=>e.type!=='thermal.exposure').slice(-6).reverse();
   for(const event of significant){const row=document.createElement('div');row.className='hl-event';const name=document.createElement('strong');name.textContent=event.type;const detail=document.createElement('span');detail.textContent=`${event.time.toFixed(1)}s · ${event.sourceId}${event.targetId?` → ${event.targetId}`:''}${event.causedBy?` · caused by ${event.causedBy}`:''}`;row.append(name,detail);this.timeline.append(row)}
   if(!significant.length){const empty=document.createElement('p');empty.textContent='Inject any fault. Follow the consequences here.';this.timeline.append(empty)}
  }
 }
}
