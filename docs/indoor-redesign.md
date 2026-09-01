# Indoor response lab

The default viewer now uses a compact cutaway factory, not the previous outdoor tank
farm. `generateIndoorFacility()` owns the hall's equipment, selectable wall bays and
columns, eight workers and two exits. The larger generator remains available for core
benchmarks and previous experiments.

## Interaction

- Click an object or an asset row; Shift/Ctrl-click adds or removes another target.
- The right-hand editor offers only shared, valid actions for the selected objects.
- Choose fire, blast, leak, thermal exposure, outage or structural damage as applicable,
  set intensity, then apply. Walls and columns expose damage, not irrelevant fuel actions.
- Run/pause and 0.25×/1×/2×/5× speed control the same fixed-step simulation. Space toggles
  playback outside inputs; Escape clears selection.
- Workers evacuate automatically on fire/blast, or through the Evacuate control. They
  use grid routing around equipment and wall footprints; blocked exits produce a
  visible blocked state rather than an invented successful escape.
- The previous isolation, suppression, topology, export and comparison functions remain.

## Rendering choices and sources

[Three.js EffectComposer](https://threejs.org/docs/pages/EffectComposer.html) and
[UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html) support restrained
highlight bloom. PBR materials, procedural concrete grain, shadow bias, roof trusses,
ceiling fixtures and painted walkways establish indoor scale. Flames and smoke use
soft sprites with per-particle rise, expansion and fading rather than square static
points. Workers use articulated limbs driven by movement state. Blast flashes,
expanding rings and sparks have finite lifetimes. All dynamic effect ages follow
simulation time rather than wall-clock time.

[Nielsen Norman Group's progressive disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/)
informs the target-specific action editor. The asset browser, damage editor, inspection
panel and transport controls have distinct roles; routine interaction no longer
requires navigating one long form.

[Rapier's rigid-body documentation](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/)
and [collider documentation](https://rapier.rs/docs/user_guides/javascript/colliders/)
were reviewed. This release deliberately uses deterministic ballistic debris with a
floor-settling approximation, not a newly added rigid-body engine. It does not claim
fragment-to-fragment collisions or structural finite-element analysis.

## Model boundaries

An operator-triggered blast is a normalized reference impulse, not calculated industrial
overpressure. It consumes a small amount of source fuel and applies distance-attenuated
structural damage once. A wall/column below 25% integrity is visually fragmented; the
fragments fall under an analytic gravity curve and settle. Roof trusses remain visual
context; load redistribution, roof collapse, secondary debris impacts and fracture
mechanics are not simulated. Personnel are non-graphic evacuation agents; there is no
injury, mortality, crowd-pressure or toxic-dose calculation. Navigation does not yet
model smoke visibility or heat avoidance. These limits remain visible in the model
documentation and the application retains its reference-simulation notice.

## Verification

Core tests cover the indoor asset graph, ignition/evacuation, one-shot blast damage,
available/blocked exits and deterministic cloning. Chromium integration checks contextual
actions, fire, blast, collapse, pause, multi-selection, isolation, export and mobile
controls, producing screenshots as CI artifacts.
