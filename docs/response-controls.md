# Containment and response controls

The selected-object editor now has **Contain the incident** actions. Choose a
response in the preview selector and compare two cloned worlds before applying it.
Comparison includes active fires, failed assets, peak equipment temperature and
remaining released gas. Responses appear as applied/rejected events in Domino chain.

| Action | Model effect | Limit |
|---|---|---|
| Isolate fuel | Closes selected pipe supply; stops new withdrawal | Existing gas and damage remain; not a repair |
| Cool vessel | Adds 30 seconds of reference cooling, up to 5 K/s, capped at ambient | Requires available emergency resources; no hydraulic/spray heat-transfer solver |
| Suppress this source | Extinguishes its attached fire and temporarily inhibits its gas-field flames | Does not delete gas; re-ignition remains possible |
| Shut down equipment | Disables the selected service; dependent twins respond normally | Residual reactor heat remains |
| Restore service | Re-enables an intact, cool service outside nearby active hazards | Integrity must be ≥0.8, temperature ≤360 K; destroyed assets are not rebuilt |

Batch validation occurs before queuing. Preconditions are checked again on execution;
if conditions change, the log records rejection. None of these controls are real
emergency instructions. Site-specific procedures and qualified response personnel
remain essential; see [HSE emergency isolation](https://www.hse.gov.uk/comah/sragtech/techmeasisolatio.htm)
and [emergency procedures](https://www.hse.gov.uk/workplace-health/emergency-procedures.htm).
The action rates and eligibility thresholds above are unvalidated simulation rules.

## Fire lifecycle correction

A fire attached to missing/destroyed equipment terminates with zero heat output;
major pipe failure also terminates its original attached flame. An isolated or empty
fuel source cannot sustain that flame. Repeated ignite commands no longer stack
identical attached fires. Existing spilled fuel is a separate inventory: it may
continue burning after equipment destruction, so total fire count need not reach zero.

## Visual changes

Ground gas uses three shallow animated wisp layers; floor flames use crossed,
noise-distorted flame surfaces. These are GPU-efficient approximations, not volume
raymarching. Both follow simulation time and pause. Cyan gas is a visualization aid,
not physically visible propane. This supersedes the previous concentration-color
legend; local concentration remains in exported gas cells.

Leaking/damaged pipelines show separated, bent pipe sections. Other damaged
machinery tilts/compresses according to integrity. Active cooling shows spray particles.
These effects depict state, not validated fracture or droplet mechanics.
