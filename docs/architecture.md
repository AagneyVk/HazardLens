# HazardLens Architecture

## 1. Product contract

HazardLens is not a timeline-driven disaster animation. A run begins from a facility configuration and a deliberate initial disturbance. Every downstream state transition must be attributable to twin logic, consequence models, uncertainty, and events.

## 2. Runtime layers

### Twin layer
Each twin owns identity, geometry reference, physical parameters, dynamic state, health, fidelity, uncertainty, capabilities, and subscriptions.

### Event fabric
Twins communicate only through typed events. Examples:
- `material_release_started`
- `thermal_exposure_changed`
- `flammable_region_intersects_ignition_source`
- `fire_started`
- `overpressure_received`
- `structural_damage_changed`
- `asset_failed`
- `geometry_changed`
- `route_invalidated`
- `suppression_activated`

### Physics/consequence layer
Provides replaceable model adapters for source terms, dispersion, thermal radiation, combustion/fire growth, blast/overpressure, component fragility, structural thermal response, exposure, and routing risk.

### World state
The single authoritative snapshot consumed by the renderer, forecast engine, intervention planner, recorder, and inspector.

### 3D renderer
Renders geometry and effects from world-state deltas. It may interpolate motion and visuals but must never alter physical state.

### Forecast/intervention layer
Clones world state, applies candidate interventions, runs forward simulations, and compares risk metrics.

## 3. Fidelity orchestration

Twins expose a fidelity level:

- `F0 Dormant`: static state only
- `F1 Monitoring`: low-cost telemetry/state checks
- `F2 Analytical`: reduced-order physical equations
- `F3 Surrogate`: calibrated surrogate / higher-resolution local model
- `F4 High Fidelity`: expensive solver or cached high-fidelity result

A scheduler raises fidelity based on proximity to active hazards, uncertainty, predicted cascade importance, and intervention relevance. Compute should follow risk rather than update every asset equally.

## 4. Simulation clocks

Rendering and physics are decoupled:

- Renderer target: 60 FPS
- Twin/state tick: 10-20 Hz
- Heavy consequence models: 1-5 Hz or event-triggered
- Monte Carlo / counterfactual forecast: on demand
- High-fidelity CFD/FEM: offline, cached, or selectively invoked

## 5. Emergent domino rule

No downstream event may depend on a scenario name or scripted timestamp.

Bad:

```text
if scenario == "tank_leak":
  at 45s: ignite()
  at 90s: explode(T2)
```

Required:

```text
ValveTwin changes leak state
→ release source calculated
→ ReleaseTwin evolves in WeatherTwin field
→ flammable region reaches IgnitionSourceTwin
→ ignition model creates FireTwin
→ thermal field reaches TankTwin T2
→ T2 thermal/pressure state evolves
→ failure model determines outcome
```

## 6. Intervention contract

Interventions are normal state changes on available facility capabilities, not magic shortcuts.

Examples:
- close isolation valve
- activate installed deluge/suppression system
- emergency shutdown
- change responder/evacuation routing
- isolate a process section

The same simulation engine must evaluate untreated and treated futures.

## 7. Provenance

Each state-changing model result should carry:

- model identifier/version
- input values
- output values
- confidence/uncertainty
- fidelity level
- source/reference key
- timestamp

This powers the Simulation Inspector and prevents the 3D experience from becoming an unexplained black box.

## 8. Safety positioning

HazardLens is a simulation and decision-support research prototype. It does not claim certified operational guidance, exact prediction, or replacement of site-specific emergency procedures and trained responders.
