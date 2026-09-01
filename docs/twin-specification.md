# Twin Specification

This document is the engineering contract for every twin added to HazardLens.

## Required twin interface

Every twin must define:

- `id`
- `type`
- `geometryRef`
- immutable physical parameters
- mutable dynamic state
- health/damage state
- fidelity level
- uncertainty state
- subscribed event types
- emitted event types
- model/provenance metadata

## Initial professional twin set

| Twin | Core state | Receives | Emits |
|---|---|---|---|
| `TankTwin` | inventory, pressure, fluid temperature, shell temperature, fill, integrity | heat flux, overpressure, connected-flow changes, cooling | pressure/temperature changes, release, failure |
| `PipeTwin` | pressure, flow, contents, temperature, integrity | pressure surge, heat, impact, valve state | leak/rupture, flow change |
| `ValveTwin` | open fraction, actuator state, integrity | operator command, pressure, heat | flow restriction, leak, isolated |
| `IgnitionSourceTwin` | active state, location, ignition capability | flammable-envelope intersection | ignition event |
| `WeatherTwin` | wind vector, ambient temperature, stability inputs | operator/live input | environment changed |
| `ReleaseTwin` | source rate, material, phase, extent | source change, weather, geometry | concentration/flammability fields |
| `FireTwin` | location, fuel source, heat-release proxy, thermal field, smoke state | fuel, ventilation/weather, suppression | thermal exposure, smoke, extinguished |
| `BlastTwin` | origin, energy/yield proxy, pressure/impulse field | initiating failure | overpressure/impulse exposure |
| `WallTwin` | material, dimensions, thermal state, blast impulse, integrity, damage class | heat, blast, impact | geometry change, debris/obstruction, failure |
| `WorkerTwin` | position, mobility, exposure, route | hazard field, route changes | exposure state, evacuation progress |
| `RouteTwin` | graph edges, capacity, obstruction, risk cost | hazard/geometry changes | route invalidation/recommendation |
| `SuppressionTwin` | agent/system type, capacity, coverage, status | intervention command | cooling/suppression field |

## Twin quality gate

A twin is not considered production/demo ready until all are present:

1. State schema with units.
2. Causal inputs and outputs.
3. At least one defensible model/reference path.
4. Explicit limitations.
5. Deterministic unit tests for hand-checkable cases.
6. Validation test against a reference calculation/tool/dataset where practical.
7. Visual-state mapping that does not invent physical outcomes.
8. Provenance emitted with every important model result.

## Domino causality matrix v0

```text
Valve/Pipe fault
  → source release
  → dispersion / flammable envelope
  → ignition intersection
  → fire
  → thermal exposure
  → asset heating / material ignition / strength loss
  → component failure or geometry change
  → secondary release / obstruction / blast
  → new hazard twins
  → evolving global threat field
  → worker/responder route changes
```

The first vertical slice will prove this chain without scenario-specific timing.

## First vertical slice

Facility:
- 2 pressurized tanks
- 1 pump/ignition source
- connected valves/pipes
- 1 wall
- worker group + two exits
- fixed suppression system

Supported initial disturbances:
- pipe leak
- valve stuck open
- cooling failure
- pump ignition source enabled/disabled
- wind direction/speed change

Required emergent outcomes:
- release evolves from source state
- ignition occurs only if modeled conditions are satisfied
- fire applies thermal exposure to nearby twins
- neighboring tank risk evolves with exposure
- wall damage state evolves from hazard exposure
- pipe/tank failure can instantiate secondary hazard twins
- route cost changes with evolving threat field
- intervention branches use the same twin engine

## Explicit non-goals for v0

- particle-level fracture simulation
- full CFD on every frame
- exact crack geometry prediction
- certified fire-fighting instructions
- unrestricted arbitrary chemistry
- biomechanical casualty prediction

These can be represented later through higher-fidelity adapters without changing the twin/event contract.
