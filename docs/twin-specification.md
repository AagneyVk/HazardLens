# Twin contract

The active contract is `src/core/types.ts`. Every twin exposes state, event handling,
`tick(dt, context)` and an independent clone. Metadata carries physical-model provenance,
relationships and bounded local history. Fuel-bearing twins additionally implement
`withdrawFuel(requestedKg)`, returning nonnegative mass no greater than inventory.

The runtime owns time and event IDs. The facility graph owns structural relationships.
The renderer receives snapshots and must not write simulation state. See
[architecture](architecture.md) and [model registry](model-register.md) for semantics.
