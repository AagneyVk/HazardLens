# Industrial platform architecture

## Ownership

`src/facility/generator.ts` creates every facility twin and a `FacilityTwinGraph`.
The graph contains stable IDs, positions, zones, and typed directed edges. Graph
construction rejects missing endpoints, self-links and duplicate edges; validation
checks that every facility node has a twin and every facility twin has a node.
Transient fires and releases are runtime-created twins, not static graph nodes.

`SimulationRuntime` owns time, the twin registry, the event queue and retained history.
`Twin.tick(dt, context)` changes simulation state; `onEvent` reacts to targeted or
broadcast events. Commands are validated as a complete batch before enqueueing.
Snapshots contain deep copies. Counterfactuals clone state, queued events, metadata,
time, counters and topology.

The viewer obtains snapshots from `ViewerSimulation`. `WorldRenderer` binds geometry
to `TwinState.id`; equipment appearance, selection, integrity, heat and activity come
from those states. Only the ground, grid and lights exist outside the twin model.
Reset explicitly disposes facility geometries/materials before rebuilding.

## Time and service semantics

The viewer integrates in fixed 0.05-second steps. The core permits other positive
finite steps for experiments. Each step drains commands, ticks a stable twin list,
advances time, then drains resulting events. Event times identify the emission
instant. Heat events carry duration explicitly, so heat dose is kW/m² × seconds.

Graph edges distinguish process, power, cooling, control and emergency-route links.
Process links currently document connectivity; this is not a hydraulic network solver.
Pumps gate connected pipe withdrawal. Cooling gates reactor temperature evolution.
The control center and access roads gate emergency-system availability. Compressor
failure affects its own state; compressor process dynamics are not yet coupled.
Dependencies read provider states in deterministic generator order; graph edits and
arbitrary cyclic coupled-equation solving are not supported.

## Bounded data

The runtime retains 20,000 recent events and counts all processed events. Each twin
retains at most 256 local history entries. Viewer snapshots request 80 significant
events; raw thermal ticks are omitted from the displayed trace. JSON export discloses
history truncation. It is an incident snapshot, not a complete replay archive or a
durable audit database. Long-running telemetry ingestion requires external persistence.

## Branch integration

The upstream industrial expansion commit `8e963c2` was an ancestor of foundation
`b7afbdd`; there were no unmerged commits in the former. The production-feature branch
starts from `b7afbdd`. Obsolete viewer-only generators, registries and queue stubs were
removed after their roles were integrated into the core.
