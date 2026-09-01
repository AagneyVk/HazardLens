# HazardLens

An interactive industrial-facility simulation platform for free-form failure exploration,
causal inspection, and counterfactual response experiments.

**Release candidate: 0.3.0 · `feat/hazardlens-industrial-platform`**

HazardLens is a qualitative reference simulator for research and training. It is not a
validated predictor of toxic concentrations, blast distances, or real emergency outcomes.
There is no live plant telemetry connection in this release.

## Integrated facility

One generator supplies both the simulation and the 3D view. The default facility has
**240 assets plus weather**, with stable IDs and a validated `FacilityTwinGraph`:

| Asset | Count | ID prefix |
|---|---:|---|
| Tanks | 60 | T |
| Pipes | 120 | P |
| Reactors | 8 | R |
| Pumps | 12 | PU |
| Compressors | 6 | CP |
| Cooling units | 4 | CL |
| Control center | 1 | CTRL |
| Emergency systems | 8 | ES |
| Roads | 3 | RD |
| Walls | 12 | W |
| Ignition sources | 6 | M |

Twins own physical and service state. The renderer reads snapshots; it does not decide
failures. Cooling loss affects connected reactors, pump outages interrupt connected
pipe sources, and control/access failures restrict emergency response.

## Run

Requires Node.js 22+ and a WebGL2-capable browser.

```sh
npm ci
npm test
npm run viewer
```

Open the Vite URL. Additional commands:

```sh
npm run build:all       # core and viewer TypeScript checks + production bundle
npm run demo            # headless reference experiment
npm run benchmark       # 240 assets / 20 initial faults / 30 simulated seconds
npx playwright install chromium
npm run test:browser    # requires a built viewer; exercises Chromium/WebGL
```

## Operator workflow

1. Search by asset ID, type, or zone. Select multiple assets with Ctrl/Cmd-click,
   or use **Select visible**. Shift-click adds 3D assets to the selection.
2. Choose a supported shared failure mode and severity. **Inject failure** can be
   repeated on any available assets; there are no fixed incident scripts.
3. Inspect temperature, integrity, operational state, providers and dependents.
   **Show connections** reveals the generated graph.
4. Isolate selected pipes, suppress fires, or compare suppression against a cloned
   no-intervention continuation over ten seconds. The comparison does not mutate
   the live world or automatically apply a recommendation.
5. Pause, change speed, reset, or export the incident as JSON with model version,
   units, summary, topology, twin state and retained events.

On narrow screens the console becomes a scrollable bottom panel. WebGL failures
produce a visible startup message. No account or server is required for local use.

## Engineering checks

- Validated all-or-nothing failure batches and graph endpoint validation.
- Unique hazard IDs and one active release stream per source.
- Finite source inventories with release/dispersal/combustion mass accounting.
- Elapsed-time thermal dose, deterministic cloning and bounded retained history.
- Locked dependencies and CI on Node 22 and 24.
- Browser integration test with overview, cascade, and mobile screenshots.
- Benchmark output and browser evidence retained as CI artifacts.

The industrial expansion branch was already an ancestor of the foundation branch;
this branch preserves that history and replaces disconnected viewer-only stubs with
the integrated generator and graph.

## Documentation

- [Architecture and contracts](docs/architecture.md)
- [Model registry, sources, and limitations](docs/model-register.md)
- [Verification and release gates](docs/validation.md)
- [Running and diagnosing the platform](docs/operations.md)
- [Release changes](CHANGELOG.md)
