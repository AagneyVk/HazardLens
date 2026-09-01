# Model registry and research rationale

The indoor 0.4.0 spatial model is specified in [Spatial model audit](spatial-models.md).
It supersedes the legacy indoor plume, tank-heating and ignition assumptions below;
the original outdoor benchmark retains its reference models.

Reviewed 2026-09-01. These sources inform architecture and validation discipline;
HazardLens does not implement or claim conformance to the listed standards or tools.

| Method / source | Applied in this release | Boundary |
|---|---|---|
| [NIST: credibility considerations for digital twins](https://www.nist.gov/publications/credibility-consideration-digital-twins-manufacturing) | Versioned exports, explicit model assumptions, independent invariant tests and validation gates | No empirical plant validation or uncertainty calibration |
| [FMI 3.0.2 specification](https://fmi-standard.org/docs/3.0.2/) | Explicit event boundaries and separation of runtime from model state make later co-simulation integration feasible | No FMU importer/exporter or FMI certification |
| [NIST FDS documentation](https://pages.nist.gov/fds-smv/manuals.html) | Separate verification, experimental validation and configuration records | No CFD/FDS calculation is executed here |
| [NOAA ALOHA limitations](https://response.restoration.noaa.gov/oil-and-chemical-spills/chemical-spills/response-tools/alohas-limitations.html) | Avoid presenting an illustrative plume as a validated threat zone; state environmental limitations | No ALOHA equivalence, dense-gas solver, toxic LOC, BLEVE or blast solver |
| [Three.js resource cleanup](https://threejs.org/manual/en/cleanup.html) | Explicit geometry/material disposal on reset/removal | GPU memory depends on browser and hardware |
| [Three.js instanced meshes](https://threejs.org/docs/pages/InstancedMesh.html) | Reviewed for large-scene optimization | Indoor equipment remains individually selectable meshes |

## Reference parameters

The indoor viewer adds reference blast impulses, analytic falling debris and grid-based
evacuation. Their rendering sources and explicit physical limitations are documented in
[Indoor response lab](indoor-redesign.md). Indoor walls do not shield the existing
radiation model or constrain the illustrative gas envelope.

| Component | Reference behavior | Units / assumptions |
|---|---|---|
| Pipe rupture | severity × 2.5 requested release rate; finite 1,000 kg inventory | kg/s; no pressure/orifice solver |
| Tank rupture | severity × 2.4 release rate; finite 5,000 kg inventory | kg/s; no liquid/vapor equilibrium |
| Reactor rupture | 1.5 requested release rate; finite 1,000 kg inventory | kg/s; triggered by reference damage/temperature threshold |
| Source conservation | inventory removed equals material supplied to releases/direct fires | kg; withdrawal cannot exceed remaining inventory |
| Gas release | one well-mixed inventory; 0.02/s exponential dispersal | mass + dispersed + burned = received; not concentration |
| Plume position | 0.35 × wind × elapsed time | m; ignores obstacles, buoyancy and stability |
| Plume radius | 0.5 + 2 × cube-root(mass) | illustrative visual envelope, not a flammability threshold |
| Ignition | enabled source intersects visual envelope with positive mass | geometric reference rule; not validated combustion chemistry |
| Fire | energy demand uses 46 MJ/kg; material withdrawal limits delivered heat | assumes propane-like heat of combustion for all fuel |
| Radiation | min(80, 120 × intensity / max(1, distance)²) | kW/m² reference coefficient; no view factors or shielding |
| Tank failure | accumulated dose ≥ 900 or temperature ≥ 520 or integrity ≤ 0.65 | kJ/m², K; illustrative thresholds |
| Reactor temperature | cooled: −3 K/s; uncooled: +12 K/s operating, +4 K/s offline | temperature bounded below by 303 K; no reaction kinetics |
| Emergency response | available station count × 2 reduces fire intensity | MW; assumes facility-wide coverage, no hose/time/water budget |

Standalone test fires have a finite 200 kg reference inventory. Fires created by a
release or failed source draw from that source. Suppressed release fires are not
automatically re-ignited in this version; suppression comparisons therefore omit
re-ignition risk. A displayed advantage is conditional on these assumptions.

## Requirements before operational use

1. Define specific chemicals, geometry, environmental bounds, sensor quality, and
   acceptable error for a stated decision; acquire representative measurements.
2. Replace reference source, dispersion, combustion, thermal and equipment models
   with suitable validated models; verify interface units and conservation.
3. Compare against independently calculated cases and experimental benchmarks;
   quantify parameter uncertainty and publish where the model is not applicable.
4. Add versioned telemetry ingestion, durable event storage, access control and
   security review if connecting an actual plant or serving multiple users.
5. Obtain domain-expert review. Do not use the current visuals or scores to set
   evacuation distances, operating limits or emergency instructions.
