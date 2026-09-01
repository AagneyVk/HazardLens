# Spatial indoor model audit — 0.4.0 reference

This iteration corrects a key architectural gap: the previous expanding sphere had
no local fuel inventory and its single fire could not follow gas around the floor.
It also corrects an unsupported implication that accumulated-gas ignition always
produces destructive blast pressure. Automatic cloud blasts have been removed.

## Evidence and implementation

| Model | Documentation reviewed | Implemented / boundary |
|---|---|---|
| Gas chemistry | [NIOSH propane properties](https://www.cdc.gov/niosh/npg/npgd0524.html) | Propane-only floor reference, 2.1–9.5% volume ignition interval. No multi-species chemistry. |
| Gas/smoke transport | [NIST FDS reference guide](https://www.nist.gov/publications/fire-dynamics-simulator-technical-reference-guide-sixth-edition), [manuals](https://pages.nist.gov/fds-smv/manuals.html) | Conservative finite-volume upwind advection/diffusion, not FDS/Navier–Stokes or validated CFD. Smoke sprites remain visual. |
| Fire types | [Gexcon fire types](https://knowledge.gexcon.com/docs/types-of-fires) | Local cloud combustion distinct from operator blast. No liquid pool, jet momentum, fireball or VCE pressure model. |
| Thermal/structural response | [NIST steel constitutive models](https://www.nist.gov/publications/high-temperature-material-constitutive-models-structural-fire-analysis) | Lumped indoor tank shell heating/cooling and visible stress/rupture; no finite-element stress, pressure or load redistribution. |
| Other equipment, blast, people | Existing model register | Retained qualitative reference rules; not upgraded or revalidated by the gas-grid work. |

The literature informs mechanisms and verification discipline. This is not an
implementation of those complete reference solvers or proof of physical accuracy.

## Transport and combustion contract

- Grid: 27 × 19 cells, 2 m horizontal spacing, assumed uniform 0.5 m floor layer.
  Gas density 1.83 kg/m³ is an ambient propane approximation. Concentration is
  fuel mass divided by layer volume and gas density; it is not a solved mixture EOS.
- Pairwise face fluxes cancel exactly. Upwind advection uses configured horizontal
  weather velocity; effective diffusivity is an assumed 1 m²/s. Substeps constrain
  total outgoing fraction to 0.8, preserving nonnegative mass.
- Standing wall boxes block face flux and floor flame contact. Gaps are openings;
  bays below 25% integrity become permeable. External grid boundaries are no-flux.
  Uniform 0.02/s ventilation is accounted as removed mass, not an HVAC network.
- Sources retain finite inventories. Pipe isolation stops new withdrawal, not
  existing cloud movement. Export accounting is received = stored + burned + vented.
- Ignition requires a local flammable mixture and flame/contact or a burning adjacent
  cell. Neighbor propagation has a 0.5 s dwell (up to 4 m/s at this grid resolution):
  an explicit uncalibrated numerical rule, not a measured flame-speed prediction.
- Local consumption uses a 1/s time scale; heat release follows actual fuel burned
  at 46 MJ/kg. Ambient oxygen replenishment is assumed: no oxygen-starvation,
  ventilation-limited fire, buoyancy, ceiling layer or turbulent flame acceleration.
- Floor radiation uses a 0.3 radiative fraction and inverse-square point sources;
  standing wall geometry blocks line of sight. This is not surface radiosity.
- Suppression inhibits floor burning for five seconds without deleting gas.
  Re-ignition remains possible after inhibition if fuel and a hot neighbor remain.
- Multiple release fields contribute to local flammability. Updates are deterministic
  and sequential; the solver is a reduced-order approximation, not order-independent CFD.

Gas is physically invisible; colored floor patches are a diagnostic overlay, not
visible propane. Flames are drawn at burning cells instead of stretched from the leak.
Concrete itself is not made combustible. Gas can burn along the floor and through
openings, but not through intact solid walls or floors in this model.

## Vessel response

Indoor tanks use an assumed 6 mm steel shell, density 7850 kg/m³ and constant heat
capacity 500 J/(kg K): 23.55 kJ/(m² K). Absorptivity/emissivity = 0.7; external
convection = 10 W/(m² K); ambient = 303 K. Heating accumulates from incident sources;
cooling is applied once per simulation step. Actual fill level, internal convection,
boiling, pressure relief, insulation and strength are absent. The 650 K failure
threshold is a configurable-code reference assumption, not a universal failure point.
Heat stress deforms the mesh; failed tanks/reactors become segmented shell debris.
Debris is an animation, not structural or fragment-collision analysis.

Blast damage now degrades containment before rupture: tank integrity ≤0.4, pipe
integrity ≤0.5. This removes immediate rupture from every weak blast hit. These
thresholds and the blast impulse remain qualitative; blast diffraction is not solved.

## Verification versus validation

Tests check conservation, positivity under substeps, dt refinement, blocked/open
walls, local flame propagation, lean/rich exclusion, isolation, clone determinism,
shell heat capacity and fuel release without invented ignition. Browser regression
exports actual burning cells after a pipe-leak/vessel-fire interaction.

Physical validation is still missing. Before any operational prediction: specify
geometry, materials, pressure, chemicals, ventilation and release orifices; implement
appropriate source/jet/pool/pressure models; compare selected cases with independent
FDS/experimental benchmarks and quantify grid sensitivity and uncertainty. Faster
or larger-looking flames are not evidence of greater accuracy.
