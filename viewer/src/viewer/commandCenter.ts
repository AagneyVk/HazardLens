import { failureModes, type FailureMode, type FailureRequest } from '../../../src/core/failures.js';
import type { WorldSnapshot } from '../../../src/core/types.js';
import type { compareIntervention } from '../../../src/facility/report.js';

interface Actions {
  inject(requests: FailureRequest[]): void; isolate(ids: string[]): void; suppress(): number; evacuate(): void;
  reset(): void; overview(): void; focus(id: string): void; toggle(): boolean; speed(value: number): void;
  select(ids: string[]): void; graph(): boolean; export(): void; forecast(): ReturnType<typeof compareIntervention>;
}
const modes: Record<FailureMode, { label: string; detail: string; icon: string }> = {
  fire: { label: 'Ignite fire', detail: 'Heat, smoke & evacuation', icon: '♨' },
  explosion: { label: 'Trigger blast', detail: 'Impulse & structural damage', icon: '✳' },
  rupture: { label: 'Start leak', detail: 'Release stored material', icon: '◉' },
  structural_damage: { label: 'Damage structure', detail: 'Fracture & collapse', icon: '▧' },
  overheat: { label: 'Overheat', detail: 'Raise thermal exposure', icon: '↑' },
  outage: { label: 'Power outage', detail: 'Disable this service', icon: '⏻' },
  ignition: { label: 'Enable ignition', detail: 'Activate ignition source', icon: 'ϟ' },
};
function button(text: string, action: () => void, className = '') {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.className = className; b.onclick = action; return b;
}
export class CommandCenter {
  readonly root = document.createElement('aside');
  private selected = new Set<string>(); private latest?: WorldSnapshot; private mode?: FailureMode;
  private search = document.createElement('input'); private assetList = document.createElement('div');
  private editor = document.createElement('aside'); private target = document.createElement('h2'); private modeGrid = document.createElement('div');
  private severity = document.createElement('input'); private severityLabel = document.createElement('span'); private feedback = document.createElement('p');
  private apply: HTMLButtonElement; private pause: HTMLButtonElement; private clock = document.createElement('span');
  private metrics = document.createElement('div'); private events = document.createElement('div'); private forecastPanel = document.createElement('section');
  private lastAssets = ''; private lastMetrics = ''; private lastEvents = -1;
  constructor(private actions: Actions) {
    const header = document.createElement('header'); header.className = 'hl-topbar';
    header.innerHTML = '<div class="hl-brand"><span class="hl-mark">H</span><div><h1>HazardLens</h1><span>INDOOR RESPONSE LAB</span></div></div><div class="hl-location"><i></i> Factory hall <span>/</span> Cutaway view</div>';
    const tools = document.createElement('div'); tools.className = 'hl-header-tools';
    tools.append(button('Overview', actions.overview), button('Connections', () => actions.graph()), button('Export', actions.export), button('Reset', () => {
      actions.reset(); this.selected.clear(); this.lastAssets = ''; this.lastMetrics = ''; this.lastEvents = -1; this.editor.hidden = true; this.pause.textContent = '▶ Run'; this.feedback.textContent = ''; this.forecastPanel.hidden = true;
    })); header.append(tools); document.body.append(header);
    this.root.className = 'hl-browser'; this.root.setAttribute('aria-label', 'Facility assets');
    const browserHeading = document.createElement('h2'); browserHeading.textContent = 'Explore the hall';
    const hint = document.createElement('p'); hint.textContent = 'Pick an object in 3D or below.';
    this.search.type = 'search'; this.search.placeholder = 'Find equipment or structure'; this.search.setAttribute('aria-label', 'Search assets'); this.search.oninput = () => this.renderAssets();
    this.assetList.className = 'hl-asset-list'; this.assetList.setAttribute('aria-label', 'Asset list');
    const clear = button('Clear selection', () => { this.selected.clear(); this.refreshSelection(); }); clear.className = 'hl-clear';
    this.root.append(browserHeading, hint, this.search, this.assetList, clear); document.body.append(this.root);
    this.editor.className = 'hl-editor'; this.editor.hidden = true; this.editor.setAttribute('aria-label', 'Damage editor');
    const kicker = document.createElement('span'); kicker.className = 'hl-kicker'; kicker.textContent = 'SELECTED TARGET';
    const focus = button('Focus ↗', () => { const id = [...this.selected].at(-1); if (id) actions.focus(id); });
    this.modeGrid.className = 'hl-modes'; this.modeGrid.setAttribute('aria-label', 'Damage options');
    const severityWrap = document.createElement('label'); severityWrap.className = 'hl-severity';
    this.severity.type = 'range'; this.severity.min = '10'; this.severity.max = '100'; this.severity.value = '70'; this.severity.setAttribute('aria-label', 'Failure severity');
    this.severity.oninput = () => this.updateSeverity(); severityWrap.append(this.severityLabel, this.severity); this.updateSeverity();
    this.apply = button('Apply disturbance', () => this.execute(() => {
      if (!this.mode || !this.selected.size) throw new Error('Select a target and an action.');
      actions.inject([...this.selected].map(twinId => ({ twinId, mode: this.mode!, severity: Number(this.severity.value) / 100 })));
      return `${modes[this.mode].label} applied to ${this.selected.size} target(s).`;
    }, true), 'hl-primary');
    this.feedback.className = 'hl-feedback'; this.feedback.setAttribute('role', 'status');
    const help = document.createElement('p'); help.className = 'hl-helper'; help.textContent = 'Shift-click to select multiple objects. Effects follow simulation time.';
    this.editor.append(kicker, this.target, focus, this.modeGrid, severityWrap, this.apply, this.feedback, help); document.body.append(this.editor);
    this.metrics.className = 'hl-metrics'; this.metrics.setAttribute('aria-label', 'Live simulation metrics'); document.body.append(this.metrics);
    const transport = document.createElement('section'); transport.className = 'hl-transport';
    this.pause = button('▶ Run', () => { this.pause.textContent = actions.toggle() ? 'Ⅱ Pause' : '▶ Run'; }, 'hl-play');
    const speed = document.createElement('select'); speed.setAttribute('aria-label', 'Simulation speed'); for (const value of [.25, 1, 2, 5]) speed.add(new Option(`${value}×`, String(value), value === 1, value === 1)); speed.onchange = () => actions.speed(Number(speed.value));
    this.clock.className = 'hl-clock';
    transport.append(this.pause, speed, this.clock, button('Evacuate', () => this.execute(() => { actions.evacuate(); return 'Evacuation alarm activated.'; }, true)), button('Suppress', () => this.execute(() => `${actions.suppress()} fire(s) targeted.`, true)), button('Isolate', () => this.execute(() => { const ids = [...this.selected].filter(id => this.latest?.twins.find(t => t.id === id)?.kind === 'pipe'); if (!ids.length) throw new Error('Select a pipe first.'); actions.isolate(ids); return 'Selected lines isolated.'; }, true)), button('Compare response', () => { this.execute(() => { this.showForecast(actions.forecast()); return 'Comparison ready.'; }); }));
    document.body.append(transport); this.events.className = 'hl-event-strip'; this.events.setAttribute('aria-label', 'Recent events'); document.body.append(this.events);
    const notice = document.createElement('div'); notice.className = 'hl-model-note'; notice.textContent = 'REFERENCE SIMULATION · NOT AN OPERATIONAL SAFETY MODEL'; document.body.append(notice);
    this.forecastPanel.className = 'hl-forecast'; this.forecastPanel.hidden = true; document.body.append(this.forecastPanel);
    document.addEventListener('keydown', e => { if ((e.target as HTMLElement).matches('input,select,textarea,button')) return; if (e.code === 'Space') { e.preventDefault(); this.pause.click(); } if (e.key === 'Escape') { this.selected.clear(); this.refreshSelection(); } });
  }
  private execute(action: () => string, running = false) { try { this.feedback.textContent = action(); if (running) this.pause.textContent = 'Ⅱ Pause'; } catch (error) { this.feedback.textContent = error instanceof Error ? error.message : String(error); } }
  private updateSeverity() { const binary = this.mode === 'outage' || this.mode === 'ignition'; this.severity.disabled = binary; this.severityLabel.textContent = binary ? 'Switch off service' : `Intensity · ${this.severity.value}%`; }
  private renderAssets() {
    if (!this.latest) return; const query = this.search.value.toLowerCase(); this.assetList.replaceChildren();
    for (const twin of this.latest.twins.filter(t => !['weather', 'release', 'fire', 'explosion'].includes(t.kind) && `${t.id} ${t.kind} ${t.metadata.label}`.toLowerCase().includes(query))) {
      const row = button('', () => {}, 'hl-asset'); row.setAttribute('aria-label', `Select ${twin.id}`); row.setAttribute('aria-pressed', String(this.selected.has(twin.id)));
      const icon = document.createElement('span'); icon.className = `hl-asset-icon ${twin.kind}`; icon.textContent = twin.kind === 'worker' ? '♙' : twin.kind === 'wall' ? '▥' : twin.kind === 'route' ? '↗' : '◈';
      const name = document.createElement('span'), strong = document.createElement('strong'), small = document.createElement('small'); strong.textContent = String(twin.metadata.label ?? twin.id); small.textContent = `${twin.id} · ${twin.integrity < .25 ? 'damaged' : twin.kind}`; name.append(strong, small); row.append(icon, name);
      row.onclick = event => this.selectTwin(twin.id, event.shiftKey || event.ctrlKey || event.metaKey); this.assetList.append(row);
    }
  }
  selectTwin(id: string, additive = false) { if (!this.latest?.twins.some(t => t.id === id)) return; if (!additive) this.selected.clear(); if (additive && this.selected.has(id)) this.selected.delete(id); else this.selected.add(id); this.refreshSelection(); }
  private refreshSelection() {
    this.renderAssets(); this.actions.select([...this.selected]); this.editor.hidden = !this.selected.size;
    const twins = [...this.selected].map(id => this.latest!.twins.find(t => t.id === id)!);
    this.target.textContent = twins.length === 1 ? String(twins[0].metadata.label ?? twins[0].id) : `${twins.length} objects`;
    const available = twins.length && twins.every(t => t.active && t.integrity > 0) ? (failureModes[twins[0].kind] ?? []).filter(mode => twins.every(t => failureModes[t.kind]?.includes(mode))) : [];
    if (!this.mode || !available.includes(this.mode)) this.mode = available[0]; this.modeGrid.replaceChildren();
    for (const mode of available) { const details = modes[mode]; const b = button('', () => { this.mode = mode; this.refreshSelection(); }, 'hl-mode'); b.setAttribute('aria-label', details.label); b.setAttribute('aria-pressed', String(this.mode === mode)); const icon = document.createElement('span'); icon.textContent = details.icon; const title = document.createElement('strong'); title.textContent = details.label; const hint = document.createElement('small'); hint.textContent = details.detail; b.append(icon, title, hint); this.modeGrid.append(b); }
    this.apply.disabled = !available.length; this.feedback.textContent = available.length ? '' : 'This object can be inspected, but has no available damage actions.'; this.updateSeverity();
  }
  private showForecast(result: ReturnType<typeof compareIntervention>) {
    this.forecastPanel.hidden = false; this.forecastPanel.replaceChildren(); const h = document.createElement('h2'); h.textContent = 'Response comparison · 10 seconds'; const text = document.createElement('p'); text.textContent = `Active fires: ${result.baseline.activeFires} without response → ${result.candidate.activeFires} with suppression. Failed assets: ${result.baseline.failedAssets} → ${result.candidate.failedAssets}.`;
    const note = document.createElement('p'); note.textContent = 'Two cloned worlds. Same initial conditions. Reference-model results, not a safety recommendation.'; this.forecastPanel.append(h, text, note, button('Close comparison', () => { this.forecastPanel.hidden = true; }));
  }
  update(snapshot: WorldSnapshot) {
    this.latest = snapshot; this.clock.textContent = `${snapshot.time.toFixed(1).padStart(5, '0')} s`;
    const key = snapshot.twins.filter(t => !['fire', 'release', 'explosion'].includes(t.kind)).map(t => `${t.id}:${t.integrity < .25}`).join('|');
    if (key !== this.lastAssets) { this.lastAssets = key; this.renderAssets(); if (this.selected.size) this.refreshSelection(); }
    const count = (kind: string) => snapshot.twins.filter(t => t.kind === kind && t.active).length;
    const values = [[count('fire'), 'fires'], [count('release'), 'releases'], [snapshot.twins.filter(t => t.kind === 'wall' && t.integrity < .25).length, 'collapsed'], [snapshot.twins.filter(t => t.kind === 'worker' && t.metadata.status === 'safe').length, 'safe']] as const;
    const summary = JSON.stringify(values); if (summary !== this.lastMetrics) { this.lastMetrics = summary; this.metrics.replaceChildren(); for (const [value, label] of values) { const cell = document.createElement('div'); cell.dataset.metric = label; const strong = document.createElement('strong'); strong.textContent = String(value); const span = document.createElement('span'); span.textContent = label === 'safe' ? 'of 8 people safe' : label; cell.append(strong, span); this.metrics.append(cell); } }
    const total = snapshot.totalEvents ?? snapshot.events.length; if (total !== this.lastEvents) { this.lastEvents = total; const last = snapshot.events.filter(e => !['thermal.exposure', 'service.changed'].includes(e.type)).at(-1); this.events.textContent = last ? `${last.time.toFixed(1)}s  /  ${last.type.replaceAll('.', ' · ')}  /  ${last.sourceId}` : 'Ready. Select an object to explore a disturbance.'; }
  }
}
