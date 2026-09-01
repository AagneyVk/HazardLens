# Multi-twin domino propagation

**Updated model:** [Spatial indoor models](spatial-models.md) supersedes the
single-cloud and automatic flash-impulse rules below. Indoor releases now use local
fuel cells and wall-aware transport. Automatic cloud explosions have been removed.

No incident sequence is scripted. A blast twin delivers one distance-attenuated
impulse to nearby structures, equipment and containment. Tanks rupture and pipes
leak; releases intersecting an active fire, early blast flash or enabled ignition
source ignite. Radiation and service failures continue through the event bus and
FacilityTwinGraph.

**Domino chain** shows the latest 12 significant events, responsible/affected twins
and inspection controls. Orange dashed 3D links show blast/ignition transfers for
six simulation seconds. **Connections** separately shows the static service graph.
Exports retain event and causal parent IDs; parents may fall outside retained history.

Try rupturing P-001, allowing gas to accumulate, then igniting T-001. Or trigger a
strong blast at T-001 and watch walls, vessels and transfer lines respond. Isolation
stops new pipe fuel; existing gas remains until burned or dispersed.

## Reference rules and limitations

[HSE's discussion of dangerous substances](https://www.hse.gov.uk/fireandexplosion/about.htm)
motivates separating fuel from ignition. No flammable concentration or air-mixing
solver is implemented. A cloud with at least 2 kg when first ignited consumes 15%
of its inventory in one reference flash impulse, with severity capped at 0.75.
Remaining fuel supplies a sustained fire. These are illustrative parameters, not
empirical explosion thresholds. Flash fuel counts toward the release's burned mass.

A blast can ignite newly released gas for its first 0.6 simulated seconds. Each
release ignites once. Walls do not shield gas, radiation or blast. Fragment collisions,
real overpressure, chemical-specific flammability and structural redistribution remain
unmodeled. This is not a validated operational safety simulator.

Tests cover blast-to-leak-to-fire propagation, flash conservation, causal events,
fuel availability, distance exclusion and deterministic cloning. Browser tests check
the chain panel alongside the existing reload and graphics-recovery checks.
