# Verification and release gates

## Automated checks

`npm test` compiles and runs deterministic Node tests. Cases cover batch rejection,
simultaneous independent faults, unique IDs, source-stream deduplication, finite mass
accounting, isolation, graph construction, service dependencies, counterfactual
non-mutation, metadata cloning, time-input validation and thermal dose integration.
The hand-calculated thermal case uses a 1 MW reference fire 10 m from a tank for 2 s:
1.2 kW/m² × 2 s = 2.4 kJ/m²; 0.05 s and 0.25 s time steps must agree.

`npm run viewer:build` type-checks all viewer sources and builds the static application.
`npm run test:browser` starts that built application in Chromium with software WebGL.
It exercises indoor boot, contextual actions, fire, blast, wall collapse, evacuation
state, pause, multi-selection, isolation, graph overlay, counterfactual comparison,
export schema, reset, search and a narrow viewport. Indoor core tests also cover
blocked exits, successful evacuation and deterministic cloning mid-incident.
Screenshots are produced for human inspection. Software WebGL success is not an FPS
guarantee for user hardware.

`npm run benchmark` advances 240 assets with 20 initial pipe faults for 30 simulated
seconds at 0.05 s steps. It checks finite state, retained-history bounds and a generous
60-second regression budget. Reported elapsed time is runner-specific, not a universal
performance guarantee.

CI runs on Node 22 and 24 with a checked-in dependency lock. The Node 22 job runs the
browser and uploads screenshots, an exported incident, and a benchmark report.

## What passing means

Passing gates establish that the implemented reference software satisfies its tested
contracts. They do not establish the accuracy of its physical predictions, regulatory
compliance, real-time plant synchronization, response-system availability, or safe
operational recommendations. Those require the evidence listed in the model registry.
