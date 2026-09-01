# Operations

## Local and static deployment

Use Node.js 22 or 24. Install with `npm ci`, then `npm run build:all`. Serve `dist-viewer/`
from a static HTTP server. `npm run viewer` is the development server; its default
binding permits LAN access and should be used only on a trusted development network.
There is no server-side state, authentication or cloud dependency in the application.

## Persistence

The live simulation is held in browser memory. Export an incident before reload/reset.
Export includes the model version, units, topology, snapshot and retained events; it
cannot be re-imported or resumed in this release. Event truncation is explicit.
Changing the speed affects integration throughput, not the 0.05-second model step.

## Diagnosis

- Startup message / blank 3D view: use a WebGL2-capable browser and inspect the console.
- Disabled injection: select assets with a shared failure mode. Search filters the
  visible list; selections can remain outside the filter until **Clear** is used.
- No suppression: check emergency systems and control-center availability (also road
  integrity in the outdoor generator).
- No visible wall collapse: select a wall or column and apply structural damage above
  75%; lesser damage preserves its geometry. Nearby reference blasts can also damage it.
- Workers blocked: inspect exit availability; evacuation routing is a simplified grid
  model, not a validated life-safety calculation.
- No plume after isolation or pump outage: new source withdrawal has stopped;
  previously released material can remain and disperse.
- Reactor failure after cooling outage: this is the intended qualitative residual-heat
  dependency. Inspect the graph and model registry before interpreting its timing.
- Long runs: export reports as needed. The viewer keeps bounded event and twin history;
  transient twin count is not an unlimited-duration archival store.

For release checks, run tests/build/benchmark/browser tests and inspect the CI artifacts.
No credentials are required for the local application. Do not embed plant secrets or
personal data in public incident exports.
