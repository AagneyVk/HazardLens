# HazardLens

**HazardLens** is an emergent industrial-disaster digital-twin platform for DER-02: Threat-Zone Estimation for Industrial Fire and Explosion Response.

The core idea is deliberately different from a scripted scenario simulator: HazardLens models the **things that cause disasters**. Tanks, pipes, valves, structures, weather, hazards, workers, and response systems are represented as independent twins. Their state changes propagate through an event fabric, allowing leaks, ignition, fire spread, thermal escalation, structural damage, secondary releases, explosions, evacuation changes, and mitigation outcomes to emerge from the current facility state.

## Core principles

1. **No fixed catastrophe scripts.** The operator injects an initial disturbance; downstream effects must come from twin state and interaction models.
2. **Asset-level twins own their state.** The renderer never decides physical outcomes.
3. **Events connect twins.** Thermal exposure, overpressure, flow loss, rupture, ignition, geometry changes, and intervention actions are first-class events.
4. **3D is a view of world state.** Damage, fire, plume, evacuation, and suppression visuals reflect simulation state rather than drive it.
5. **Adaptive fidelity.** Expensive models are activated around risk; stable assets remain cheap.
6. **Counterfactual intervention.** A live state can be cloned and candidate response plans simulated before selection.
7. **Model provenance and uncertainty are visible.** HazardLens is decision-support simulation, not a claim of exact future prediction.

## Target judge loop

**Break → Emerge → Predict → Intervene → Simulate → Compare → Contain**

A judge can select a supported asset and inject a fault. HazardLens lets the domino effect emerge. On a second run, Intervention Mode identifies candidate ways to break the cascade, simulates those futures in the same 3D twin world, and compares outcomes.

## Planned twin library

- Process: `TankTwin`, `PipeTwin`, `ValveTwin`, `PumpTwin`, `IgnitionSourceTwin`
- Structure: `WallTwin`, `ColumnTwin`, `WindowTwin`, `DoorTwin`, `BuildingTwin`
- Environment: `WeatherTwin`, `TerrainTwin`, `SensorTwin`
- Hazard: `ReleaseTwin`, `PlumeTwin`, `FireTwin`, `PoolFireTwin`, `JetFireTwin`, `BlastTwin`
- Human/response: `WorkerTwin`, `ResponderTwin`, `RouteTwin`, `SuppressionTwin`, `IsolationTwin`

## Architecture

```text
Twin Library ──→ Event Fabric ──→ Physics / Consequence Models
      │                                │
      └──────────────→ World State ←───┘
                            │
                 ┌──────────┴──────────┐
                 ↓                     ↓
             3D Renderer        Forecast / Intervention
```

See [`docs/architecture.md`](docs/architecture.md) and [`docs/twin-specification.md`](docs/twin-specification.md) for the implementation contract.

## Status

Foundation phase: architecture, twin contracts, causal event model, fidelity policy, and validation plan.
